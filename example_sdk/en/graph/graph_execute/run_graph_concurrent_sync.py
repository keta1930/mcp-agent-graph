import mag
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

def execute_single_graph(task_info):
    """Execute single graph task"""
    task_num, graph_name, input_text = task_info

    try:
        # Non-background execution, wait for completion
        result = mag.run_graph(
            name=graph_name,
            input_text=input_text,
            stream=False,
            background=False
        )

        # Get result summary
        rounds = result.get('rounds', [])
        conversation_id = result.get('_id', 'unknown')
        final_output = result.get('final_result', '')

        return {
            "task_num": task_num,
            "conversation_id": conversation_id,
            "rounds_count": len(rounds),
            "final_output": final_output,
            "success": True,
            "description": input_text[:30] + "..."
        }

    except Exception as e:
        return {
            "task_num": task_num,
            "success": False,
            "error": str(e),
            "description": input_text[:30] + "..."
        }

def run_graph_concurrent_sync():
    """Demonstrate concurrent execution of multiple graphs (non-background mode, execute simultaneously and wait for all to complete)"""

    print("Starting concurrent execution of multiple graphs (non-background mode)...")

    # Define multiple tasks
    tasks = [
        (1, "math_exam", "Create a math test paper with a simple computational application problem."),
        (2, "math_exam", "Create a math test paper with a simple computational application problem."),
        (3, "math_exam", "Create a math test paper with a simple computational application problem.")
    ]


    # Use thread pool for concurrent execution
    with ThreadPoolExecutor(max_workers=3) as executor:
        # Submit all tasks
        future_to_task = {executor.submit(execute_single_graph, task): task for task in tasks}

        print(f"Submitted {len(tasks)} concurrent tasks to thread pool")

        # Collect results
        results = []
        for future in as_completed(future_to_task):
            result = future.result()
            results.append(result)

            if result["success"]:
                print(f"✓ Task {result['task_num']} completed - Duration: {result['execution_time']:.2f}s")
            else:
                print(f"✗ Task {result['task_num']} failed - Duration: {result['execution_time']:.2f}s")

if __name__ == "__main__":
    run_graph_concurrent_sync()