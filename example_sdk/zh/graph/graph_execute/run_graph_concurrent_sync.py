import mag
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

def execute_single_graph(task_info):
    """执行单个图任务"""
    task_num, graph_name, input_text = task_info
    
    try:
        # 非后台执行，等待完成
        result = mag.run_graph(
            name=graph_name,
            input_text=input_text,
            stream=False,
            background=False
        )

        # 获取结果摘要
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
    """演示非后台并发执行多个图（同时执行，等待全部完成）"""
    
    print("开始并发执行多个图（非后台模式）...")
    
    # 定义多个任务
    tasks = [
        (1, "math_exam", "出一张数学试卷，包含一道计算简单的应用题。"),
        (2, "math_exam", "出一张数学试卷，包含一道计算简单的应用题。"),
        (3, "math_exam", "出一张数学试卷，包含一道计算简单的应用题。")
    ]

    
    # 使用线程池并发执行
    with ThreadPoolExecutor(max_workers=3) as executor:
        # 提交所有任务
        future_to_task = {executor.submit(execute_single_graph, task): task for task in tasks}
        
        print(f"已提交 {len(tasks)} 个并发任务到线程池")
        
        # 收集结果
        results = []
        for future in as_completed(future_to_task):
            result = future.result()
            results.append(result)
            
            if result["success"]:
                print(f"✓ 任务 {result['task_num']} 完成 - 耗时: {result['execution_time']:.2f}秒")
            else:
                print(f"✗ 任务 {result['task_num']} 失败 - 耗时: {result['execution_time']:.2f}秒")

if __name__ == "__main__":
    run_graph_concurrent_sync()