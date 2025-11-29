# Agent Configuration

Agent configuration defines behavior, capabilities, and constraints. Each setting controls how the agent processes requests and interacts with tools.

## Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **name** | string | Yes | Unique identifier (no `/`, `\`, `.`) |
| **card** | string | Yes | Brief capability description shown in UI |
| **model** | string | Yes | LLM model name (must be registered) |
| **category** | string | Yes | Classification for organization |
| **instruction** | string | No | System prompt defining behavior |
| **max_actions** | integer | No | Iteration limit (1-200, default: 50) |
| **mcp** | array | No | List of MCP server names |
| **system_tools** | array | No | List of system tool names |
| **tags** | array | No | Labels for search (max 20) |

## Field Details

### name

Unique identifier used in API calls and UI selection.

**Rules:**
- Cannot contain `/`, `\`, or `.`
- Must be unique per user
- Cannot be changed after creation

**Examples:**
- ✅ `code-reviewer`
- ✅ `data_analyst`
- ❌ `my/agent` (contains `/`)
- ❌ `agent.v2` (contains `.`)

### card

Short description displayed in agent lists and selection menus.

**Best practices:**
- Keep under 100 characters
- Focus on what the agent does, not how
- Use action verbs

**Examples:**
- `Reviews code for quality, security, and best practices`
- `Analyzes data and generates visualizations`
- `Writes technical documentation from code`

### model

The LLM that powers the agent's reasoning and tool usage.

**Requirements:**
- Model must be registered in Model Manager
- Model must be active and accessible

**Common choices:**
- `claude-sonnet-4.5` - Best for complex reasoning
- `gpt-5` - Strong general-purpose performance
- `deepseek-v3` - Fast and cost-effective

### category

Classification for organizing agents in the UI.

**Common categories:**
- `coding` - Code generation, review, debugging
- `analysis` - Data analysis, research
- `writing` - Documentation, content creation
- `automation` - Task automation, workflows
- `support` - Customer support, Q&A

### instruction

System prompt that defines the agent's personality, expertise, and behavior. Leave blank for general-purpose assistants.

**Example:**
```
You are a senior Python developer specializing in data engineering.
When helping users:
- Prioritize pandas and numpy solutions
- Always include error handling
- Explain performance implications
```

### max_actions

Maximum number of tool calls and reasoning steps before stopping.

| Range | Use Case |
|-------|----------|
| 1-10 | Single-step tasks, simple Q&A |
| 10-30 | Multi-step workflows, basic research |
| 30-50 | Complex analysis, iterative refinement (default) |
| 50-100 | Deep research, extensive code generation |
| 100-200 | Long-running automation, comprehensive tasks |

### mcp

List of MCP server names the agent can access. Each server must be configured and running in MCP Manager.

**See:** [MCP Integration](../mcp/index.md)

### system_tools

List of built-in system tools the agent can use.

**See:** [System Tools](../tools/index.md)

### tags

Labels for search, filtering, and discovery. Maximum 20 tags.

**Example:** `["python", "data", "pandas", "analysis", "visualization"]`

## Runtime Configuration Override

When running an agent, you can override or extend configuration:

| Override | Effect |
|----------|--------|
| `model_name` | Use different model |
| `system_prompt` | Replace instruction |
| `mcp_servers` | Add additional MCP servers |
| `system_tools` | Add additional system tools |
| `max_iterations` | Change iteration limit |

## Next Steps

- **[Build Your First Agent](first-agent.md)** - Create an agent step-by-step
- **[Agent Loop](loop.md)** - Understand execution flow
- **[System Tools](../tools/index.md)** - Explore built-in capabilities
- **[MCP Integration](../mcp/index.md)** - Connect external services
