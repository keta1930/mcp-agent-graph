"""
认证模块

提供JWT Token生成/验证、密码加密、FastAPI认证依赖等功能
"""
from app.auth.jwt import create_access_token, verify_token, decode_token_without_verification
from app.auth.password import hash_password, verify_password, validate_password_strength
from app.auth.dependencies import (
    get_current_user,
    require_admin,
    require_super_admin,
    get_optional_user,
    security
)

__all__ = [
    # JWT函数
    "create_access_token",
    "verify_token",
    "decode_token_without_verification",

    # 密码函数
    "hash_password",
    "verify_password",
    "validate_password_strength",

    # FastAPI依赖
    "get_current_user",
    "require_admin",
    "require_super_admin",
    "get_optional_user",
    "security",
]
