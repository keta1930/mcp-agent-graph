import json
import logging
from typing import Dict, Any,List
from datetime import datetime
import time
logger = logging.getLogger(__name__)


class SSEHelper:
    """SSE工具类 - 混合方案：OpenAI标准 + 最小化自定义事件 + 数据收集功能"""

    @staticmethod
    def format_sse_data(data: Dict[str, Any]) -> str:
        """格式化SSE数据"""
        try:
            return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"格式化SSE数据时出错: {str(e)}")
            return f"data: {json.dumps({'error': {'message': str(e), 'type': 'format_error'}}, ensure_ascii=False)}\n\n"

    @staticmethod
    def format_done() -> str:
        """格式化结束标记"""
        return "data: [DONE]\n\n"

    @staticmethod
    def send_node_start(node_name: str, level: int) -> str:
        """发送节点开始事件 - 自定义事件"""
        return SSEHelper.format_sse_data({
            "type": "node_start",
            "node_name": node_name,
            "level": level
        })

    @staticmethod
    def send_node_end(node_name: str) -> str:
        """发送节点结束事件 - 自定义事件"""
        return SSEHelper.format_sse_data({
            "type": "node_end",
            "node_name": node_name
        })

    @staticmethod
    def send_graph_complete(final_result: str, execution_chain: list) -> str:
        """发送图完成事件 - 自定义事件"""
        return SSEHelper.format_sse_data({
            "type": "graph_complete",
            "final_result": final_result,
            "execution_chain": execution_chain
        })

    @staticmethod
    def send_error(message: str) -> str:
        """发送错误事件"""
        return SSEHelper.format_sse_data({
            "error": {
                "message": message,
                "type": "execution_error"
            }
        })

    @staticmethod
    def send_openai_chunk(chunk_data: Dict[str, Any]) -> str:
        """发送OpenAI标准格式的chunk - 保持原生格式"""
        return SSEHelper.format_sse_data(chunk_data)

    @staticmethod
    def send_tool_message(tool_call_id: str, content: str) -> str:
        """发送工具结果消息 - OpenAI标准格式"""
        return SSEHelper.format_sse_data({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": content
        })

    @staticmethod
    def send_json(data: Dict[str, Any]) -> str:
        """发送任意JSON数据 - 通用方法"""
        return SSEHelper.format_sse_data(data)


