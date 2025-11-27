"""
系统工具：get_memory
获取指定分类的记忆内容
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format)
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "get_memory",
            "description": "从指定分类获取记忆条目。支持跨不同所有者（用户和/或Agent）查询多个分类。结果按更新时间降序排列（最新的在前）。",
            "parameters": {
                "type": "object",
                "properties": {
                    "queries": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "owner": {
                                    "type": "string",
                                    "enum": ["user", "self"],
                                    "description": "记忆所有者：'user'（用户）或 'self'（Agent自己）"
                                },
                                "categories": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "要检索的分类名称"
                                }
                            },
                            "required": ["owner", "categories"]
                        },
                        "description": "查询列表，每项指定所有者和分类。示例：[{'owner': 'user', 'categories': ['code_preference']}, {'owner': 'self', 'categories': ['learned_patterns']}]"
                    }
                },
                "required": ["queries"]
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "get_memory",
            "description": "Get memory items from specified categories. Supports querying multiple categories across different owners (user and/or agent). Results are sorted by updated_at in descending order (most recent first).",
            "parameters": {
                "type": "object",
                "properties": {
                    "queries": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "owner": {
                                    "type": "string",
                                    "enum": ["user", "self"],
                                    "description": "Memory owner: 'user' or 'self' (agent)"
                                },
                                "categories": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Category names to retrieve"
                                }
                            },
                            "required": ["owner", "categories"]
                        },
                        "description": "List of queries, each specifying owner and categories. Example: [{'owner': 'user', 'categories': ['code_preference']}, {'owner': 'self', 'categories': ['learned_patterns']}]"
                    }
                },
                "required": ["queries"]
            }
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    获取记忆内容

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（queries, agent_id）

    Returns:
        {
            "success": True,
            "data": {
                "user": {
                    "code_preference": {
                        "items": [...],
                        "total": 2
                    }
                }
            }
        }
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.services.system_tools.registry import get_current_language
        
        language = get_current_language()
        
        queries = kwargs.get("queries", [])
        agent_id = kwargs.get("agent_id")

        if not queries:
            if language == "en":
                error_msg = "queries parameter is required"
            else:
                error_msg = "queries 参数是必需的"
            return {
                "success": False,
                "error": error_msg
            }

        result = await mongodb_client.get_memory(user_id, queries, agent_id)
        return result

    except Exception as e:
        logger.error(f"get_memory 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_msg = f"Failed to get memory: {str(e)}"
        else:
            error_msg = f"获取记忆失败: {str(e)}"
        
        return {
            "success": False,
            "error": error_msg
        }
