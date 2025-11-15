"""
系统工具：add_memory
添加记忆条目
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
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

        additions = kwargs.get("additions", [])
        agent_id = kwargs.get("agent_id")

        if not additions:
            return {
                "success": False,
                "error": "additions parameter is required"
            }

        result = await mongodb_client.add_memory(user_id, additions, agent_id)
        return result

    except Exception as e:
        logger.error(f"add_memory 执行失败: {str(e)}")
        return {
            "success": False,
            "error": f"添加记忆失败: {str(e)}"
        }
