import mag
import json
from datetime import datetime


def react_chat():
    """非流式调用对比"""

    try:
        response = mag.chat_completions(
            user_prompt="这个页面讲了什么内容：https://www.anthropic.com/news/tracing-thoughts-language-model",
            model="deepseek-reasoner", # 需要先注册这个模型
            conversation_id=None,  # 本次对话为临时对话，不存入数据库，也可以直接删除该行代码
            system_prompt="友善的AI助手，擅长简短的回答，请勿使用长文。",
            mcp=["fetch"], # 可以添加更多mcp，如 ["fetch", "search"]
            user_id="default_user", # 可以删除该行代码，默认为default_user，可以自定义用户名称
            stream=False # 是否流式返回结果，默认为False
        )

        # 打印创建时间（转换为可读格式）
        print(f"created: {datetime.fromtimestamp(response['created']).strftime('%Y-%m-%d %H:%M:%S')}")
        # 返回格式: 'YYYY-MM-DD HH:MM:SS' 字符串，如 '2025-09-15 16:18:50'

        # 打印messages
        print(f"messages: {json.dumps(response['messages'], ensure_ascii=False, indent=2)}")
        # 返回格式: 列表，包含字典元素，每个字典包含 'role', 'content' 等字段
        # 完整示例: [
        #   {'role': 'system', 'content': '系统提示词'},
        #   {'role': 'user', 'content': '用户问题'},
        #   {'role': 'assistant', 'content': '我来帮您处理', 'tool_calls': [{'id': 'call_xxx', 'type': 'function', 'function': {'name': 'tool_name', 'arguments': '{...}'}}]},
        #   {'role': 'tool', 'tool_call_id': 'call_xxx', 'content': '工具执行结果'},
        #   {'role': 'assistant', 'content': '基于工具结果的最终回答'}
        # ]
        # think模型不包含reasoning字段

        # 打印output
        print(f"output: {response['output']}")
        # 返回格式: 字符串，包含AI的最终回答内容

        # 打印usage
        print(f"usage: {response['usage']}")
        # 返回格式: 字典，包含token使用统计
        # 示例: {'completion_tokens': 300, 'prompt_tokens': 4360, 'total_tokens': 4660, ...}

    except Exception as e:
        print(f"❌ 调用出错: {e}")


if __name__ == "__main__":
    react_chat()