#!/usr/bin/env python3
"""
MAG Graph Prompt Template Example
演示获取图生成提示词模板
"""

import mag

def get_graph_generation_template():
    """获取包含指定MCP服务器的提示词模板"""
    mcp_servers = ["fetch"]  # 示例MCP服务器
    # mcp_servers = ["fetch", "playwright"] # 需要先注册到系统中
    prompt = mag.graph_gen_prompt(mcp_servers=mcp_servers)
    filename = "graph_generation_template.md"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(prompt)
    print(f"\n图生成提示词模板已保存到: {filename}")
    return prompt


if __name__ == "__main__":
    get_graph_generation_template()