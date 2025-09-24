#!/usr/bin/env python3
"""
MAG Graph Basic Operations Example
演示图的基本查询操作：列表、配置、详情
"""

import mag
import json


def list_graphs():
    """获取所有图列表"""
    graphs = mag.list_graph()
    print("\nlist_graph result:\n")
    print(json.dumps(graphs, ensure_ascii=False, indent=2))
    return graphs


if __name__ == "__main__":
    list_graphs()