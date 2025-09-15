import mag
import json

def react_chat():
    """演示临时对话的流式输出（不保存到数据库）"""

    conversation_id = "test_002"

    response = mag.chat_completions(
            user_prompt="请获取 https://www.anthropic.com/news/tracing-thoughts-language-model 页面内容，并制作一个markdown表格展示模型的关键信息。",
            model="Qwen/Qwen3-235B-A22B-Thinking-2507",
            conversation_id=conversation_id,
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

    # # 列出对话元数据
    # print("\n=== 对话元数据 ===")
    # metadata = mag.get_conversation_metadata(conversation_id)
    # print(f"对话元数据: {json.dumps(metadata, ensure_ascii=False, indent=2)}")
    #
    # # 获取对话详情并保存到本地
    # print("\n=== 对话详情 ===")
    # detail = mag.get_conversation_detail(conversation_id)
    # print(f"对话详情轮次数: {len(detail['rounds'])}")
    #
    # # 保存到本地文件
    # with open(f"conversation_{conversation_id}.json", "w", encoding="utf-8") as f:
    #     json.dump(detail, f, ensure_ascii=False, indent=2)
    # print(f"对话详情已保存到: conversation_{conversation_id}.json")
    #
    # # 从数据库中删除对话
    # delete = mag.permanently_delete_conversation(conversation_id)
    # print(f"删除结果: {delete}")

if __name__ == "__main__":
    react_chat()