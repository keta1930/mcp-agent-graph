"""
系统工具：get_graph_details
查看指定图的完整配置详情
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
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

        # 获取图配置
        graph_config = await graph_service.get_graph(graph_name, user_id=user_id)
        
        if not graph_config:
            return {
                "success": False,
                "error": f"图 '{graph_name}' 不存在或无权访问",
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
        return {
            "success": False,
            "error": f"获取图详情失败: {str(e)}",
            "graph_name": graph_name,
            "config": None
        }
