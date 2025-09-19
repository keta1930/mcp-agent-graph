#!/usr/bin/env python3
"""
MAG Graph to MCP Script Example
演示图转MCP脚本的生成操作
"""

import mag
import json


def graph_to_mcp(graph_name="math_calculator_graph"):
    """生成MCP脚本示例"""
    result = mag.graph_to_mcp(graph_name)
    print(f"\ngraph_to_mcp result for '{graph_name}':")
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # 保存脚本到文件
    if "sequential_script" in result:
        script_filename = f"{graph_name}_mcp.py"
        with open(script_filename, 'w', encoding='utf-8') as f:
            f.write(result["sequential_script"])
        print(f"\n✅ MCP脚本已保存到: {script_filename}")

    return result


if __name__ == "__main__":
    print("=== MAG Graph to MCP Script Example ===")

    # 为math_calculator_graph图生成MCP脚本
    print("\n为 math_calculator_graph 生成MCP脚本")
    graph_to_mcp("math_calculator_graph")

    print("\n=== MCP脚本生成示例完成 ===")