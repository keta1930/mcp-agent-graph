import mag
import json


def conversation_management_demo():
    """演示对话管理相关的SDK功能"""

    conversation_id = "test_001"

    # 1. 列出对话列表
    print("=== 1. 列出对话列表 ===")
    conversations = mag.list_conversations()
    print(json.dumps(conversations, ensure_ascii=False, indent=2))

    # 2. 获取对话详情
    print("\n=== 2. 获取对话详情 ===")
    try:
        detail = mag.get_conversation_detail(conversation_id)
        print(json.dumps(detail, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"获取对话详情失败: {e}")

    # 3. 获取对话元数据
    print("\n=== 3. 获取对话元数据 ===")
    try:
        metadata = mag.get_conversation_metadata(conversation_id)
        print(json.dumps(metadata, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"获取对话元数据失败: {e}")

    # 4. 更新对话标题
    print("\n=== 4. 更新对话标题 ===")
    try:
        title_result = mag.update_conversation_title(conversation_id, "新的对话标题")
        print(json.dumps(title_result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"更新对话标题失败: {e}")

    # 5. 更新对话标签
    print("\n=== 5. 更新对话标签 ===")
    try:
        tags_result = mag.update_conversation_tags(conversation_id, ["AI", "聊天", "测试"])
        print(json.dumps(tags_result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"更新对话标签失败: {e}")

    # 6. 更新对话状态为收藏
    print("\n=== 6. 更新对话状态为收藏 ===")
    try:
        status_result = mag.update_conversation_status(conversation_id, "favorite")
        print(json.dumps(status_result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"更新对话状态失败: {e}")

    # 7. 压缩对话内容
    print("\n=== 7. 压缩对话内容 ===")
    try:
        compact_result = mag.compact_conversation(
            conversation_id=conversation_id,
            model_name="deepseek-chat",
            compact_type="simple",  # "simple": 简单压缩，保留每轮的系统提示词、用户消息和最后一个assistant消息
                                   # "smart": 智能压缩，对长工具内容进行AI总结
            compact_threshold=2000  # 压缩阈值，超过此长度的tool content将被总结（100-10000）
        )
        print(json.dumps(compact_result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"压缩对话失败: {e}")

    # 8. 永久删除对话（注释掉，避免误删）
    print("\n=== 8. 永久删除对话 ===")
    print("# 永久删除操作已注释，如需测试请取消注释")
    # try:
    #     delete_result = mag.permanently_delete_conversation(conversation_id)
    #     print(json.dumps(delete_result, ensure_ascii=False, indent=2))
    # except Exception as e:
    #     print(f"永久删除对话失败: {e}")


if __name__ == "__main__":
    conversation_management_demo()