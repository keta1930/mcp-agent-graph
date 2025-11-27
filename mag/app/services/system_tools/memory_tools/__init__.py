"""
记忆系统工具模块
包含 6 个记忆操作相关的系统工具
"""
from app.services.system_tools.registry import register_system_tool

# 导入所有工具
from . import list_memory_categories
from . import get_memory
from . import add_memory
from . import update_memory
from . import delete_memory
from . import search_memory_with_agent

# 注册所有工具
register_system_tool(
    name="list_memory_categories",
    schema=list_memory_categories.TOOL_SCHEMA,
    handler=list_memory_categories.handler,
    category="memory_tools"
)

register_system_tool(
    name="get_memory",
    schema=get_memory.TOOL_SCHEMA,
    handler=get_memory.handler,
    category="memory_tools"
)

register_system_tool(
    name="add_memory",
    schema=add_memory.TOOL_SCHEMA,
    handler=add_memory.handler,
    category="memory_tools"
)

register_system_tool(
    name="update_memory",
    schema=update_memory.TOOL_SCHEMA,
    handler=update_memory.handler,
    category="memory_tools"
)

register_system_tool(
    name="delete_memory",
    schema=delete_memory.TOOL_SCHEMA,
    handler=delete_memory.handler,
    category="memory_tools"
)

register_system_tool(
    name="search_memory_with_agent",
    schema=search_memory_with_agent.TOOL_SCHEMA,
    handler=search_memory_with_agent.handler,
    category="memory_tools",
    is_streaming=True
)

__all__ = [
    "list_memory_categories",
    "get_memory",
    "add_memory",
    "update_memory",
    "delete_memory",
    "search_memory_with_agent"
]
