"""
Agent 执行器
实现 agent_loop 核心执行引擎
"""
import logging
from typing import Dict, List, Any, Optional

from app.services.model.model_service import model_service
from app.services.mcp.tool_executor import ToolExecutor
from app.services.system_tools import get_system_tools_by_names

logger = logging.getLogger(__name__)


class AgentExecutor:
    """Agent 执行器 - 负责 Agent 的执行和任务管理"""

    def __init__(self):
        """初始化 Agent 执行器"""
        self.tool_executor = ToolExecutor()

    async def agent_loop(
        self,
        agent_name: str,
        messages: List[Dict[str, Any]],
        user_id: str,
        conversation_id: str,
        max_iterations: Optional[int] = None,
        is_sub_agent: bool = False
    ) -> Dict[str, Any]:
        """
        Agent 执行引擎核心函数

        Args:
            agent_name: Agent 名称
            messages: 初始消息列表
            user_id: 用户 ID
            conversation_id: 对话 ID
            max_iterations: 最大迭代次数（None 则使用 agent.max_actions）
            is_sub_agent: 是否为 Sub Agent（影响工具可用性）

        Returns:
            {
                "success": bool,
                "messages": List[Dict],  # 所有消息
                "final_response": str,   # 最终回复内容
                "token_usage": Dict,     # token使用统计
                "iteration_count": int   # 迭代次数
            }
        """
        try:
            from app.infrastructure.database.mongodb.client import mongodb_client

            # 获取 Agent 配置
            agent = await mongodb_client.agent_repository.get_agent(agent_name, user_id)

            if not agent:
                return {
                    "success": False,
                    "error": f"Agent 不存在: {agent_name}",
                    "messages": [],
                    "final_response": "",
                    "token_usage": {},
                    "iteration_count": 0
                }

            agent_config = agent.get("agent_config", {})
            model_name = agent_config.get("model")
            max_actions = max_iterations if max_iterations is not None else agent_config.get("max_actions", 50)

            # 准备工具
            tools = await self.prepare_agent_tools(
                agent_config=agent_config,
                user_id=user_id,
                is_sub_agent=is_sub_agent,
                conversation_id=conversation_id
            )

            # 执行循环
            current_messages = messages.copy()
            iteration = 0
            token_usage = {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0
            }

            logger.info(f"开始执行 agent_loop: {agent_name} (max_actions={max_actions}, is_sub_agent={is_sub_agent})")

            while iteration < max_actions:
                iteration += 1
                logger.info(f"Agent {agent_name} - 第 {iteration} 轮执行")

                # 过滤 reasoning_content
                filtered_messages = model_service.filter_reasoning_content(current_messages)

                # 调用模型（非流式）
                response = await model_service.call_model(
                    model_name=model_name,
                    messages=filtered_messages,
                    tools=tools,
                    user_id=user_id
                )

                if not response:
                    logger.error(f"Agent {agent_name} - 第 {iteration} 轮未收到响应")
                    break

                # 提取响应内容
                accumulated_content = response.get("accumulated_content", "")
                accumulated_reasoning = response.get("accumulated_reasoning", "")
                tool_calls = response.get("tool_calls", [])
                api_usage = response.get("api_usage", {})

                # 更新 token 使用量
                if api_usage:
                    token_usage["total_tokens"] += api_usage.get("total_tokens", 0)
                    token_usage["prompt_tokens"] += api_usage.get("prompt_tokens", 0)
                    token_usage["completion_tokens"] += api_usage.get("completion_tokens", 0)

                # 构建 assistant 消息
                assistant_message = {
                    "role": "assistant",
                    "content": accumulated_content or ""
                }

                if accumulated_reasoning:
                    assistant_message["reasoning_content"] = accumulated_reasoning

                if tool_calls:
                    assistant_message["tool_calls"] = tool_calls

                current_messages.append(assistant_message)

                # 如果没有工具调用，结束循环
                if not tool_calls:
                    logger.info(f"Agent {agent_name} - 第 {iteration} 轮无工具调用，执行完成")
                    break

                # 执行工具调用
                logger.info(f"Agent {agent_name} - 执行 {len(tool_calls)} 个工具调用")

                mcp_servers = agent_config.get("mcp", [])
                tool_results = await self.tool_executor.execute_tools_batch(
                    tool_calls=tool_calls,
                    mcp_servers=mcp_servers,
                    user_id=user_id,
                    conversation_id=conversation_id
                )

                # 添加工具结果到消息列表
                for tool_result in tool_results:
                    tool_message = {
                        "role": "tool",
                        "tool_call_id": tool_result["tool_call_id"],
                        "content": tool_result["content"]
                    }
                    current_messages.append(tool_message)

            if iteration >= max_actions:
                logger.warning(f"Agent {agent_name} - 达到最大迭代次数 {max_actions}")

            # 提取最终回复
            final_response = ""
            for msg in reversed(current_messages):
                if msg.get("role") == "assistant" and msg.get("content"):
                    final_response = msg.get("content", "")
                    break

            return {
                "success": True,
                "messages": current_messages,
                "final_response": final_response,
                "token_usage": token_usage,
                "iteration_count": iteration
            }

        except Exception as e:
            logger.error(f"agent_loop 执行失败 ({agent_name}): {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "messages": [],
                "final_response": "",
                "token_usage": {},
                "iteration_count": 0
            }

    async def execute_agent_task(
        self,
        agent_name: str,
        task_id: str,
        task_description: str,
        context: str,
        user_id: str,
        conversation_id: str
    ) -> Dict[str, Any]:
        """
        执行单个 Agent 任务

        Args:
            agent_name: Agent 名称
            task_id: 任务 ID
            task_description: 任务描述
            context: 上下文信息
            user_id: 用户 ID
            conversation_id: 对话 ID

        Returns:
            {
                "task_id": str,
                "agent_name": str,
                "success": bool,
                "result": str
            }
        """
        try:
            from app.infrastructure.database.mongodb.client import mongodb_client

            # 检查 task 是否已存在
            task_history = await self.get_task_history(conversation_id, task_id)

            # 构建消息
            messages = await self.build_task_messages(
                agent_name=agent_name,
                task_description=task_description,
                context=context,
                task_history=task_history,
                user_id=user_id
            )

            # 如果 task 不存在，创建新 task
            if not task_history:
                await mongodb_client.agent_invoke_repository.add_task(
                    conversation_id=conversation_id,
                    task_id=task_id,
                    agent_name=agent_name
                )

            # 执行 agent_loop（作为 Sub Agent）
            result = await self.agent_loop(
                agent_name=agent_name,
                messages=messages,
                user_id=user_id,
                conversation_id=conversation_id,
                is_sub_agent=True
            )

            if not result.get("success"):
                return {
                    "task_id": task_id,
                    "agent_name": agent_name,
                    "success": False,
                    "error": result.get("error", "执行失败")
                }

            # 保存 task round
            task_messages = result.get("messages", [])
            current_round = await mongodb_client.agent_invoke_repository.get_task(conversation_id, task_id)
            round_number = len(current_round.get("rounds", [])) + 1 if current_round else 1

            await mongodb_client.agent_invoke_repository.add_round_to_task(
                conversation_id=conversation_id,
                task_id=task_id,
                round_number=round_number,
                messages=task_messages,
                model=None  # 可以从 agent_config 获取
            )

            return {
                "task_id": task_id,
                "agent_name": agent_name,
                "success": True,
                "result": result.get("final_response", "")
            }

        except Exception as e:
            logger.error(f"执行 Agent 任务失败 ({task_id}, {agent_name}): {str(e)}")
            return {
                "task_id": task_id,
                "agent_name": agent_name,
                "success": False,
                "error": str(e)
            }

    async def build_task_messages(
        self,
        agent_name: str,
        task_description: str,
        context: str,
        task_history: List[Dict[str, Any]],
        user_id: str
    ) -> List[Dict[str, Any]]:
        """
        构建任务消息

        Args:
            agent_name: Agent 名称
            task_description: 任务描述
            context: 上下文
            task_history: 任务历史消息
            user_id: 用户 ID

        Returns:
            消息列表
        """
        from app.infrastructure.database.mongodb.client import mongodb_client

        # 获取 Agent 配置
        agent = await mongodb_client.agent_repository.get_agent(agent_name, user_id)

        if not agent:
            return []

        agent_config = agent.get("agent_config", {})
        instruction = agent_config.get("instruction", "")

        # 构建用户消息
        user_content = f"任务描述：\n{task_description}"

        if context:
            user_content += f"\n\n上下文信息：\n{context}"

        user_content += "\n\n请专注于完成这个任务，并在完成后提供清晰的结果报告。"

        # 如果有历史，继承完整历史
        if task_history:
            messages = [
                {"role": "system", "content": instruction}
            ]
            messages.extend(task_history)
            messages.append({"role": "user", "content": user_content})
        else:
            # 新任务
            messages = [
                {"role": "system", "content": instruction},
                {"role": "user", "content": user_content}
            ]

        return messages

    async def get_task_history(
        self,
        conversation_id: str,
        task_id: str
    ) -> List[Dict[str, Any]]:
        """
        获取任务历史

        Args:
            conversation_id: 对话 ID
            task_id: 任务 ID

        Returns:
            历史消息列表
        """
        try:
            from app.infrastructure.database.mongodb.client import mongodb_client

            history = await mongodb_client.agent_invoke_repository.get_task_history(
                conversation_id=conversation_id,
                task_id=task_id
            )

            return history

        except Exception as e:
            logger.error(f"获取任务历史失败 ({task_id}): {str(e)}")
            return []

    async def prepare_agent_tools(
        self,
        agent_config: Dict[str, Any],
        user_id: str,
        is_sub_agent: bool,
        conversation_id: str
    ) -> List[Dict[str, Any]]:
        """
        准备 Agent 工具（移除 agent_task_executor）

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
            for mcp_server in mcp_servers:
                try:
                    mcp_tools = await mcp_service.get_server_tools(mcp_server, user_id)
                    tools.extend(mcp_tools)
                except Exception as e:
                    logger.error(f"加载 MCP 工具失败 ({mcp_server}): {str(e)}")

        # 加载系统工具
        system_tool_names = agent_config.get("system_tools", []).copy()

        # 如果是 Sub Agent，移除 agent_task_executor（防止递归）
        if is_sub_agent and "agent_task_executor" in system_tool_names:
            system_tool_names.remove("agent_task_executor")
            logger.debug("Sub Agent: 已移除 agent_task_executor 工具")

        if system_tool_names:
            system_tools = get_system_tools_by_names(system_tool_names)
            tools.extend(system_tools)

        return tools
