"""
JWT Token生成和验证模块

使用python-jose库进行JWT操作
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi import HTTPException, status

from app.core.config import settings


def create_access_token(user_id: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建JWT访问令牌

    Args:
        user_id: 用户ID
        role: 用户角色 (user|admin|super_admin)
        expires_delta: 可选的过期时间增量，如果不提供则使用配置中的默认值

    Returns:
        str: JWT令牌字符串

    Example:
        >>> token = create_access_token("zhangsan", "user")
        >>> print(token)  # eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    """
    # 准备payload
    now = datetime.utcnow()

    # 计算过期时间
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    # 构建token payload（按照设计文档的规范）
    payload: Dict[str, Any] = {
        "sub": user_id,          # Subject: 用户ID
        "role": role,            # 用户角色
        "iat": int(now.timestamp()),      # Issued At: 签发时间
        "exp": int(expire.timestamp())    # Expiration: 过期时间
    }

    # 生成JWT token
    encoded_jwt = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """
    验证JWT令牌并返回payload

    Args:
        token: JWT令牌字符串

    Returns:
        dict: 包含用户信息的字典，格式为 {"sub": user_id, "role": role, ...}

    Raises:
        HTTPException: 当token无效或过期时抛出401错误

    Example:
        >>> token = create_access_token("zhangsan", "user")
        >>> payload = verify_token(token)
        >>> print(payload["sub"])  # zhangsan
        >>> print(payload["role"])  # user
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的认证凭证",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # 解码JWT token
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
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
            detail=f"Token验证失败: {str(e)}",
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
