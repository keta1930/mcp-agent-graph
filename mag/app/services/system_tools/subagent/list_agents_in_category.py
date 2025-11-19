"""
系统工具：list_agents_in_category
列出指定分类下的所有 Agents
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "list_agents_in_category",
        "description": "列出指定分类下的所有 Agent，包括 name 和 tags。这是查找 Agent 的第二步，在分类中找到合适的 Agent。",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "description": "要查询的 Agent 分类名称"
                }
            },
            "required": ["category"]
        }
    }
}


async def handler(user_id: str, category: str, **kwargs) -> Dict[str, Any]:
    """
    列出指定分类下的所有 Agents

    Args:
        user_id: 用户 ID
        category: 分类名称
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "category": "coding",
            "agents": [
                {
                    "name": "code_reviewer",
                    "tags": ["代码审查", "质量检查", "Python"]
                },
                ...
            ],
            "total_count": 3
        }
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client

        # 获取分类下的 Agents
        agents = await mongodb_client.agent_repository.list_agents_in_category(
            user_id=user_id,
            category=category
        )

        return {
            "success": True,
            "category": category,
            "agents": agents,
            "total_count": len(agents)
        }

    except Exception as e:
        logger.error(f"list_agents_in_category 执行失败 (category={category}): {str(e)}")
        return {
            "success": False,
            "error": f"获取分类下的 Agents 失败: {str(e)}",
            "category": category,
            "agents": [],
            "total_count": 0
        }
