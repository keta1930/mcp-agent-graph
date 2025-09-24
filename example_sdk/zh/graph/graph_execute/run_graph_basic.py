import mag
import json

def run_graph_basic():
    """演示基础的图执行（非流式，等待完成后返回结果）"""
    
    # 执行图并等待完成
    result = mag.run_graph(
        name="math_exam",
        input_text="出一张数学试卷，包含一道计算简单的应用题。",
        stream=False,
        background=False
    )
    
    # 打印conversation详情
    print("图执行完成！")
    print(f"对话ID: {result.get('_id')}")
    print(f"轮次数量: {len(result.get('rounds', []))}")
    print(f"最终输出: {result.get('final_result', '')}")
    
    # 可获取的内容（保存在MongoDB中的图运行数据）：
    # - _id: 对话ID
    # - conversation_id: 对话ID
    # - graph_name: 图名称
    # - graph_config: 图配置
    # - rounds: 对话轮次列表（包含用户输入和AI回复）
    # - input: 初始输入
    # - global_outputs: 全局输出（按节点名称组织）
    # - final_result: 最终结果
    # - execution_chain: 执行链
    # - handoffs_status: 交接状态
    # - start_time: 开始时间
    # - completed: 是否完成
    # - updated_at: 更新时间


if __name__ == "__main__":
    run_graph_basic()