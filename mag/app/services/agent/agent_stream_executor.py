"""
Agent 流式执行器
实现 Agent 调用的流式执行逻辑
"""
import json
import logging
from typing import Dict, List, Any, Optional, AsyncGenerator

from app.services.model.model_service import model_service
from app.services.mcp.tool_executor import ToolExecutor
from app.services.system_tools import get_system_tools_by_names

logger = logging.getLogger(__name__)


class AgentStreamExecutor:
    """Agent 流式执行器 - 处理 Agent 调用的流式执行"""

    def __init__(self):
        """初始化 Agent 流式执行器"""
        self.tool_executor = ToolExecutor()

    async def execute_agent_invoke_stream(
        self,
        agent_name: Optional[str],
        user_prompt: str,
        user_id: str,
        conversation_id: str
    ) -> AsyncGenerator[str, None]:
        """
        Agent 调用流式执行（主入口）

        Args:
            agent_name: Agent 名称（None 表示使用系统默认）
            user_prompt: 用户输入
            user_id: 用户 ID
            conversation_id: 对话 ID

        Yields:
            SSE 格式字符串 "data: {...}\\n\\n"
        """
        try:
            from app.infrastructure.database.mongodb.client import mongodb_client

            # 获取 Agent 配置（routes 层已验证 agent_name 存在性）
            agent = await mongodb_client.agent_repository.get_agent(agent_name, user_id)

            if not agent:
                error_msg = {"error": f"Agent 不存在: {agent_name}"}
                yield f"data: {json.dumps(error_msg)}\n\n"
                yield "data: [DONE]\n\n"
                return

            agent_config = agent.get("agent_config", {})

            # 构建初始消息
            messages = [
                {"role": "system", "content": agent_config.get("instruction", "")},
                {"role": "user", "content": user_prompt}
            ]

            # 准备工具
            tools = await self._prepare_agent_tools(
                agent_config=agent_config,
                user_id=user_id,
                is_sub_agent=False,
                conversation_id=conversation_id
            )

            # 执行完整流程
            final_result = None
            async for item in self.execute_complete_flow(
                agent_name=agent_name,
                model_name=agent_config.get("model"),
                messages=messages,
                tools=tools,
                mcp_servers=agent_config.get("mcp", []),
                max_iterations=agent_config.get("max_actions", 50),
                user_id=user_id,
                conversation_id=conversation_id
            ):
                if isinstance(item, str):
                    # SSE 字符串，直接转发给客户端
                    yield item
                else:
                    # Dict 结果，保存但不转发到客户端
                    final_result = item

            # 保存执行结果到数据库
            if final_result:
                await self._save_agent_invoke_result(
                    conversation_id=conversation_id,
                    agent_name=agent_name,
                    result=final_result,
                    user_id=user_id,
                    user_prompt=user_prompt,
                    model_name=agent_config.get("model")
                )
                # 标题生成已移至 agent_routes.py 的后台任务中

            # 发送完成信号
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"execute_agent_invoke_stream 失败: {str(e)}")
            error_msg = {"error": str(e)}
            yield f"data: {json.dumps(error_msg)}\n\n"
            yield "data: [DONE]\n\n"

    async def execute_complete_flow(
        self,
        agent_name: str,
        model_name: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        mcp_servers: List[str],
        max_iterations: int,
        user_id: str,
        conversation_id: str,
        task_id: Optional[str] = None
    ) -> AsyncGenerator[str | Dict[str, Any], None]:
        """
        执行完整的流式执行流程（含工具调用循环）

        Args:
            agent_name: Agent 名称
            model_name: 模型名称
            messages: 初始消息列表
            tools: 工具列表
            mcp_servers: MCP 服务器列表
            max_iterations: 最大迭代次数
            user_id: 用户 ID
            conversation_id: 对话 ID
            task_id: 任务 ID（Sub Agent 时提供）

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
                        if msg.get("role") in ["system", "user"]:
                            round_messages.append(msg)
                round_messages.append(assistant_message)

                # 如果没有工具调用，结束循环
                if not current_tool_calls:
                    logger.info(f"Agent {agent_name} - 第 {iteration} 轮无工具调用，执行完成")
                    break

                # 执行工具调用
                logger.info(f"Agent {agent_name} - 执行 {len(current_tool_calls)} 个工具调用")
                tool_results = await self.tool_executor.execute_tools_batch(
                    tool_calls=current_tool_calls,
                    mcp_servers=mcp_servers,
                    user_id=user_id,
                    conversation_id=conversation_id
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
            logger.error(f"execute_complete_flow 失败 ({agent_name}): {str(e)}")
            raise

    async def _prepare_agent_tools(
        self,
        agent_config: Dict[str, Any],
        user_id: str,
        is_sub_agent: bool,
        conversation_id: str
    ) -> List[Dict[str, Any]]:
        """
        准备 Agent 工具

        Args:
            agent_config: Agent 配置
            user_id: 用户 ID
            is_sub_agent: 是否为 Sub Agent
            conversation_id: 对话 ID

        Returns:
            工具 schema 列表
        """
        tools = []

        # 加载 MCP 工具
        mcp_servers = agent_config.get("mcp", [])
        if mcp_servers:
            from app.services.mcp.mcp_service import mcp_service
            try:
                mcp_tools = await mcp_service.prepare_chat_tools(mcp_servers)
                tools.extend(mcp_tools)
            except Exception as e:
                logger.error(f"加载 MCP 工具失败: {str(e)}")

        # 加载系统工具
        system_tool_names = agent_config.get("system_tools", []).copy()

        # 如果是 Sub Agent，移除 agent_task_executor
        if is_sub_agent and "agent_task_executor" in system_tool_names:
            system_tool_names.remove("agent_task_executor")
            logger.debug("Sub Agent: 已移除 agent_task_executor 工具")

        if system_tool_names:
            system_tools = get_system_tools_by_names(system_tool_names)
            tools.extend(system_tools)

        return tools

    async def _save_agent_invoke_result(
        self,
        conversation_id: str,
        agent_name: str,
        result: Dict[str, Any],
        user_id: str,
        user_prompt: str,
        model_name: str
    ) -> Optional[Dict[str, Any]]:
        """
        保存 Agent 执行结果到数据库，并在第一轮时生成标题和标签

        Args:
            conversation_id: 对话 ID
            agent_name: Agent 名称
            result: 执行结果字典，包含 round_messages, round_token_usage, iteration_count 等
            user_id: 用户 ID
            user_prompt: 用户输入
            model_name: 模型名称

        Returns:
            如果生成了新标题，返回 {"title": str, "tags": List[str]}，否则返回 None
        """
        try:
            from app.infrastructure.database.mongodb.client import mongodb_client

            # 确保 conversations 元数据存在（使用正确的 user_id）
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            if not conversation:
                await mongodb_client.conversation_repository.create_conversation(
                    conversation_id=conversation_id,
                    conversation_type="agent",
                    user_id=user_id,
                    title=f"Agent 对话 - {agent_name}",
                    tags=[]
                )

            # 确保 agent_invoke 文档存在（借鉴 chat_repository 的做法）
            await mongodb_client.agent_invoke_repository.create_agent_invoke(conversation_id)

            # 获取当前主线程的 round 数量，用于确定新 round 的编号
            current_round_count = await mongodb_client.agent_invoke_repository.get_round_count(
                conversation_id
            )
            next_round_number = current_round_count + 1

            # 保存轮次数据到 agent_invoke 集合的主线程 rounds
            success = await mongodb_client.agent_invoke_repository.add_round_to_main(
                conversation_id=conversation_id,
                round_number=next_round_number,
                agent_name=agent_name,
                messages=result.get("round_messages", []),
                tools=None,
                model=None
            )

            if not success:
                logger.error(f"保存主线程 round 失败: {conversation_id}")
                return None

            # 更新 conversation 的 token 使用量
            token_usage = result.get("round_token_usage", {})
            if token_usage:
                await mongodb_client.conversation_repository.update_conversation_token_usage(
                    conversation_id=conversation_id,
                    prompt_tokens=token_usage.get("prompt_tokens", 0),
                    completion_tokens=token_usage.get("completion_tokens", 0)
                )

            logger.debug(f"Agent {agent_name} 执行结果已保存到数据库: {conversation_id}, round {next_round_number}")

            # 标题生成已移至 agent_routes.py 的后台任务中
            return None

        except Exception as e:
            logger.error(f"保存 Agent 执行结果失败: {str(e)}")
            return None
