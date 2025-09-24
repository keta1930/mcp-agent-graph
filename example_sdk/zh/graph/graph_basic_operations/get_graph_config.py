#!/usr/bin/env python3
"""
MAG Graph Basic Operations Example
演示图的基本查询操作：列表、配置、详情
"""

import mag
import json

def get_config(graph_name="deepresearch"):
    """获取特定图的配置"""
    config = mag.get_graph_config(graph_name)
    filename = f"{graph_name}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    print(f"\n配置已保存到: {filename}")
    return config


if __name__ == "__main__":
    get_config()
