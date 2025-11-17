"""
系统工具：list_all_models
列出所有的模型名称
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
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
        return {
            "success": False,
            "error": f"获取模型列表失败: {str(e)}",
            "models": [],
            "total_count": 0
        }
