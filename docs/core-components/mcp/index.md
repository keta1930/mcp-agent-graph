# MCP (Model Context Protocol)

## What is MCP

MCP is a standardized protocol that connects AI agents with external tools and data sources. Think of it as the USB-C of the AI world—one protocol that's compatible with all services.

Instead of writing custom integrations for each tool, MCP allows you to connect once and use hundreds of services: databases, APIs, file systems, cloud platforms, and more.

## Core Components

| Component | Purpose | Example |
|-----------|---------|---------|
| **Server** | Provides tools and data | GitHub server provides repository operations |
| **Tools** | Actions the agent can execute | Search files, create issues, commit code |
| **Resources** | Data the agent can read | File contents, API responses, database records |
| **Client** | Connects servers to agents | Built into the MAG platform |

## Why Use MCP

**Extend Agent Capabilities**
Add tools without writing integration code. Connect file systems, databases, cloud services, or custom APIs.

**Standardized Integration**
One protocol works with all MCP servers. Add new capabilities by installing servers, no integration code needed.

**Community Ecosystem**
Use ready-made servers from the open-source community.

## Learn More

- [MCP Official Documentation](https://www.anthropic.com/news/model-context-protocol) - Anthropic's introduction to MCP
- [MCP Specification](https://github.com/modelcontextprotocol) - Technical details and standards
- [Community Discussions](https://github.com/orgs/modelcontextprotocol/discussions) - Join the conversation
- [MCP.so](https://mcp.so/) - Comprehensive MCP hub
- [ModelScope](https://www.modelscope.cn/mcp) - ModelScope MCP hub
- [FastMCP](https://gofastmcp.com) - Python framework and server examples
