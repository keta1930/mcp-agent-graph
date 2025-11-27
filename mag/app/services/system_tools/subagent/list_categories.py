"""
系统工具：list_agent_categories
列出所有可用的 Agent 分类
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format)
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "list_agent_categories",
            "description": "列出所有可用的 Agent 分类。这是查找 Agent 的第一步，先了解有哪些分类，再深入查看具体的 Agent。",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "list_agent_categories",
            "description": "List all available Agent categories. This is the first step in finding an Agent - understand what categories exist before exploring specific Agents.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    列出所有 Agent 分类

    Args:
        user_id: 用户 ID
        **kwargs: 其他参数（工具调用时传入）

    Returns:
        {
            "success": True,
            "categories": [
                {
                    "category": "coding",
                    "agent_count": 15
                },
                ...
            ],
            "total_categories": 3
        }
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.services.system_tools.registry import get_current_language

        # 获取当前语言
        language = get_current_language()

        # 获取分类列表
        categories = await mongodb_client.agent_repository.list_categories(user_id)

        return {
            "success": True,
            "categories": categories,
            "total_categories": len(categories)
        }

    except Exception as e:
        logger.error(f"list_agent_categories 执行失败: {str(e)}")
        
        # 根据语言返回错误消息
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        error_msg = "Failed to get Agent categories" if language == "en" else "获取 Agent 分类失败"
        
        return {
            "success": False,
            "error": f"{error_msg}: {str(e)}",
            "categories": [],
            "total_categories": 0
        }
