#!/usr/bin/env python3
"""
MAG Graph Export Example
Demonstrates graph export operations
"""

import mag
import json
import os

def export_graph(graph_name="deepresearch"):
    """Export graph example"""
    result = mag.export_graph(graph_name)
    print(f"\nexport_graph result for '{graph_name}':")
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    print("=== MAG Graph Export Example ===")

    # Export deepresearch graph
    print("\nExporting deepresearch graph")
    export_graph("deepresearch")

    print("\n=== Export example completed ===")