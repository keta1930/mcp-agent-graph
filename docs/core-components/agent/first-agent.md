# Build Your First Agent

## Prerequisites

Before creating an agent, ensure you have:

- At least **one registered model** (see [Model Registration](../model/register.md))
- Access to the **Workspace** interface

## Creating an Agent

### Step 1: Open Agent Manager

From the workspace sidebar, navigate to **Agent Manager**.

### Step 2: Configure Basic Info

Click **Create Agent** and fill in required fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Unique identifier (no `/`, `\`, `.`) | `code-reviewer` |
| **Capability Card** | Brief description of what the agent does | `Reviews code for quality, security, and best practices` |
| **Category** | Classification for organization | `coding` |
| **Tags** | Labels for search and discovery (optional) | `code`, `review`, `security` |

### Step 3: Select a Model

Choose the LLM to power your agent:

- **Claude Sonnet 4.5** - Best for complex reasoning
- **GPT-5** - Strong general-purpose performance
- **DeepSeek V3** - Fast and cost-effective

The model handles all decision-making and tool usage.

### Step 4: Add System Instruction (Optional)

Define custom behavior:

```
You are a senior code reviewer with expertise in Python, JavaScript, and security.
When reviewing code:
- Check for common security vulnerabilities
- Suggest performance improvements
- Highlight best practice violations
- Provide specific examples for improvements
```

Leave blank for default assistant behavior.

### Step 5: Configure Tools (Optional)

Select tools your agent can use. Visit the following pages to learn more:

- **[MCP Servers](../mcp/index.md)** - Connect external services and capabilities
- **[System Tools](../tools/index.md)** - Use built-in functions

### Step 6: Set Max Actions

Configure iteration limit (1-200):

- **10-20** - Simple Q&A agents
- **30-50** - General-purpose agents (default: 50)
- **100+** - Complex multi-step workflows

### Step 7: Create

Click **Submit** to save your agent.

## Running Your Agent

### From Chat Interface

1. Open the **Chat** page from workspace
2. Click the **Agent Selector** dropdown
3. Choose your newly created agent
4. Type a message and send

The agent will process your request using its configured model and tools.

## Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Agent won't run | No model selected | Ensure model is configured |
| Tools not working | MCP server disconnected | Reconnect server in MCP Manager |
| Stops after one response | Normal for simple questions | Try multi-step requests |
| Hits max actions | Complex task or infinite loop | Increase max_actions or simplify task |

## Next Steps

- **[Agent Configuration](config.md)** - Deep dive into all settings
- **[Agent Loop](loop.md)** - Understand how agents think
- **[System Tools](../tools/index.md)** - Explore built-in capabilities
- **[MCP Integration](../mcp/index.md)** - Connect external services
