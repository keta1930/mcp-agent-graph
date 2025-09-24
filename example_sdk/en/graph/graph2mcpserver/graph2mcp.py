#!/usr/bin/env python3
"""
MAG Graph to MCP Script Example
Demonstrate graph to MCP script generation operation
"""

import mag
import json


def graph_to_mcp(graph_name="math_calculator_graph"):
    """Generate MCP script example"""
    result = mag.graph_to_mcp(graph_name)
    print(f"\ngraph_to_mcp result for '{graph_name}':")
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # Save script to file
    if "sequential_script" in result:
        script_filename = f"{graph_name}_mcp.py"
        with open(script_filename, 'w', encoding='utf-8') as f:
            f.write(result["sequential_script"])
        print(f"\n✅ MCP script saved to: {script_filename}")

    return result


if __name__ == "__main__":
    print("=== MAG Graph to MCP Script Example ===")

    # Generate MCP script for math_calculator_graph
    print("\nGenerating MCP script for math_calculator_graph")
    graph_to_mcp("math_calculator_graph")

    print("\n=== MCP script generation example completed ===")