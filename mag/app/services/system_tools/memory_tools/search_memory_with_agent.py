"""
系统工具：search_memory_with_agent
使用 Agent 任务搜索和整理记忆（上下文隔离）
"""
import logging
from typing import Dict, Any, Optional, AsyncGenerator
import json
import uuid

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format)
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "search_memory_with_agent",
            "description": "搜索相关的历史记忆。在执行任务前调用此工具，查找用户的偏好、约束、规范，以及你之前学到的执行经验，确保本次执行符合历史要求。",
            "parameters": {
                "type": "object",
                "properties": {
                    "search_request": {
                        "type": "string",
                        "description": "描述当前任务的类型和需要查找的记忆方向。说明你要做什么任务，需要哪些方面的规范或偏好。示例：'我要生成 Python API 代码，需要查找用户关于代码风格、文档生成、错误处理的偏好，以及我之前处理类似任务的经验'"
                    }
                },
                "required": ["search_request"]
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "search_memory_with_agent",
            "description": "Search relevant historical memories. Call this tool before executing tasks to find user preferences, constraints, specifications, and your previously learned execution experiences to ensure current execution meets historical requirements.",
            "parameters": {
                "type": "object",
                "properties": {
                    "search_request": {
                        "type": "string",
                        "description": "Describe the current task type and memory search direction. Explain what task you are doing and what aspects of specifications or preferences you need. Example: 'I am generating Python API code and need to find user preferences about code style, documentation generation, error handling, and my previous experience with similar tasks'"
                    }
                },
                "required": ["search_request"]
            }
        }
    }
}


