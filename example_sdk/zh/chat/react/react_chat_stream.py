import mag
import json

def react_chat():
    """演示临时对话的流式输出（不保存到数据库）"""

    response = mag.chat_completions(
            user_prompt="请获取 https://www.anthropic.com/news/tracing-thoughts-language-model 页面内容，并制作一个markdown表格展示模型的关键信息。",
            model="Qwen/Qwen3-235B-A22B-Thinking-2507",
            conversation_id=None,
            system_prompt="你是一个友善的AI助手，擅长制作markdown表格。",
            mcp=["fetch"],
            stream=True
    )

    for chunk in response:
        # 处理AI回复内容
        if "choices" in chunk and chunk["choices"]:
            delta = chunk["choices"][0].get("delta", {})
            if delta.get("content"):
                print(delta["content"], end="", flush=True)
            if delta.get("reasoning_content"):
                print(delta["reasoning_content"], end="", flush=True)

        # 处理工具调用结果
        if chunk.get("role") == "tool":
            tool_content = chunk.get("content", "")
            print(f"\n\n{tool_content}\n", flush=True)

if __name__ == "__main__":
    react_chat()