## MCP Agent Graph (MAG)

English | [中文](README_CN.md)

> MCP Agent Graph (MAG) is an agent development framework for rapidly building agent systems. This project is based on graphs, nodes, and MCP to quickly construct complex Agent systems.

📚 [Documentation](https://keta1930.github.io/mcp-agent-graph/#) | 📦 [PyPI Package](https://pypi.org/project/mcp-agent-graph/)

## Table of Contents

- [🚀 Deployment Guide](#-deployment-guide)
  - [Option 1: Install via PyPI](#option-1-install-via-pypi-recommended)
  - [Option 2: Using Conda](#option-2-using-conda)
  - [Option 3: Using uv](#option-3-using-uv)
  - [Frontend Deployment](#frontend-deployment)
- [✨ Core Features](#-core-features)
- [Development Details](#development-details)
- [🖼️ Frontend Feature Showcase](#️-frontend-feature-showcase)
  - [Visual Agent Graph Editor](#visual-agent-graph-editor)
  - [MCP Server Integration](#mcp-server-integration)
  - [Nested Graphs](#nested-graphs-graphs-as-nodes)
  - [Graph to MCP Server Export](#graph-to-mcp-server-export)
- [Citation](#citation)
- [Star History](#star-history)

![MAG 系统架构](appendix/image_en.png)


## 🚀 Deployment Guide

### Option 1: Install via PyPI (Recommended)

```bash
# Install mag package directly from PyPI
pip install mcp-agent-graph

# View examples
# Clone the repository to get example code
git clone https://github.com/keta1930/mcp-agent-graph.git
cd mcp-agent-graph/sdk_demo
```

> **Update**: Starting from version v1.3.1, we officially released the Python SDK. You can now install and use it directly via pip.

> **Tip**: We provide usage examples in the sdk_demo directory.

### Option 2: Using Conda

```bash
# Create and activate conda environment
conda create -n mag python=3.11
conda activate mag

# Clone repository
git clone https://github.com/keta1930/mcp-agent-graph.git
cd mcp-agent-graph

# Install dependencies
pip install -r requirements.txt

# Run main application
cd mag
python main.py
```

### Option 3: Using uv

```bash
# Install uv if you don't have it
Installation guide: https://docs.astral.sh/uv/getting-started/installation/

# Clone repository
git clone https://github.com/keta1930/mcp-agent-graph.git
cd mcp-agent-graph

# Install dependencies
uv sync
.venv\Scripts\activate.ps1 (powershell)
.venv\Scripts\activate.bat (cmd)

# Run directly with uv
cd mag
uv run python main.py
```

The backend server will run on port 9999, and the MCP client runs on port 8765.

### Frontend Deployment

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend development server will run on port 5173.

### ✨ Core Features

#### 1️⃣ Graph-Based Agent Development Framework
Provides an intuitive visual environment that allows you to easily design and build complex intelligent agent systems.

#### 2️⃣ Nodes as Agents
Each node in the graph is an independent intelligent agent that can leverage MCP server tool capabilities to complete specific tasks.

#### 3️⃣ Graph Nesting (Hierarchical Worlds)
Supports using entire graphs as nodes within other graphs, enabling hierarchical intelligent agent architectures and building "Agents within Agents."

#### 4️⃣ Graph to MCP Server
Export any graph as a standard MCP server Python script, making it callable as an independent tool by other systems.

#### 5️⃣ Agent Trading & Transfer
Package complete intelligent agent systems with all dependencies (configurations, prompts, documents) into self-contained, portable units that can be easily shared, transferred, and deployed across different environments. Automatic documentation generation creates comprehensive README files, enabling recipients to quickly understand your agent's capabilities and requirements. This feature provides solutions for agent marketplace trading, intra-organizational sharing, and cross-organizational sharing.

#### 6️⃣ Rapid Agent Development
This project provides prompt template functionality for quickly generating prompt templates for developing intelligent agents. Templates help LLMs better understand this project and generate better nodes and graphs. The system automatically identifies registered models and MCP servers in the project and includes them in templates.
Implementation: Prompt template generation → Requirements input → LLM generates graph → Import graph → Run graph rapid development workflow.

<details>
<summary>🌐 System Architecture</summary>

MAG follows a HOST-CLIENT-SERVER architecture:
- **HOST**: Central service that manages graph execution and coordinates communication between components
- **CLIENT**: MCP client that interacts with MCP servers
- **SERVER**: MCP servers that provide specialized tools and functionality

```
HOST  → CLIENT  → SERVER 
(Graph) → (Agent) <==> (MCP Server)
```
</details>

## Development Details

For detailed development information, including a complete feature list, Agent configuration reference, intelligent agent node parameters, configuration examples, and advanced usage guides, please see the [Development Details Documentation](appendix/intro.md).

## 🖼️ Frontend Feature Showcase (Frontend is V1.1.0 version, hasn't caught up with backend updates yet.)

### Visual Agent Graph Editor

Visually create agent workflows by connecting nodes in a graph. Each node represents an agent with its own configuration, behavior, and capabilities.

***Graph Editor Interface - Visual design of nodes and connections***

![Graph Editor Interface - Visual design of nodes and connections](appendix/img_3.png)

***Graph Executor Interface - Running agent workflows***

![Graph Executor Interface - Running agent workflows](appendix/img_6.png)

***Graph Executor Interface - Viewing workflow results***

![Graph Executor Interface - Viewing workflow results](appendix/img_7.png)

### MCP Server Integration

Enhance your agent capabilities through MCP servers. Each agent node can leverage multiple MCP servers to access specialized capabilities such as web search, code execution, data analysis, etc.

***MCP Manager Interface - Server overview***

![MCP Manager Interface - Server overview](appendix/img.png)

***MCP Manager Interface - Detailed server configuration***

![MCP Manager Interface - Detailed server configuration](appendix/img_1.png)

***MCP Manager Interface - Tool capability management***

![MCP Manager Interface - Tool capability management](appendix/img_2.png)

### Nested Graphs (Graphs as Nodes)

Build hierarchical agent systems by using entire graphs as nodes within larger graphs. This creates modular, reusable agent components, enabling a "worlds within worlds" architecture.

> This is a nesting feature 😉

***Nested Graph Interface - Hierarchical agent system design***

![Nested Graph Interface - Hierarchical agent system design](appendix/img_4.png)

### Graph to MCP Server Export

Export any graph as a standalone MCP server, making it usable as a tool for other agents or applications. This feature transforms your agent graphs into reusable services that can be composed into larger systems.

> This is a nested nesting feature 😉

***Export MCP Server Interface - Converting graphs to standalone services***

![Export MCP Server Interface - Converting graphs to standalone services](appendix/img_5.png)

***Calling in Cline - Example 1***

![Calling in Cline](appendix/img_8.png)

***Calling in Cline - Example 2***

![Calling in Cline](appendix/img_9.png)

## Citation

If you find MCP Agent Graph helpful for your research or work, please consider citing it:

```bibtex
@misc{mcp_agent_graph_2025,
  title        = {mcp-agent-graph},
  author       = {Yan Yixin},
  howpublished = {\url{https://github.com/keta1930/mcp-agent-graph}},
  note         = {Accessed: 2025-04-24},
  year         = {2025}
}
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=keta1930/mcp-agent-graph&type=Date)](https://www.star-history.com/#keta1930/mcp-agent-graph&Date)