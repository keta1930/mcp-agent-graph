# Short-Term Memory (Session Context)

Conversation context automatically maintained within each session.

**Memory Type Comparison:**

| Type | Storage Location | Scope | Lifecycle |
|------|-----------------|-------|-----------|
| **Short-Term Memory** | Conversation Turns | Single Session | Persisted until deleted |
| **Long-Term Memory** | Database Categories | Cross-Session | Persisted until deleted |

## Automatic Management

The system automatically manages short-term memory. You don't need to manually operate it.

## Token Usage

Each message consumes tokens. Longer conversations use more tokens and may reach the model's context limit.

**Token Management:**

| Aspect | Behavior |
|--------|----------|
| **Context Window** | All turns sent to model as context |
| **Token Limit** | Determined by selected model |
| **Long Conversations** | May exceed model's context limit |
| **Solution** | Use conversation compression |

## Conversation Compression

When conversations become long, you can compress them to reduce token usage while preserving key information.

**Compression Types:**

| Type | Method | Use Case |
|------|--------|----------|
| **Brute Force Compression** | Keep only first and last message of each user-assistant turn | Quick reduction needed |
| **Precise Compression** | AI summarizes tool content | Quality preservation important |

**How to Compress:**

Open conversation settings and select compression type. The system compresses tool outputs while keeping user and agent messages intact.

**Compression Flow:**

```
Long Tool Output → Compression → Shorter Summary → Reduced Tokens
```

## Conversation Storage

Conversations persist in the database even after closing them. You can return later to view or continue.

## Viewing Conversations

Access past conversations from the conversation sidebar. Select any conversation to view its complete message history.

**Available Actions:**

| Action | Description |
|--------|-------------|
| **View** | Read all conversation turns |
| **Continue** | Add new messages to conversation |
| **Export** | Download as JSON or Markdown |
| **Delete** | Remove conversation (soft delete) |
| **Compress** | Reduce token usage |

## Related Links

- [User Memory](long-term/user-memory.md) - Your persistent preferences
- [Agent Memory](long-term/agent-memory.md) - Agent's accumulated knowledge
- [Memory Overview](index.md) - Complete memory system
