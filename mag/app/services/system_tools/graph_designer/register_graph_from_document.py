"""
系统工具：register_graph_from_document
从文档注册 Graph 配置
"""
import logging
import json
from typing import Dict, Any
from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "register_graph_from_document",
        "description": "从指定文档中解析Graph配置（JSON格式）并注册到系统。文档需要包含完整的Graph配置，包括name、description、nodes、end_template等字段。",
        "parameters": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "包含Graph配置的文档名称（含路径），例如：'graph/my_graph.json'"
                }
            },
            "required": ["filename"]
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    从文档注册Graph配置
    
    Args:
        user_id: 用户ID
        filename: 文档名称
        conversation_id: 对话ID
        
    Returns:
        {
            "success": True,
            "graph_name": "my_graph",
            "message": "Graph 'my_graph' 注册成功"
        }
    """
    try:
        # 验证必需参数
        filename = kwargs.get("filename")
        conversation_id = kwargs.get("conversation_id")
        
        if not filename:
            logger.error("缺少必需参数：filename")
            return {
                "success": False,
                "message": "缺少必需参数：filename"
            }
        
        if not conversation_id:
            logger.error("缺少必需参数：conversation_id")
            return {
                "success": False,
                "message": "缺少必需参数：conversation_id"
            }
        
        logger.info(f"正在从文档注册Graph: {filename}")
        
        # 从 conversation_document_manager 读取文档
        content = await conversation_document_manager.read_file(
            user_id=user_id,
            conversation_id=conversation_id,
            filename=filename
        )
        
        if content is None:
            logger.error(f"读取文档失败或文档不存在: {filename}")
            return {
                "success": False,
                "message": f"读取文档失败或文档不存在: {filename}"
            }
        
        # 解析 JSON 内容
        try:
            graph_config = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析失败: {str(e)}")
            return {
                "success": False,
                "message": f"JSON解析失败: {str(e)}"
            }
        
        # 验证必需字段
        if not isinstance(graph_config, dict):
            logger.error("Graph配置必须是JSON对象")
            return {
                "success": False,
                "message": "Graph配置必须是JSON对象"
            }
        
        graph_name = graph_config.get("name")
        if not graph_name:
            logger.error("Graph配置缺少必需字段：name")
            return {
                "success": False,
                "message": "Graph配置缺少必需字段：name"
            }
        
        # 使用 graph_service 验证和保存配置
        from app.services.graph.graph_service import graph_service
        
        # 验证 Graph 配置
        logger.info(f"正在验证Graph配置: {graph_name}")
        is_valid, error_message = await graph_service.validate_graph(graph_config, user_id)
        
        if not is_valid:
            logger.error(f"Graph配置验证失败: {error_message}")
            return {
                "success": False,
                "message": f"Graph配置验证失败: {error_message}"
            }
        
        # 保存 Graph 配置
        logger.info(f"正在保存Graph配置: {graph_name}")
        save_success = await graph_service.save_graph(graph_name, graph_config, user_id)
        
        if not save_success:
            logger.error(f"保存Graph配置失败: {graph_name}")
            return {
                "success": False,
                "message": f"保存Graph配置失败: {graph_name}"
            }
        
        logger.info(f"成功注册Graph: {graph_name}")
        return {
            "success": True,
            "graph_name": graph_name,
            "message": f"Graph '{graph_name}' 注册成功"
        }
        
    except Exception as e:
        logger.error(f"register_graph_from_document 执行失败: {str(e)}")
        return {
            "success": False,
            "message": f"注册Graph失败: {str(e)}"
        }
