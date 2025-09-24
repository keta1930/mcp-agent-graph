import mag

def run_graph_stream():
    """演示流式执行图（实时输出）"""

    response = mag.run_graph(
        name="math_exam",
        input_text="出一张数学试卷，包含两道应用题。",
        stream=True
    )

    for chunk in response:
        # 处理节点执行状态
        if chunk.get("type") == "node_start":
            node_name = chunk.get("node_name", "")
            print(f"\n[开始执行节点: {node_name}]")

        elif chunk.get("type") == "node_complete":
            node_name = chunk.get("node_name", "")
            print(f"[节点完成: {node_name}]\n")

        # 处理AI回复内容
        elif chunk.get("type") == "ai_response":
            content = chunk.get("content", "")
            if content:
                print(content, end="", flush=True)

        # 处理工具调用结果
        elif chunk.get("type") == "tool_result":
            tool_content = chunk.get("content", "")
            print(f"\n\n{tool_content}\n", flush=True)

if __name__ == "__main__":
    run_graph_stream()