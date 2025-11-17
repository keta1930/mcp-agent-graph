"""
会话文档工具的公共函数
"""
import os

# 支持的文本文件扩展名
ALLOWED_TEXT_EXTENSIONS = {
    '.md', '.txt', '.py', '.js', '.ts', '.tsx', '.jsx',
    '.json', '.yaml', '.yml', '.xml', '.html', '.css',
    '.sql', '.sh', '.bash', '.env', '.gitignore',
    '.java', '.cpp', '.c', '.h', '.go', '.rs', '.rb',
    '.php', '.swift', '.kt', '.scala', '.r', '.m', ''
}


def is_text_file(filename: str) -> bool:
    """检查是否为文本文件"""
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_TEXT_EXTENSIONS


def validate_filename(filename: str) -> tuple:
    """
    验证文件名安全性

    Returns:
        (is_valid, error_message)
    """
    # 禁止路径穿越
    if '..' in filename or filename.startswith('/'):
        return False, "文件名不能包含'..'或以'/'开头"

    # 禁止特殊字符（但允许/用于目录结构）
    invalid_chars = ['\\', ':', '*', '?', '"', '<', '>', '|']
    for char in invalid_chars:
        if char in filename:
            return False, f"文件名不能包含特殊字符: {char}"

    # 检查文件类型
    if not is_text_file(filename):
        ext = os.path.splitext(filename)[1]
        return False, f"不支持的文件类型: {ext}。只支持文本文件"

    return True, ""
