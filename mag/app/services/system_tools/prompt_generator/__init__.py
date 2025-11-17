"""
Prompt 生成器系统工具
提供 Prompt 的规范获取和注册功能
"""
from ..registry import register_system_tool

# 导入工具模块
from . import get_prompt_spec
from . import register_prompt

# 注册工具
register_system_tool(
    name="get_prompt_spec",
    schema=get_prompt_spec.TOOL_SCHEMA,
    handler=get_prompt_spec.handler,
    category="prompt_generator"
)

register_system_tool(
    name="register_prompt",
    schema=register_prompt.TOOL_SCHEMA,
    handler=register_prompt.handler,
    category="prompt_generator"
)

__all__ = [
    "get_prompt_spec",
    "register_prompt"
]
