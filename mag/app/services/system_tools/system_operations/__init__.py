"""
系统运营工具集
提供系统级别的查询和管理功能
"""
from app.services.system_tools.registry import register_system_tool

# 导入所有工具
from . import list_all_models
from . import list_all_mcps
from . import get_mcp_details
from . import list_all_graphs
from . import get_graph_details
from . import list_all_prompts
from . import get_prompt_content

# 注册所有工具
register_system_tool(
    name="list_all_models",
    schema=list_all_models.TOOL_SCHEMA,
    handler=list_all_models.handler,
    category="system_operations"
)

register_system_tool(
    name="list_all_mcps",
    schema=list_all_mcps.TOOL_SCHEMA,
    handler=list_all_mcps.handler,
    category="system_operations"
)

register_system_tool(
    name="get_mcp_details",
    schema=get_mcp_details.TOOL_SCHEMA,
    handler=get_mcp_details.handler,
    category="system_operations"
)

register_system_tool(
    name="list_all_graphs",
    schema=list_all_graphs.TOOL_SCHEMA,
    handler=list_all_graphs.handler,
    category="system_operations"
)

register_system_tool(
    name="get_graph_details",
    schema=get_graph_details.TOOL_SCHEMA,
    handler=get_graph_details.handler,
    category="system_operations"
)

register_system_tool(
    name="list_all_prompts",
    schema=list_all_prompts.TOOL_SCHEMA,
    handler=list_all_prompts.handler,
    category="system_operations"
)

register_system_tool(
    name="get_prompt_content",
    schema=get_prompt_content.TOOL_SCHEMA,
    handler=get_prompt_content.handler,
    category="system_operations"
)

__all__ = [
    "list_all_models",
    "list_all_mcps",
    "get_mcp_details",
    "list_all_graphs",
    "get_graph_details",
    "list_all_prompts",
    "get_prompt_content"
]
