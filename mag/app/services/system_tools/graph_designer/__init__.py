"""
Graph 设计工具模块
提供 Graph 设计、导出和注册相关的系统工具
"""
from app.services.system_tools.registry import register_system_tool

# 导入所有工具
from . import get_graph_spec
from . import export_graph_to_document
from . import register_graph_from_document

# 注册所有工具
register_system_tool(
    name="get_graph_spec",
    schema=get_graph_spec.TOOL_SCHEMA,
    handler=get_graph_spec.handler,
    category="graph_designer"
)

register_system_tool(
    name="export_graph_to_document",
    schema=export_graph_to_document.TOOL_SCHEMA,
    handler=export_graph_to_document.handler,
    category="graph_designer"
)

register_system_tool(
    name="register_graph_from_document",
    schema=register_graph_from_document.TOOL_SCHEMA,
    handler=register_graph_from_document.handler,
    category="graph_designer"
)

__all__ = [
    "get_graph_spec",
    "export_graph_to_document",
    "register_graph_from_document"
]
