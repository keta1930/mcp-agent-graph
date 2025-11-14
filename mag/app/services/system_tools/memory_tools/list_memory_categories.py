"""
系统工具：list_memory_categories
列出所有记忆分类
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "list_memory_categories",
        "description": "List all memory categories with item counts. Can query user's categories, agent's own categories, or both simultaneously. Returns category names and the number of memory items in each category.",
        "parameters": {
            "type": "object",
            "properties": {
                "owners": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["user", "self"]
                    },
                    "description": "Memory owners to query. 'user' for user's memory, 'self' for agent's own memory. Can specify both: ['user', 'self']"
                }
            },
            "required": ["owners"]
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    列出所有记忆分类

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（owners）

    Returns:
        {
            "success": True,
            "data": {
                "user": {
                    "categories": [
                        {"name": "code_preference", "count": 5},
                        {"name": "work_habits", "count": 3}
                    ],
                    "total": 2
                }
            }
        }
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client

        owners = kwargs.get("owners", [])

        if not owners:
            return {
                "success": False,
                "error": "owners parameter is required"
            }

        result = await mongodb_client.list_memory_categories(user_id, owners)
        return result

    except Exception as e:
        logger.error(f"list_memory_categories 执行失败: {str(e)}")
        return {
            "success": False,
            "error": f"列出记忆分类失败: {str(e)}"
        }
