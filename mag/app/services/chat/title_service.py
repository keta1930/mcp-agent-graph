import asyncio
import logging
from typing import Dict, List, Tuple

from app.infrastructure.database.mongodb.client import mongodb_client
from app.utils.text_tool import detect_language
from app.utils.text_parser import parse_title_and_tags_response
from app.services.model.model_service import model_service
from app.services.chat.prompts import get_title_prompt

logger = logging.getLogger(__name__)


async def generate_title_and_tags(user_id: str, user_prompt: str) -> Tuple[str, List[str]]:
    """
    根据用户输入异步生成会话标题与标签。

    返回 (title, tags)。若生成失败，返回默认标题和空标签。
    """
    try:
        # 轻微延迟，避免与主流程争抢资源
        await asyncio.sleep(1)

        # 获取标题生成模型配置
        title_model_name = await mongodb_client.user_repository.get_title_generation_model(user_id)
        if not title_model_name:
            logger.warning(f"用户 {user_id} 未配置标题生成模型，跳过标题生成")
            return "新对话", []

        model_config = await model_service.get_model(title_model_name, user_id=user_id)
        if not model_config:
            logger.warning(f"标题生成模型 {title_model_name} 不存在，跳过标题生成")
            return "新对话", []

        # 检测语言并获取标题生成提示词
        language = detect_language(user_prompt)
        title_prompt_template = get_title_prompt(language)

        title_prompt = title_prompt_template.format(
            user_message=user_prompt,
            assistant_message=""
        )

        # 调用模型生成标题
        result = await model_service.call_model(
            model_name=model_config["name"],
            messages=[{"role": "user", "content": title_prompt}],
            user_id=user_id
        )

        title = "新对话"
        tags: List[str] = []

        if result.get("status") == "success":
            response_content = result.get("content", "")
            parsed_result = parse_title_and_tags_response(response_content)

            if parsed_result.get("success"):
                title = parsed_result.get("title", "").strip() or title
                parsed_tags = parsed_result.get("tags", [])
                if parsed_tags:
                    tags = [tag.strip() for tag in parsed_tags]
            else:
                logger.warning(f"解析标题和标签失败: {parsed_result.get('error', '未知错误')}")
                if response_content:
                    fallback_title = response_content.strip()[:10]
                    if fallback_title:
                        title = fallback_title

        return title, tags

    except Exception as e:
        logger.error(f"生成标题与标签出错: {str(e)}")
        return "新对话", []