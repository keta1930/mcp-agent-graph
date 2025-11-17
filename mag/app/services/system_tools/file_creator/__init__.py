"""
会话文档系统工具模块
包含 7 个文件操作相关的系统工具
"""
from app.services.system_tools.registry import register_system_tool

# 导入所有工具
from . import list_all_files
from . import list_files_by_directory
from . import create_file
from . import update_file
from . import rewrite_file
from . import read_file
from . import delete_files

# 注册所有工具
register_system_tool(
    name="list_all_files",
    schema=list_all_files.TOOL_SCHEMA,
    handler=list_all_files.handler,
    category="file_creator"
)

register_system_tool(
    name="list_files_by_directory",
    schema=list_files_by_directory.TOOL_SCHEMA,
    handler=list_files_by_directory.handler,
    category="file_creator"
)

register_system_tool(
    name="create_file",
    schema=create_file.TOOL_SCHEMA,
    handler=create_file.handler,
    category="file_creator"
)

register_system_tool(
    name="update_file",
    schema=update_file.TOOL_SCHEMA,
    handler=update_file.handler,
    category="file_creator"
)

register_system_tool(
    name="rewrite_file",
    schema=rewrite_file.TOOL_SCHEMA,
    handler=rewrite_file.handler,
    category="file_creator"
)

register_system_tool(
    name="read_file",
    schema=read_file.TOOL_SCHEMA,
    handler=read_file.handler,
    category="file_creator"
)

register_system_tool(
    name="delete_files",
    schema=delete_files.TOOL_SCHEMA,
    handler=delete_files.handler,
    category="file_creator"
)

__all__ = [
    "list_all_files",
    "list_files_by_directory",
    "create_file",
    "update_file",
    "rewrite_file",
    "read_file",
    "delete_files"
]
