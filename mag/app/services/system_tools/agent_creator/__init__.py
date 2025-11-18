"""
Agent 创建器系统工具
提供 Agent 的规范获取、导出和注册功能
"""
from ..registry import register_system_tool

# 导入工具模块
from . import get_agent_spec
from . import export_agent_to_document
from . import register_agent

# 注册工具
register_system_tool(
    name="get_agent_spec",
    schema=get_agent_spec.TOOL_SCHEMA,
    handler=get_agent_spec.handler,
    category="agent_creator"
)

register_system_tool(
    name="export_agent_to_document",
    schema=export_agent_to_document.TOOL_SCHEMA,
    handler=export_agent_to_document.handler,
    category="agent_creator"
)

register_system_tool(
    name="register_agent",
    schema=register_agent.TOOL_SCHEMA,
    handler=register_agent.handler,
    category="agent_creator"
)

__all__ = [
    "get_agent_spec",
    "export_agent_to_document",
    "register_agent"
]
