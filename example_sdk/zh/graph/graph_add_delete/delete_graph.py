#!/usr/bin/env python3
"""
MAG Graph Delete Example
演示图的删除操作
"""

import mag
import json


def delete_graph(graph_name="math_calculator_graph"):
    """删除图示例"""
    result = mag.delete_graph(graph_name)
    print(f"\ndelete_graph result for '{graph_name}':")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == "__main__":
    print("=== MAG Graph Delete Example ===")

    # 删除指定图
    print(f"\n删除图: math_calculator_graph")
    delete_graph()
    print("\n=== 删除示例完成 ===")