"""
Task Manager 系统工具
提供任务的规范获取和注册功能
"""
from ..registry import register_system_tool

# 导入工具模块
from . import get_task_spec
from . import register_task

# 注册工具
register_system_tool(
    name="get_task_spec",
    schema=get_task_spec.TOOL_SCHEMA,
    handler=get_task_spec.handler,
    category="task_manager"
)

register_system_tool(
    name="register_task",
    schema=register_task.TOOL_SCHEMA,
    handler=register_task.handler,
    category="task_manager"
)

__all__ = [
    "get_task_spec",
    "register_task"
]
