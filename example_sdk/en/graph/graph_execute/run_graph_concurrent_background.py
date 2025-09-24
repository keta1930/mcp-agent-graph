import mag

def run_graph_concurrent_background():
    """Demonstrate concurrent execution of multiple graphs in background"""

    print("Starting concurrent execution of multiple graphs (background mode)...")

    # Define multiple tasks
    tasks = [
        {"name": "math_exam", "input": "Create a math test paper with a simple computational application problem."},
        {"name": "math_exam", "input": "Create a math test paper with a simple computational application problem."},
        {"name": "math_exam", "input": "Create a math test paper with a simple computational application problem."}
    ]

    # Start all graph executions
    conversation_ids = []

    # Simple handling for background execution
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

        print(f"Task {i} started, conversation ID: {conversation_id}")

    print(f"Started {len(conversation_ids)} concurrent tasks")
    print("You can use mag.get_conversation_detail(conversation_id) to check specific results")

if __name__ == "__main__":
    run_graph_concurrent_background()