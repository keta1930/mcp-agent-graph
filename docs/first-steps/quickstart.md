# Quickstart

## For Administrators: Team Management

**Location:** Admin Panel (user menu → Admin)

As an administrator, your first steps should focus on team setup:

### 1. Create Invite Codes

Invite team members to join the platform:

**Learn more:** [Create Invite Code](../core-components/team/invite-code.md)

### 2. Manage Team Members

Control team access and permissions:

**Learn more:** [Manage Your Team](../core-components/team/manage.md)

---

## For Users: Getting Started

After logging in, explore the pre-configured resources and learn the platform:

### Available Resources

The system provides ready-to-use resources:

| Resource | Count | What You Can Do |
|----------|-------|-----------------|
| **Welcome Conversation** | 1 | Interactive tutorial showing core features |
| **LLM Models** | 7 | Pre-configured models (add your API keys) |
| **Creator Agents** | 5 | Help create agents, graphs, prompts, tasks, view resources |
| **Demo Workflow** | 1 | Example multi-agent collaboration graph |
| **Welcome Prompt** | 1 | Base system prompt template |

### 1. Start with Welcome Conversation

The welcome conversation teaches through examples:

| Round | Topic | What You'll See |
|-------|-------|-----------------|
| 1 | System Overview | Agents, Graphs, Tools, Memory capabilities |
| 2 | Subagent Demo | Agent delegates file creation task |
| 3 | Memory Demo | Store and recall user preferences |
| 4 | File System | Files as collaboration mechanism |
| 5 | Next Steps | Ready to build |

**Included file:** `WELCOME.md` - Quick reference guide

### 2. Add Your API Keys

Pre-configured models need your API keys:

| Model | Provider | Get Key |
|-------|----------|---------|
| claude-sonnet-4-5 | Anthropic | https://console.anthropic.com |
| gpt-5 | OpenAI | https://platform.openai.com |
| gemini-2-5-flash | Google | https://aistudio.google.com |
| deepseek-v3-2-exp | DeepSeek | https://platform.deepseek.com |
| qwen3-235b-a22b-thinking-2507 | Alibaba | https://dashscope.aliyun.com |
| kimi-k2-turbo-preview | Moonshot | https://platform.moonshot.cn |
| MiniMax-M2 | MiniMax | https://platform.minimaxi.com |

**Steps:**
1. Click a model to edit
2. Replace placeholder with your actual API key
3. Save

You only need one working model to begin.

### 3. Try the Demo Workflow

Run the `welcome-workflow` graph:

1. Select the graph
2. Click run (input optional)
3. Watch the workflow execute

**What happens:**

| Node | Action | Tool Used |
|------|--------|-----------|
| greeter | Creates welcome document | `create_file` |
| checker | Validates completeness | `read_file` + handoffs |
| finalizer | Adds system info | `update_file` |

**Result:** A `WELCOME.md` file demonstrating multi-node collaboration

### 4. Use Creator Agents

Pre-configured agents help you build through conversation:

| Agent | Purpose | Example Request |
|-------|---------|-----------------|
| agent-creator | Create agents | "Design a code reviewer agent" |
| graph-creator | Design workflows | "Create a data analysis pipeline" |
| prompt-creator | Manage prompts | "Create a blog writing prompt" |
| task-creator | Schedule tasks | "Create a daily summary task" |
| system-resource-viewer | Browse resources | "What models are available?" |

**To use:**
1. Enable `agent_task_executor` in chat settings (⚙️)
2. Ask: "Use agent-creator to design..."
3. Follow the agent's guidance

## Next Steps

| Learn About | Documentation |
|-------------|---------------|
| Agent basics | [Agent](../core-components/agent/index.md) |
| Agent configuration | [Config](../core-components/agent/config.md) |
| Workflow graphs | [Graph](../core-components/graph/index.md) |
| External tools | [MCP](../core-components/mcp/index.md) |
| System tools | [Tools](../core-components/tools/index.md) |
| Memory system | [Memory](../core-components/memory/index.md) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Model not configured" | Add API key in Model Manager |
| "Tool not available" | Enable tool in chat settings (⚙️) |
| Graph execution fails | Check node models have valid API keys |
| Subagent not working | Enable `agent_task_executor` in system tools |
