# Build Your First Graph

## Prerequisites

Before creating a graph, ensure you have:

- At least **one model** registered (see [Model Registration](../model/register.md))
- Access to the **Workspace** interface

## Create a Graph

### Step 1: Open Graph Manager

Navigate to **Graph Editor** from the workspace sidebar.

### Step 2: Create New Graph

Click **Create Graph** and fill in the required fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Unique identifier (no `/`, `\`, `.`) | `content-pipeline` |
| **Description** | Brief explanation of the workflow | `Research, write, and review articles` |

### Step 3: Add Nodes

Click the **+** button in the toolbar to add your first node.

#### Node Configuration

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Node identifier | `researcher` |
| **Description** | Node purpose | `Gather information on the topic` |
| **Type** | Agent node or Subgraph | Agent |
| **Model** | LLM to use | `claude-sonnet-4-5` |
| **Agent** | Pre-configured agent (optional) | - |
| **System Prompt** | Behavior instructions | `You are a research assistant...` |
| **User Prompt** | Task template | `Research: {topic}` |
| **Tools** | MCP servers or system tools | `web_search`, `read_file` |
| **Max Tool Calls** | Iteration limit (1-200) | `50` |

**Agent vs Model**: Choose an existing agent for pre-configured behavior, or select a model and configure prompts manually.

### Step 4: Connect Nodes

1. Click the edge button on a node
2. Drag to another node to create a connection
3. Repeat to build your workflow

**Start and End**: Every graph has `start` (entry point) and `end` (exit point). Connect your first node to `start` and final node to `end`.

### Step 5: Save

Click the **Save** button in the toolbar. Your graph is now ready to run.

## Run Your Graph

### From Chat Interface

1. Open the **Chat** page from the workspace
2. Click the **Graph Selector** dropdown
3. Select your newly created graph
4. Enter input and send

The graph executes nodes in order based on their connections.

## Example: Simple Research Pipeline

A basic 3-node workflow:

```
start → researcher → writer → reviewer → end
```

**Node Configuration**:

| Node | Model | System Prompt | Tools |
|------|-------|---------------|-------|
| `researcher` | claude-sonnet-4-5 | Research assistant that gathers information | `web_search` |
| `writer` | gpt-5 | Content writer that creates articles from research | - |
| `reviewer` | claude-sonnet-4-5 | Editor that checks quality and suggests improvements | - |

**Execution**: Enter a topic → researcher gathers information → writer creates article → reviewer checks quality → final output.

## Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Node won't save | Missing required fields | Ensure name, model/agent are set |
| Graph won't run | No connection to start/end | Check all nodes are connected |
| Unexpected execution order | Incorrect connections | Verify input/output relationships |
| Node stops early | Max iterations reached | Increase max tool calls setting |

## Next Steps

- **[Graph Configuration](config.md)** - Explore all configuration options
- **[Graph Execution](execution.md)** - Understand how graphs run
- **[Subgraphs](subgraph.md)** - Nest graphs within graphs
- **[Handoffs](handoffs.md)** - Add dynamic routing
- **[Build Complex Workflows](complex-workflows.md)** - Advanced patterns
