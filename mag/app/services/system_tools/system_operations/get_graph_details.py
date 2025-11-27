"""
系统工具：get_graph_details
查看指定图的完整配置详情
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "get_graph_details",
            "description": "查看指定图（Graph）的完整配置详情。返回该图的完整config字段，包括所有节点、边、配置参数等信息。",
            "parameters": {
                "type": "object",
                "properties": {
                    "graph_name": {
                        "type": "string",
                        "description": "要查询的图名称"
                    }
                },
                "required": ["graph_name"]
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "get_graph_details",
            "description": "View the complete configuration details of a specified graph. Returns the complete config field of the graph, including all nodes, edges, configuration parameters, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "graph_name": {
                        "type": "string",
                        "description": "The name of the graph to query"
                    }
                },
                "required": ["graph_name"]
            }
        }
    }
}


async def handler(user_id: str, graph_name: str, **kwargs) -> Dict[str, Any]:
    """
    获取图的完整配置详情

    Args:
        user_id: 用户ID
        graph_name: 图名称
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "graph_name": "deepresearch",
            "config": {
                "description": "深度研究系统",
                "nodes": [...],
                "edges": [...],
                ...
            }
        }
    """
    try:
        from app.services.graph.graph_service import graph_service
        from app.services.system_tools.registry import get_current_language

        # 获取当前语言
        language = get_current_language()

        # 获取图配置
        graph_config = await graph_service.get_graph(graph_name, user_id=user_id)
        
        if not graph_config:
            if language == "en":
                error_msg = f"Graph '{graph_name}' does not exist or access denied"
            else:
                error_msg = f"图 '{graph_name}' 不存在或无权访问"
            
            return {
                "success": False,
                "error": error_msg,
                "graph_name": graph_name,
                "config": None
            }

        return {
            "success": True,
            "graph_name": graph_name,
            "config": graph_config.get("config", {})
        }

    except Exception as e:
        logger.error(f"get_graph_details 执行失败 (graph_name={graph_name}): {str(e)}")
        
        # 根据语言返回错误消息
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_msg = f"Failed to get graph details: {str(e)}"
        else:
            error_msg = f"获取图详情失败: {str(e)}"
        
        return {
            "success": False,
            "error": error_msg,
            "graph_name": graph_name,
            "config": None
        }
