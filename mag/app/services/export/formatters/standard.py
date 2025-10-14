import logging
from typing import List, Dict, Any, Set
from .base import BaseFormatter

logger = logging.getLogger(__name__)


class StandardFormatter(BaseFormatter):
    """标准格式化器"""

    def format(self, conversations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """格式化对话数据为标准格式"""
        formatted_data = []

        for conversation in conversations:
            conv_type = conversation.get("type", "chat")

            if conv_type == "graph":
                # Graph模式：按轮次切分，删除round=1
                formatted_data.extend(self._format_graph_conversation(conversation))
            elif conv_type in ["chat", "agent"]:
                # Chat/Agent模式：按文档切分
                formatted_data.extend(self._format_document_conversation(conversation))

        return formatted_data

    def _format_graph_conversation(self, conversation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """处理Graph类型对话 - 按轮次切分"""
        result = []
        rounds = conversation.get("rounds", [])

        for round_data in rounds:
            round_num = round_data.get("round", 1)
            if round_num == 1:
                continue  # 跳过round=1

            messages = self._convert_messages(round_data.get("messages", []))
            if not messages:
                continue

            formatted_item = {
                "data_source": conversation.get("type", "graph"),
                "ability": conversation.get("tags", []),
                "messages": messages,
                "tools": round_data.get("tools", []),
                "model": round_data.get("model", ""),
                "conversation_id": conversation.get("_id", "")
            }
            result.append(formatted_item)

        return result

    def _format_document_conversation(self, conversation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """处理Chat/Agent类型对话 - 按文档切分"""
        rounds = conversation.get("rounds", [])
        if not rounds:
            return []

        # 合并所有rounds的messages
        all_messages = []
        all_tools = []
        last_model = ""

        for round_data in rounds:
            round_messages = round_data.get("messages", [])
            round_tools = round_data.get("tools", [])
            round_model = round_data.get("model", "")

            all_messages.extend(round_messages)
            all_tools.extend(round_tools)
            if round_model:
                last_model = round_model

        if not all_messages:
            return []

        # 处理系统提示词：只保留最后一个system消息
        processed_messages = self._process_system_messages(all_messages)

        # 转换消息格式
        converted_messages = self._convert_messages(processed_messages)

        # 去重tools
        unique_tools = self._deduplicate_tools(all_tools)

        formatted_item = {
            "data_source": conversation.get("type", "chat"),
            "ability": conversation.get("tags", []),
            "messages": converted_messages,
            "tools": unique_tools,
            "model": last_model,
            "conversation_id": conversation.get("_id", "")
        }

        return [formatted_item]

    def _process_system_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """处理系统提示词：只保留最后一个system消息，并放在首位"""
        system_messages = [msg for msg in messages if msg.get("role") == "system"]
        non_system_messages = [msg for msg in messages if msg.get("role") != "system"]

        if not system_messages:
            return non_system_messages

        # 只保留最后一个system消息，放在首位
        last_system = system_messages[-1]
        return [last_system] + non_system_messages

    def _convert_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """转换消息格式：assistant -> function_call（如果有tool_calls）"""
        converted = []

        for msg in messages:
            role = msg.get("role")

            if role == "assistant":
                tool_calls = msg.get("tool_calls")

                if tool_calls and len(tool_calls) > 0:
                    # 有工具调用 -> function_call
                    new_msg = {
                        "role": "function_call",
                        "tool_calls": tool_calls
                    }

                    # 保留可选字段
                    if "reasoning_content" in msg:
                        new_msg["reasoning_content"] = msg["reasoning_content"]
                    if "content" in msg:
                        new_msg["content"] = msg["content"]

                    converted.append(new_msg)
                else:
                    # 无工具调用 -> assistant
                    new_msg = {
                        "role": "assistant",
                        "content": msg.get("content", "")
                    }

                    if "reasoning_content" in msg:
                        new_msg["reasoning_content"] = msg["reasoning_content"]

                    converted.append(new_msg)
            else:
                # 其他类型消息保持不变
                converted.append(msg.copy())

        return converted

    def _deduplicate_tools(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """去重tools：相同name的工具只保留一个"""
        seen_names: Set[str] = set()
        unique_tools = []

        for tool in tools:
            if tool.get("type") == "function":
                function_info = tool.get("function", {})
                name = function_info.get("name", "")

                if name and name not in seen_names:
                    seen_names.add(name)
                    unique_tools.append(tool)

        return unique_tools