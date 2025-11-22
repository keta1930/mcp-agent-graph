"""
权限验证工具

提供资源访问权限验证的通用函数
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def can_access_resource(
    resource: Dict[str, Any],
    user_id: str,
    require_owner: bool = False
) -> bool:
    """
    验证用户是否可访问资源

    访问规则：
    1. 用户是资源所有者 -> 允许所有操作
    2. 其他情况 -> 拒绝访问

    Args:
        resource: 资源对象（需包含user_id字段）
        user_id: 当前用户ID
        require_owner: 是否要求所有者权限（修改/删除操作需设为True）

    Returns:
        bool: 是否有权限访问

    Examples:
        # 检查读权限
        if can_access_resource(graph_doc, current_user_id, require_owner=False):
            return graph_doc

        # 检查写权限
        if can_access_resource(graph_doc, current_user_id, require_owner=True):
            # 允许修改
            pass
    """
    if not resource:
        return False

    # 检查所有者
    resource_owner = resource.get("user_id")
    if resource_owner == user_id:
        return True

    logger.debug(
        f"Access denied: User {user_id} is not the owner (owner: {resource_owner})"
    )
    return False


def verify_resource_ownership(
    resource: Dict[str, Any],
    user_id: str,
    resource_type: str = "resource"
) -> None:
    """
    验证用户是否为资源所有者，如果不是则抛出异常

    用于需要所有者权限的操作（修改、删除等）

    Args:
        resource: 资源对象
        user_id: 当前用户ID
        resource_type: 资源类型名称（用于错误消息）

    Raises:
        ValueError: 当用户不是资源所有者时

    Examples:
        verify_resource_ownership(graph_doc, current_user_id, "graph")
    """
    if not resource:
        raise ValueError(f"{resource_type} not found")

    resource_owner = resource.get("user_id")
    if resource_owner != user_id:
        logger.warning(
            f"Permission denied: User {user_id} attempted to access {resource_type} "
            f"owned by {resource_owner}"
        )
        raise ValueError(
            f"You do not have permission to access this {resource_type}. "
            f"Only the owner can perform this operation."
        )


def verify_resource_access(
    resource: Dict[str, Any],
    user_id: str,
    resource_type: str = "resource"
) -> None:
    """
    验证用户是否可以访问资源（读权限），如果不能则抛出异常

    Args:
        resource: 资源对象
        user_id: 当前用户ID
        resource_type: 资源类型名称（用于错误消息）

    Raises:
        ValueError: 当用户无权访问时

    Examples:
        verify_resource_access(graph_doc, current_user_id, "graph")
    """
    if not resource:
        raise ValueError(f"{resource_type} not found")

    # 检查所有者
    resource_owner = resource.get("user_id")
    if resource_owner == user_id:
        return

    logger.warning(
        f"Permission denied: User {user_id} attempted to access {resource_type} "
        f"owned by {resource_owner}"
    )
    raise ValueError(
        f"You do not have permission to access this {resource_type}."
    )
