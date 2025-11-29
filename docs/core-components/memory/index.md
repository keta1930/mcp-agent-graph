# Memory

Store and retrieve conversation context and persistent knowledge.

## What is Memory

Memory stores information for AI to reference across conversations. Two types serve different purposes:

- **Short-term:** Stores current conversation messages as context
- **Long-term:** Stores persistent knowledge independent of conversations

## Memory Types

| Type | Storage | Scope | Use Case |
|------|---------|-------|----------|
| **Short-term** | Conversation rounds | Single session | Maintains context within one conversation |
| **Long-term** | Database categories | Cross-session | Stores reusable knowledge for future use |

### Short-term Memory

Conversation messages automatically stored in rounds. Each message includes role (user/assistant/tool) and content.

### Long-term Memory

Structured knowledge storage with categories. Two owner types available:

| Owner | Purpose | Access |
|-------|---------|--------|
| **User Memory** | User preferences and information | Available to all agents the user talks to |
| **Agent Memory** | Agent-specific knowledge | Only available to that specific agent |

## Next Steps

- [Short-term Memory](short-term.md) - Conversation context management
- [User Memory](long-term/user-memory.md) - Store user preferences
- [Agent Memory](long-term/agent-memory.md) - Build agent knowledge base
