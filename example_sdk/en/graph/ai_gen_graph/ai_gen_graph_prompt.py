#!/usr/bin/env python3
"""
MAG Graph Prompt Template Example
Demonstrate getting graph generation prompt template
"""

import mag

def get_graph_generation_prompt_template():
    """Get prompt template containing specified MCP servers"""
    mcp_servers = ["fetch"]  # Example MCP server
    # mcp_servers = ["fetch", "playwright"] # Need to register to system first
    prompt = mag.graph_gen_prompt(mcp_servers=mcp_servers)
    filename = "graph_generation_template.md"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(prompt)
    print(f"\nGraph generation prompt template saved to: {filename}")
    return prompt


if __name__ == "__main__":
    get_graph_generation_prompt_template()