"""
Agent 系统工具模块
包含 4 个 Agent 相关的系统工具
"""
from app.services.system_tools.registry import register_system_tool

# 导入所有工具
from . import list_categories
from . import list_agents_in_category
from . import get_agent_details
from . import agent_task_executor

# 注册所有工具
register_system_tool(
    name="list_agent_categories",
    schema=list_categories.TOOL_SCHEMA,
    handler=list_categories.handler,
    category="subagent"
)

register_system_tool(
    name="list_agents_in_category",
    schema=list_agents_in_category.TOOL_SCHEMA,
    handler=list_agents_in_category.handler,
    category="subagent"
)

register_system_tool(
    name="get_agent_details",
    schema=get_agent_details.TOOL_SCHEMA,
    handler=get_agent_details.handler,
    category="subagent"
)

register_system_tool(
    name="agent_task_executor",
    schema=agent_task_executor.TOOL_SCHEMA,
    handler=agent_task_executor.handler,
    category="subagent"
)

__all__ = [
    "list_categories",
    "list_agents_in_category",
    "get_agent_details",
    "agent_task_executor"
]
