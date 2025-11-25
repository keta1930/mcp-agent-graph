"""
系统工具：delete_memory
删除记忆条目
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format - 多语言格式）
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "delete_memory",
            "description": "删除记忆条目。支持跨不同所有者和分类删除多个条目。每次删除需要提供条目ID列表。",
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
                                    "description": "记忆所有者：'user'（用户）或 'self'（Agent自己）"
                                },
                                "category": {
                                    "type": "string",
                                    "description": "分类名称"
                                },
                                "item_ids": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "要删除的条目ID列表（格式：YYYYMMDD_xxxx）"
                                }
                            },
                            "required": ["owner", "category", "item_ids"]
                        },
                        "description": "要执行的删除操作列表"
                    }
                },
                "required": ["deletions"]
            }
        }
    },
    "en": {
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
        from app.services.system_tools.registry import get_current_language
        
        language = get_current_language()
        
        deletions = kwargs.get("deletions", [])
        agent_id = kwargs.get("agent_id")

        if not deletions:
            if language == "en":
                error_msg = "deletions parameter is required"
            else:
                error_msg = "deletions 参数是必需的"
            return {
                "success": False,
                "error": error_msg
            }

        result = await mongodb_client.delete_memory(user_id, deletions, agent_id)
        return result

    except Exception as e:
        logger.error(f"delete_memory 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_msg = f"Failed to delete memory: {str(e)}"
        else:
            error_msg = f"删除记忆失败: {str(e)}"
        
        return {
            "success": False,
            "error": error_msg
        }
