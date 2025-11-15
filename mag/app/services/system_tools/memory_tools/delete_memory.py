"""
系统工具：delete_memory
删除记忆条目
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "delete_memory",
        "description": "Delete memory items. Supports deleting multiple items across different owners and categories. Requires item_id list for each deletion.",
        "parameters": {
            "type": "object",
            "properties": {
                "deletions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "owner": {
                                "type": "string",
                                "enum": ["user", "self"],
                                "description": "Memory owner: 'user' or 'self' (agent)"
                            },
                            "category": {
                                "type": "string",
                                "description": "Category name"
                            },
                            "item_ids": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "List of item IDs to delete (format: YYYYMMDD_xxxx)"
                            }
                        },
                        "required": ["owner", "category", "item_ids"]
                    },
                    "description": "List of deletions to perform"
                }
            },
            "required": ["deletions"]
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    删除记忆条目

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（deletions, agent_id）

    Returns:
        {
            "success": True,
            "message": "Successfully deleted 2 items"
        }
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client

        deletions = kwargs.get("deletions", [])
        agent_id = kwargs.get("agent_id")

        if not deletions:
            return {
                "success": False,
                "error": "deletions parameter is required"
            }

        result = await mongodb_client.delete_memory(user_id, deletions, agent_id)
        return result

    except Exception as e:
        logger.error(f"delete_memory 执行失败: {str(e)}")
        return {
            "success": False,
            "error": f"删除记忆失败: {str(e)}"
        }
