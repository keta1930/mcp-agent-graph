# System Operations

Query system resources and configurations for Agents.

## What is System Operations

System Operations tools enable Agents to understand available resources in the system. Agents can query models, MCP services, workflows, and prompts to avoid duplication and select appropriate tools.

## Core Capabilities

| Capability | Description |
|------------|-------------|
| **Model Query** | View all available model names |
| **MCP Management** | View MCP server status and tool lists |
| **Workflow Query** | Browse and view workflow configurations |
| **Prompt Query** | Find and read prompt content |
| **Tool Inventory** | View all system tools by category and function |

## How It Works

Agents call these tools when they need to understand system resources. For example, querying available models before creating a new Agent, or reviewing existing workflows before designing a new one.

**Example Flow:**

```
User: "Help me create a code review Agent"
↓
Agent calls list_all_models
Views available model list
↓
Agent calls list_all_prompts
Checks for relevant prompts
↓
Agent designs Agent using query results
```

## Available Tools

### Model Query

| Tool | Function |
|------|----------|
| `list_all_models` | List all configured model names |

**Use Cases:** Agent creation, model selection, configuration validation

### MCP Service Query

| Tool | Function |
|------|----------|
| `list_all_mcps` | List all MCP servers, connection status, and tool overview (connected servers show first 3 tools) |
| `get_mcp_details` | Get complete configuration and full tool list for specified MCP servers |

**Use Cases:** Tool selection, MCP status check, capability assessment

### Workflow Query

| Tool | Function |
|------|----------|
| `list_all_graphs` | List all workflows and their descriptions |
| `get_graph_details` | Get complete configuration of specified workflow (including all nodes and connections) |

**Use Cases:** Workflow design, reference existing processes, avoid duplication

### Prompt Query

| Tool | Function |
|------|----------|
| `list_all_prompts` | List all prompts and their categories |
| `get_prompt_content` | Get complete content of specified prompt |

**Use Cases:** Prompt reuse, content reference, template selection

### Tool Inventory

| Tool | Function |
|------|----------|
| `list_system_tools` | List all system tools with categories, names, and functional descriptions |

**Use Cases:** Understand system capabilities, tool selection, Agent configuration

## Usage Tips

**Query First:** Check existing resources before creating new ones

**Query on Demand:** Only query information needed for current task

**Cache Results:** Reuse query results within the same conversation

**Combine Tools:** Use list tools to browse, then detail tools for deeper understanding

## Permissions & Access

- Query results only include resources you have access to
- MCP connection status reflects current real-time state

## Related Links

- [Agent Creator](agent-creator.md) - Create and manage Agents
- [Graph Designer](graph-designer.md) - Design multi-agent workflows
- [MCP Builder](mcp-builder.md) - Create MCP tool servers
- [Prompt Generator](prompt-generator.md) - Create prompt templates
