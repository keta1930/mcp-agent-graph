#!/usr/bin/env python3
"""
MAG Graph Import Example
Demonstrates graph import operations
"""

import mag
import json
import os


def import_graph(file_path="deepresearch.json"):
    """Import graph example"""
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"\nFile does not exist: {file_path}")
        print("Please ensure the file exists before running")
        return None

    result = mag.import_graph(file_path)
    print(f"\nimport_graph result from '{file_path}':")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    print("=== MAG Graph Import Example ===")

    # 1. Try to import deepresearch.json
    print("\n1. Importing deepresearch.json")
    import_graph("deepresearch.json")

    # 2. Try to import math_exam.zip
    print("\n2. Importing math_exam.zip")
    import_graph("math_exam.zip")

    print("\n=== Import example completed ===")