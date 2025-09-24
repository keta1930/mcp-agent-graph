import mag
import json
from datetime import datetime


def react_chat():
    """Non-streaming call comparison"""

    try:
        response = mag.chat_completions(
            user_prompt="What content does this page discuss: https://www.anthropic.com/news/tracing-thoughts-language-model",
            model="deepseek-reasoner", # Need to register this model first
            conversation_id=None,  # This conversation is temporary and not saved to database, you can also delete this line
            system_prompt="Friendly AI assistant, good at brief answers, please don't use long text.",
            mcp=["fetch"], # Can add more mcp, such as ["fetch", "search"]
            user_id="default_user", # Can delete this line, defaults to default_user, can customize user name
            stream=False # Whether to return results in streaming mode, defaults to False
        )

        # Print creation time (convert to readable format)
        print(f"created: {datetime.fromtimestamp(response['created']).strftime('%Y-%m-%d %H:%M:%S')}")
        # Return format: 'YYYY-MM-DD HH:MM:SS' string, e.g., '2025-09-15 16:18:50'

        # Print messages
        print(f"messages: {json.dumps(response['messages'], ensure_ascii=False, indent=2)}")
        # Return format: List containing dictionary elements, each dictionary contains 'role', 'content' and other fields
        # Complete example: [
        #   {'role': 'system', 'content': 'System prompt'},
        #   {'role': 'user', 'content': 'User question'},
        #   {'role': 'assistant', 'content': 'I will help you process', 'tool_calls': [{'id': 'call_xxx', 'type': 'function', 'function': {'name': 'tool_name', 'arguments': '{...}'}}]},
        #   {'role': 'tool', 'tool_call_id': 'call_xxx', 'content': 'Tool execution result'},
        #   {'role': 'assistant', 'content': 'Final answer based on tool results'}
        # ]
        # Think models do not include reasoning field

        # Print output
        print(f"output: {response['output']}")
        # Return format: String containing AI's final answer content

        # Print usage
        print(f"usage: {response['usage']}")
        # Return format: Dictionary containing token usage statistics
        # Example: {'completion_tokens': 300, 'prompt_tokens': 4360, 'total_tokens': 4660, ...}

    except Exception as e:
        print(f"❌ Call error: {e}")


if __name__ == "__main__":
    react_chat()