import mag

def run_graph_concurrent_background():
    """演示后台并发执行多个图"""
    
    print("开始并发执行多个图（后台模式）...")
    
    # 定义多个任务
    tasks = [
        {"name": "math_exam", "input": "出一张数学试卷，包含一道计算简单的应用题。"},
        {"name": "math_exam", "input": "出一张数学试卷，包含一道计算简单的应用题。"},
        {"name": "math_exam", "input": "出一张数学试卷，包含一道计算简单的应用题。"}
    ]
    
    # 启动所有图执行
    conversation_ids = []

    # 由于后台运行，这里简便处理
    for i, task in enumerate(tasks, 1):
        conversation_id = mag.run_graph(
            name=task["name"],
            input_text=task["input"],
            background=True
        )
        
        conversation_ids.append({
            "id": conversation_id,
            "task_num": i,
            "description": task["input"][:30] + "..."
        })
        
        print(f"任务 {i} 已启动，对话ID: {conversation_id}")

    print(f"共启动了 {len(conversation_ids)} 个并发任务")
    print("您可以使用 mag.get_conversation_detail(conversation_id) 查看具体结果")

if __name__ == "__main__":
    run_graph_concurrent_background()