"""
系统工具：add_memory
添加记忆条目
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format - 多语言格式）
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "add_memory",
            "description": "向指定分类添加记忆条目。支持一次调用添加到多个所有者和分类。如果分类不存在会自动创建。每个条目应简洁（建议最多300字）。",
            "parameters": {
                "type": "object",
                "properties": {
                    "additions": {
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
                                    "description": "分类名称，例如：'code_preference'、'project_context'"
                                },
                                "items": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "要添加的记忆内容条目"
                                }
                            },
                            "required": ["owner", "category", "items"]
                        },
                        "description": "添加列表，每项指定所有者、分类和要添加的条目"
                    }
                },
                "required": ["additions"]
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "add_memory",
            "description": "Add memory items to specified categories. Supports adding to multiple owners and categories in one call. Auto-creates categories if they don't exist. Each item should be concise (recommended max 300 words).",
            "parameters": {
                "type": "object",
                "properties": {
                    "additions": {
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
                                    "description": "Category name, e.g., 'code_preference', 'project_context'"
                                },
                                "items": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Memory content items to add"
                                }
                            },
                            "required": ["owner", "category", "items"]
                        },
                        "description": "List of additions, each specifying owner, category, and items to add"
                    }
                },
                "required": ["additions"]
            }
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    添加记忆条目

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（additions, agent_id）

    Returns:
        {
            "success": True,
            "message": "Successfully added 2 items"
        }
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.services.system_tools.registry import get_current_language
        
        language = get_current_language()
        
        additions = kwargs.get("additions", [])
        agent_id = kwargs.get("agent_id")

        if not additions:
            if language == "en":
                error_msg = "additions parameter is required"
            else:
                error_msg = "additions 参数是必需的"
            return {
                "success": False,
                "error": error_msg
            }

        result = await mongodb_client.add_memory(user_id, additions, agent_id)
        return result

    except Exception as e:
        logger.error(f"add_memory 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_msg = f"Failed to add memory: {str(e)}"
        else:
            error_msg = f"添加记忆失败: {str(e)}"
        
        return {
            "success": False,
            "error": error_msg
        }
