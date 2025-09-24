#!/usr/bin/env python3
"""
MAG Graph Save and Rename Example
Demonstrates graph save and rename operations
"""

import mag
import json


def save_graph():
    """Save graph configuration example"""
    graph_config = {
        "name": "math_solver_single_node_v1",
        "description": "A single-node math problem solving graph where users input mathematical expressions, and the system calls calculator tools to solve and return results.",
        "nodes": [
            {
                "name": "math_solver",
                "description": "Solve mathematical problems posed by users, using calculator tools to compute expressions",
                "model_name": "deepseek-chat",
                "mcp_servers": [
                    "math-calculator"
                ],
                "system_prompt": "You are a math assistant who can understand mathematical problems posed by users, extract mathematical expressions from them, and calculate results. Please understand the problem first, then use the calculate_expression tool to perform calculations.",
                "user_prompt": "Please solve the following mathematical problem: {start}. Please analyze the problem and calculate the result.",
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
        "end_template": "Mathematical problem solution: {math_solver}"
    }

    result = mag.save_graph(graph_config)
    print("\nsave_graph result:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def rename_graph(old_name="math_solver_single_node_v1", new_name="math_calculator_graph"):
    """Rename graph example"""
    result = mag.rename_graph(old_name, new_name)
    print(f"\nrename_graph result ('{old_name}' -> '{new_name}'):")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == "__main__":
    print("=== MAG Graph Save and Rename Example ===")

    # 1. Save graph configuration
    print("\n1. Save math solver graph configuration")
    save_graph()

    # 2. Rename graph
    print("\n2. Rename graph")
    rename_graph()

    print("\n=== Save and rename example completed ===")