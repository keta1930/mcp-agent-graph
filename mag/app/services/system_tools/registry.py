"""
系统工具注册表
提供系统工具的注册和获取机制
"""
import logging
from contextvars import ContextVar
from typing import Dict, List, Any, Optional, Callable

logger = logging.getLogger(__name__)

# 存储当前请求的用户语言
_current_user_language: ContextVar[str] = ContextVar('user_language', default='zh')

# 全局系统工具注册表
SYSTEM_TOOLS_REGISTRY: Dict[str, Dict[str, Any]] = {}


def set_user_language_context(language: str):
    """
    设置当前请求的用户语言上下文
    
    Args:
        language: 用户语言代码 ("zh" 或 "en")
    """
    _current_user_language.set(language)
    logger.debug(f"设置用户语言上下文: {language}")


def get_current_language() -> str:
    """
    获取当前请求的用户语言
    
    Returns:
        用户语言代码，默认为 "zh"
    """
    return _current_user_language.get()


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
    获取工具 Schema（自动根据当前语言返回对应版本）

    Args:
        tool_name: 工具名称

    Returns:
        工具 schema，不存在返回 None
    """
    tool = SYSTEM_TOOLS_REGISTRY.get(tool_name)
    if not tool:
        return None
    
    schema = tool.get("schema")
    
    # schema 必须是多语言格式 {"zh": {...}, "en": {...}}
    if isinstance(schema, dict) and "zh" in schema and "en" in schema:
        language = get_current_language()
        # 根据当前语言上下文返回对应版本，如果不存在则返回中文版本
        return schema.get(language, schema.get("zh"))
    
    # 如果不是多语言格式，记录警告并返回 None
    logger.warning(f"工具 {tool_name} 的 schema 不是多语言格式，必须包含 'zh' 和 'en' 键")
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
    获取所有系统工具 Schemas（自动根据当前语言返回对应版本）

    Returns:
        工具 schema 列表
    """
    language = get_current_language()
    schemas = []
    
    for tool_name, tool in SYSTEM_TOOLS_REGISTRY.items():
        schema = tool["schema"]
        
        # schema 必须是多语言格式
        if isinstance(schema, dict) and "zh" in schema and "en" in schema:
            # 返回当前语言的版本
            schemas.append(schema.get(language, schema.get("zh")))
        else:
            # 不是多语言格式，记录警告并跳过
            logger.warning(f"工具 {tool_name} 的 schema 不是多语言格式，已跳过")
    
    return schemas


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
    按类别获取工具（自动根据当前语言返回对应版本）
    
    Returns:
        {
            "agent_tools": [
                {"name": "tool1", "schema": {...}},
                {"name": "tool2", "schema": {...}}
            ],
            "conversation_document_tools": [...]
        }
    """
    language = get_current_language()
    categorized_tools: Dict[str, List[Dict[str, Any]]] = {}
    
    for tool_name, tool_info in SYSTEM_TOOLS_REGISTRY.items():
        category = tool_info.get("category", "uncategorized")
        schema = tool_info.get("schema")
        
        # schema 必须是多语言格式
        if isinstance(schema, dict) and "zh" in schema and "en" in schema:
            # 返回当前语言的版本
            schema = schema.get(language, schema.get("zh"))
            
            if category not in categorized_tools:
                categorized_tools[category] = []
            
            categorized_tools[category].append({
                "name": tool_name,
                "schema": schema
            })
        else:
            # 不是多语言格式，记录警告并跳过
            logger.warning(f"工具 {tool_name} 的 schema 不是多语言格式，已跳过")
    
    return categorized_tools
