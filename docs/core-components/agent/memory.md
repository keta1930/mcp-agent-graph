# Agent Memory

Give agents personal knowledge base to learn and improve over time.

## What is Agent Memory

Agent Memory enables agents to store and recall their own knowledge separately from shared user preferences.

| Memory Type | Owner | Access | Purpose |
|-------------|-------|--------|---------|
| **User Memory** | You | All agents | Your preferences and requirements |
| **Agent Memory** | Each agent | Only that agent | Agent's learned patterns and experiences |

## How Agents Use Memory

Agents manage memory autonomously during conversations:

**Before tasks:** Search memories for relevant patterns

**During execution:** Add learnings and update knowledge

**After completion:** Store successful approaches

## Key Benefits

| Benefit | Result |
|---------|--------|
| **Persistent learning** | Knowledge accumulates across conversations |
| **Personalized service** | Agents remember your style and preferences |
| **Autonomous improvement** | Agents learn from experience without manual input |
| **Context isolation** | Each agent builds domain-specific expertise |

## Managing Memory

### Via Memory Manager

Open Memory Manager from workspace to view and manage any agent's knowledge:

- View categories and items
- Add, edit, or delete memories
- Export as JSON, Markdown, TXT, or YAML
- Import content with AI parsing

### Via Memory Tools

Agents use built-in memory tools during conversations:

- `list_memory_categories` - Discover existing knowledge
- `get_memory` - Retrieve specific memories
- `add_memory` - Store new learnings
- `update_memory` - Refine existing knowledge
- `search_memory_with_agent` - AI-powered search in isolated context

## Common Use Cases

| Agent Type | Memory Strategy | Outcome |
|------------|----------------|---------|
| Code Reviewer | Stores style rules in `code_standards` | Consistent reviews |
| Support Agent | Saves solutions in `faq_answers` | Faster responses |
| Writing Agent | Remembers tone in `brand_voice` | Unified style |

## Related

- [Agent Memory Documentation](../memory/long-term/agent-memory.md) - Complete guide to memory ownership, organization, and lifecycle
- [Memory Tool Documentation](../tools/memory-tool.md) - Tool reference for memory operations and integration patterns
