"""
系统工具：update_memory
更新记忆条目
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "update_memory",
        "description": "Update memory items. Supports updating multiple items across different owners and categories. Requires item_id and new content for each update. Updates the updated_at timestamp to current date.",
        "parameters": {
            "type": "object",
            "properties": {
                "updates": {
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
                            "item_id": {
                                "type": "string",
                                "description": "Item ID to update (format: YYYYMMDD_xxxx)"
                            },
                            "content": {
                                "type": "string",
                                "description": "New memory content"
                            }
                        },
                        "required": ["owner", "category", "item_id", "content"]
                    },
                    "description": "List of updates to perform"
                }
            },
            "required": ["updates"]
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    更新记忆条目

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（updates）

    Returns:
        {
            "success": True,
            "message": "Successfully updated 2 items"
        }
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client

        updates = kwargs.get("updates", [])

        if not updates:
            return {
                "success": False,
                "error": "updates parameter is required"
            }

        result = await mongodb_client.update_memory(user_id, updates)
        return result

    except Exception as e:
        logger.error(f"update_memory 执行失败: {str(e)}")
        return {
            "success": False,
            "error": f"更新记忆失败: {str(e)}"
        }
