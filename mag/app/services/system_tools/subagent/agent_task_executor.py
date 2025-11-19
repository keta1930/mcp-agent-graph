"""
系统工具：agent_task_executor
调用其他已注册的 Agent 执行特定任务（流式执行）
"""
import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
import json

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "agent_task_executor",
        "description": "调用其他已注册的 Agent 执行特定任务。支持同时创建一个或多个任务。你可以将复杂任务委托给专门的 Agent，它们会专注于完成任务并返回结果。建议先使用 list_agent_categories、list_agents_in_category、get_agent_details 工具查找合适的 Agent。",
        "parameters": {
            "type": "object",
            "properties": {
                "tasks": {
                    "type": "array",
                    "description": "要执行的任务列表（可以是单个或多个任务）",
                    "items": {
                        "type": "object",
                        "properties": {
                            "agent_name": {
                                "type": "string",
                                "description": "要调用的 Agent 名称（必须是已注册的 Agent）"
                            },
                            "task_id": {
                                "type": "string",
                                "description": "任务 ID。如果该 task 已存在，则子 Agent 会继承该 task 的完整历史继续执行；如果 task 不存在，则创建新 task"
                            },
                            "task_description": {
                                "type": "string",
                                "description": "任务描述，清晰说明要执行的任务内容和期望结果"
                            },
                            "context": {
                                "type": "string",
                                "description": "传递给 Agent 的上下文信息（可选）"
                            }
                        },
                        "required": ["agent_name", "task_id", "task_description"]
                    },
                    "minItems": 1
                }
            },
            "required": ["tasks"]
        }
    }
}


async def handler(
    user_id: str,
    conversation_id: str,
    tasks: List[Dict[str, Any]],
    tool_call_id: Optional[str] = None,
    **kwargs
) -> AsyncGenerator:
    """
    执行 Agent 任务（支持批量，流式执行）

    Args:
        user_id: 用户 ID
        conversation_id: 对话 ID
        tasks: 任务列表
        tool_call_id: 工具调用 ID（用于关联主对话）
        **kwargs: 其他参数

    Yields:
        - str: SSE 事件字符串
        - Dict: 最终结果
    """
    try:
        from app.services.agent.agent_stream_executor import AgentStreamExecutor
        from app.infrastructure.database.mongodb.client import mongodb_client

        agent_stream_executor = AgentStreamExecutor()
        results = []
        all_success = True

        # 执行每个任务
        for task in tasks:
            agent_name = task.get("agent_name")
            task_id = task.get("task_id")
            task_description = task.get("task_description")
            context = task.get("context", "")

            try:
                # 验证 Agent 是否存在
                agent = await mongodb_client.agent_repository.get_agent(agent_name, user_id)

                if not agent:
                    results.append({
                        "task_id": task_id,
                        "agent_name": agent_name,
                        "success": False,
                        "error": f"Agent 不存在: {agent_name}",
                        "error_type": "agent_not_found"
                    })
                    all_success = False
                    continue

                # 执行任务（流式）
                task_result = None
                async for item in execute_agent_task_stream(
                    agent_stream_executor=agent_stream_executor,
                    agent_name=agent_name,
                    task_id=task_id,
                    task_description=task_description,
                    context=context,
                    user_id=user_id,
                    conversation_id=conversation_id,
                    tool_call_id=tool_call_id
                ):
                    if isinstance(item, str):
                        # SSE 事件，转发
                        yield item
                    else:
                        # 最终结果
                        task_result = item

                if task_result:
                    results.append(task_result)
                    if not task_result.get("success"):
                        all_success = False

            except Exception as e:
                logger.error(f"执行任务失败 (task_id={task_id}, agent={agent_name}): {str(e)}")
                results.append({
                    "task_id": task_id,
                    "agent_name": agent_name,
                    "success": False,
                    "error": str(e),
                    "error_type": "execution_error"
                })
                all_success = False

        # 返回最终结果
        yield {
            "success": all_success,
            "results": results
        }

    except Exception as e:
        logger.error(f"agent_task_executor 流式执行失败: {str(e)}")
        yield {
            "success": False,
            "error": f"执行 Agent 任务失败: {str(e)}",
            "results": []
        }


