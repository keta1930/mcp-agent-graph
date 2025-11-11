"""
系统工具模块
提供所有内置系统工具的统一入口
"""
from .registry import (
    register_system_tool,
    get_tool_schema,
    get_tool_handler,
    get_all_tool_schemas,
    get_tool_names,
    is_system_tool,
    get_system_tools_by_names,
    SYSTEM_TOOLS_REGISTRY
)

# 导入所有工具模块（触发注册）
from . import agent_tools
from . import conversation_document_tools

__all__ = [
    "register_system_tool",
    "get_tool_schema",
    "get_tool_handler",
    "get_all_tool_schemas",
    "get_tool_names",
    "is_system_tool",
    "get_system_tools_by_names",
    "SYSTEM_TOOLS_REGISTRY",
    "agent_tools",
    "conversation_document_tools"
]
