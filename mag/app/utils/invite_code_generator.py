"""
邀请码生成工具

生成形如 TEAM-ABC123 的邀请码
"""
import secrets
import string


def generate_invite_code(prefix: str = "TEAM", length: int = 6) -> str:
    """
    生成随机邀请码

    Args:
        prefix: 邀请码前缀，默认为 "TEAM"
        length: 随机部分的长度，默认为 6

    Returns:
        str: 生成的邀请码，格式为 {prefix}-{random}

    Example:
        >>> code = generate_invite_code()
        >>> print(code)  # TEAM-ABC123
        >>> code = generate_invite_code("ADMIN", 8)
        >>> print(code)  # ADMIN-ABCD1234
    """
    # 使用大写字母和数字生成随机字符串
    characters = string.ascii_uppercase + string.digits
    random_suffix = ''.join(secrets.choice(characters) for _ in range(length))

    return f"{prefix}-{random_suffix}"
