"""流式响应处理器 - 负责处理SSE流式响应"""
import json
import logging
from typing import AsyncGenerator, Dict, Any

logger = logging.getLogger(__name__)


class StreamAccumulator:
    """流式响应累积器 - 用于处理和累积流式API响应"""

    def __init__(self):
        self.accumulated_content = ""
        self.accumulated_reasoning = ""
        self.tool_calls_dict = {}
        self.api_usage = None

    def process_chunk(self, chunk):
        """处理单个chunk并累积数据

        Args:
            chunk: API返回的chunk对象
        """
        if chunk.choices and chunk.choices[0].delta:
            delta = chunk.choices[0].delta

            # 累积content
            if delta.content:
                self.accumulated_content += delta.content

            # 累积reasoning_content
            if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                self.accumulated_reasoning += delta.reasoning_content

            # 累积reasoning
            if hasattr(delta, 'reasoning') and delta.reasoning:
                self.accumulated_reasoning += delta.reasoning

            # 累积tool_calls
            if delta.tool_calls:
                for tool_call_delta in delta.tool_calls:
                    index = tool_call_delta.index

                    if index not in self.tool_calls_dict:
                        self.tool_calls_dict[index] = {
                            "id": tool_call_delta.id or "",
                            "type": "function",
                            "function": {"name": "", "arguments": ""}
                        }

                    if tool_call_delta.id:
                        self.tool_calls_dict[index]["id"] = tool_call_delta.id

                    if tool_call_delta.function:
                        if tool_call_delta.function.name:
                            self.tool_calls_dict[index]["function"]["name"] += tool_call_delta.function.name
                        if tool_call_delta.function.arguments:
                            self.tool_calls_dict[index]["function"]["arguments"] += tool_call_delta.function.arguments

        # 收集usage信息
        if hasattr(chunk, "usage") and chunk.usage is not None:
            self.api_usage = {
                "total_tokens": chunk.usage.total_tokens,
                "prompt_tokens": chunk.usage.prompt_tokens,
                "completion_tokens": chunk.usage.completion_tokens
            }

    def get_tool_calls_list(self):
        """获取tool_calls列表"""
        return list(self.tool_calls_dict.values())

    def get_result(self):
        """获取累积的结果"""
        return {
            "accumulated_content": self.accumulated_content,
            "accumulated_reasoning": self.accumulated_reasoning,
            "tool_calls_dict": self.tool_calls_dict,
            "tool_calls_list": self.get_tool_calls_list(),
            "api_usage": self.api_usage
        }


class StreamHandler:
    """流式响应处理器"""

    @staticmethod
    async def stream_and_accumulate(stream,
                                    yield_chunks: bool = True) -> AsyncGenerator[str | Dict[str, Any], None]:
        """处理流式响应，实时yield chunk并累积结果

        Args:
            stream: 异步流对象
            yield_chunks: 是否yield chunk数据

        Yields:
            如果 yield_chunks=True: 生成 SSE 格式的字符串 "data: {...}\\n\\n"
            最后一条: 生成累积结果字典
        """
        accumulator = StreamAccumulator()

        async for chunk in stream:
            # 实时yield chunk（SSE格式）
            if yield_chunks:
                chunk_dict = chunk.model_dump()
                yield f"data: {json.dumps(chunk_dict)}\n\n"

            # 使用累积器处理chunk
            accumulator.process_chunk(chunk)

            if chunk.choices and chunk.choices[0].finish_reason:
                logger.debug(f"流式响应完成，finish_reason: {chunk.choices[0].finish_reason}")

        # 返回累积的结果
        result = {
            "accumulated_content": accumulator.accumulated_content,
            "accumulated_reasoning": accumulator.accumulated_reasoning,
            "tool_calls": accumulator.get_tool_calls_list(),
            "api_usage": accumulator.api_usage
        }

        yield result
