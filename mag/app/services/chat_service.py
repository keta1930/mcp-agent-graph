import asyncio
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, AsyncGenerator
import traceback
from app.services.mongodb_service import mongodb_service
from app.services.model_service import model_service, StreamAccumulator
from app.services.mcp_service import mcp_service
from app.services.mcp.tool_executor import ToolExecutor
from app.services.chat.message_builder import MessageBuilder
from app.services.chat.prompts import get_summarize_prompt,get_title_prompt
from app.utils.text_tool import detect_language
from app.utils.text_parser import parse_title_and_tags_response

logger = logging.getLogger(__name__)


class ChatService:
    """Chat服务"""

    def __init__(self):
        self.active_streams = {}
        self.tool_executor = ToolExecutor(mcp_service)
        self.message_builder = MessageBuilder(mongodb_service)

    async def chat_completions_stream(self,
                                      conversation_id: Optional[str],
                                      user_prompt: str,
                                      system_prompt: str = "",
                                      mcp_servers: List[str] = None,
                                      model_name: str = None,
                                      user_id: str = "default_user") -> AsyncGenerator[str, None]:
        """Chat completions流式接口"""
        if not model_name:
            raise ValueError("必须指定模型名称")

        if mcp_servers is None:
            mcp_servers = []

        try:
            # 只有非临时对话才确保对话存在
            if conversation_id is not None:
                await mongodb_service.ensure_conversation_exists(conversation_id, user_id)

            # 构建消息上下文
            if conversation_id is not None:
                # 持久对话：获取历史消息
                messages = await self.message_builder.build_chat_messages(
                    conversation_id, user_prompt, system_prompt
                )
            else:
                # 临时对话：只使用当前消息
                messages = self.message_builder.build_temporary_chat_messages(
                    user_prompt, system_prompt
                )

            # 验证消息格式
            messages = self.message_builder.validate_messages(messages)

            # 使用MCP服务准备工具
            tools = await mcp_service.prepare_chat_tools(mcp_servers)

            # 获取模型配置和客户端
            model_config = await model_service.get_model(model_name)
            if not model_config:
                raise ValueError(f"找不到模型配置: {model_name}")

            client = model_service.clients.get(model_name)
            if not client:
                raise ValueError(f"模型客户端未初始化: {model_name}")

            # 执行完整的循环流程
            async for sse_data in self._execute_complete_flow(
                    client=client,
                    model_config=model_config,
                    messages=messages,
                    tools=tools,
                    conversation_id=conversation_id,
                    mcp_servers=mcp_servers,
                    user_id=user_id
            ):
                yield sse_data

        except Exception as e:
            logger.error(f"Chat completions流式处理出错: {str(e)}")
            # 发送错误信息
            error_chunk = {
                "error": {
                    "message": str(e),
                    "type": "api_error"
                }
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
            yield "data: [DONE]\n\n"

    async def _execute_complete_flow(self,
                                     client,
                                     model_config: Dict[str, Any],
                                     messages: List[Dict[str, Any]],
                                     tools: List[Dict[str, Any]],
                                     conversation_id: Optional[str],
                                     mcp_servers: List[str],
                                     user_id: str) -> AsyncGenerator[str, None]:

        current_messages = messages.copy()
        max_iterations = 10
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
                messages = model_service.filter_reasoning_content(current_messages)

                # 准备基本API调用参数
                base_params = {
                    "model": model_config["model"],
                    "messages": messages,
                    "stream": True,
                    "stream_options": {"include_usage": True}
                }

                if tools:
                    base_params["tools"] = tools

                # 准备参数
                params, extra_kwargs = model_service.prepare_api_params(base_params, model_config)

                # 流式调用模型
                stream = await client.chat.completions.create(**params, **extra_kwargs)

                # 使用StreamAccumulator处理流式响应
                accumulator = StreamAccumulator()

                # 处理流式响应
                async for chunk in stream:
                    chunk_dict = chunk.model_dump()
                    yield f"data: {json.dumps(chunk_dict)}\n\n"

                    # 使用累积器处理chunk
                    accumulator.process_chunk(chunk)

                    if chunk.choices and chunk.choices[0].finish_reason:
                        logger.info(
                            f"第 {iteration} 轮完成，finish_reason: {chunk.choices[0].finish_reason} ({chat_type})")

                # 获取累积的结果
                accumulated_content = accumulator.accumulated_content
                accumulated_reasoning = accumulator.accumulated_reasoning
                current_tool_calls = accumulator.get_tool_calls_list()
                api_usage = accumulator.api_usage

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
                    for msg in messages:
                        if msg.get("role") == "system":
                            round_messages.append(msg)
                            break  # 只添加第一条system消息
                    # 添加用户消息
                    round_messages.append(messages[-1])
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

            # 持久对话保存到数据库
            tools_schema = tools or []
            if conversation_id is not None:
                await self._save_complete_round(
                    conversation_id=conversation_id,
                    round_messages=round_messages,
                    token_usage=round_token_usage,
                    user_id=user_id,
                    model_config=model_config,
                    tools_schema=tools_schema
                )
            else:
                logger.info(f"临时对话完成，跳过数据库保存。Token使用量: {round_token_usage}")

            # 发送完成信号
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"执行完整流程时出错 ({chat_type}): {str(e)}")
            logger.error(traceback.format_exc())
            raise

    async def _save_complete_round(self,
                                   conversation_id: str,
                                   round_messages: List[Dict[str, Any]],
                                   token_usage: Dict[str, int],
                                   user_id: str,
                                   model_config,
                                   tools_schema: Optional[List[Dict[str, Any]]] = None):
        """保存完整轮次到数据库"""
        try:
            # 获取轮次编号
            round_number = await self._get_next_round_number(conversation_id)

            # 保存轮次消息到数据库
            await mongodb_service.add_round_to_conversation(
                conversation_id, round_number, round_messages, tools_schema, model_config["model"]
            )

            # 更新对话总token统计
            await mongodb_service.update_conversation_token_usage(
                conversation_id=conversation_id,
                prompt_tokens=token_usage["prompt_tokens"],
                completion_tokens=token_usage["completion_tokens"]
            )

            logger.info(f"轮次 {round_number} 保存成功，token使用量: {token_usage}")

            # 生成标题和标签
            if round_number == 1:
                await self._generate_title_and_tags(
                    conversation_id, round_messages, model_config
                )

        except Exception as e:
            logger.error(f"保存轮次时出错: {str(e)}")

    async def _generate_title_and_tags(self,
                                             conversation_id: str,
                                             messages: List[Dict[str, Any]],
                                             model_config: Dict[str, Any]):
        """生成对话标题和标签（调用统一方法）"""
        try:
            # 标题和标签生成方法
            await mongodb_service.conversation_manager.generate_conversation_title_and_tags(
                conversation_id=conversation_id,
                messages=messages,
                model_config=model_config
            )
        except Exception as e:
            logger.error(f"生成标题和标签时出错: {str(e)}")

    async def compact_conversation(self,
                             conversation_id: str,
                             model_name: str,
                             compact_type: str = "brutal",
                             compact_threshold: int = 2000,
                             user_id: str = "default_user") -> Dict[str, Any]:
        """压缩对话内容"""
        try:
            # 验证参数
            if compact_type not in ['brutal', 'precise']:
                return {"status": "error", "error": "压缩类型必须是 'brutal' 或 'precise'"}
            
            # 验证模型是否存在
            model_config = await model_service.get_model(model_name)
            if not model_config:
                return {"status": "error", "error": f"找不到模型配置: {model_name}"}

            # 创建总结回调函数（用于精确压缩）
            summarize_callback = None
            if compact_type == "precise":
                summarize_callback = lambda content: self._summarize_tool_content(content, model_name)

            # 调用MongoDB服务执行压缩
            result = await mongodb_service.compact_conversation(
                conversation_id=conversation_id,
                compact_type=compact_type,
                compact_threshold=compact_threshold,
                summarize_callback=summarize_callback,
                user_id=user_id
            )

            logger.info(f"对话压缩完成: {conversation_id}, 结果: {result.get('status')}")
            return result

        except Exception as e:
            logger.error(f"压缩对话时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def _summarize_tool_content(self, content: str, model_name: str) -> Dict[str, Any]:
        """使用模型总结工具结果进行压缩内容"""
        try:
            language = detect_language(content)
            prompt_template = get_summarize_prompt(language)
            truncated_content = content
            summary_prompt = prompt_template.format(content=truncated_content)

            # 构建消息
            messages = [
                {"role": "user", "content": summary_prompt}
            ]

            # 调用模型
            result = await model_service.call_model(
                model_name=model_name,
                messages=messages
            )

            if result.get("status") == "success":
                summary_content = result.get("content", "").strip()
                
                return {
                    "status": "success", 
                    "content": summary_content
                }
            else:
                logger.warning(f"内容总结失败: {result.get('error', '未知错误')}")
                return {"status": "error", "error": result.get("error", "总结失败")}

        except Exception as e:
            logger.error(f"总结工具内容时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def _get_next_round_number(self, conversation_id: str) -> int:
        """获取下一个轮次编号"""
        conversation_data = await mongodb_service.get_conversation_with_messages(conversation_id)
        if not conversation_data or not conversation_data.get("rounds"):
            return 1
        return len(conversation_data["rounds"]) + 1

    async def get_conversations_list(self, user_id: str = "default_user",
                                     limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """获取对话列表"""
        try:
            return await mongodb_service.list_conversations(user_id, limit, skip)
        except Exception as e:
            logger.error(f"获取对话列表出错: {str(e)}")
            return []

    async def get_conversation_detail(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取对话详情"""
        try:
            return await mongodb_service.get_conversation_with_messages(conversation_id)
        except Exception as e:
            logger.error(f"获取对话详情出错: {str(e)}")
            return None

    async def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话"""
        try:
            return await mongodb_service.delete_conversation(conversation_id)
        except Exception as e:
            logger.error(f"删除对话出错: {str(e)}")
            return False


# 创建全局Chat服务实例
chat_service = ChatService()