import mag
import json

def run_graph_basic():
    """演示基础的图执行（非流式，等待完成后返回结果）"""

    result = mag.run_graph(
        name="math_exam",
        input_text="出一张数学试卷，包含两道应用题。",
        stream=False
    )

    # 打印完整的执行结果
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    run_graph_basic()