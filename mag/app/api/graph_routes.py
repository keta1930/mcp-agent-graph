import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse,JSONResponse
from typing import Dict, List, Any, Optional

from app.core.config import settings
from app.core.file_manager import FileManager
from app.services.model_service import model_service
from app.services.graph_service import graph_service
from app.templates.flow_diagram import FlowDiagram
from app.utils.sse_helper import SSEHelper
from app.models.graph_schema import GraphConfig, GraphInput

logger = logging.getLogger(__name__)

router = APIRouter(tags=["graph"])

# ======= 图管理 =======
@router.get("/graphs", response_model=List[str])
async def get_graphs():
    """获取所有可用的图"""
    try:
        return await graph_service.list_graphs()
    except Exception as e:
        logger.error(f"获取图列表时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取图列表时出错: {str(e)}"
        )


@router.get("/graphs/{graph_name}", response_model=Dict[str, Any])
async def get_graph(graph_name: str):
    """获取特定图的配置"""
    try:
        graph_config = await graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )
        return graph_config
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取图 '{graph_name}' 时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取图 '{graph_name}' 时出错: {str(e)}"
        )
        
@router.get("/graphs/{graph_name}/readme", response_model=Dict[str, Any])
async def get_graph_readme(graph_name: str):
    """获取图的README文件内容"""
    try:
        graph_config = await graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        readme_content = graph_config.get("readme", "未找到README文件")

        graph_info = {
            "name": graph_name,
            "config": graph_config,
            "readme": readme_content
        }

        return graph_info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取图README时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取图README时出错: {str(e)}"
        )


@router.post("/graphs", response_model=Dict[str, Any])
async def create_graph(graph: GraphConfig):
    """创建新图或更新现有图"""
    try:
        valid, error = await graph_service.validate_graph(graph.dict())
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"图配置无效: {error}"
            )

        graph_dict = graph.dict()

        mcp_config = FileManager.load_mcp_config()
        filtered_mcp_config = {"mcpServers": {}}

        used_servers = set()
        for node in graph_dict.get("nodes", []):
            for server in node.get("mcp_servers", []):
                used_servers.add(server)

        for server_name in used_servers:
            if server_name in mcp_config.get("mcpServers", {}):
                filtered_mcp_config["mcpServers"][server_name] = mcp_config["mcpServers"][server_name]

        used_models = set()
        for node in graph_dict.get("nodes", []):
            if node.get("model_name"):
                used_models.add(node.get("model_name"))

        model_configs = []
        all_models = model_service.get_all_models()
        for model in all_models:
            if model["name"] in used_models:
                model_configs.append(model)

        readme_content = FlowDiagram.generate_graph_readme(graph_dict, filtered_mcp_config, model_configs)
        graph_dict["readme"] = readme_content

        success = await graph_service.save_graph(graph.name, graph_dict)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="保存图失败"
            )

        return {"status": "success", "message": f"图 '{graph.name}' 保存成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建/更新图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建/更新图时出错: {str(e)}"
        )


@router.delete("/graphs/{graph_name}", response_model=Dict[str, Any])
async def delete_graph(graph_name: str):
    """删除图"""
    try:
        graph_config = await graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        success = await graph_service.delete_graph(graph_name)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="删除图失败"
            )

        return {"status": "success", "message": f"图 '{graph_name}' 删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除图时出错: {str(e)}"
        )


@router.put("/graphs/{old_name}/rename/{new_name}", response_model=Dict[str, Any])
async def rename_graph(old_name: str, new_name: str):
    """重命名图"""
    try:
        graph_config = await graph_service.get_graph(old_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{old_name}'"
            )

        existing_graph = await graph_service.get_graph(new_name)
        if existing_graph:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"已存在名为 '{new_name}' 的图"
            )

        success = await graph_service.rename_graph(old_name, new_name)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="重命名图失败"
            )

        return {"status": "success", "message": f"图 '{old_name}' 重命名为 '{new_name}' 成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"重命名图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"重命名图时出错: {str(e)}"
        )


@router.get("/graphs/{graph_name}/generate_mcp", response_model=Dict[str, Any])
async def generate_mcp_script(graph_name: str):
    """生成MCP服务器脚本"""
    try:
        graph_config = await graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )
        host = "http://localhost:9999"

        result = graph_service.generate_mcp_script(graph_name, graph_config, host)

        if isinstance(result, str):
            return {
                "graph_name": graph_name,
                "script": result
            }

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成MCP脚本时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成MCP脚本时出错: {str(e)}"
        )

# ======= 图执行 =======
@router.post("/graphs/execute")
async def execute_graph(input_data: GraphInput):
    """执行图并返回流式结果或后台执行结果"""
    try:
        # 检查图是否存在
        graph_config = await graph_service.get_graph(input_data.graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{input_data.graph_name}'"
            )

        # 根据background参数选择执行模式
        if input_data.background:
            # 后台执行模式：返回conversation_id，图在后台继续执行
            try:
                result = await graph_service.execute_graph_background(
                    input_data.graph_name,
                    input_data.input_text,
                    graph_config,
                    input_data.conversation_id
                )
                return JSONResponse(result)
            except Exception as e:
                logger.error(f"启动后台执行时出错: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"启动后台执行时出错: {str(e)}"
                )
        else:
            # SSE模式：现有流程保持不变
            async def generate_hybrid_stream():
                try:
                    if input_data.conversation_id:
                        # 继续现有会话
                        async for sse_data in graph_service.continue_conversation_stream(
                                input_data.conversation_id,
                                input_data.input_text,
                        ):
                            yield sse_data
                    else:
                        # 创建新会话
                        async for sse_data in graph_service.execute_graph_stream(
                                input_data.graph_name,
                                input_data.input_text,
                                graph_config
                        ):
                            yield sse_data

                    # 发送完成标记
                    yield SSEHelper.format_done()

                except HTTPException as he:
                    yield SSEHelper.send_error(he.detail)
                    yield SSEHelper.format_done()
                except Exception as e:
                    logger.error(f"执行图时出错: {str(e)}")
                    yield SSEHelper.send_error(f"执行图时出错: {str(e)}")
                    yield SSEHelper.format_done()

            return StreamingResponse(
                generate_hybrid_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"初始化执行图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"初始化执行图时出错: {str(e)}"
        )
