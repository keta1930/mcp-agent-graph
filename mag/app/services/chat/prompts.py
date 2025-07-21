# -*- coding: utf-8 -*-
"""
聊天服务提示词模板
存储中英文提示词，用于各种聊天场景
"""

# ===== 工具内容智能压缩提示词 =====

SUMMARIZE_TOOL_CONTENT_ZH = """你是一位信息处理专家，擅长分析和重新组织大量文本数据。

任务：分析以下内容，提取和保留所有有价值的信息，同时优化其组织结构。

文本内容：
{content}

分析要求：
- 仔细分析内容，识别核心信息和辅助信息
- 保留所有可用于追溯和引用的关键数据
- 去除格式冗余、重复内容和装饰性文字
- 重新组织信息层次，让内容更清晰易读
- 直接输出处理后的内容，无需说明或引导语
"""

SUMMARIZE_TOOL_CONTENT_EN = """You are an information processing expert, skilled at analyzing and reorganizing large volumes of text data.

Task: Analyze the following content, extract and preserve all valuable information while optimizing its organizational structure.

Text Content:
{content}

Analysis Requirements:
- Carefully analyze content to identify core information vs auxiliary information  
- Preserve all key data that can be used for tracing and referencing
- Remove format redundancy, repetitive content, and decorative text
- Reorganize information hierarchy for clearer readability
- Output processed content directly without explanations or introductory phrases
"""

# ===== 对话标题生成提示词 =====

GENERATE_TITLE_ZH = """请为以下对话生成一个简洁的中文标题和相关标签。

要求：
1. 标题不超过10个字，简洁准确
2. 标签3-5个，体现对话的主要内容和领域
3. 必须严格按照XML格式输出

用户: {user_message}
助手: {assistant_message}

请按照以下XML格式输出：
<title>对话标题</title>
<tags>标签1,标签2,标签3</tags>"""

GENERATE_TITLE_EN = """Please generate a concise English title and relevant tags for the following conversation.

Requirements:
1. Title: no more than 8 words, concise and accurate
2. Tags: 3-5 tags reflecting main content and domain
3. Must output in strict XML format

User: {user_message}
Assistant: {assistant_message}

Please output in the following XML format:
<title>Conversation Title</title>
<tags>tag1,tag2,tag3</tags>"""

# ===== 提示词选择函数 =====

def get_summarize_prompt(language: str = "zh") -> str:
    """获取工具内容总结提示词"""
    if language.lower() == "en":
        return SUMMARIZE_TOOL_CONTENT_EN
    return SUMMARIZE_TOOL_CONTENT_ZH

def get_title_prompt(language: str = "zh") -> str:
    """获取标题生成提示词"""
    if language.lower() == "en":
        return GENERATE_TITLE_EN
    return GENERATE_TITLE_ZH