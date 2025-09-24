import mag
import json


def conversation_management_demo():
    """Demonstrate conversation management related SDK functionality"""

    conversation_id = "test_001"

    # 1. List conversations
    print("=== 1. List conversations ===")
    conversations = mag.list_conversations()
    print(json.dumps(conversations, ensure_ascii=False, indent=2))

    # 2. Get conversation details
    print("\n=== 2. Get conversation details ===")
    try:
        detail = mag.get_conversation_detail(conversation_id)
        print(json.dumps(detail, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Failed to get conversation details: {e}")

    # 3. Get conversation metadata
    print("\n=== 3. Get conversation metadata ===")
    try:
        metadata = mag.get_conversation_metadata(conversation_id)
        print(json.dumps(metadata, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Failed to get conversation metadata: {e}")

    # 4. Update conversation title
    print("\n=== 4. Update conversation title ===")
    try:
        title_result = mag.update_conversation_title(conversation_id, "New conversation title")
        print(json.dumps(title_result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Failed to update conversation title: {e}")

    # 5. Update conversation tags
    print("\n=== 5. Update conversation tags ===")
    try:
        tags_result = mag.update_conversation_tags(conversation_id, ["AI", "chat", "test"])
        print(json.dumps(tags_result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Failed to update conversation tags: {e}")

    # 6. Update conversation status to favorite
    print("\n=== 6. Update conversation status to favorite ===")
    try:
        status_result = mag.update_conversation_status(conversation_id, "favorite")
        print(json.dumps(status_result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Failed to update conversation status: {e}")

    # 7. Compact conversation content
    print("\n=== 7. Compact conversation content ===")
    try:
        compact_result = mag.compact_conversation(
            conversation_id=conversation_id,
            model_name="deepseek-chat",
            compact_type="simple",  # "simple": Simple compression, keep system prompts, user messages and last assistant message per round
                                    # "smart": Smart compression, use AI to summarize long tool content
            compact_threshold=2000  # Compression threshold, tool content exceeding this length will be summarized (100-10000)
        )
        print(json.dumps(compact_result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Failed to compact conversation: {e}")

    # 8. Permanently delete conversation (commented out to avoid accidental deletion)
    print("\n=== 8. Permanently delete conversation ===")
    print("# Permanent deletion operation is commented out, uncomment to test if needed")
    # try:
    #     delete_result = mag.permanently_delete_conversation(conversation_id)
    #     print(json.dumps(delete_result, ensure_ascii=False, indent=2))
    # except Exception as e:
    #     print(f"Failed to permanently delete conversation: {e}")


if __name__ == "__main__":
    conversation_management_demo()