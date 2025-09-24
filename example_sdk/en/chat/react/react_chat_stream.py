import mag
import json

def react_chat():
    """Demonstrate streaming output for temporary conversation (not saved to database)"""

    response = mag.chat_completions(
            user_prompt="Please fetch the content from https://www.anthropic.com/news/tracing-thoughts-language-model and create a markdown table showing the key information about the model.",
            model="Qwen/Qwen3-235B-A22B-Thinking-2507",
            conversation_id=None,
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

if __name__ == "__main__":
    react_chat()