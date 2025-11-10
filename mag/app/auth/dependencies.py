"""
FastAPI认证依赖注入模块

提供用于路由保护的依赖函数
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.jwt import verify_token
from app.models.auth_schema import CurrentUser


# 定义HTTPBearer认证scheme
# 使用HTTPBearer
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    """
    从JWT Token中获取当前用户信息

    这是一个FastAPI依赖函数，用于保护需要认证的路由。
    它从Authorization header中提取Bearer token，验证后返回当前用户信息。

    Args:
        credentials: HTTPBearer自动从请求头中提取的认证凭证

    Returns:
        CurrentUser: 当前登录用户的信息

    Raises:
        HTTPException: 当token无效、过期或格式错误时抛出401错误

    Usage:
        @router.get("/protected")
        async def protected_route(current_user: CurrentUser = Depends(get_current_user)):
            return {"user_id": current_user.user_id, "role": current_user.role}
    """
    # 提取token（credentials.credentials就是Bearer后面的token字符串）
    token = credentials.credentials

    # 验证token并获取payload
    payload = verify_token(token)

    # 构造CurrentUser对象
    current_user = CurrentUser(
        user_id=payload["sub"],
        role=payload["role"]
    )

    return current_user


async def require_admin(
    current_user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    """
    要求管理员权限的依赖

    验证当前用户是否为管理员（admin或super_admin）

    Args:
        current_user: 当前用户信息（由get_current_user依赖提供）

    Returns:
        CurrentUser: 当前用户信息（已验证为管理员）

    Raises:
        HTTPException: 当用户不是管理员时抛出403错误

    Usage:
        @router.post("/admin/users")
        async def admin_only_route(current_user: CurrentUser = Depends(require_admin)):
            return {"message": "Admin access granted"}
    """
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )

    return current_user


async def require_super_admin(
    current_user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    """
    要求超级管理员权限的依赖

    验证当前用户是否为超级管理员

    Args:
        current_user: 当前用户信息（由get_current_user依赖提供）

    Returns:
        CurrentUser: 当前用户信息（已验证为超级管理员）

    Raises:
        HTTPException: 当用户不是超级管理员时抛出403错误

    Usage:
        @router.delete("/admin/users/{user_id}")
        async def super_admin_only_route(
            user_id: str,
            current_user: CurrentUser = Depends(require_super_admin)
        ):
            return {"message": "Super admin access granted"}
    """
    if not current_user.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要超级管理员权限"
        )

    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[CurrentUser]:
    """
    可选的用户认证依赖

    如果提供了token则验证，否则返回None。
    适用于某些路由既支持匿名访问又支持登录用户访问的场景。

    Args:
        credentials: 可选的认证凭证

    Returns:
        Optional[CurrentUser]: 如果提供了有效token则返回用户信息，否则返回None

    Usage:
        @router.get("/public-or-private")
        async def mixed_route(current_user: Optional[CurrentUser] = Depends(get_optional_user)):
            if current_user:
                return {"message": f"Hello {current_user.user_id}"}
            else:
                return {"message": "Hello anonymous"}
    """
    if credentials is None:
        return None

    try:
        token = credentials.credentials
        payload = verify_token(token)
        return CurrentUser(
            user_id=payload["sub"],
            role=payload["role"]
        )
    except HTTPException:
        # Token无效时返回None而不是抛出异常
        return None
