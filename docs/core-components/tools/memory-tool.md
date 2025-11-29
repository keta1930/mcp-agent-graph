# Memory Tool

Give Agents persistent memory to remember your preferences, learn from experience, and provide personalized service across conversations.

## Why Use Memory Tool

- Continuous service across conversations
- Personalized responses matching your style
- Agents improve from accumulated experience
- Context-aware decisions based on history

**Core Mechanism:**

1. **User Memory:** You define preferences and constraints
2. **Agent Memory:** Agents record their own execution patterns and insights
3. **Categories:** Both organize memories by topic
4. **Smart Search:** Agents independently explore memories before executing tasks

### Memory Lifecycle

Each memory has complete lifecycle tracking:

| Field | Purpose |
|-------|---------|
| **ID** | Unique identifier (format: `YYYYMMDD_xxxx`) |
| **Content** | Actual memory text (recommended ≤300 words) |
| **Created At** | When entry was added |
| **Updated At** | Last modification timestamp (auto-updates on changes) |

## Memory Operations

### List Categories

Discover what memories exist:
- Query user memories, Agent memories, or both
- Returns category names and entry counts
- Helps Agents understand available knowledge

### Get Memories

Retrieve specific memories:
- Fetch from multiple categories at once
- Query across owners (e.g., user `code_style` + Agent `learned_patterns`)
- Results sorted by most recently updated

### Add Memories

Store new knowledge:
- Add multiple entries across categories in one call
- Auto-creates categories if they don't exist
- Records creation timestamp

### Update Memories

Refine existing memories:
- Modify specific entries by ID
- Auto-updates `updated_at` timestamp
- Suitable for evolving preferences

### Delete Memories

Remove outdated information:
- Delete specific entries by ID
- Batch delete across categories
- Keep memories relevant and accurate

### Smart Search

AI-powered memory exploration:
- Agent describes what to find
- Search runs in isolated subtask
- Returns organized summary of relevant memories
- No main conversation token overhead

## Integration Patterns

### Memory + Sub-Agents

Experts inherit or share memories:

**Shared User Memory:**
All Agents in conversation access same user preferences (consistent behavior)

**Independent Agent Memory:**
Each expert learns from their domain (code reviewer vs. writer have different insights)

**Handoff Pattern:**
Main Agent searches memory → delegates to expert with context → expert learns from execution → updates own memory

### Memory + File Tool

Combine persistent knowledge with document delivery:

**Memory Guides Behavior:** Agent reads `documentation` preferences
**File Tool Delivers Results:** Creates `api_docs.md` following those preferences
**Learning Loop:** After user approval, Agent records successful patterns in memory

## Configuration Requirements

Requirements for effective memory use:

| Requirement | Purpose |
|-------------|---------|
| **Clear Instructions** | Tell Agent when to consult memory (e.g., "Always check user preferences before code generation") |
| **Memory Access** | Enable memory tool in Agent configuration |
| **Smart Search Usage** | Encourage use before complex tasks |
| **Learning Prompts** | Instruct Agent to record successful strategies |


## Related Documentation

- [User Memory](../memory/long-term/user-memory.md) - User Memory
- [Agent Memory](../memory/long-term/agent-memory.md) - Agent Memory
- [Agent Configuration](../agent/config.md) - Enable memory tool in Agents
