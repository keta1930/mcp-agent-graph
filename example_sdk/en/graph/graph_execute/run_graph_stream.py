import mag
import json

def run_graph_stream():
    """Demonstrate streaming graph execution"""

    response = mag.run_graph(
        name="math_exam",
        input_text="Create a math test paper with a simple application problem.",
        stream=True,
        background=False
    )

    for chunk in response:
        # Handle error messages
        if chunk.get("error"):
            error_msg = chunk["error"].get("message", "Unknown error")
            print(f"\nError: {error_msg}")
            continue

        # Handle conversation creation event
        if chunk.get("type") == "conversation_created":
            conversation_id = chunk.get("conversation_id", "")
            print(f"\nConversation created: {conversation_id}")
            continue

        # Handle node execution status
        if chunk.get("type") == "node_start":
            node_name = chunk.get("node_name", "")
            print(f"\n[Starting node: {node_name}]\n")

        elif chunk.get("type") == "node_end":
            node_name = chunk.get("node_name", "")
            print(f"\n[Node completed: {node_name}]\n")

        # Handle streaming messages
        elif chunk.get("choices") and chunk["choices"]:
            delta = chunk["choices"][0].get("delta", {})

            # Handle reasoning content
            if delta.get("reasoning_content"):
                print(f"{delta['reasoning_content']}", end="", flush=True)

            # Handle regular content
            if delta.get("content"):
                print(delta["content"], end="", flush=True)

            # Handle tool calls
            if delta.get("tool_calls"):
                for tool_call in delta["tool_calls"]:
                    if tool_call.get("function"):
                        func_name = tool_call["function"].get("name", "")
                        if func_name:
                            print(f"\nCalling tool: {func_name}")

        # Handle tool execution results
        elif chunk.get("role") == "tool":
            tool_content = chunk.get("content", "")
            print(f"\nTool result:{tool_content}\n")

        # Handle graph completion event
        elif chunk.get("type") == "graph_complete":
            print("\nGraph execution completed!")

if __name__ == "__main__":
    run_graph_stream()