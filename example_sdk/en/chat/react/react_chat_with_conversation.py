import mag
import json


def react_chat():
    """Demonstrate persistent conversation capability of the dialogue system"""

    conversation_id = "test_001"

    # First conversation
    print("=== First conversation ===")
    response1 = mag.chat_completions(
        user_prompt="Please fetch the content from https://ollama.com/library/qwen3:235b and provide a brief summary.",
        model="deepseek-reasoner",
        conversation_id=conversation_id,
        system_prompt="You are a friendly AI assistant, skilled at web content analysis.",
        mcp=["fetch"],
        stream=False
    )

    print(f"First output: {response1['output']}\n")
    print(f"\nFirst messages: {json.dumps(response1['messages'], ensure_ascii=False, indent=2)}\n")

    # Second conversation (using same conversation_id)
    print("\n=== Second conversation ===")
    response2 = mag.chat_completions(
        user_prompt="Based on the page content we just fetched, please create a markdown table to display information about this model.",
        model="deepseek-chat",  # deepseek-reasoner does not support Function Calling
        conversation_id=conversation_id,
        stream=False
    )

    print(f"Second output: {response2['output']}\n")
    print(f"\nSecond messages: {json.dumps(response2['messages'], ensure_ascii=False, indent=2)}\n")

    # List conversation metadata
    print("\n=== Conversation metadata ===")
    metadata = mag.get_conversation_metadata(conversation_id)
    print(f"Conversation metadata: {json.dumps(metadata, ensure_ascii=False, indent=2)}")

    # Get conversation details and save locally
    print("\n=== Conversation details ===")
    detail = mag.get_conversation_detail(conversation_id)
    print(f"Number of conversation rounds: {len(detail['rounds'])}")

    # Save to local file
    with open(f"conversation_{conversation_id}.json", "w", encoding="utf-8") as f:
        json.dump(detail, f, ensure_ascii=False, indent=2)
    print(f"Conversation details saved to: conversation_{conversation_id}.json")

    # Delete conversation from database
    # delete = mag.permanently_delete_conversation(conversation_id)
    # print(f"Delete result: {delete}")


if __name__ == "__main__":
    react_chat()