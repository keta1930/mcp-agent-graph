"""
系统工具：update_memory
更新记忆条目
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format)
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "update_memory",
            "description": "更新记忆条目。支持跨不同所有者和分类更新多个条目。每次更新需要提供条目ID和新内容。会将更新时间戳更新为当前日期。",
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
                                    "description": "记忆所有者：'user'（用户）或 'self'（Agent自己）"
                                },
                                "category": {
                                    "type": "string",
                                    "description": "分类名称"
                                },
                                "item_id": {
                                    "type": "string",
                                    "description": "要更新的条目ID（格式：YYYYMMDD_xxxx）"
                                },
                                "content": {
                                    "type": "string",
                                    "description": "新的记忆内容"
                                }
                            },
                            "required": ["owner", "category", "item_id", "content"]
                        },
                        "description": "要执行的更新操作列表"
                    }
                },
                "required": ["updates"]
            }
        }
    },
    "en": {
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
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    更新记忆条目

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（updates, agent_id）

    Returns:
        {
            "success": True,
            "message": "Successfully updated 2 items"
        }
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.services.system_tools.registry import get_current_language
        
        language = get_current_language()
        
        updates = kwargs.get("updates", [])
        agent_id = kwargs.get("agent_id")

        if not updates:
            if language == "en":
                error_msg = "updates parameter is required"
            else:
                error_msg = "updates 参数是必需的"
            return {
                "success": False,
                "error": error_msg
            }

        result = await mongodb_client.update_memory(user_id, updates, agent_id)
        return result

    except Exception as e:
        logger.error(f"update_memory 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_msg = f"Failed to update memory: {str(e)}"
        else:
            error_msg = f"更新记忆失败: {str(e)}"
        
        return {
            "success": False,
            "error": error_msg
        }
