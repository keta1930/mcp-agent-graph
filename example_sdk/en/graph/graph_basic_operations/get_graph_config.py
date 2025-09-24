#!/usr/bin/env python3
"""
MAG Graph Basic Operations Example
Demonstrates basic graph query operations: list, configuration, details
"""

import mag
import json

def get_config(graph_name="deepresearch"):
    """Get configuration for a specific graph"""
    config = mag.get_graph_config(graph_name)
    filename = f"{graph_name}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    print(f"\nConfiguration saved to: {filename}")
    return config


if __name__ == "__main__":
    get_config()