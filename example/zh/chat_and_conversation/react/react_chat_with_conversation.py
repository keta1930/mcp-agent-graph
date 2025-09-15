import mag
import json


def react_chat():
    """演示对话系统的持久化对话能力"""

    conversation_id = "test_001"

    # 第一次对话
    print("=== 第一次对话 ===")
    response1 = mag.chat_completions(
        user_prompt="请获取 https://ollama.com/library/qwen3:235b 这个页面的内容，并简要总结一下。",
        model="deepseek-reasoner",
        conversation_id=conversation_id,
        system_prompt="你是一个友善的AI助手，擅长网页内容分析。",
        mcp=["fetch"],
        stream=False
    )

    print(f"第一次output: {response1['output']}\n")
    print(f"\n第一次messages: {json.dumps(response1['messages'], ensure_ascii=False, indent=2)}\n")

    # 第二次对话（使用相同conversation_id）
    print("\n=== 第二次对话 ===")
    response2 = mag.chat_completions(
        user_prompt="请基于刚才获取的页面内容，制作一个markdown 表格来展示这个模型的信息。",
        model="deepseek-chat",  # deepseek-reasoner 不支持 Function Calling
        conversation_id=conversation_id,
        stream=False
    )

    print(f"第二次output: {response2['output']}\n")
    print(f"\n第二次messages: {json.dumps(response2['messages'], ensure_ascii=False, indent=2)}\n")

    # 列出对话元数据
    print("\n=== 对话元数据 ===")
    metadata = mag.get_conversation_metadata(conversation_id)
    print(f"对话元数据: {json.dumps(metadata, ensure_ascii=False, indent=2)}")

    # 获取对话详情并保存到本地
    print("\n=== 对话详情 ===")
    detail = mag.get_conversation_detail(conversation_id)
    print(f"对话详情轮次数: {len(detail['rounds'])}")

    # 保存到本地文件
    with open(f"conversation_{conversation_id}.json", "w", encoding="utf-8") as f:
        json.dump(detail, f, ensure_ascii=False, indent=2)
    print(f"对话详情已保存到: conversation_{conversation_id}.json")

    # 从数据库中删除对话
    # delete = mag.permanently_delete_conversation(conversation_id)
    # print(f"删除结果: {delete}")


if __name__ == "__main__":
    react_chat()