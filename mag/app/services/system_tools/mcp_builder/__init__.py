"""
MCP构建器系统工具
提供MCP工具的规范获取和注册功能
"""
import logging
from ..registry import register_system_tool

logger = logging.getLogger(__name__)

# 导入工具模块
from . import get_mcp_spec
from . import register_mcp

# 注册工具
register_system_tool(
    name="get_mcp_spec",
    schema=get_mcp_spec.TOOL_SCHEMA,
    handler=get_mcp_spec.handler,
    category="mcp_builder"
)

register_system_tool(
    name="register_mcp",
    schema=register_mcp.TOOL_SCHEMA,
    handler=register_mcp.handler,
    category="mcp_builder"
)

logger.info("MCP构建器工具已注册：get_mcp_spec, register_mcp")
