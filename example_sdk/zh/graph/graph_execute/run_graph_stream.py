import mag
import json

def run_graph_stream():
    """演示流式执行图"""

    response = mag.run_graph(
        name="math_exam",
        input_text="出一张数学试卷，包含一道简单应用题。",
        stream=True,
        background=False
    )
    
    for chunk in response:
        # 处理错误消息
        if chunk.get("error"):
            error_msg = chunk["error"].get("message", "未知错误")
            print(f"\n错误: {error_msg}")
            continue
        
        # 处理对话创建事件
        if chunk.get("type") == "conversation_created":
            conversation_id = chunk.get("conversation_id", "")
            print(f"\n对话已创建: {conversation_id}")
            continue
        
        # 处理节点执行状态
        if chunk.get("type") == "node_start":
            node_name = chunk.get("node_name", "")
            print(f"\n[开始执行节点: {node_name}]\n")
        
        elif chunk.get("type") == "node_end":
            node_name = chunk.get("node_name", "")
            print(f"\n[节点完成: {node_name}]\n")
        
        # 处理流式消息
        elif chunk.get("choices") and chunk["choices"]:
            delta = chunk["choices"][0].get("delta", {})
            
            # 处理推理内容
            if delta.get("reasoning_content"):
                print(f"{delta['reasoning_content']}", end="", flush=True)
            
            # 处理普通内容
            if delta.get("content"):
                print(delta["content"], end="", flush=True)
            
            # 处理工具调用
            if delta.get("tool_calls"):
                for tool_call in delta["tool_calls"]:
                    if tool_call.get("function"):
                        func_name = tool_call["function"].get("name", "")
                        if func_name:
                            print(f"\n调用工具: {func_name}")
        
        # 处理工具执行结果
        elif chunk.get("role") == "tool":
            tool_content = chunk.get("content", "")
            print(f"\n工具结果:{tool_content}\n")
        
        # 处理图完成事件
        elif chunk.get("type") == "graph_complete":
            print("\n图执行完成！")

if __name__ == "__main__":
    run_graph_stream()