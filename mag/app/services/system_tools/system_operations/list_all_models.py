"""
系统工具：list_all_models
列出所有的模型名称
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format - 多语言）
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "list_all_models",
            "description": "列出系统中所有已配置的模型名称。返回所有可用模型的名称列表。",
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
            "name": "list_all_models",
            "description": "List all configured model names in the system. Returns a list of all available model names.",
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
    列出所有模型名称

    Args:
        user_id: 用户ID
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "models": ["gpt-4", "claude-3", "gemini-pro"],
            "total_count": 3
        }
    """
    try:
        from app.services.model.model_service import model_service
        from app.services.system_tools.registry import get_current_language

        # 获取当前语言
        language = get_current_language()

        # 获取所有模型配置
        models = await model_service.get_all_models(user_id=user_id)
        
        # 提取模型名称
        model_names = [model["name"] for model in models]

        return {
            "success": True,
            "models": model_names,
            "total_count": len(model_names)
        }

    except Exception as e:
        logger.error(f"list_all_models 执行失败: {str(e)}")
        
        # 根据语言返回错误消息
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_msg = f"Failed to get model list: {str(e)}"
        else:
            error_msg = f"获取模型列表失败: {str(e)}"
        
        return {
            "success": False,
            "error": error_msg,
            "models": [],
            "total_count": 0
        }
