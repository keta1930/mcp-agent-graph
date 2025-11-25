"""
Agent 流式执行器
实现 Agent 调用的流式执行逻辑（支持多轮对话）
"""
import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, AsyncGenerator

from app.services.model.model_service import model_service
from app.services.tool_execution import ToolExecutor
from app.services.system_tools import get_system_tools_by_names

logger = logging.getLogger(__name__)


class AgentStreamExecutor:
    """Agent 流式执行器 - 处理 Agent 调用的流式执行"""

    def __init__(self):
        """初始化 Agent 流式执行器"""
        self.tool_executor = ToolExecutor()

    async def run_agent_stream(
            self,
            agent_name: Optional[str],
            user_prompt: str,
            user_id: str,
            conversation_id: str,
            model_name: Optional[str] = None,
            system_prompt: Optional[str] = None,
            mcp_servers: Optional[List[str]] = None,
            system_tools: Optional[List[str]] = None,
            max_iterations: Optional[int] = None
    ) -> AsyncGenerator[str, None]:
        """
        Agent 流式运行（主入口，支持多轮对话）

        Args:
            agent_name: Agent 名称（None 表示手动配置模式）
            user_prompt: 用户输入
            user_id: 用户 ID
            conversation_id: 对话 ID
            model_name: 模型名称（可选覆盖）
            system_prompt: 系统提示词（可选覆盖）
            mcp_servers: MCP服务器列表（可选添加）
            system_tools: 系统工具列表（可选添加）
            max_iterations: 最大迭代次数（可选覆盖）

        Yields:
            SSE 格式字符串 "data: {...}\\n\\n"
        """
        try:
            from app.infrastructure.database.mongodb.client import mongodb_client
            from app.services.system_tools.registry import set_user_language_context

            # 获取用户语言并设置到上下文
            user_language = await mongodb_client.user_repository.get_user_language(user_id)
            set_user_language_context(user_language)
            logger.info(f"设置用户语言上下文: user_id={user_id}, language={user_language}")

            # 加载有效配置
            effective_config = await self._load_effective_config(
                agent_name=agent_name,
                user_id=user_id,
                model_name=model_name,
                system_prompt=system_prompt,
                mcp_servers=mcp_servers,
                system_tools=system_tools,
                max_iterations=max_iterations
            )

            if not effective_config:
                error_msg = {"error": "无法加载有效配置"}
                yield f"data: {json.dumps(error_msg)}\n\n"
                yield "data: [DONE]\n\n"
                return

            # 构建包含历史消息的完整消息列表
            messages = await self._build_messages(
                conversation_id=conversation_id,
                user_prompt=user_prompt,
                system_prompt=effective_config["system_prompt"]
            )

            # 准备工具
            tools = await self._prepare_agent_tools(
                mcp_servers=effective_config["mcp_servers"],
                system_tools=effective_config["system_tools"],
                user_id=user_id,
                conversation_id=conversation_id
            )

            # 执行完整流程
            final_result = None
            async for item in self.run_agent_loop(
                    agent_name=effective_config["agent_name"],
                    model_name=effective_config["model_name"],
                    messages=messages,
                    tools=tools,
                    mcp_servers=effective_config["mcp_servers"],
                    max_iterations=effective_config["max_iterations"],
                    user_id=user_id,
                    conversation_id=conversation_id
            ):
                if isinstance(item, str):
                    # SSE 字符串，直接转发给客户端
                    yield item
                else:
                    # Dict 结果，保存但不转发到客户端
                    final_result = item

            # 保存执行结果到数据库（is_graph_node 默认为 False）
            if final_result:
                await self._save_agent_run_result(
                    conversation_id=conversation_id,
                    agent_name=effective_config["agent_name"],
                    result=final_result,
                    user_id=user_id,
                    user_prompt=user_prompt,
                    model_name=effective_config["model_name"],
                    tools=tools,
                    is_graph_node=False
                )

            # 发送完成信号
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"run_agent_stream 失败: {str(e)}")
            error_msg = {"error": str(e)}
            yield f"data: {json.dumps(error_msg)}\n\n"
            yield "data: [DONE]\n\n"

    async def _build_messages(
            self,
            conversation_id: str,
            user_prompt: str,
            system_prompt: str
    ) -> List[Dict[str, Any]]:
        """
        构建包含历史消息的完整消息列表

        Args:
            conversation_id: 对话 ID
            user_prompt: 当前用户输入
            system_prompt: 系统提示词

        Returns:
            完整的消息列表
        """
        from app.infrastructure.database.mongodb.client import mongodb_client

        messages = []

        try:
            # 1. 添加系统提示词
            if system_prompt and system_prompt.strip():
                messages.append({
                    "role": "system",
                    "content": system_prompt.strip()
                })

            # 2. 获取并添加历史消息
            agent_run_doc = await mongodb_client.agent_run_repository.get_agent_run(
                conversation_id
            )

            if agent_run_doc and agent_run_doc.get("rounds"):
                logger.debug(f"加载历史消息: {len(agent_run_doc['rounds'])} 轮")

                for round_data in agent_run_doc["rounds"]:
                    round_messages = round_data.get("messages", [])
                    for msg in round_messages:
                        # 跳过历史中的 system 消息（已在开头添加）
                        if msg.get("role") != "system":
                            messages.append(msg)
            else:
                logger.debug(f"新对话，无历史消息: {conversation_id}")

            # 3. 添加当前用户消息
            if user_prompt and user_prompt.strip():
                messages.append({
                    "role": "user",
                    "content": user_prompt.strip()
                })

            logger.info(f"✓ 构建消息完成，共 {len(messages)} 条（包含历史）")
            return messages

        except Exception as e:
            logger.error(f"构建消息失败: {str(e)}")
            # 出错时至少返回当前消息
            fallback_messages = []
            if system_prompt and system_prompt.strip():
                fallback_messages.append({
                    "role": "system",
                    "content": system_prompt.strip()
                })
            if user_prompt and user_prompt.strip():
                fallback_messages.append({
                    "role": "user",
                    "content": user_prompt.strip()
                })
            return fallback_messages

    async def _load_effective_config(
            self,
            agent_name: Optional[str],
            user_id: str,
            model_name: Optional[str] = None,
            system_prompt: Optional[str] = None,
            mcp_servers: Optional[List[str]] = None,
            system_tools: Optional[List[str]] = None,
            max_iterations: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        加载有效配置（智能合并策略）

        策略：
        - 无 Agent：直接使用用户参数
        - 仅 Agent：使用 Agent 完整配置
        - Agent + 参数：
          - 覆盖：model_name, system_prompt, max_iterations
          - 添加（去重）：mcp_servers, system_tools

        Returns:
            {
                "agent_name": str,
                "model_name": str,
                "system_prompt": str,
                "mcp_servers": List[str],
                "system_tools": List[str],
                "max_iterations": int
            }
        """
        from app.infrastructure.database.mongodb.client import mongodb_client

        config = {
            "agent_name": "manual",
            "model_name": None,
            "system_prompt": "",
            "mcp_servers": [],
            "system_tools": [],
            "max_iterations": 50
        }

        # === 场景1：无 Agent，纯手动配置 ===
        if not agent_name:
            config["model_name"] = model_name
            config["system_prompt"] = system_prompt or ""
            config["mcp_servers"] = mcp_servers or []
            config["system_tools"] = system_tools or []
            config["max_iterations"] = max_iterations or 50

            if not config["model_name"]:
                logger.error("手动配置模式缺少 model_name")
                return None

            logger.info(f"✓ 使用手动配置: model={config['model_name']}")
            return config

        # === 场景2/3：使用 Agent（可能带覆盖参数）===
        agent = await mongodb_client.agent_repository.get_agent(agent_name, user_id)
        if not agent:
            logger.error(f"Agent 不存在: {agent_name}")
            return None

        agent_config = agent.get("agent_config", {})

        # 加载 Agent 基础配置
        config["agent_name"] = agent_name
        config["model_name"] = agent_config.get("model")
        config["system_prompt"] = agent_config.get("instruction", "")
        config["mcp_servers"] = agent_config.get("mcp", []).copy()
        config["system_tools"] = agent_config.get("system_tools", []).copy()
        config["max_iterations"] = agent_config.get("max_actions", 50)

        # 应用覆盖参数
        if model_name:
            config["model_name"] = model_name
            logger.info(f"覆盖模型: {model_name}")

        if system_prompt:
            config["system_prompt"] = system_prompt
            logger.info(f"覆盖系统提示词")

        if max_iterations:
            config["max_iterations"] = max_iterations
            logger.info(f"覆盖最大迭代次数: {max_iterations}")

        # 添加工具（去重）
        if mcp_servers:
            original_count = len(config["mcp_servers"])
            config["mcp_servers"] = list(set(config["mcp_servers"] + mcp_servers))
            added = len(config["mcp_servers"]) - original_count
            if added > 0:
                logger.info(f"添加 MCP 服务器: {added} 个")

        if system_tools:
            original_count = len(config["system_tools"])
            config["system_tools"] = list(set(config["system_tools"] + system_tools))
            added = len(config["system_tools"]) - original_count
            if added > 0:
                logger.info(f"添加系统工具: {added} 个")

        logger.info(f"✓ 加载配置完成: agent={agent_name}, model={config['model_name']}")
        return config

    async def run_agent_loop(
            self,
            agent_name: str,
            model_name: str,
            messages: List[Dict[str, Any]],
            tools: List[Dict[str, Any]],
            mcp_servers: List[str],
            max_iterations: int,
            user_id: str,
            conversation_id: str,
            task_id: Optional[str] = None,
            is_graph_node: bool = False
    ) -> AsyncGenerator[str | Dict[str, Any], None]:
        """
        运行 Agent 循环（含工具调用循环）

        Args:
            agent_name: Agent 名称
            model_name: 模型名称
            messages: 初始消息列表（已包含历史）
            tools: 工具列表
            mcp_servers: MCP 服务器列表
            max_iterations: 最大迭代次数
            user_id: 用户 ID
            conversation_id: 对话 ID
            task_id: 任务 ID（Sub Agent 时提供）
            is_graph_node: 是否为 Graph 节点调用（默认 False）

        Yields:
            - 中间 yield: SSE 格式字符串 "data: {...}\\n\\n"
            - 最后 yield: 完整结果字典
        """
        current_messages = messages.copy()
        iteration = 0
        round_messages = []
        round_token_usage = {
            "total_tokens": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0
        }

        # 标识是否为 Sub Agent
        is_sub_agent = task_id is not None
        
        # 记录 Graph 节点调用
        if is_graph_node:
            logger.debug(f"Graph 节点调用 Agent: {agent_name}, conversation_id={conversation_id}")

        try:
            while iteration < max_iterations:
                iteration += 1
                logger.info(f"Agent {agent_name} - 第 {iteration} 轮执行 (task_id={task_id})")

                # 过滤 reasoning_content
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
                        # SSE chunk
                        # 如果是 Sub Agent，添加 task_id 标识
                        if is_sub_agent:
                            # 解析 SSE 数据
                            if item.startswith("data: ") and not item.startswith("data: [DONE]"):
                                try:
                                    data_str = item[6:].strip()
                                    data = json.loads(data_str)
                                    # 添加 task_id 标识
                                    data["task_id"] = task_id
                                    yield f"data: {json.dumps(data)}\n\n"
                                except:
                                    yield item
                            else:
                                yield item
                        else:
                            yield item
                    else:
                        # 累积结果
                        accumulated_result = item

                if not accumulated_result:
                    logger.error(f"Agent {agent_name} - 第 {iteration} 轮未收到累积结果")
                    break

                # 提取累积的结果
                accumulated_content = accumulated_result["accumulated_content"]
                accumulated_reasoning = accumulated_result.get("accumulated_reasoning", "")
                current_tool_calls = accumulated_result.get("tool_calls", [])
                api_usage = accumulated_result.get("api_usage")

                # 更新 token 使用量
                if api_usage:
                    round_token_usage["total_tokens"] += api_usage["total_tokens"]
                    round_token_usage["prompt_tokens"] += api_usage["prompt_tokens"]
                    round_token_usage["completion_tokens"] += api_usage["completion_tokens"]

                # 构建 assistant 消息
                assistant_message = {
                    "role": "assistant"
                }

                if accumulated_reasoning:
                    assistant_message["reasoning_content"] = accumulated_reasoning

                assistant_message["content"] = accumulated_content or ""

                if current_tool_calls:
                    assistant_message["tool_calls"] = current_tool_calls

                # 添加到消息列表
                current_messages.append(assistant_message)
                if iteration == 1:
                    # 第一轮时，记录 system 和 user 消息
                    for msg in filtered_messages:
                        if msg.get("role") == "system":
                            round_messages.append(msg)
                            break  # 只添加第一条system消息
                    # 只添加当前用户消息（最后一个）
                    round_messages.append(filtered_messages[-1])
                round_messages.append(assistant_message)

                # 如果没有工具调用，结束循环
                if not current_tool_calls:
                    logger.info(f"Agent {agent_name} - 第 {iteration} 轮无工具调用，执行完成")
                    break

                # 执行工具调用
                logger.info(f"Agent {agent_name} - 执行 {len(current_tool_calls)} 个工具调用")
                
                # 检查是否有 agent_task_executor 工具调用
                has_agent_task = any(
                    tc.get("function", {}).get("name") == "agent_task_executor" 
                    for tc in current_tool_calls
                )
                
                if has_agent_task:
                    # 有 Sub Agent 调用，使用流式执行
                    tool_results = []
                    async for item in self.tool_executor.execute_tools_batch_stream(
                        tool_calls=current_tool_calls,
                        mcp_servers=mcp_servers,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        agent_id=agent_name
                    ):
                        if isinstance(item, str):
                            # SSE 事件，直接转发
                            if is_sub_agent:
                                # 如果当前也是 Sub Agent，添加 task_id
                                if item.startswith("data: ") and not item.startswith("data: [DONE]"):
                                    try:
                                        data_str = item[6:].strip()
                                        data = json.loads(data_str)
                                        data["task_id"] = task_id
                                        yield f"data: {json.dumps(data)}\n\n"
                                    except:
                                        yield item
                                else:
                                    yield item
                            else:
                                yield item
                        else:
                            # 工具结果
                            tool_results.append(item)
                else:
                    # 普通工具调用，使用非流式执行
                    tool_results = await self.tool_executor.execute_tools_batch(
                        tool_calls=current_tool_calls,
                        mcp_servers=mcp_servers,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        agent_id=agent_name
                    )

                # 添加工具结果到消息列表并实时发送
                for tool_result in tool_results:
                    tool_message = {
                        "role": "tool",
                        "tool_call_id": tool_result["tool_call_id"],
                        "content": tool_result["content"]
                    }
                    current_messages.append(tool_message)
                    round_messages.append(tool_message)

                    # 发送工具结果 SSE
                    if is_sub_agent:
                        tool_message["task_id"] = task_id
                    yield f"data: {json.dumps(tool_message)}\n\n"

            if iteration >= max_iterations:
                logger.warning(f"Agent {agent_name} - 达到最大迭代次数 {max_iterations}")

            # 返回完整结果
            result = {
                "round_messages": round_messages,
                "round_token_usage": round_token_usage,
                "iteration_count": iteration,
                "agent_name": agent_name
            }

            if is_sub_agent:
                result["task_id"] = task_id

            yield result

        except Exception as e:
            logger.error(f"run_agent_loop 失败 ({agent_name}): {str(e)}")
            raise

    async def _prepare_agent_tools(
            self,
            mcp_servers: List[str],
            system_tools: List[str],
            user_id: str,
            conversation_id: str
    ) -> List[Dict[str, Any]]:
        """
        准备 Agent 工具

        Args:
            mcp_servers: MCP服务器列表
            system_tools: 系统工具列表
            user_id: 用户 ID
            conversation_id: 对话 ID

        Returns:
            工具 schema 列表
        """
        tools = []

        # 加载 MCP 工具
        if mcp_servers:
            from app.services.mcp.mcp_service import mcp_service
            try:
                mcp_tools = await mcp_service.prepare_chat_tools(mcp_servers)
                tools.extend(mcp_tools)
            except Exception as e:
                logger.error(f"加载 MCP 工具失败: {str(e)}")

        # 加载系统工具
        if system_tools:
            sys_tools = get_system_tools_by_names(system_tools)
            tools.extend(sys_tools)

        return tools

    async def _save_agent_run_result(
            self,
            conversation_id: str,
            agent_name: str,
            result: Dict[str, Any],
            user_id: str,
            user_prompt: str,
            model_name: str,
            tools: Optional[List[Dict[str, Any]]] = None,
            is_graph_node: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        保存 Agent 运行结果到数据库

        Args:
            conversation_id: 对话 ID
            agent_name: Agent 名称
            result: 执行结果字典
            user_id: 用户 ID
            user_prompt: 用户输入
            model_name: 模型名称
            tools: 工具 schema 列表（可选）
            is_graph_node: 是否为 Graph 节点调用（默认 False）

        Returns:
            如果生成了新标题，返回 {"title": str, "tags": List[str]}，否则返回 None
        """
        # 如果是 Graph 节点调用，跳过所有数据库写入操作
        if is_graph_node:
            logger.debug(f"Graph 节点调用，跳过数据库写入: conversation_id={conversation_id}")
            return None
        
        try:
            from app.infrastructure.database.mongodb.client import mongodb_client

            # 确保 conversations 元数据存在
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            if not conversation:
                await mongodb_client.conversation_repository.create_conversation(
                    conversation_id=conversation_id,
                    conversation_type="agent",
                    user_id=user_id,
                    title=f"{agent_name} 对话" if agent_name != "manual" else "新对话",
                    tags=[]
                )

            # 确保 agent_run 文档存在
            agent_run = await mongodb_client.agent_run_repository.get_agent_run(conversation_id)
            if not agent_run:
                await mongodb_client.agent_run_repository.create_agent_run(conversation_id)

            # 获取当前主线程的 round 数量
            current_round_count = await mongodb_client.agent_run_repository.get_round_count(
                conversation_id
            )
            next_round_number = current_round_count + 1

            # 提取 token 使用量
            token_usage = result.get("round_token_usage", {})
            prompt_tokens = token_usage.get("prompt_tokens", 0)
            completion_tokens = token_usage.get("completion_tokens", 0)

            # 保存轮次数据到 agent_run 集合的主线程 rounds
            success = await mongodb_client.agent_run_repository.add_round_to_main(
                conversation_id=conversation_id,
                round_number=next_round_number,
                agent_name=agent_name,
                messages=result.get("round_messages", []),
                tools=tools,
                model=model_name,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens
            )
            
            logger.info(f"✓ 保存主线程 round 成功: conversation_id={conversation_id}, round={next_round_number}")

            if not success:
                logger.error(f"保存主线程 round 失败: {conversation_id}")
                return None

            # 更新 conversation 的 round_count
            await mongodb_client.conversation_repository.update_conversation_round_count(
                conversation_id=conversation_id,
                increment=1
            )

            # 更新 conversation 的 token 使用量
            if token_usage:
                await mongodb_client.conversation_repository.update_conversation_token_usage(
                    conversation_id=conversation_id,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens
                )

            logger.debug(f"Agent {agent_name} 执行结果已保存到数据库: {conversation_id}, round {next_round_number}")

            return None

        except Exception as e:
            logger.error(f"保存 Agent 执行结果失败: {str(e)}")
            return None