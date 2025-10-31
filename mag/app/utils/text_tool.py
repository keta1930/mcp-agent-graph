import re
import hashlib

def calculate_sentence_length(text: str) -> int:
    english_words = len([word for word in re.findall(r'[a-zA-Z]+', text)])
    chinese_chars = len([char for char in text if '\u4e00' <= char <= '\u9fff'])
    punctuation_marks = len(re.findall(r'[^\w\s]', text))  
    return english_words + chinese_chars + punctuation_marks  

def detect_language(text: str) -> str:
    """
    检测文本主要使用的语言，支持中英文混合文本
    中文按字符计数，英文按单词计数
    返回 'zh' 表示中文为主，'en' 表示英文为主

    示例:
    - "Hello World" -> 2个英文单词
    - "你好世界" -> 4个中文字符
    - "我在learning英文" -> 2个中文字符 + 1个英文单词
    """
    # 使用正则表达式分离中文和英文
    # 英文单词匹配模式：连续的字母（不区分大小写）
    english_pattern = r'[a-zA-Z]+'
    # 提取所有英文单词
    english_words = re.findall(english_pattern, text)
    english_count = len(english_words)

    # 统计中文字符
    chinese_chars = len([char for char in text if '\u4e00' <= char <= '\u9fff'])
    return 'zh' if chinese_chars > english_count else 'en'

def calculate_text_hash(text: str, algorithm: str = 'md5') -> str:
    """
    计算文本的哈希值，用于文本块去重和唯一标识
    
    Args:
        text: 输入文本
        algorithm: 哈希算法，支持 'md5', 'sha1', 'sha256'
        
    Returns:
        str: 十六进制格式的哈希值
        
    Examples:
        >>> calculate_text_hash("Hello World")
        'b10a8db164e0754105b7a99be72e3fe5'
        >>> calculate_text_hash("Hello World", "sha256")  
        'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e'
    """
    # 标准化文本：去除首尾空白，统一换行符
    normalized_text = text.strip().replace('\r\n', '\n').replace('\r', '\n')
    
    # 编码为UTF-8字节
    text_bytes = normalized_text.encode('utf-8')
    
    # 根据算法选择哈希函数
    if algorithm == 'md5':
        hash_obj = hashlib.md5(text_bytes)
    elif algorithm == 'sha1':
        hash_obj = hashlib.sha1(text_bytes)
    elif algorithm == 'sha256':
        hash_obj = hashlib.sha256(text_bytes)
    else:
        raise ValueError(f"不支持的哈希算法: {algorithm}。支持的算法: md5, sha1, sha256")
    
    return hash_obj.hexdigest()