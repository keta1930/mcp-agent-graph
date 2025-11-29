# User Memory

Store your preferences and information for all agents to access.

## What is User Memory

User Memory stores your preferences, requirements, and contextual information. Unlike Agent Memory (private to each agent), User Memory is shared across all agents you interact with.

**Memory Ownership:**

| Owner | Stored As | Access | Purpose |
|-------|-----------|--------|---------|
| User | `owner: "user"` | All agents | Your preferences, requirements, context |
| Agent | `owner: "self"` | Only that agent | Agent's learned patterns, experiences |

## How It Works

When you add information to User Memory, all agents can access it. This eliminates repetitive explanations across conversations.

**Example Flow:**

```
You tell Code Agent:
"I prefer snake_case naming"
↓
Stored in User Memory
↓
Later, Review Agent automatically knows your preference
```

## Managing Your Memory

### Via Memory Manager

Open Memory Manager from the workspace sidebar to view and manage your memories.

**Available Actions:**

| Action | Description |
|--------|-------------|
| **View** | See all categories and items |
| **Add** | Create new category or add items |
| **Edit** | Update existing content |
| **Delete** | Remove items or entire categories |
| **Export** | Download as JSON, Markdown, TXT, or YAML |
| **Import** | Upload content with AI parsing |

### Via Agent Interaction

Agents can add information to your memory during conversations when they learn about your preferences or requirements.

**Agent Tools:**

| Tool | What Agents Do |
|------|----------------|
| `add_memory` | Store new preferences you mention |
| `get_memory` | Retrieve your stored information |
| `update_memory` | Correct existing entries |
| `delete_memory` | Remove outdated information |

## Organization

Memories are organized in categories you define. Category names use lowercase letters, numbers, underscores, and hyphens (2-50 characters).

**Common Categories:**

| Type | Examples | What to Store |
|------|----------|---------------|
| Preferences | `code_style`, `communication_tone` | How you like things done |
| Requirements | `project_constraints`, `tech_stack` | What you need |
| Background | `work_context`, `domain_knowledge` | Your situation |
| Goals | `learning_objectives`, `project_goals` | What you're working toward |

## Storage Format

Each memory item includes:

| Field | Description | Example |
|-------|-------------|---------|
| `item_id` | Unique identifier | `20241128_a3f2` |
| `content` | Memory text (max 300 words recommended) | "Prefer snake_case over camelCase" |
| `updated_at` | Last modified date | `2024-11-28` |

## Export & Import

### Export Formats

Download your memories in four formats:

| Format | Use Case |
|--------|----------|
| JSON | Structured data for backup |
| YAML | Human-readable structured format |
| Markdown | Documentation and notes |
| TXT | Plain text for simple viewing |

### Import with AI

Upload text content and select a model. The AI parses your text, extracts information, and organizes it into categories automatically.

**Import Flow:**

```
Upload text → AI analyzes → Extracts information → Creates categories → Stores memories
```

## Privacy & Access

- Your memories are private to your account
- Team members cannot see your User Memory
- Agents can only access memories via tools you authorize
- Memories persist until you delete them

## Related

- [Agent Memory](agent-memory.md) - Agent-specific knowledge
- [Short-term Memory](../short-term.md) - Conversation context
- [Memory Tool](../../tools/memory-tool.md) - Tool documentation
