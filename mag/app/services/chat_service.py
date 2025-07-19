import asyncio
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, AsyncGenerator

from app.services.mongodb_service import mongodb_service
from app.services.model_service import model_service
from app.services.mcp_service import mcp_service

logger = logging.getLogger(__name__)


class ChatService:
    """Chat服务 - 实现完整的对话功能和流式响应"""

    def __init__(self):
        self.active_streams = {}

    async def chat_completions_stream(self,
                                    conversation_id: str,
                                    user_prompt: str,
                                    system_prompt: str = "你是一个专业的AI助手。",
                                    mcp_servers: List[str] = None,
                                    model_name: str = None,
                                    user_id: str = "default_user") -> AsyncGenerator[str, None]:
        """
        Chat completions流式接口 - 借鉴参考项目的消息构建方式
        """
        if not model_name:
            raise ValueError("必须指定模型名称")
        
        if mcp_servers is None:
            mcp_servers = []

        try:
            # 确保对话存在
            await self._ensure_conversation_exists(conversation_id, user_id)
            
            # 构建消息上下文
            messages = await self._build_message_context(
                conversation_id, user_prompt, system_prompt
            )
            
            # 准备MCP工具
            tools = await self._prepare_mcp_tools(mcp_servers)
            
            # 获取模型配置和客户端
            model_config = model_service.get_model(model_name)
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
                               conversation_id: str,
                               mcp_servers: List[str],
                               user_id: str) -> AsyncGenerator[str, None]:
        
        current_messages = messages.copy()
        max_iterations = 10
        iteration = 0
        all_round_messages = []  # 记录本轮次的所有消息
        round_token_usage = {
            "total_tokens": 0,
            "prompt_tokens": 0, 
            "completion_tokens": 0
        }  # 累积本轮次的token使用量
        
        try:
            while iteration < max_iterations:
                iteration += 1
                logger.info(f"开始第 {iteration} 轮模型调用")
                
                # 准备API调用参数
                params = {
                    "model": model_config["model"],
                    "messages": current_messages,
                    "stream": True
                }
                
                if tools:
                    params["tools"] = tools
                
                self._add_model_params(params, model_config)
                extra_kwargs = self._get_extra_kwargs(model_config)
                
                # 第一阶段：流式调用模型
                stream = await client.chat.completions.create(**params, **extra_kwargs)
                
                # 收集响应数据
                accumulated_content = ""
                current_tool_calls = []
                tool_calls_dict = {}
                api_usage = None  # 收集token使用量
                
                # 处理流式响应
                async for chunk in stream:
                    # 直接透传chunk给前端
                    chunk_dict = chunk.model_dump()
                    yield f"data: {json.dumps(chunk_dict)}\n\n"
                    
                    # 收集数据用于后续处理
                    if chunk.choices and chunk.choices[0].delta:
                        delta = chunk.choices[0].delta
                        
                        # 收集内容
                        if delta.content:
                            accumulated_content += delta.content
                        
                        # 收集工具调用 - 参考前端的处理方式
                        if delta.tool_calls:
                            for tool_call_delta in delta.tool_calls:
                                index = tool_call_delta.index
                                
                                if index not in tool_calls_dict:
                                    tool_calls_dict[index] = {
                                        "id": tool_call_delta.id or "",
                                        "type": "function",
                                        "function": {
                                            "name": "",
                                            "arguments": ""
                                        }
                                    }
                                
                                if tool_call_delta.id:
                                    tool_calls_dict[index]["id"] = tool_call_delta.id
                                
                                if tool_call_delta.function:
                                    if tool_call_delta.function.name:
                                        tool_calls_dict[index]["function"]["name"] += tool_call_delta.function.name
                                    if tool_call_delta.function.arguments:
                                        tool_calls_dict[index]["function"]["arguments"] += tool_call_delta.function.arguments
                    
                    # 收集token使用量信息 - 移到这里，在break之前
                    if hasattr(chunk, 'usage') and chunk.usage:
                        api_usage = {
                            "total_tokens": chunk.usage.total_tokens,
                            "prompt_tokens": chunk.usage.prompt_tokens,
                            "completion_tokens": chunk.usage.completion_tokens
                        }
                        logger.info(f"第 {iteration} 轮API调用token使用量: {api_usage}")
                    
                    # 检查是否完成
                    if chunk.choices and chunk.choices[0].finish_reason:
                        current_tool_calls = list(tool_calls_dict.values())
                        logger.info(f"第 {iteration} 轮完成，finish_reason: {chunk.choices[0].finish_reason}")
                        break
                
                # 累积token使用量
                if api_usage:
                    round_token_usage["total_tokens"] += api_usage["total_tokens"]
                    round_token_usage["prompt_tokens"] += api_usage["prompt_tokens"] 
                    round_token_usage["completion_tokens"] += api_usage["completion_tokens"]
                    logger.info(f"累积token使用量: {round_token_usage}")
                else:
                    logger.warning(f"第 {iteration} 轮未收集到token使用量信息")
                
                # 第二阶段：构建assistant消息 - 严格按照OpenAI格式
                assistant_message = {
                    "role": "assistant",
                    "content": accumulated_content or ""  # 确保content是字符串，可以为空
                }
                
                # 如果有工具调用，添加tool_calls字段
                if current_tool_calls:
                    assistant_message["tool_calls"] = current_tool_calls
                
                # 添加到消息列表
                current_messages.append(assistant_message)
                if iteration == 1:  # 只在第一轮记录用户消息
                    all_round_messages.append(messages[-1])  # 用户消息
                all_round_messages.append(assistant_message)
                
                # 如果没有工具调用，结束循环
                if not current_tool_calls:
                    logger.info(f"第 {iteration} 轮没有工具调用，对话完成")
                    break
                
                # 第三阶段：执行工具调用
                logger.info(f"执行 {len(current_tool_calls)} 个工具调用")
                tool_results = await self._execute_tool_calls_batch(current_tool_calls, mcp_servers)
                
                # 添加工具结果到消息列表并实时发送
                for tool_result in tool_results:
                    tool_message = {
                        "role": "tool",
                        "tool_call_id": tool_result["tool_call_id"],
                        "content": tool_result["content"]
                    }
                    current_messages.append(tool_message)
                    all_round_messages.append(tool_message)
                    
                    # 实时发送工具结果给前端 - 标准OpenAI格式
                    tool_chunk = {
                        "id": f"tool-{int(time.time())}-{uuid.uuid4().hex[:8]}",
                        "object": "chat.completion.chunk",
                        "created": int(time.time()),
                        "model": model_config["model"],
                        "choices": [
                            {
                                "index": 0,
                                "delta": {
                                    "role": "tool",
                                    "content": tool_result["content"],
                                    "tool_call_id": tool_result["tool_call_id"]
                                },
                                "finish_reason": None
                            }
                        ]
                    }
                    yield f"data: {json.dumps(tool_chunk)}\n\n"
                
                # 继续下一轮循环
                logger.info(f"工具执行完成，准备第 {iteration + 1} 轮模型调用")
            
            if iteration >= max_iterations:
                logger.warning(f"达到最大迭代次数 {max_iterations}")
            
            # 保存到数据库，包含token统计
            await self._save_complete_round(
                conversation_id=conversation_id,
                round_messages=all_round_messages,
                token_usage=round_token_usage,
                user_id=user_id
            )
            
            # 发送完成信号
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.error(f"执行完整流程时出错: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise

    async def _execute_tool_calls_batch(self, tool_calls: List[Dict[str, Any]], mcp_servers: List[str]) -> List[Dict[str, Any]]:
        """批量执行工具调用"""
        tool_results = []
        
        # 创建异步任务
        tasks = []
        for tool_call in tool_calls:
            tool_name = tool_call["function"]["name"]
            tool_id = tool_call["id"]
            
            try:
                arguments_str = tool_call["function"]["arguments"]
                arguments = json.loads(arguments_str) if arguments_str else {}
            except json.JSONDecodeError as e:
                logger.error(f"工具参数JSON解析失败: {arguments_str}, 错误: {e}")
                tool_results.append({
                    "tool_call_id": tool_id,
                    "content": f"工具调用解析失败：{str(e)}"
                })
                continue
            
            # 查找工具所属服务器
            server_name = await self._find_tool_server(tool_name, mcp_servers)
            if not server_name:
                tool_results.append({
                    "tool_call_id": tool_id,
                    "content": f"找不到工具 '{tool_name}' 所属的服务器"
                })
                continue
            
            # 创建异步任务
            task = asyncio.create_task(
                self._call_single_tool(server_name, tool_name, arguments, tool_id)
            )
            tasks.append(task)
        
        # 等待所有工具执行完成
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"工具执行异常: {result}")
                    tool_results.append({
                        "tool_call_id": "unknown",
                        "content": f"工具执行异常: {str(result)}"
                    })
                else:
                    tool_results.append(result)
        
        return tool_results

    async def _call_single_tool(self, server_name: str, tool_name: str, 
                               arguments: Dict[str, Any], tool_call_id: str) -> Dict[str, Any]:
        """调用单个工具"""
        try:
            result = await mcp_service.call_tool(server_name, tool_name, arguments)
            
            if result.get("error"):
                content = f"工具 {tool_name} 执行失败：{result['error']}"
            else:
                # 格式化成功结果
                result_content = result.get("content", "")
                if isinstance(result_content, dict) or isinstance(result_content, list):
                    content = f"工具 {tool_name} 执行成功：{json.dumps(result_content, ensure_ascii=False)}"
                else:
                    content = f"工具 {tool_name} 执行成功：{str(result_content)}"
            
            return {
                "tool_call_id": tool_call_id,
                "content": content
            }
            
        except Exception as e:
            logger.error(f"工具 {tool_name} 执行失败: {str(e)}")
            return {
                "tool_call_id": tool_call_id,
                "content": f"工具 {tool_name} 执行失败：{str(e)}"
            }

    async def _find_tool_server(self, tool_name: str, mcp_servers: List[str]) -> Optional[str]:
        """查找工具所属的服务器"""
        try:
            all_tools = await mcp_service.get_all_tools()
            for server_name in mcp_servers:
                if server_name in all_tools:
                    for tool in all_tools[server_name]:
                        if tool["name"] == tool_name:
                            return server_name
            return None
        except Exception as e:
            logger.error(f"查找工具服务器时出错: {str(e)}")
            return None

    def _add_model_params(self, params: Dict[str, Any], model_config: Dict[str, Any]):
        """添加模型配置参数"""
        optional_params = [
            'temperature', 'max_tokens', 'max_completion_tokens',
            'top_p', 'frequency_penalty', 'presence_penalty', 'n',
            'stop', 'seed', 'logprobs', 'top_logprobs'
        ]
        
        for param in optional_params:
            if param in model_config and model_config[param] is not None:
                if param in ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty']:
                    params[param] = float(model_config[param])
                elif param in ['max_tokens', 'max_completion_tokens', 'n', 'seed', 'top_logprobs']:
                    params[param] = int(model_config[param])
                else:
                    params[param] = model_config[param]

    def _get_extra_kwargs(self, model_config: Dict[str, Any]) -> Dict[str, Any]:
        """获取额外的请求参数"""
        extra_kwargs = {}
        if model_config.get('extra_headers'):
            extra_kwargs['extra_headers'] = model_config['extra_headers']
        if model_config.get('timeout'):
            extra_kwargs['timeout'] = model_config['timeout']
        if model_config.get('extra_body'):
            extra_kwargs['extra_body'] = model_config['extra_body']
        return extra_kwargs

    async def _save_complete_round(self,
                                 conversation_id: str,
                                 round_messages: List[Dict[str, Any]],
                                 token_usage: Dict[str, int],
                                 user_id: str):
        """保存完整轮次到数据库，包含token统计"""
        try:
            # 获取轮次编号
            round_number = await self._get_next_round_number(conversation_id)
            
            # 保存轮次消息到数据库
            await mongodb_service.add_round_to_conversation(
                conversation_id, round_number, round_messages
            )
            
            # 更新对话总token统计
            await mongodb_service.update_conversation_token_usage(
                conversation_id=conversation_id,
                prompt_tokens=token_usage["prompt_tokens"],
                completion_tokens=token_usage["completion_tokens"]
            )
            
            logger.info(f"轮次 {round_number} 保存成功，token使用量: {token_usage}")
            
            # 如果是第一轮，生成标题和标签
            if round_number == 1:
                await self._generate_title_and_tags_if_needed(
                    conversation_id, round_messages, model_service.get_model(list(model_service.clients.keys())[0])
                )
                
        except Exception as e:
            logger.error(f"保存轮次时出错: {str(e)}")

    async def _generate_title_and_tags_if_needed(self,
                                               conversation_id: str,
                                               messages: List[Dict[str, Any]],
                                               model_config: Dict[str, Any]):
        """生成对话标题和标签"""
        try:
            # 找到用户消息和第一个assistant回复
            user_message = ""
            assistant_content = ""
            
            for msg in messages:
                if msg.get("role") == "user" and not user_message:
                    user_message = msg.get("content", "")
                elif msg.get("role") == "assistant" and not assistant_content:
                    assistant_content = msg.get("content", "")
                    if user_message and assistant_content:
                        break
            
            if not user_message or not assistant_content:
                return
            
            # 生成标题 - 参考前端项目的简化方式
            title_prompt = f"""请为以下对话生成一个简洁的中文标题，不超过10个字，直接返回标题内容，不要加引号或其他格式：

用户: {user_message[:100]}
助手: {assistant_content[:100]}

标题:"""

            title_result = await model_service.call_model(
                model_name=model_config["name"],
                messages=[{"role": "user", "content": title_prompt}]
            )
            
            title = "新对话"
            if title_result.get("status") == "success":
                title = title_result.get("content", "新对话").strip()
                # 清理引号
                title = title.strip('"\'""''')
                if not title or len(title) > 15:
                    title = "新对话"
            
            # 简化标签生成
            tags = []
            
            # 更新数据库
            await mongodb_service.update_conversation_title_and_tags(
                conversation_id=conversation_id,
                title=title,
                tags=tags
            )
            
        except Exception as e:
            logger.error(f"生成标题和标签时出错: {str(e)}")

    # === 辅助方法 ===

    async def _ensure_conversation_exists(self, conversation_id: str, user_id: str):
        """确保对话存在，不存在则创建"""
        conversation = await mongodb_service.get_conversation(conversation_id)
        if not conversation:
            await mongodb_service.create_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                title="新对话",
                tags=[]
            )

    async def _build_message_context(self,
                                   conversation_id: str,
                                   user_prompt: str,
                                   system_prompt: str) -> List[Dict[str, Any]]:
        """构建消息上下文"""
        messages = []
        
        # 添加系统提示词
        messages.append({
            "role": "system",
            "content": system_prompt
        })
        
        # 获取历史消息
        conversation_data = await mongodb_service.get_conversation_with_messages(conversation_id)
        if conversation_data and conversation_data.get("rounds"):
            for round_data in conversation_data["rounds"]:
                for msg in round_data.get("messages", []):
                    if msg.get("role") != "system":  # 避免重复添加系统消息
                        messages.append(msg)
        
        # 添加当前用户消息
        messages.append({
            "role": "user",
            "content": user_prompt
        })
        
        return messages

    async def _prepare_mcp_tools(self, mcp_servers: List[str]) -> List[Dict[str, Any]]:
        """准备MCP工具列表"""
        tools = []
        
        if not mcp_servers:
            return tools
        
        try:
            # 确保服务器已连接
            for server_name in mcp_servers:
                await mcp_service.connect_server(server_name)
            
            # 获取所有工具
            all_tools = await mcp_service.get_all_tools()
            
            for server_name in mcp_servers:
                if server_name in all_tools:
                    for tool in all_tools[server_name]:
                        tools.append({
                            "type": "function",
                            "function": {
                                "name": tool["name"],
                                "description": f"[Tool from:{server_name}] {tool['description']}",
                                "parameters": tool["input_schema"]
                            }
                        })
        except Exception as e:
            logger.error(f"准备MCP工具时出错: {str(e)}")
        
        return tools

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