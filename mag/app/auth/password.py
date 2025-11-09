"""
密码加密和验证模块

使用bcrypt进行密码哈希和验证
"""
import bcrypt
from typing import Optional


def hash_password(password: str) -> str:
    """
    使用bcrypt加密密码

    Args:
        password: 明文密码

    Returns:
        str: bcrypt加密后的密码哈希（字符串格式）

    Example:
        >>> hashed = hash_password("mypassword123")
        >>> print(hashed)  # $2b$12$...
    """
    # 生成salt并加密密码
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)

    # 返回字符串格式（便于存储到MongoDB）
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码是否匹配

    Args:
        plain_password: 明文密码
        hashed_password: 存储的密码哈希

    Returns:
        bool: True表示密码匹配，False表示不匹配

    Example:
        >>> hashed = hash_password("mypassword123")
        >>> verify_password("mypassword123", hashed)
        True
        >>> verify_password("wrongpassword", hashed)
        False
    """
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        # 如果验证过程出错，返回False
        return False


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    验证密码强度

    根据设计文档要求：至少8个字符

    Args:
        password: 要验证的密码

    Returns:
        tuple[bool, Optional[str]]: (是否有效, 错误消息)

    Example:
        >>> validate_password_strength("short")
        (False, "密码长度至少为8个字符")
        >>> validate_password_strength("validpass123")
        (True, None)
    """
    if not password:
        return False, "密码不能为空"

    if len(password) < 8:
        return False, "密码长度至少为8个字符"

    # 可以根据需要添加更多验证规则
    # 例如：包含大小写字母、数字、特殊字符等

    return True, None
