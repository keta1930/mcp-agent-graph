"""
系统工具：list_memory_categories
列出所有记忆分类
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format - 多语言格式）
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "list_memory_categories",
            "description": "列出所有记忆分类及其条目数量。可以查询用户的分类、Agent自己的分类，或同时查询两者。返回分类名称和每个分类中的记忆条目数量。",
            "parameters": {
                "type": "object",
                "properties": {
                    "owners": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["user", "self"]
                        },
                        "description": "要查询的记忆所有者。'user' 表示用户的记忆，'self' 表示Agent自己的记忆。可以同时指定两者：['user', 'self']"
                    }
                },
                "required": ["owners"]
            }
        }
    },
    "en": {
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
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    列出所有记忆分类

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（owners, agent_id）

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
        from app.services.system_tools.registry import get_current_language
        
        language = get_current_language()
        
        owners = kwargs.get("owners", [])
        agent_id = kwargs.get("agent_id")

        if not owners:
            if language == "en":
                error_msg = "owners parameter is required"
            else:
                error_msg = "owners 参数是必需的"
            return {
                "success": False,
                "error": error_msg
            }

        result = await mongodb_client.list_memory_categories(user_id, owners, agent_id)
        return result

    except Exception as e:
        logger.error(f"list_memory_categories 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_msg = f"Failed to list memory categories: {str(e)}"
        else:
            error_msg = f"列出记忆分类失败: {str(e)}"
        
        return {
            "success": False,
            "error": error_msg
        }