async def handler(
    user_id: str,
    conversation_id: str,
    search_request: str,
    agent_id: Optional[str] = None,
    tool_call_id: Optional[str] = None,
    **kwargs
) -> AsyncGenerator:
    """
    使用 Agent 任务搜索记忆（流式执行）

    Args:
        user_id: 用户 ID
        conversation_id: 对话 ID
        search_request: 搜索请求描述
        agent_id: 当前 Agent ID（自动传入）
        tool_call_id: 工具调用 ID
        **kwargs: 其他参数

    Yields:
        - str: SSE 事件字符串
        - Dict: 最终结果
    """
    try:
        from app.services.agent.agent_stream_executor import AgentStreamExecutor
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.services.system_tools.registry import get_current_language
        from app.services.agent.sub_agent_task_service import sub_agent_task_service

        language = get_current_language()

        # 获取当前 Agent 信息
        if not agent_id:
            error_msg = "Missing agent_id parameter" if language == "en" else "缺少 agent_id 参数"
            yield {
                "success": False,
                "error": error_msg
            }
            return

        agent_name = agent_id

        # 获取 Agent 配置
        agent = await mongodb_client.agent_repository.get_agent(agent_name, user_id)
        if not agent:
            error_msg = f"Agent not found: {agent_name}" if language == "en" else f"Agent 不存在: {agent_name}"
            yield {
                "success": False,
                "error": error_msg
            }
            return

        agent_config = agent.get("agent_config", {})

        # 构建任务描述
        task_description = _build_task_description(search_request, language)

        # 创建任务 ID
        task_id = f"memory_search_{uuid.uuid4().hex[:8]}"

        # 创建任务
        await sub_agent_task_service.add_task(
            conversation_id=conversation_id,
            task_id=task_id,
            agent_name=agent_name
        )

        # 准备消息
        instruction = agent_config.get("instruction", "")
        messages = [
            {"role": "system", "content": instruction},
            {"role": "user", "content": task_description}
        ]

        # 准备工具（只提供记忆工具，不包含 agent_task_executor）
        memory_tools = [
            "list_memory_categories",
            "get_memory"
        ]

        agent_stream_executor = AgentStreamExecutor()
        tools = await agent_stream_executor._prepare_agent_tools(
            mcp_servers=[],  # 不使用 MCP
            system_tools=memory_tools,  # 只提供记忆工具
            user_id=user_id,
            conversation_id=conversation_id
        )

        # 获取模型配置
        model_name = agent_config.get("model")
        max_iterations = 15  # 给足够的轮次让 Agent 探索记忆

        # 发送任务开始事件
        yield f"data: {json.dumps({'type': 'task_start', 'task_id': task_id, 'agent_name': agent_name, 'task_description': task_description})}\n\n"

        # 执行流式任务
        final_result = None
        async for item in agent_stream_executor.run_agent_loop(
            agent_name=agent_name,
            model_name=model_name,
            messages=messages,
            tools=tools,
            mcp_servers=[],
            max_iterations=max_iterations,
            user_id=user_id,
            conversation_id=conversation_id,
            task_id=task_id
        ):
            if isinstance(item, str):
                # SSE 字符串，转发
                yield item
            else:
                # 最终结果字典
                final_result = item

        if not final_result:
            error_msg = "Memory search failed, no result" if language == "en" else "记忆搜索失败，未收到结果"
            # 发送任务错误事件
            yield f"data: {json.dumps({'type': 'task_error', 'task_id': task_id, 'error': {'message': error_msg}})}\n\n"
            yield {
                "success": False,
                "error": error_msg
            }
            return

        # 保存任务轮次
        task_messages = final_result.get("round_messages", [])
        await sub_agent_task_service.add_round_to_task(
            conversation_id=conversation_id,
            task_id=task_id,
            round_number=1,
            messages=task_messages,
            model=model_name,
            tool_call_id=tool_call_id
        )

        logger.info(f"✓ 记忆搜索任务完成: task_id={task_id}, tool_call_id={tool_call_id}")

        # 提取最终回复
        final_response = ""
        for msg in reversed(task_messages):
            if msg.get("role") == "assistant" and msg.get("content"):
                final_response = msg.get("content", "")
                break

        # 发送完成事件
        yield f"data: {json.dumps({'type': 'task_complete', 'task_id': task_id, 'agent_name': agent_name, 'success': True, 'result': final_response})}\n\n"

        # 返回结果
        yield {
            "success": True,
            "task_id": task_id,
            "memory_summary": final_response
        }

    except Exception as e:
        logger.error(f"search_memory_with_agent 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()

        error_msg = "Memory search failed" if language == "en" else "记忆搜索失败"
        # 发送任务错误事件
        yield f"data: {json.dumps({'type': 'task_error', 'task_id': task_id, 'error': {'message': f'{error_msg}: {str(e)}'}})}\n\n"
        yield {
            "success": False,
            "error": f"{error_msg}: {str(e)}"
        }


def _build_task_description(search_request: str, language: str) -> str:
    """
    构建任务描述（完全自主模式）

    Args:
        search_request: 搜索请求
        language: 语言

    Returns:
        任务描述文本
    """
    if language == "en":
        desc = f"Memory Search Request:\n{search_request}\n\n"
        desc += "Task Instructions:\n"
        desc += "1. First, use 'list_memory_categories' to explore available memory categories for both 'user' and 'self' (agent)\n"
        desc += "2. Based on the search request, determine which categories are most relevant\n"
        desc += "3. Use 'get_memory' to retrieve memories from the relevant categories\n"
        desc += "4. Analyze and organize the found memories\n"
        desc += "5. Provide a clear, concise summary of:\n"
        desc += "   - User preferences and requirements related to the search request\n"
        desc += "   - Your own (agent's) execution experiences and learned patterns\n"
        desc += "   - Key insights that should guide current actions\n\n"
        desc += "Important:\n"
        desc += "- Be thorough in exploring all potentially relevant categories\n"
        desc += "- Focus on actionable information\n"
        desc += "- If no relevant memories are found, clearly state that\n"
        desc += "- Your final response should be a well-organized summary, not raw memory data"
    else:
        desc = f"记忆搜索请求：\n{search_request}\n\n"
        desc += "任务说明：\n"
        desc += "1. 首先，使用 'list_memory_categories' 探索 'user'（用户）和 'self'（你自己）的所有可用记忆分类\n"
        desc += "2. 根据搜索请求，判断哪些分类最相关\n"
        desc += "3. 使用 'get_memory' 从相关分类中检索记忆\n"
        desc += "4. 分析和整理找到的记忆\n"
        desc += "5. 提供清晰、简洁的摘要，包括：\n"
        desc += "   - 与搜索请求相关的用户偏好和要求\n"
        desc += "   - 你自己（Agent）的执行经验和学到的模式\n"
        desc += "   - 应该指导当前行动的关键见解\n\n"
        desc += "重要提示：\n"
        desc += "- 彻底探索所有可能相关的分类\n"
        desc += "- 专注于可操作的信息\n"
        desc += "- 如果没有找到相关记忆，请明确说明\n"
        desc += "- 你的最终回复应该是组织良好的摘要，而不是原始记忆数据"

    return desc
