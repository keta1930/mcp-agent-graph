import asyncio
import requests
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import logging
from urllib.parse import unquote

from app.services.mcp_service import mcp_service
from app.services.model_service import model_service
from app.services.graph_service import graph_service
from app.core.file_manager import FileManager
from app.models.schema import (
    MCPConfig, ModelConfig, GraphConfig, GraphInput,
    GraphResult, NodeResult, ModelConfigList
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ======= MCP服务器管理 =======

@router.get("/mcp/config", response_model=MCPConfig)
async def get_mcp_config():
    """获取MCP配置"""
    from app.core.file_manager import FileManager
    return FileManager.load_mcp_config()


@router.post("/mcp/config", response_model=Dict[str, Dict[str, Any]])
async def update_mcp_config(config: MCPConfig):
    """更新MCP配置并重新连接服务器"""
    try:
        results = await mcp_service.update_config(config.dict())
        return results
    except Exception as e:
        logger.error(f"更新MCP配置时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新MCP配置时出错: {str(e)}"
        )


@router.get("/mcp/status", response_model=Dict[str, Dict[str, Any]])
async def get_mcp_status():
    """获取MCP服务器状态"""
    try:
        return await mcp_service.get_server_status()
    except Exception as e:
        logger.error(f"获取MCP状态时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取MCP状态时出错: {str(e)}"
        )


@router.post("/mcp/connect/{server_name}", response_model=Dict[str, Any])
async def connect_server(server_name: str):
    """连接指定的MCP服务器"""
    try:
        result = await mcp_service.connect_server(server_name)
        if result.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "连接服务器失败")
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"连接服务器'{server_name}'时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"连接服务器时出错: {str(e)}"
        )


@router.get("/mcp/tools", response_model=Dict[str, List[Dict[str, Any]]])
async def get_mcp_tools():
    """获取所有MCP工具信息"""
    try:
        return await mcp_service.get_all_tools()
    except Exception as e:
        logger.error(f"获取MCP工具信息时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取MCP工具信息时出错: {str(e)}"
        )

# ======= 模型管理 =======

@router.get("/models", response_model=List[Dict[str, Any]])
async def get_models():
    """获取所有模型配置（不包含API密钥）"""
    try:
        return model_service.get_all_models()
    except Exception as e:
        logger.error(f"获取模型列表时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型列表时出错: {str(e)}"
        )


@router.post("/models", response_model=Dict[str, Any])
async def add_model(model: ModelConfig):
    """添加新模型配置"""
    try:
        # 检查是否已存在同名模型
        existing_model = model_service.get_model(model.name)
        if existing_model:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"已存在名为 '{model.name}' 的模型"
            )

        # 添加模型
        success = model_service.add_model(model.dict())
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="添加模型失败"
            )

        return {"status": "success", "message": f"模型 '{model.name}' 添加成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加模型时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加模型时出错: {str(e)}"
        )


@router.put("/models/{model_name}", response_model=Dict[str, Any])
async def update_model(model_name: str, model: ModelConfig):
    """更新模型配置"""
    try:
        # 检查模型是否存在
        existing_model = model_service.get_model(model_name)
        if not existing_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{model_name}'"
            )

        # 如果模型名称已更改，检查新名称是否已存在
        if model_name != model.name:
            existing_model_with_new_name = model_service.get_model(model.name)
            if existing_model_with_new_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"已存在名为 '{model.name}' 的模型"
                )

        # 更新模型
        success = model_service.update_model(model_name, model.dict())
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="更新模型失败"
            )

        return {"status": "success", "message": f"模型 '{model_name}' 更新成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新模型时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新模型时出错: {str(e)}"
        )


@router.delete("/models/{model_name:path}", response_model=Dict[str, Any])
async def delete_model(model_name: str):
    """删除模型配置"""
    try:
        model_name = unquote(model_name)
        logger.info(f"尝试删除模型: '{model_name}'")

        # 检查模型是否存在
        existing_model = model_service.get_model(model_name)
        if not existing_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{model_name}'"
            )

        # 删除模型
        success = model_service.delete_model(model_name)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="删除模型失败"
            )

        return {"status": "success", "message": f"模型 '{model_name}' 删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除模型时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除模型时出错: {str(e)}"
        )


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


@router.post("/graphs", response_model=Dict[str, Any])
async def create_graph(graph: GraphConfig):
    """创建新图或更新现有图"""
    try:
        # 验证图配置
        print("")
        valid, error = graph_service.validate_graph(graph.dict())
        print("valid, error",valid, error)
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"图配置无效: {error}"
            )

        # 保存图
        print("保存图")
        success = graph_service.save_graph(graph.name, graph.dict())
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


# ======= 图执行 =======

@router.post("/graphs/execute", response_model=GraphResult)
async def execute_graph(input_data: GraphInput):
    """执行图并返回结果"""
    try:
        # 检查图是否存在
        graph_config = graph_service.get_graph(input_data.graph_name)
        if not graph_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到图 '{input_data.graph_name}'"
            )

        # 执行图
        if input_data.conversation_id:
            # 继续现有会话
            result = await graph_service.continue_conversation(
                input_data.conversation_id,
                input_data.input_text,
                input_data.parallel
            )
        else:
            # 创建新会话
            result = await graph_service.execute_graph(
                input_data.graph_name,
                input_data.input_text,
                input_data.parallel
            )
        print("\n\n========369result========\n",result)

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"执行图时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"执行图时出错: {str(e)}"
        )


