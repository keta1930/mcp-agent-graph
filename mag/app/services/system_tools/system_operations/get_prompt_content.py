"""
系统工具：get_prompt_content
查看指定提示词的完整内容
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format - 多语言）
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "get_prompt_content",
            "description": "查看指定提示词的完整内容。返回该提示词的完整文本内容。",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt_name": {
                        "type": "string",
                        "description": "要查询的提示词名称"
                    }
                },
                "required": ["prompt_name"]
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "get_prompt_content",
            "description": "View the complete content of a specified prompt. Returns the full text content of the prompt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt_name": {
                        "type": "string",
                        "description": "The name of the prompt to query"
                    }
                },
                "required": ["prompt_name"]
            }
        }
    }
}


async def handler(user_id: str, prompt_name: str, **kwargs) -> Dict[str, Any]:
    """
    获取提示词的完整内容

    Args:
        user_id: 用户ID
        prompt_name: 提示词名称
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "prompt_name": "code_review",
            "content": "你是一个专业的代码审查专家..."
        }
    """
    try:
        from app.services.prompt.prompt_service import prompt_service
        from app.services.system_tools.registry import get_current_language

        # 获取当前语言
        language = get_current_language()

        # 获取提示词内容
        result = await prompt_service.get_prompt_content_only(prompt_name, user_id=user_id)
        
        if not result.get("success"):
            if language == "en":
                error_msg = result.get("message", f"Prompt '{prompt_name}' does not exist")
            else:
                error_msg = result.get("message", f"提示词 '{prompt_name}' 不存在")
            
            return {
                "success": False,
                "error": error_msg,
                "prompt_name": prompt_name,
                "content": None
            }

        # 提取内容
        data = result.get("data", {})
        content = data.get("content", "")

        return {
            "success": True,
            "prompt_name": prompt_name,
            "content": content
        }

    except Exception as e:
        logger.error(f"get_prompt_content 执行失败 (prompt_name={prompt_name}): {str(e)}")
        
        # 根据语言返回错误消息
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_msg = f"Failed to get prompt content: {str(e)}"
        else:
            error_msg = f"获取提示词内容失败: {str(e)}"
        
        return {
            "success": False,
            "error": error_msg,
            "prompt_name": prompt_name,
            "content": None
        }