async def execute_agent_task_stream(
    agent_stream_executor,
    agent_name: str,
    task_id: str,
    task_description: str,
    context: str,
    user_id: str,
    conversation_id: str,
    tool_call_id: Optional[str] = None
) -> AsyncGenerator:
    """
    执行单个 Agent 任务（流式）

    Args:
        agent_stream_executor: Agent 流式执行器
        agent_name: Agent 名称
        task_id: 任务 ID
        task_description: 任务描述
        context: 上下文信息
        user_id: 用户 ID
        conversation_id: 对话 ID
        tool_call_id: 工具调用 ID（用于关联主对话）

    Yields:
        - str: SSE 事件字符串
        - Dict: 最终结果
    """
    try:
        from app.services.agent.sub_agent_task_service import sub_agent_task_service
        from app.infrastructure.database.mongodb.client import mongodb_client

        # 检查 task 是否已存在
        task_history = await get_task_history(conversation_id, task_id)

        # 构建消息
        messages = await build_task_messages(
            agent_name=agent_name,
            task_description=task_description,
            context=context,
            task_history=task_history,
            user_id=user_id
        )

        # 如果 task 不存在，创建新 task
        if not task_history:
            await sub_agent_task_service.add_task(
                conversation_id=conversation_id,
                task_id=task_id,
                agent_name=agent_name
            )

        # 获取 Agent 配置
        agent = await mongodb_client.agent_repository.get_agent(agent_name, user_id)
        agent_config = agent.get("agent_config", {})
        model_name = agent_config.get("model")
        max_iterations = agent_config.get("max_actions", 50)

        # 准备工具（移除 agent_task_executor 防止递归）
        tools = await agent_stream_executor._prepare_agent_tools(
            mcp_servers=agent_config.get("mcp", []),
            system_tools=[t for t in agent_config.get("system_tools", []) if t != "agent_task_executor"],
            user_id=user_id,
            conversation_id=conversation_id
        )

        # 发送 task 开始事件
        yield f"data: {json.dumps({'type': 'task_start', 'task_id': task_id, 'agent_name': agent_name, 'task_description': task_description})}\n\n"

        # 执行流式任务，收集所有数据
        final_result = None
        async for item in agent_stream_executor.run_agent_loop(
            agent_name=agent_name,
            model_name=model_name,
            messages=messages,
            tools=tools,
            mcp_servers=agent_config.get("mcp", []),
            max_iterations=max_iterations,
            user_id=user_id,
            conversation_id=conversation_id,
            task_id=task_id  # 传递 task_id，标识为 Sub Agent
        ):
            if isinstance(item, str):
                # SSE 字符串，转发
                yield item
            else:
                # 最终结果字典
                final_result = item

        if not final_result:
            yield {
                "task_id": task_id,
                "agent_name": agent_name,
                "success": False,
                "error": "执行失败，未收到结果"
            }
            return

        # 保存 task round（包含 tool_call_id）
        task_messages = final_result.get("round_messages", [])
        current_round = await sub_agent_task_service.get_task(conversation_id, task_id)
        round_number = len(current_round.get("rounds", [])) + 1 if current_round else 1

        await sub_agent_task_service.add_round_to_task(
            conversation_id=conversation_id,
            task_id=task_id,
            round_number=round_number,
            messages=task_messages,
            model=model_name,
            tool_call_id=tool_call_id  # 关联主对话的工具调用 ID
        )
        
        logger.info(f"✓ 保存 task round 成功: task_id={task_id}, round={round_number}, tool_call_id={tool_call_id}")

        # 提取最终回复
        final_response = ""
        for msg in reversed(task_messages):
            if msg.get("role") == "assistant" and msg.get("content"):
                final_response = msg.get("content", "")
                break

        # 发送 task 完成事件
        yield f"data: {json.dumps({'type': 'task_complete', 'task_id': task_id, 'agent_name': agent_name, 'result': final_response})}\n\n"

        # 返回最终结果
        yield {
            "task_id": task_id,
            "agent_name": agent_name,
            "success": True,
            "result": final_response
        }

    except Exception as e:
        logger.error(f"执行 Agent 任务失败 ({task_id}, {agent_name}): {str(e)}")
        
        # 发送 task 失败事件
        yield f"data: {json.dumps({'type': 'task_error', 'task_id': task_id, 'agent_name': agent_name, 'error': str(e)})}\n\n"
        
        # 返回错误结果
        yield {
            "task_id": task_id,
            "agent_name": agent_name,
            "success": False,
            "error": str(e)
        }


async def build_task_messages(
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
        from app.services.agent.sub_agent_task_service import sub_agent_task_service

        history = await sub_agent_task_service.get_task_history(
            conversation_id=conversation_id,
            task_id=task_id
        )

        return history

    except Exception as e:
        logger.error(f"获取任务历史失败 ({task_id}): {str(e)}")
        return []

