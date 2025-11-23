"""响应解析器 - 负责解析和清理模型响应"""
import json
import logging
import re
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class ResponseParser:
    """响应解析器"""

    @staticmethod
    def clean_content(content: str) -> str:
        """清理模型输出内容

        Args:
            content: 原始内容

        Returns:
            清理后的内容
        """
        if not content:
            return ""

        # 清理</think>之前的文本
        think_pattern = r".*?</think>"
        cleaned_content = re.sub(think_pattern, "", content, flags=re.DOTALL)

        return cleaned_content.strip()

    @staticmethod
    def filter_reasoning_content(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """过滤消息中的reasoning_content字段

        Args:
            messages: 消息列表

        Returns:
            过滤后的消息列表
        """
        return [{k: v for k, v in msg.items() if k != "reasoning_content"} for msg in messages]
