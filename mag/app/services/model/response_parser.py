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

    @staticmethod
    def parse_tool_calls(tool_calls_data: List[Dict[str, Any]]) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """解析工具调用

        Args:
            tool_calls_data: 原始tool_calls数据

        Returns:
            (simplified_tool_calls, raw_tool_calls): 简化的工具调用和原始工具调用
        """
        simplified_calls = []
        raw_calls = []

        for tool_call in tool_calls_data:
            # 保存原始工具调用
            raw_calls.append({
                "id": tool_call.get("id", ""),
                "type": tool_call.get("type", "function"),
                "function": {
                    "name": tool_call["function"]["name"],
                    "arguments": tool_call["function"]["arguments"]
                }
            })

            # 解析简化的工具调用
            tool_name = tool_call["function"]["name"]

            try:
                tool_args = json.loads(tool_call["function"]["arguments"] or "{}")
            except json.JSONDecodeError:
                logger.error(f"工具参数JSON无效: {tool_call['function']['arguments']}")
                tool_args = {}

            # 处理handoffs工具
            if tool_name.startswith("transfer_to_"):
                selected_node = tool_name[len("transfer_to_"):]
                simplified_calls.append({
                    "tool_name": tool_name,
                    "content": f"选择了节点: {selected_node}",
                    "selected_node": selected_node
                })
            else:
                # 普通工具调用
                simplified_calls.append({
                    "tool_name": tool_name,
                    "params": tool_args
                })

        return simplified_calls, raw_calls