class SSECollector:
    """SSE数据收集器 - 将流式数据转换为完整响应"""

    def __init__(self):
        self.messages = []
        self.token_usage = None
        self.errors = []
        self.tool_results = []

    async def collect_stream_data(self, stream_generator) -> Dict[str, Any]:
        """收集流式数据并转换为完整响应"""
        accumulated_content = ""
        accumulated_reasoning = ""
        current_tool_calls = []

        try:
            async for chunk_raw in stream_generator:
                # 解析SSE数据
                if chunk_raw.startswith("data: "):
                    data_part = chunk_raw[6:].strip()

                    if data_part == "[DONE]":
                        break

                    try:
                        chunk_data = json.loads(data_part)

                        # 处理错误
                        if "error" in chunk_data:
                            self.errors.append(chunk_data["error"])
                            continue

                        # 处理工具结果消息
                        if chunk_data.get("role") == "tool":
                            self.tool_results.append({
                                "tool_call_id": chunk_data.get("tool_call_id"),
                                "content": chunk_data.get("content")
                            })
                            continue

                        # 处理OpenAI格式的chunk
                        if "choices" in chunk_data and chunk_data["choices"]:
                            choice = chunk_data["choices"][0]
                            delta = choice.get("delta", {})

                            # 累积内容
                            if delta.get("content"):
                                accumulated_content += delta["content"]

                            # 累积思考内容（如果有）
                            if delta.get("reasoning_content"):
                                accumulated_reasoning += delta["reasoning_content"]

                            # 处理工具调用
                            if delta.get("tool_calls"):
                                for tool_call_delta in delta["tool_calls"]:
                                    index = tool_call_delta.get("index", 0)

                                    # 确保有足够的工具调用槽位
                                    while len(current_tool_calls) <= index:
                                        current_tool_calls.append({
                                            "id": "",
                                            "type": "function",
                                            "function": {"name": "", "arguments": ""}
                                        })

                                    # 累积工具调用数据
                                    if tool_call_delta.get("id"):
                                        current_tool_calls[index]["id"] = tool_call_delta["id"]

                                    if tool_call_delta.get("function"):
                                        func = tool_call_delta["function"]
                                        if func.get("name"):
                                            current_tool_calls[index]["function"]["name"] += func["name"]
                                        if func.get("arguments"):
                                            current_tool_calls[index]["function"]["arguments"] += func["arguments"]

                        # 收集token使用量
                        if "usage" in chunk_data:
                            self.token_usage = chunk_data["usage"]

                    except json.JSONDecodeError:
                        continue

        except Exception as e:
            logger.error(f"收集流式数据时出错: {str(e)}")
            self.errors.append({"message": str(e), "type": "collection_error"})

        # 构建完整响应
        return self._build_complete_response(
            accumulated_content,
            accumulated_reasoning,
            current_tool_calls
        )

    def _build_complete_response(self,
                                 content: str,
                                 reasoning_content: str,
                                 tool_calls: List[Dict]) -> Dict[str, Any]:
        """构建完整的非流式响应"""

        response = {
            "id": f"chatcmpl-{int(datetime.now().timestamp())}",
            "object": "chat.completion",
            "created": int(datetime.now().timestamp()),
            "model": "unknown",  # 可以从模型配置中获取
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": content
                    },
                    "finish_reason": "tool_calls" if tool_calls else "stop"
                }
            ]
        }

        # 添加思考内容（如果有）
        if reasoning_content:
            response["choices"][0]["message"]["reasoning_content"] = reasoning_content

        # 添加工具调用（如果有）
        if tool_calls:
            # 清理工具调用数据
            cleaned_tool_calls = []
            for tool_call in tool_calls:
                if tool_call["id"] and tool_call["function"]["name"]:
                    cleaned_tool_calls.append(tool_call)

            if cleaned_tool_calls:
                response["choices"][0]["message"]["tool_calls"] = cleaned_tool_calls

        # 添加工具结果（如果有）
        if self.tool_results:
            response["tool_results"] = self.tool_results

        # 添加token使用量
        if self.token_usage:
            response["usage"] = self.token_usage

        # 添加错误信息（如果有）
        if self.errors:
            response["errors"] = self.errors

        return response
    
