"""
系统工具：list_all_prompts
列出所有的提示词及其类别
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "list_all_prompts",
        "description": "列出系统中所有已注册的提示词。返回所有提示词的名称和类别信息。",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    列出所有提示词及其类别

    Args:
        user_id: 用户ID
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "prompts": [
                {
                    "name": "code_review",
                    "category": "coding"
                },
                {
                    "name": "data_analysis",
                    "category": "analysis"
                }
            ],
            "total_count": 2
        }
    """
    try:
        from app.services.prompt.prompt_service import prompt_service

        # 获取所有提示词列表
        result = await prompt_service.list_prompts(user_id=user_id)
        
        if not result.get("success"):
            return {
                "success": False,
                "error": result.get("message", "获取提示词列表失败"),
                "prompts": [],
                "total_count": 0
            }

        # 提取提示词数据
        data = result.get("data", {})
        prompts_data = data.get("prompts", [])
        
        # 构建简化的提示词列表
        prompts = []
        for prompt in prompts_data:
            prompts.append({
                "name": prompt.get("name", ""),
                "category": prompt.get("category", "")
            })

        return {
            "success": True,
            "prompts": prompts,
            "total_count": len(prompts)
        }

    except Exception as e:
        logger.error(f"list_all_prompts 执行失败: {str(e)}")
        return {
            "success": False,
            "error": f"获取提示词列表失败: {str(e)}",
            "prompts": [],
            "total_count": 0
        }
