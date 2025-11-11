"""
系统工具：agent_task_executor
调用其他已注册的 Agent 执行特定任务
"""
import logging
from typing import Dict, Any, List
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
    **kwargs
) -> Dict[str, Any]:
    """
    执行 Agent 任务（支持批量）

    Args:
        user_id: 用户 ID
        conversation_id: 对话 ID
        tasks: 任务列表
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "results": [
                {
                    "task_id": "task_001",
                    "agent_name": "research_agent",
                    "success": True,
                    "result": "任务完成的详细结果..."
                },
                ...
            ]
        }
    """
    try:
        # 导入 AgentExecutor（延迟导入避免循环依赖）
        from app.services.agent.agent_executor import AgentExecutor
        from app.infrastructure.database.mongodb.client import mongodb_client

        agent_executor = AgentExecutor()
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

                # 执行任务
                task_result = await agent_executor.execute_agent_task(
                    agent_name=agent_name,
                    task_id=task_id,
                    task_description=task_description,
                    context=context,
                    user_id=user_id,
                    conversation_id=conversation_id
                )

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

        # 返回结果
        return {
            "success": all_success,
            "results": results
        }

    except Exception as e:
        logger.error(f"agent_task_executor 执行失败: {str(e)}")
        return {
            "success": False,
            "error": f"执行 Agent 任务失败: {str(e)}",
            "results": []
        }
