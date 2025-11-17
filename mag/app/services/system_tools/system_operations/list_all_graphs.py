"""
系统工具：list_all_graphs
列出所有的图（Graph）及其描述
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "list_all_graphs",
        "description": "列出系统中所有已配置的图（Graph）。返回所有图的名称和描述信息。",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    列出所有图及其描述

    Args:
        user_id: 用户ID
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "graphs": [
                {
                    "name": "deepresearch",
                    "description": "深度研究系统，多轮智能检索"
                },
                {
                    "name": "code_review",
                    "description": "代码审查工作流"
                }
            ],
            "total_count": 2
        }
    """
    try:
        from app.services.graph.graph_service import graph_service

        # 获取所有图名称
        graph_names = await graph_service.list_graphs(user_id=user_id)
        
        # 获取每个图的配置以提取描述
        graphs = []
        for graph_name in graph_names:
            graph_config = await graph_service.get_graph(graph_name, user_id=user_id)
            if graph_config:
                graphs.append({
                    "name": graph_name,
                    "description": graph_config.get("config", {}).get("description", "")
                })

        return {
            "success": True,
            "graphs": graphs,
            "total_count": len(graphs)
        }

    except Exception as e:
        logger.error(f"list_all_graphs 执行失败: {str(e)}")
        return {
            "success": False,
            "error": f"获取图列表失败: {str(e)}",
            "graphs": [],
            "total_count": 0
        }
