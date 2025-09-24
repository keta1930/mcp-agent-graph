#!/usr/bin/env python3
"""
MAG Graph Basic Operations Example
演示图的基本查询操作：列表、配置、详情
"""

import mag
import json

def get_readme(graph_name="deepresearch"):
    """获取图的详细信息（包括README）"""
    detail = mag.get_graph_detail(graph_name)
    readme_content = detail.get('readme', '')
    filename = f"{graph_name}_readme.md"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(readme_content)
    print(f"\nREADME已保存到: {filename}")
    return detail


if __name__ == "__main__":
    get_readme()