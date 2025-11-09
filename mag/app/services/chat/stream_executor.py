"""流式执行器 - 负责完整的流式执行流程（含工具调用循环）"""
import json
import logging
from typing import Dict, List, Any, Optional, AsyncGenerator

from app.services.model_service import model_service
from app.services.mcp.tool_executor import ToolExecutor

logger = logging.getLogger(__name__)


class StreamExecutor:
    """流式执行器 - 处理多轮模型调用和工具执行的完整流程"""

    def __init__(self, tool_executor: ToolExecutor):
        """初始化流式执行器

        Args:
            tool_executor: 工具执行器实例
        """
        self.tool_executor = tool_executor

    async def execute_complete_flow(self,
                                    model_name: str,
                                    messages: List[Dict[str, Any]],
                                    tools: List[Dict[str, Any]],
                                    mcp_servers: List[str],
                                    conversation_id: Optional[str] = None,
                                    max_iterations: int = 10,
                                    user_id: str = "default_user") -> AsyncGenerator[str | Dict[str, Any], None]:
        """执行完整的流式执行流程（含工具调用循环）

        Args:
            model_name: 模型名称
            messages: 初始消息列表
            tools: 工具列表
            mcp_servers: MCP服务器列表
            conversation_id: 对话ID（可选，用于日志）
            max_iterations: 最大迭代次数
            user_id: 用户ID

        Yields:
            - 中间yield: SSE格式字符串 "data: {...}\\n\\n"
            - 最后yield: 完整结果字典

        最后一条结果格式:
            {
                "round_messages": List[Dict],  # 本轮所有消息
                "round_token_usage": Dict,     # token使用统计
                "iteration_count": int         # 实际迭代次数
            }
        """
        current_messages = messages.copy()
        iteration = 0
        round_messages = []
        round_token_usage = {
            "total_tokens": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0
        }

        # 日志标识
        chat_type = "临时对话" if conversation_id is None else f"对话 {conversation_id}"

        try:
            while iteration < max_iterations:
                iteration += 1
                logger.info(f"开始第 {iteration} 轮模型调用 ({chat_type})")

                # 过滤reasoning_content字段
                filtered_messages = model_service.filter_reasoning_content(current_messages)

                # 调用模型进行流式生成
                accumulated_result = None
                async for item in model_service.stream_chat_with_tools(
                    model_name=model_name,
                    messages=filtered_messages,
                    tools=tools,
                    yield_chunks=True,
                    user_id=user_id
                ):
                    if isinstance(item, str):
                        # SSE chunk，直接转发
                        yield item
                    else:
                        # 累积结果
                        accumulated_result = item

                if not accumulated_result:
                    logger.error(f"第 {iteration} 轮未收到累积结果 ({chat_type})")
                    break

                # 提取累积的结果
                accumulated_content = accumulated_result["accumulated_content"]
                accumulated_reasoning = accumulated_result.get("accumulated_reasoning", "")
                current_tool_calls = accumulated_result.get("tool_calls", [])
                api_usage = accumulated_result.get("api_usage")

                # 更新token使用量
                if api_usage:
                    round_token_usage["total_tokens"] += api_usage["total_tokens"]
                    round_token_usage["prompt_tokens"] += api_usage["prompt_tokens"]
                    round_token_usage["completion_tokens"] += api_usage["completion_tokens"]
                    logger.info(f"累积token使用量: {round_token_usage} ({chat_type})")
                else:
                    logger.warning(f"第 {iteration} 轮未收集到token使用量信息 ({chat_type})")

                # 构建assistant消息
                assistant_message = {
                    "role": "assistant"
                }

                if accumulated_reasoning:
                    assistant_message["reasoning_content"] = accumulated_reasoning

                assistant_message["content"] = accumulated_content or ""

                # 如果有工具调用，添加tool_calls字段
                if current_tool_calls:
                    assistant_message["tool_calls"] = current_tool_calls

                # 添加到消息列表
                current_messages.append(assistant_message)
                if iteration == 1:
                    # 第一轮时，检查是否有system消息需要记录
                    for msg in filtered_messages:
                        if msg.get("role") == "system":
                            round_messages.append(msg)
                            break  # 只添加第一条system消息
                    # 添加用户消息
                    round_messages.append(filtered_messages[-1])
                round_messages.append(assistant_message)

                # 如果没有工具调用，结束循环
                if not current_tool_calls:
                    logger.info(f"第 {iteration} 轮没有工具调用，对话完成 ({chat_type})")
                    break

                # 执行工具调用
                logger.info(f"执行 {len(current_tool_calls)} 个工具调用 ({chat_type})")
                tool_results = await self.tool_executor.execute_tools_batch(current_tool_calls, mcp_servers)

                # 添加工具结果到消息列表并实时发送
                for tool_result in tool_results:
                    tool_message = {
                        "role": "tool",
                        "tool_call_id": tool_result["tool_call_id"],
                        "content": tool_result["content"]
                    }
                    current_messages.append(tool_message)
                    round_messages.append(tool_message)
                    yield f"data: {json.dumps(tool_message)}\n\n"

                # 继续下一轮循环
                logger.info(f"工具执行完成，准备第 {iteration + 1} 轮模型调用 ({chat_type})")

            if iteration >= max_iterations:
                logger.warning(f"达到最大迭代次数 {max_iterations} ({chat_type})")

            # 返回完整结果
            result = {
                "round_messages": round_messages,
                "round_token_usage": round_token_usage,
                "iteration_count": iteration
            }

            yield result

        except Exception as e:
            logger.error(f"执行完整流程时出错 ({chat_type}): {str(e)}")
            raise
