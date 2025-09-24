import mag
import json

def react_chat():
    """Demonstrate streaming output for temporary conversation (not saved to database)"""

    conversation_id = "test_002"

    response = mag.chat_completions(
            user_prompt="Please fetch the content from https://www.anthropic.com/news/tracing-thoughts-language-model and create a markdown table showing the key information about the model.",
            model="Qwen/Qwen3-235B-A22B-Thinking-2507",
            conversation_id=conversation_id,
            system_prompt="You are a friendly AI assistant, skilled at creating markdown tables.",
            mcp=["fetch"],
            stream=True
    )

    for chunk in response:
        # Handle AI response content
        if "choices" in chunk and chunk["choices"]:
            delta = chunk["choices"][0].get("delta", {})
            if delta.get("content"):
                print(delta["content"], end="", flush=True)
            if delta.get("reasoning_content"):
                print(delta["reasoning_content"], end="", flush=True)

        # Handle tool execution results
        if chunk.get("role") == "tool":
            tool_content = chunk.get("content", "")
            print(f"\n\n{tool_content}\n", flush=True)

    # # List conversation metadata
    # print("\n=== Conversation metadata ===")
    # metadata = mag.get_conversation_metadata(conversation_id)
    # print(f"Conversation metadata: {json.dumps(metadata, ensure_ascii=False, indent=2)}")
    #
    # # Get conversation details and save locally
    # print("\n=== Conversation details ===")
    # detail = mag.get_conversation_detail(conversation_id)
    # print(f"Number of conversation rounds: {len(detail['rounds'])}")
    #
    # # Save to local file
    # with open(f"conversation_{conversation_id}.json", "w", encoding="utf-8") as f:
    #     json.dump(detail, f, ensure_ascii=False, indent=2)
    # print(f"Conversation details saved to: conversation_{conversation_id}.json")
    #
    # # Delete conversation from database
    # delete = mag.permanently_delete_conversation(conversation_id)
    # print(f"Delete result: {delete}")

if __name__ == "__main__":
    react_chat()