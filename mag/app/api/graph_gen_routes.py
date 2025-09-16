import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Dict, Any, Optional, List
from app.services.mcp_service import mcp_service
from app.services.model_service import model_service
from app.services.graph_service import graph_service
from app.models.graph_schema import GraphGenerationRequest, PromptTemplateRequest
from app.services.graph.ai_graph_generator import AIGraphGenerator
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/prompt-template", response_model=Dict[str, str])
async def get_prompt_template(request: PromptTemplateRequest):
    """生成提示词模板，包含节点参数规范、指定MCP服务器的工具信息和已有模型名称"""
    try:
        # 获取图配置（如果提供了graph_name）
        graph_config = None
        if request.graph_name:
            graph_config = graph_service.get_graph(request.graph_name)
            if not graph_config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"找不到图 '{request.graph_name}'"
                )
            logger.info(f"成功加载图配置: {request.graph_name}")

        # 创建AI图生成器实例并调用_build_system_prompt方法
        ai_generator = AIGraphGenerator()

        # 使用build_system_prompt方法生成完整的提示词
        prompt = await ai_generator.build_system_prompt(
            mcp_servers=request.mcp_servers,
            graph_config=graph_config
        )

        return {
            "prompt": prompt
        }
    except Exception as e:
        logger.error(f"生成提示词模板时出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成提示词模板时出错: {str(e)}"
        )

@router.post("/graphs/generate")
async def generate_graph(request: GraphGenerationRequest):
    """AI生成图接口 - 流式SSE响应"""
    try:
        # 基本参数验证
        if not request.requirement.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户需求不能为空"
            )

        if not request.model_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="必须指定模型名称"
            )

        # 验证模型是否存在
        model_config = model_service.get_model(request.model_name)
        if not model_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{request.model_name}'"
            )

        # 获取graph配置（如果提供了graph_name）
        graph_config = None
        if request.graph_name:
            graph_config = graph_service.get_graph(request.graph_name)
            if not graph_config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"找不到图 '{request.graph_name}'"
                )

        # 生成流式响应
        async def generate_stream():
            try:
                async for chunk in graph_service.ai_generate_graph(
                    requirement=request.requirement,
                    model_name=request.model_name,
                    mcp_servers=request.mcp_servers,
                    conversation_id=request.conversation_id,
                    user_id=request.user_id,
                    graph_config=graph_config,
                ):
                    yield chunk
            except Exception as e:
                logger.error(f"AI图生成流式响应出错: {str(e)}")
                error_chunk = {
                    "error": {
                        "message": str(e),
                        "type": "api_error"
                    }
                }
                yield f"data: {json.dumps(error_chunk)}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI图生成处理出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理AI图生成请求时出错: {str(e)}"
        )