# Agent Memory

Agent's personal knowledge base for learning and improvement.

## What is Agent Memory

Agent Memory is where agents store their own knowledge and experiences. Unlike User Memory (shared across all agents), Agent Memory belongs exclusively to each agent.

**Memory Ownership:**

| Owner | Stored As | Access | Purpose |
|-------|-----------|--------|---------|
| User | `owner: "user"` | All agents | Your preferences, requirements, context |
| Agent | `owner: "self"` | Only that agent | Agent's learned patterns, experiences |

## How It Works

Each agent builds its own knowledge base over time. Knowledge stored in one agent's memory stays private to that agent.

**Example Flow:**

```
Code Review Agent learns:
"This user prefers type hints"
↓
Stored in Code Review Agent's memory
↓
Only Code Review Agent remembers this pattern
(Other agents don't see it)
```

## How Agents Use Memory

Agents automatically manage their memories during task execution:

**Before Tasks:** Search memories to recall relevant patterns and experiences

**During Execution:** Add new learnings and update existing knowledge

**After Completion:** Store successful approaches and lessons learned

## Managing Agent Memory

### Via Memory Manager

Open Memory Manager from the workspace sidebar. Select an agent's memory card to view and manage that agent's knowledge.

**Available Actions:**

| Action | Description |
|--------|-------------|
| **View** | See all categories and items for that agent |
| **Add** | Create new category or add items to agent's memory |
| **Edit** | Update existing knowledge |
| **Delete** | Remove items or entire categories |
| **Export** | Download as JSON, Markdown, TXT, or YAML |
| **Import** | Upload content with AI parsing |

### Via Agent Tools

Agents use memory tools during conversations to manage their own knowledge autonomously.

**Memory Tools:**

| Tool | What Agents Do |
|------|----------------|
| `list_memory_categories` | Explore what categories exist |
| `get_memory` | Retrieve specific knowledge |
| `add_memory` | Store new learnings |
| `update_memory` | Refine existing knowledge |
| `delete_memory` | Remove outdated information |

### Search with Context Isolation

The `search_memory_with_agent` tool runs a separate task to find relevant memories without consuming main conversation tokens. The agent explores categories, retrieves content, and returns a focused summary.

## Organization

Agent memories are organized in categories. Category names use lowercase letters, numbers, underscores, and hyphens (2-50 characters).

**Common Categories:**

| Type | Examples | What Agents Store |
|------|----------|-------------------|
| Capabilities | `my_capabilities`, `my_tools` | What the agent can do |
| Patterns | `task_patterns`, `workflow_tips` | How to handle tasks efficiently |
| Knowledge | `best_practices`, `common_issues` | Domain expertise |
| Learning | `lessons_learned`, `feedback_received` | Improvements from experience |

## Storage Format

Each memory item includes:

| Field | Description | Example |
|-------|-------------|---------|
| `item_id` | Unique identifier | `20241128_a3f2` |
| `content` | Memory text (max 300 words recommended) | "User prefers snake_case naming" |
| `updated_at` | Last modified date | `2024-11-28` |

**Persistence:** Memories survive across conversations. An agent's knowledge accumulates over time.

## Export & Import

### Export Formats

Download agent memories in four formats:

| Format | Use Case |
|--------|----------|
| JSON | Structured data for backup |
| YAML | Human-readable structured format |
| Markdown | Documentation and notes |
| TXT | Plain text for simple viewing |

### Import with AI

Upload text content and select a model. The AI parses the text, extracts information, and organizes it into categories for that specific agent.

**Import Flow:**

```
Upload text → AI analyzes → Extracts information → Creates categories → Stores in agent's memory
```

## Privacy & Access

- Each agent's memory is private to that agent
- Other agents cannot access another agent's memories
- You can view and manage any agent's memory via Memory Manager
- Agent memories persist until deleted

## Related

- [User Memory](user-memory.md) - Shared user preferences
- [Short-term Memory](../short-term.md) - Conversation context
- [Memory Tool](../../tools/memory-tool.md) - Tool documentation
