#!/usr/bin/env python3
"""
MAG Graph Basic Operations Example
Demonstrates basic graph query operations: list, configuration, details
"""

import mag
import json

def get_readme(graph_name="deepresearch"):
    """Get graph detailed information (including README)"""
    detail = mag.get_graph_detail(graph_name)
    readme_content = detail.get('readme', '')
    filename = f"{graph_name}_readme.md"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(readme_content)
    print(f"\nREADME saved to: {filename}")
    return detail


if __name__ == "__main__":
    get_readme()