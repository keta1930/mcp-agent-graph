#!/usr/bin/env python3
"""
MAG Graph Save and Rename Example
演示图的保存和重命名操作
"""

import mag
import json


def save_graph():
    """保存图配置示例"""
    graph_config = {
        "name": "math_solver_single_node_v1",
        "description": "一个单节点数学问题求解图，用户输入数学表达式，系统调用计算器工具求解并返回结果。",
        "nodes": [
            {
                "name": "math_solver",
                "description": "解决用户提出的数学问题，使用计算器工具计算表达式",
                "model_name": "deepseek-chat",
                "mcp_servers": [
                    "math-calculator"
                ],
                "system_prompt": "你是一个数学助手，能够理解用户提出的数学问题，提取其中的数学表达式并计算结果。请先理解问题，再使用 calculate_expression 工具执行计算。",
                "user_prompt": "请解决以下数学问题：{start}。请分析问题并计算出结果。",
                "input_nodes": [
                    "start"
                ],
                "output_nodes": [
                    "end"
                ],
                "handoffs": None,
                "global_output": False,
                "context": [],
                "context_mode": "all",
                "output_enabled": True,
                "is_subgraph": False,
                "subgraph_name": None,
                "position": None,
                "level": 0,
                "save": None
            }
        ],
        "end_template": "数学问题解答：{math_solver}"
    }

    result = mag.save_graph(graph_config)
    print("\nsave_graph result:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def rename_graph(old_name="math_solver_single_node_v1", new_name="math_calculator_graph"):
    """重命名图示例"""
    result = mag.rename_graph(old_name, new_name)
    print(f"\nrename_graph result ('{old_name}' -> '{new_name}'):")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == "__main__":
    print("=== MAG Graph Save and Rename Example ===")

    # 1. 保存图配置
    print("\n1. 保存数学求解图配置")
    save_graph()

    # 2. 重命名图
    print("\n2. 重命名图")
    rename_graph()

    print("\n=== 保存和重命名示例完成 ===")