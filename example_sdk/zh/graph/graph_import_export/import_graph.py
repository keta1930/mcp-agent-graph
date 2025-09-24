#!/usr/bin/env python3
"""
MAG Graph Import Example
演示图的导入操作
"""

import mag
import json
import os


def import_graph(file_path="deepresearch.json"):
    """导入图示例"""
    # 检查文件是否存在
    if not os.path.exists(file_path):
        print(f"\n文件不存在: {file_path}")
        print("请确保文件存在后再运行")
        return None

    result = mag.import_graph(file_path)
    print(f"\nimport_graph result from '{file_path}':")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    print("=== MAG Graph Import Example ===")

    # 1. 尝试导入deepresearch.json
    print("\n1. 导入 deepresearch.json")
    import_graph("deepresearch.json")

    # 2. 尝试导入math_exam.zip
    print("\n2. 导入 math_exam.zip")
    import_graph("math_exam.zip")

    print("\n=== 导入示例完成 ===")