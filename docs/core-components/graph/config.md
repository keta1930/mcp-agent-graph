# Graph Config

Graph config controls workflow execution. Understanding key settings helps you build effective multi-agent workflows.

## Configuration Overview

Graph config has two levels:

| Level | What It Controls | Key Settings |
|-------|------------------|--------------|
| **Graph Level** | Overall workflow | Name, description, output format |
| **Node Level** | Individual execution units | Agent/model, prompts, tools, connections |

## Graph Level Settings

| Setting | Purpose | Notes |
|---------|---------|-------|
| **Name** | Workflow identifier | Cannot contain `/` `\` `.` |
| **Description** | What this workflow does | Helps organize and search |
| **End Template** | Format final output | Combines results from multiple nodes |

**End Template** combines node outputs using `{{node_name}}` syntax:

```
# Report
## Data: {{collector}}
## Analysis: {{analyzer}}
```

---

## Node Settings

Each node has 6 configuration categories:

### 1. Identity

| Setting | Required | Purpose |
|---------|----------|---------|
| **Name** | Yes | Node identifier (no `/` `\` `.`) |
| **Description** | No | What this node does |

### 2. Execution Source

**Choose ONE approach:**

| Approach | When to Use | What You Get |
|----------|-------------|--------------|
| **Use Agent** (`agent_name`) | Reuse configured agent | Inherits agent's model, prompts, tools |
| **Use Model** (`model_name`) | Custom one-off node | Full manual control over prompts and tools |
| **Use Subgraph** (`is_subgraph` + `subgraph_name`) | Call another workflow | Modular, reusable logic |

**Agent Override**: When using an agent, node settings override agent defaults. For example, setting `model_name` in the node uses a different model while keeping the agent's prompts and tools.

### 3. Prompts

| Setting | Purpose | Variable Support |
|---------|---------|------------------|
| **System Prompt** | Define node behavior and role | Yes |
| **User Prompt** | Specific task for this execution | Yes |

**Variable Substitution** in prompts:

| Syntax | Meaning | Example |
|--------|---------|---------|
| `{{start}}` | User's original input | `Analyze: {{start}}` |
| `{{node_name}}` | Output from a node | `Summarize: {{researcher}}` |
| `{{node_name:3}}` | Last 3 outputs from node | `Review: {{checker:3}}` |
| `{{node_name:all}}` | All outputs from node | `Combine: {{processor:all}}` |
| `{{@prompt_name}}` | Reference registered prompt | `{{@data_analyst}}` |

### 4. Tools

| Setting | Purpose |
|---------|---------|
| **System Tools** | Built-in capabilities (`file_creator`, `memory_tools`, etc.) |
| **MCP Servers** | External services (web search, databases, APIs) |

### 5. Execution Control

| Setting | Default | Range | What It Does |
|---------|---------|-------|--------------|
| **Max Iterations** | 50 | 1-200 | Limits tool calls per execution |
| **Handoffs** | - | - | How many times node can be re-selected (for loops) |
| **Output Enabled** | true | - | Show results to user vs silent processing |

**Max Iterations Guide:**

| Range | Use Case |
|-------|----------|
| 1-10 | Quick tasks, simple queries |
| 10-30 | Multi-step workflows |
| 30-50 | Complex analysis (default) |
| 50-100 | Deep research, code generation |
| 100-200 | Long-running automation |

**Handoffs** enables loops. When set to `3`, the node can be chosen up to 3 times before being disabled. See [Handoffs](./handoffs.md) for routing logic.

**Output Enabled** controls visibility:

| Setting | Shows | Use For |
|---------|-------|---------|
| `true` | Assistant response | User-facing results |
| `false` | Only tool results | Background processing |

### 6. Connections

| Setting | Purpose |
|---------|---------|
| **Input Nodes** | Where this node receives data from |
| **Output Nodes** | Where this node sends data to |

**Special Values:**

| Value | Meaning |
|-------|---------|
| `["start"]` | Receives user input |
| `["end"]` | Finishes workflow |

**Connection Examples:**

| Input | Output | Flow |
|-------|--------|------|
| `["start"]` | `["processor"]` | User → processor |
| `["collector"]` | `["analyzer"]` | collector → analyzer |
| `["validator"]` | `["end"]` | validator → finish |
| `["router"]` | `["option_a", "option_b"]` | router → multiple paths |

---

## Configuration Patterns

### Quick Response

- Max iterations: 10-20
- Minimal tools
- Single path (no branches)

### Deep Analysis

- Max iterations: 50-100
- Multiple MCP servers
- System tools for file/memory operations

### Background Processing

- Output enabled: `false` on processing nodes
- Output enabled: `true` on final notification node

### Modular Workflows

- Use subgraphs for reusable logic
- Each subgraph handles one responsibility
- Connect subgraphs sequentially

---

## Common Questions

**Q: What's the difference between agent_name and model_name?**

| Setting | Uses | Best For |
|---------|------|----------|
| `agent_name` | Pre-configured agent | Reusable, consistent behavior |
| `model_name` | Direct model access | Custom, one-off tasks |

**Q: Can I override an agent's settings?**

Yes. When using `agent_name`, any node setting overrides the agent default:
- `model_name` → Different model
- `system_prompt` → Different behavior
- `mcp_servers` → Different tools
- `max_iterations` → Different limit

**Q: How do I reference previous node outputs?**

Use `{{node_name}}` in prompts. The first node connecting to `["start"]` can use `{{start}}` for user input.

**Q: What happens when max_iterations is reached?**

Execution stops gracefully. The node returns whatever was generated. No error occurs.

**Q: Can subgraphs call each other?**

Not in circles. If A calls B, then B cannot call A.

**Q: How do nodes at the same level execute?**

Sequentially, in the order they appear in the node list.