@router.get("/conversations/{conversation_id}", response_model=Dict[str, Any])
async def get_conversation(conversation_id: str):
    """获取会话状态"""
    try:
        conversation = graph_service.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到会话 '{conversation_id}'"
            )
        return {
            "conversation_id": conversation_id,
            "graph_name": conversation["graph_name"],
            "results": conversation["results"],
            "completed_nodes": list(conversation["completed_nodes"]),
            "pending_nodes": list(conversation["pending_nodes"])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取会话时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取会话时出错: {str(e)}"
        )


@router.delete("/conversations/{conversation_id}", response_model=Dict[str, Any])
async def delete_conversation(conversation_id: str):
    """删除会话"""
    try:
        success = graph_service.delete_conversation(conversation_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到会话 '{conversation_id}'"
            )
        return {"status": "success", "message": f"会话 '{conversation_id}' 删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除会话时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除会话时出错: {str(e)}"
        )

@router.get("/conversations", response_model=List[str])
async def list_conversations():
    """列出所有会话"""
    try:
        return FileManager.list_conversations()
    except Exception as e:
        logger.error(f"列出会话时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"列出会话时出错: {str(e)}"
        )


@router.post("/graphs/continue", response_model=GraphResult)
async def continue_graph_execution(input_data: GraphInput):
    """从文件恢复并继续执行会话"""
    try:
        conversation_id = input_data.conversation_id
        if not conversation_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="必须提供会话ID以继续执行"
            )

        # 检查会话是否存在
        if not FileManager.load_conversation_json(conversation_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到会话 '{conversation_id}'"
            )

        # 如果是从断点继续，设置标志位并传递到continue_conversation
        continue_from_checkpoint = input_data.continue_from_checkpoint or not input_data.input_text

        # 继续执行会话
        result = await graph_service.continue_conversation(
            conversation_id,
            input_data.input_text,
            input_data.parallel,
            continue_from_checkpoint
        )

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"继续执行会话时出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"继续执行会话时出错: {str(e)}"
        )


@router.get("/conversations/detail/{conversation_id}", response_model=Dict[str, Any])
async def get_conversation_detail(conversation_id: str):
    """获取会话详细信息"""
    try:
        # 尝试从内存中获取
        conversation = graph_service.get_conversation_with_hierarchy(conversation_id)
        if conversation:
            return conversation

        # 如果内存中不存在，尝试从文件加载
        json_data = FileManager.load_conversation_json(conversation_id)
        if not json_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到会话 '{conversation_id}'"
            )

        # 返回基本信息
        return {
            "conversation_id": conversation_id,
            "graph_name": json_data.get("graph_name", "未知图"),
            "start_time": json_data.get("start_time", "未知时间"),
            "completed": json_data.get("completed", False),
            "from_file": True
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取会话详情时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取会话详情时出错: {str(e)}"
        )

@router.get("/conversations/{conversation_id}/hierarchy", response_model=Dict[str, Any])
async def get_conversation_hierarchy(conversation_id: str):
    """获取会话层次结构"""
    try:
        hierarchy = graph_service.get_conversation_with_hierarchy(conversation_id)
        if not hierarchy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到会话 '{conversation_id}'"
            )
        return hierarchy
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取会话层次结构时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取会话层次结构时出错: {str(e)}"
        )


@router.post("/system/shutdown", response_model=Dict[str, Any])
async def shutdown_service(background_tasks: BackgroundTasks):
    """优雅关闭MAG服务"""
    logger.info("收到关闭服务请求")

    try:
        active_conversations = list(graph_service.active_conversations.keys())
        logger.info(f"当前有 {len(active_conversations)} 个活跃会话")

        # 保存所有活跃会话到文件中
        for conv_id in active_conversations:
            try:
                graph_service.conversation_manager.update_conversation_file(conv_id)
                logger.info(f"已保存会话: {conv_id}")
            except Exception as e:
                logger.error(f"保存会话 {conv_id} 时出错: {str(e)}")

        background_tasks.add_task(_perform_shutdown)

        return {
            "status": "success",
            "message": "服务关闭过程已启动",
            "active_sessions": len(active_conversations)
        }
    except Exception as e:
        logger.error(f"启动关闭过程时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"关闭服务失败: {str(e)}"
        )

async def _perform_shutdown():
    """执行实际的关闭操作"""
    logger.info("开始执行关闭流程")

    try:
        # 1. 清理所有会话
        for conv_id in list(graph_service.active_conversations.keys()):
            try:
                graph_service.delete_conversation(conv_id)
                logger.info(f"已清理会话: {conv_id}")
            except Exception as e:
                logger.error(f"清理会话 {conv_id} 时出错: {str(e)}")

        # 2. 首先尝试优雅关闭
        client_notified = await mcp_service.notify_client_shutdown()

        # 3. 如果优雅关闭失败，使用强制方式
        if not client_notified:
            await mcp_service.cleanup(force=True)
        else:
            # 即使优雅关闭成功，也执行cleanup以重置状态，但不强制终止
            await mcp_service.cleanup(force=False)

        logger.info("MCP服务已清理")

        # 4. 关闭Host服务
        logger.info("即将关闭Host服务...")
        import signal
        import os
        os.kill(os.getpid(), signal.SIGTERM)
    except Exception as e:
        logger.error(f"执行关闭流程时出错: {str(e)}")

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