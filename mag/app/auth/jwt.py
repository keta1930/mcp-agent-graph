"""
JWT Token生成和验证模块

支持双Token机制：
- Access Token: 短期访问令牌（15分钟）
- Refresh Token: 长期刷新令牌（7天）
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from jose import JWTError, jwt
from fastapi import HTTPException, status
import secrets

from app.core.config import settings


def create_tokens(user_id: str, role: str) -> Tuple[str, str, str, datetime]:
    """
    创建访问令牌和刷新令牌

    Args:
        user_id: 用户ID
        role: 用户角色 (user|admin|super_admin)

    Returns:
        Tuple[str, str, str, datetime]: (access_token, refresh_token, refresh_token_id, refresh_expires_at)

    Example:
        >>> access, refresh, jti, exp = create_tokens("zhangsan", "user")
    """
    now = datetime.utcnow()

    # 1. 创建 Access Token (15分钟)
    access_expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    access_payload = {
        "sub": user_id,
        "role": role,
        "type": "access",  # 标记Token类型
        "iat": int(now.timestamp()),
        "exp": int(access_expire.timestamp())
    }
    access_token = jwt.encode(
        access_payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    # 2. 创建 Refresh Token (7天)
    refresh_expire = now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token_id = secrets.token_urlsafe(32)  # 生成唯一ID

    refresh_payload = {
        "sub": user_id,
        "type": "refresh",  # 标记Token类型
        "jti": refresh_token_id,  # Token唯一ID（用于数据库存储和撤销）
        "iat": int(now.timestamp()),
        "exp": int(refresh_expire.timestamp())
    }
    refresh_token = jwt.encode(
        refresh_payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return access_token, refresh_token, refresh_token_id, refresh_expire


def create_access_token(user_id: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建JWT访问令牌（兼容旧接口）

    Args:
        user_id: 用户ID
        role: 用户角色 (user|admin|super_admin)
        expires_delta: 可选的过期时间增量

    Returns:
        str: JWT令牌字符串

    Note:
        这个函数保留是为了向后兼容，建议使用 create_tokens()
    """
    now = datetime.utcnow()

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }

    encoded_jwt = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """
    验证JWT令牌并返回payload（兼容旧接口）

    Args:
        token: JWT令牌字符串

    Returns:
        dict: 包含用户信息的字典

    Raises:
        HTTPException: 当token无效或过期时抛出401错误

    Note:
        这个函数保留是为了向后兼容，建议使用 verify_access_token()
    """
    return verify_access_token(token)


def verify_access_token(token: str) -> Dict[str, Any]:
    """
    验证访问令牌

    Args:
        token: Access Token字符串

    Returns:
        dict: 包含用户信息的字典，格式为 {"sub": user_id, "role": role, ...}

    Raises:
        HTTPException: 当token无效、过期或类型错误时抛出401错误

    Example:
        >>> payload = verify_access_token(token)
        >>> print(payload["sub"])  # zhangsan
        >>> print(payload["role"])  # user
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的访问令牌",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # 解码JWT token
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )

        # 验证Token类型
        token_type = payload.get("type")
        if token_type and token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token类型错误，需要Access Token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 验证必要字段
        user_id: Optional[str] = payload.get("sub")
        role: Optional[str] = payload.get("role")

        if user_id is None or role is None:
            raise credentials_exception

        return payload

    except JWTError as e:
        # JWT解码失败或token过期
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Access Token验证失败: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_refresh_token(token: str) -> Dict[str, Any]:
    """
    验证刷新令牌

    Args:
        token: Refresh Token字符串

    Returns:
        dict: 包含用户信息的字典，格式为 {"sub": user_id, "jti": token_id, ...}

    Raises:
        HTTPException: 当token无效、过期或类型错误时抛出401错误

    Example:
        >>> payload = verify_refresh_token(token)
        >>> print(payload["sub"])  # zhangsan
        >>> print(payload["jti"])  # token_id
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的刷新令牌",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # 解码JWT token
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )

        # 验证Token类型
        token_type = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token类型错误，需要Refresh Token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 验证必要字段
        user_id: Optional[str] = payload.get("sub")
        token_id: Optional[str] = payload.get("jti")

        if user_id is None or token_id is None:
            raise credentials_exception

        return payload

    except JWTError as e:
        # JWT解码失败或token过期
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Refresh Token验证失败: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def decode_token_without_verification(token: str) -> Optional[Dict[str, Any]]:
    """
    解码JWT令牌但不验证（用于调试或特殊场景）

    警告: 此函数不验证签名和过期时间，仅用于调试目的

    Args:
        token: JWT令牌字符串

    Returns:
        dict: 解码后的payload，如果解码失败返回None
    """
    try:
        payload = jwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": False}
        )
        return payload
    except JWTError:
        return None