class TrajectoryCollector:
    """轨迹收集器 - 收集完整的消息轨迹用于非流式响应"""

    def __init__(self, user_prompt: str = "", system_prompt: str = ""):
        self.messages = []
        self.token_usage = None
        self.errors = []
        self.output = ""
        self.user_prompt = user_prompt
        self.system_prompt = system_prompt
        self._initial_messages_added = False

    def _add_initial_messages(self):
        """添加初始消息（系统消息和用户消息）"""
        if self._initial_messages_added:
            return

        # 添加系统消息（如果存在）
        if self.system_prompt and self.system_prompt.strip():
            self.messages.append({
                "role": "system",
                "content": self.system_prompt.strip()
            })

        # 添加用户消息
        if self.user_prompt and self.user_prompt.strip():
            self.messages.append({
                "role": "user",
                "content": self.user_prompt.strip()
            })

        self._initial_messages_added = True

    async def collect_stream_data(self, stream_generator) -> Dict[str, Any]:
        """收集流式数据并转换为轨迹响应"""
        accumulated_content = ""
        accumulated_reasoning = ""
        current_tool_calls = []

        # 添加初始消息（系统消息和用户消息）
        self._add_initial_messages()

        try:
            async for chunk_raw in stream_generator:
                # 解析SSE数据
                if chunk_raw.startswith("data: "):
                    data_part = chunk_raw[6:].strip()

                    if data_part == "[DONE]":
                        break

                    try:
                        chunk_data = json.loads(data_part)

                        # 处理错误
                        if "error" in chunk_data:
                            self.errors.append(chunk_data["error"])
                            continue

                        # 处理工具结果消息
                        if chunk_data.get("role") == "tool":
                            tool_message = {
                                "role": "tool",
                                "tool_call_id": chunk_data.get("tool_call_id"),
                                "content": chunk_data.get("content")
                            }
                            self.messages.append(tool_message)
                            continue

                        # 处理OpenAI格式的chunk
                        if "choices" in chunk_data and chunk_data["choices"]:
                            choice = chunk_data["choices"][0]
                            delta = choice.get("delta", {})

                            # 累积内容
                            if delta.get("content"):
                                accumulated_content += delta["content"]

                            # 累积思考内容（如果有）
                            if delta.get("reasoning_content"):
                                accumulated_reasoning += delta["reasoning_content"]

                            # 处理工具调用
                            if delta.get("tool_calls"):
                                for tool_call_delta in delta["tool_calls"]:
                                    index = tool_call_delta.get("index", 0)

                                    # 确保有足够的工具调用槽位
                                    while len(current_tool_calls) <= index:
                                        current_tool_calls.append({
                                            "id": "",
                                            "type": "function",
                                            "function": {"name": "", "arguments": ""}
                                        })

                                    # 累积工具调用数据
                                    if tool_call_delta.get("id"):
                                        current_tool_calls[index]["id"] = tool_call_delta["id"]

                                    if tool_call_delta.get("function"):
                                        func = tool_call_delta["function"]
                                        if func.get("name"):
                                            current_tool_calls[index]["function"]["name"] += func["name"]
                                        if func.get("arguments"):
                                            current_tool_calls[index]["function"]["arguments"] += func["arguments"]

                            # 检查是否完成一轮assistant响应
                            if choice.get("finish_reason"):
                                # 构建assistant消息
                                if accumulated_content or current_tool_calls:
                                    assistant_message = {"role": "assistant"}

                                    if accumulated_reasoning:
                                        assistant_message["reasoning_content"] = accumulated_reasoning

                                    assistant_message["content"] = accumulated_content

                                    if current_tool_calls:
                                        # 清理工具调用数据
                                        cleaned_tool_calls = []
                                        for tool_call in current_tool_calls:
                                            if tool_call["id"] and tool_call["function"]["name"]:
                                                cleaned_tool_calls.append(tool_call)

                                        if cleaned_tool_calls:
                                            assistant_message["tool_calls"] = cleaned_tool_calls

                                    self.messages.append(assistant_message)

                                    # 如果没有工具调用，这是最终输出
                                    if not current_tool_calls:
                                        self.output = accumulated_content

                                # 重置累积变量
                                accumulated_content = ""
                                accumulated_reasoning = ""
                                current_tool_calls = []

                        # 收集token使用量
                        if "usage" in chunk_data:
                            self.token_usage = chunk_data["usage"]

                    except json.JSONDecodeError:
                        continue

        except Exception as e:
            logger.error(f"收集轨迹数据时出错: {str(e)}")
            self.errors.append({"message": str(e), "type": "collection_error"})

        # 构建完整响应
        return self._build_trajectory_response()

    def _build_trajectory_response(self) -> Dict[str, Any]:
        """构建轨迹响应"""
        response = {
            "id": f"chatcmpl-{int(datetime.now().timestamp())}",
            "object": "chat.completion",
            "created": int(datetime.now().timestamp()),
            "model": "unknown",
            "messages": self.messages.copy(),
            "output": self.output
        }

        # 添加token使用量
        if self.token_usage:
            response["usage"] = self.token_usage

        # 添加错误信息（如果有）
        if self.errors:
            response["errors"] = self.errors

        return response