#!/usr/bin/env python3
"""
MAG Graph Basic Operations Example
Demonstrates basic graph query operations: list, configuration, details
"""

import mag
import json


def list_graphs():
    """Get list of all graphs"""
    graphs = mag.list_graph()
    print("\nlist_graph result:\n")
    print(json.dumps(graphs, ensure_ascii=False, indent=2))
    return graphs


if __name__ == "__main__":
    list_graphs()