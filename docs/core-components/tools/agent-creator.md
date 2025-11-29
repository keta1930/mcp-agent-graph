# Agent Creator

Enable human-AI collaboration to design and create specialized Agents through iterative refinement.

## Core Capabilities

Agent Creator provides guided Agent design through conversation:

| Capability | Benefit | Example |
|------------|---------|---------|
| **Requirements Gathering** | Agent asks clarifying questions to understand needs | User says "create coding agent" → Agent asks about languages, tools, use cases |
| **Specification Guidance** | Provides complete design specification with parameters explained | Learn what fields like `instruction`, `max_actions`, `mcp` mean and how to configure them |
| **Configuration as Files** | Agent designs are JSON files users can review and edit | `agent/code_reviewer.json` created in conversation, visible in file system |
| **Export Existing Agents** | Study successful Agent configurations | Export `data_analyst` config to learn patterns for new analytics Agent |
| **Iterative Refinement** | Modify designs based on feedback until satisfied | Draft → User feedback → Adjustment → Repeat until perfect |

**Collaboration Pattern:**

1. User states need in natural language
2. Agent Creator asks clarifying questions (languages, tools, scenarios)
3. Gets specification to understand all configuration options
4. Designs Agent config based on user requirements
5. Creates JSON file for user to review
6. User provides feedback, Agent adjusts design
7. Repeat until user approves
8. Registers finalized Agent to system

## Available Operations

| Operation | Purpose | When to Use |
|-----------|---------|-------------|
| `get_agent_spec` | Get complete Agent design specification | Starting a new Agent design to understand parameters |
| `export_agent_to_document` | Export existing Agent config to JSON file | Learning from successful Agents or creating variations |
| `register_agent` | Save Agent design to system | After user approves final configuration |

**Note:** Agent Creator works with File Tool to create/edit JSON configuration files.

## Common Workflows

### Creating New Agent

| Stage | Action | Details |
|-------|--------|---------|
| 1. Requirements | Agent asks questions | "What tasks will this Agent perform?", "What tools does it need?", "Which model?" |
| 2. Specification | Get design guide | `get_agent_spec` retrieves parameter explanations and examples |
| 3. Design | Draft configuration | Agent designs `card`, `instruction`, selects `model`, `tools`, `category` |
| 4. Review | Create file & discuss | `create_file("agent/reviewer.json", ...)` → User reviews design |
| 5. Refine | Iterate on feedback | User: "Add Python focus" → Agent updates with `update_file` |
| 6. Register | Save to system | User approves → `register_agent("agent/reviewer.json")` |

### Optimizing Existing Agent

| Stage | Action | Details |
|-------|--------|---------|
| 1. Export | Get current config | `export_agent_to_document("code_analyzer")` → Creates `agent/code_analyzer.json` |
| 2. Review | User identifies changes | "Make it more detailed", "Add security focus" |
| 3. Modify | Update configuration | Agent edits JSON using `update_file` or `rewrite_file` |
| 4. Refine | Iterate until satisfied | Multiple rounds of user feedback and adjustments |
| 5. Update | Re-register | `register_agent("agent/code_analyzer.json")` → Updates existing Agent |

### Creating Agent Variations

| Stage | Action | Result |
|-------|--------|--------|
| 1. Export base | `export_agent_to_document("python_expert")` | `agent/python_expert.json` |
| 2. Duplicate | `create_file("agent/javascript_expert.json")` | Copy of Python expert config |
| 3. Customize | Modify language-specific details | Change instruction, tools, tags for JavaScript |
| 4. Register | `register_agent("agent/javascript_expert.json")` | New JavaScript expert Agent |

## Design Principles

The specification guides Agents to follow these principles:

**Clear Capabilities:** Agent should have well-defined purpose and scope

**Detailed Descriptions:** `card` field explains what Agent does and when to use it

**Precise Instructions:** `instruction` accurately defines Agent's role and behavior

**Appropriate Tools:** Select tools matching Agent's domain (code tools for reviewers, file tools for analysts)

**Semantic Naming:** Clear names and tags help discovery

**Reasonable Limits:** Set `max_actions` based on task complexity

## Integration with Other Tools

**+ File Tool:** Agent configs are JSON files managed with file operations
- `create_file` to create initial design
- `read_file` to review current config
- `update_file` for targeted changes
- `rewrite_file` for major revisions

**+ Sub-agent:** Created Agents can be used via Sub-agent tool
- Design specialist Agents
- Delegate tasks to them
- Iterate on their configurations based on performance

## Related Documentation

- [File Tool](file-tool.md) - Manage Agent configuration files
- [Sub-agent](sub-agent.md) - Use created Agents for delegation
- [Agent Configuration](../agent/config.md) - Detailed configuration reference
