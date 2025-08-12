import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Dict, List, Any, Optional

from app.core.config import settings
from app.core.file_manager import FileManager
from app.services.model_service import model_service
from app.services.graph_service import graph_service
from app.templates.flow_diagram import FlowDiagram
from app.utils.sse_helper import SSEHelper
from app.models.graph_schema import GraphConfig, GraphInput

logger = logging.getLogger(__name__)

router = APIRouter()

# ======= 图管理 =======
@router.get("/graphs", response_model=List[str])
async def get_graphs():
    """获取所有可用的图"""
    try:
        return graph_service.list_graphs()
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
        graph_config = graph_service.get_graph(graph_name)
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
        # 检查图是否存在
        graph_config = graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        # 获取图的目录
        agent_dir = settings.get_agent_dir(graph_name)

        # 查找可能的README文件（不区分大小写）
        readme_content = None
        readme_patterns = ["readme.md", "README.md", "Readme.md"]

        for pattern in readme_patterns:
            readme_path = agent_dir / pattern
            if readme_path.exists() and readme_path.is_file():
                try:
                    with open(readme_path, 'r', encoding='utf-8') as f:
                        readme_content = f.read()
                    break
                except Exception as e:
                    logger.error(f"读取README文件出错: {str(e)}")

        # 构建返回的图信息
        graph_info = {
            "name": graph_name,
            "config": graph_config,
            "readme": readme_content or "未找到README文件"
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
        # 验证图配置
        valid, error = graph_service.validate_graph(graph.dict())
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"图配置无效: {error}"
            )

        # 保存图
        success = graph_service.save_graph(graph.name, graph.dict())
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="保存图失败"
            )

        # 每次保存都重新生成README文件
        try:
            agent_dir = settings.get_agent_dir(graph.name)
            agent_dir.mkdir(parents=True, exist_ok=True)

            # 获取MCP配置
            mcp_config = FileManager.load_mcp_config()
            filtered_mcp_config = {"mcpServers": {}}

            # 获取使用的服务器
            used_servers = set()
            for node in graph.dict().get("nodes", []):
                for server in node.get("mcp_servers", []):
                    used_servers.add(server)

            # 过滤MCP配置
            for server_name in used_servers:
                if server_name in mcp_config.get("mcpServers", {}):
                    filtered_mcp_config["mcpServers"][server_name] = mcp_config["mcpServers"][server_name]

            # 获取使用的模型
            used_models = set()
            for node in graph.dict().get("nodes", []):
                if node.get("model_name"):
                    used_models.add(node.get("model_name"))

            # 获取模型配置
            model_configs = []
            all_models = model_service.get_all_models()

            for model in all_models:
                if model["name"] in used_models:
                    model_configs.append(model)

            # 生成README内容
            readme_content = FlowDiagram.generate_graph_readme(graph.dict(), filtered_mcp_config, model_configs)

            # 保存README文件 - 直接覆盖原文件
            readme_path = agent_dir / "readme.md"
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)

            logger.info(f"已为图 '{graph.name}' 重新生成README文件")
            
        except Exception as e:
            logger.error(f"生成README文件时出错: {str(e)}")
            # README生成失败不应该影响图保存的主要功能，所以不抛出异常

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
        # 检查图是否存在
        graph_config = graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )

        # 删除图
        success = graph_service.delete_graph(graph_name)
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
        # 检查图是否存在
        graph_config = graph_service.get_graph(old_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{old_name}'"
            )

        # 检查新名称是否已存在
        existing_graph = graph_service.get_graph(new_name)
        if existing_graph:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"已存在名为 '{new_name}' 的图"
            )

        # 重命名图
        success = graph_service.rename_graph(old_name, new_name)
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
        # 获取图配置
        graph_config = graph_service.get_graph(graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{graph_name}'"
            )
        host = "http://localhost:9999"

        # 生成脚本
        result = graph_service.generate_mcp_script(graph_name, graph_config, host)

        # 确保响应格式统一
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
    """执行图并返回流式结果"""
    try:
        # 检查图是否存在
        graph_config = graph_service.get_graph(input_data.graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{input_data.graph_name}'"
            )

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
