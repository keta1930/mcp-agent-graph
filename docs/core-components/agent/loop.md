# Agent Execution Loop

How agents think, act, and iterate to solve problems.

## Agent Loop Concept

Unlike simple chatbots that respond once, agents **iterate** through a cycle of thinking and acting until they solve the problem or reach a limit.

**Core Pattern:**

```mermaid
graph TB
    A[Receive User Request] --> B[Build Context]
    B --> C[Call Model]
    C --> D{Model Decision}
    D -->|Use Tools| E[Execute Tools]
    E --> F[Add Results to Context]
    F --> C
    D -->|Ready to Answer| G[Return Response]
    C --> H{Max Actions Reached?}
    H -->|Yes| I[Stop and Return Current State]
    H -->|No| C
```

From user input to final response is one cycle. Within each cycle, each tool call counts as one **iteration** or **action**.

## Next Steps

- **[Multi-Agent Systems](multi-agent.md)** - Use specialized agents for complex workflows
- **[Graph Workflows](../graph/index.md)** - Orchestrate multiple agent loops
- **[System Tools](../tools/index.md)** - Explore tools that extend agent capabilities
