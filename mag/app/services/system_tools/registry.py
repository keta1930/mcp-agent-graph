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
    handler: Callable,
    category: str = "uncategorized"
):
    """
    注册系统工具

    Args:
        name: 工具名称
        schema: 工具 schema（OpenAI tool format）
        handler: 工具处理函数
        category: 工具类别（可选，默认为 "uncategorized"）

    Example:
        register_system_tool(
            name="tool_name",
            schema={...},
            handler=my_handler_function,
            category="agent_tools"
        )
    """
    SYSTEM_TOOLS_REGISTRY[name] = {
        "schema": schema,
        "handler": handler,
        "category": category
    }
    logger.debug(f"注册系统工具: {name} (类别: {category})")


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


def get_tools_by_category() -> Dict[str, List[Dict[str, Any]]]:
    """
    按类别获取工具
    
    Returns:
        {
            "agent_tools": [
                {"name": "tool1", "schema": {...}},
                {"name": "tool2", "schema": {...}}
            ],
            "conversation_document_tools": [...]
        }
    """
    categorized_tools: Dict[str, List[Dict[str, Any]]] = {}
    
    for tool_name, tool_info in SYSTEM_TOOLS_REGISTRY.items():
        category = tool_info.get("category", "uncategorized")
        schema = tool_info.get("schema")
        
        if category not in categorized_tools:
            categorized_tools[category] = []
        
        categorized_tools[category].append({
            "name": tool_name,
            "schema": schema
        })
    
    return categorized_tools
