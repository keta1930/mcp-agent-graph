"""
系统工具注册表
提供系统工具的注册和获取机制
"""
import logging
from typing import Dict, List, Any, Optional, Callable

logger = logging.getLogger(__name__)

# 全局系统工具注册表
SYSTEM_TOOLS_REGISTRY: Dict[str, Dict[str, Any]] = {}


def register_system_tool(
    name: str,
    schema: Dict[str, Any],
    handler: Callable
):
    """
    注册系统工具

    Args:
        name: 工具名称
        schema: 工具 schema（OpenAI tool format）
        handler: 工具处理函数

    Example:
        register_system_tool(
            name="tool_name",
            schema={...},
            handler=my_handler_function
        )
    """
    SYSTEM_TOOLS_REGISTRY[name] = {
        "schema": schema,
        "handler": handler
    }
    logger.debug(f"注册系统工具: {name}")


def get_tool_schema(tool_name: str) -> Optional[Dict[str, Any]]:
    """
    获取工具 Schema

    Args:
        tool_name: 工具名称

    Returns:
        工具 schema，不存在返回 None
    """
    tool = SYSTEM_TOOLS_REGISTRY.get(tool_name)
    if tool:
        return tool.get("schema")
    return None


def get_tool_handler(tool_name: str) -> Optional[Callable]:
    """
    获取工具处理函数

    Args:
        tool_name: 工具名称

    Returns:
        工具处理函数，不存在返回 None
    """
    tool = SYSTEM_TOOLS_REGISTRY.get(tool_name)
    if tool:
        return tool.get("handler")
    return None


def get_all_tool_schemas() -> List[Dict[str, Any]]:
    """
    获取所有系统工具 Schemas

    Returns:
        工具 schema 列表
    """
    return [tool["schema"] for tool in SYSTEM_TOOLS_REGISTRY.values()]


def get_tool_names() -> List[str]:
    """
    获取所有系统工具名称

    Returns:
        工具名称列表
    """
    return list(SYSTEM_TOOLS_REGISTRY.keys())


def is_system_tool(tool_name: str) -> bool:
    """
    检查是否为系统工具

    Args:
        tool_name: 工具名称

    Returns:
        是系统工具返回 True，否则返回 False
    """
    return tool_name in SYSTEM_TOOLS_REGISTRY


def get_system_tools_by_names(tool_names: List[str]) -> List[Dict[str, Any]]:
    """
    根据工具名称列表获取工具 Schemas

    Args:
        tool_names: 工具名称列表

    Returns:
        工具 schema 列表
    """
    schemas = []
    for tool_name in tool_names:
        schema = get_tool_schema(tool_name)
        if schema:
            schemas.append(schema)
        else:
            logger.warning(f"系统工具未找到: {tool_name}")
    return schemas
