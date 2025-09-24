import mag
import time

def run_graph_background():
    """演示后台执行图（立即返回conversation_id）"""
    
    print("启动后台图执行...")
    
    # 后台执行图，立即返回conversation_id
    conversation_id = mag.run_graph(
        name="math_exam",
        input_text="出一张数学试卷，包含一道计算简单的应用题。",
        background=True
    )
    
    print(f"图已在后台启动，对话ID: \n{conversation_id}\n")
    print("您可以继续执行其他任务，图会在后台运行...")

if __name__ == "__main__":
    run_graph_background()