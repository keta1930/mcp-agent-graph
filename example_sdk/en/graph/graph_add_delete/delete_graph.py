#!/usr/bin/env python3
"""
MAG Graph Delete Example
Demonstrates graph deletion operations
"""

import mag
import json


def delete_graph(graph_name="math_calculator_graph"):
    """Delete graph example"""
    result = mag.delete_graph(graph_name)
    print(f"\ndelete_graph result for '{graph_name}':")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == "__main__":
    print("=== MAG Graph Delete Example ===")

    # Delete specified graph
    print(f"\nDeleting graph: math_calculator_graph")
    delete_graph()
    print("\n=== Delete example completed ===")