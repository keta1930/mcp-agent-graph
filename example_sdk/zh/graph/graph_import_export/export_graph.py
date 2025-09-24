#!/usr/bin/env python3
"""
MAG Graph Export Example
演示图的导出操作
"""

import mag
import json
import os

def export_graph(graph_name="deepresearch"):
    """导出图示例"""
    result = mag.export_graph(graph_name)
    print(f"\nexport_graph result for '{graph_name}':")
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    print("=== MAG Graph Export Example ===")

    # 导出deepresearch图
    print("\n导出 deepresearch 图")
    export_graph("deepresearch")

    print("\n=== 导出示例完成 ===")