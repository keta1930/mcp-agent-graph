# Graph Designer

Enable human-AI collaboration to design and create multi-agent workflows through iterative refinement.

## Core Capabilities

Graph Designer provides guided workflow design through conversation:

| Capability | Benefit | Example |
|------------|---------|---------|
| **Requirements Gathering** | Agent asks questions to understand workflow needs | User says "automate code review" → Agent asks about steps, quality checks, tools |
| **Specification Guidance** | Provides complete design specification with all parameters explained | Learn node configuration, connections, handoffs, placeholders, and design patterns |
| **Configuration as Files** | Workflow designs are JSON files users can review and edit | `graph/code_review_workflow.json` created in conversation, visible in file system |
| **Export Existing Graphs** | Study successful workflow configurations | Export `research_pipeline` to learn multi-stage workflow patterns |
| **Iterative Refinement** | Modify designs based on feedback until satisfied | Draft → User feedback → Adjustment → Repeat until perfect |

## Why Use Graph Designer

- Natural language conversation to design workflows
- Agent asks questions to understand requirements
- Provides specification explaining all configuration options
- Can reference existing workflows for patterns
- Iterative improvement based on feedback

**Collaboration Pattern:**

1. User describes desired workflow in natural language
2. Graph Designer asks clarifying questions (stages, tools, quality checks)
3. Gets specification to understand all configuration options
4. Designs workflow config based on user requirements
5. Creates JSON file for user to review
6. User provides feedback, Agent adjusts design
7. Repeat until user approves
8. Registers finalized workflow to system

## Available Operations

| Operation | Purpose | When to Use |
|-----------|---------|-------------|
| `get_graph_spec` | Get complete workflow design specification | Starting a new workflow to understand parameters and patterns |
| `export_graph_to_document` | Export existing workflow config to JSON file | Learning from successful workflows or creating variations |
| `register_graph_from_document` | Save workflow design to system | After user approves final configuration |

**Note:** Graph Designer works with File Tool to create/edit JSON configuration files.

## Common Workflows

### Creating New Workflow

| Stage | Action | Details |
|-------|--------|---------|
| 1. Requirements | Agent asks questions | "What stages?", "Need quality checks?", "Which tools?", "Parallel processing?" |
| 2. Specification | Get design guide | `get_graph_spec` retrieves node configuration, connections, handoffs, placeholders |
| 3. Design | Draft configuration | Agent designs nodes, connections, prompts, tool assignments |
| 4. Review | Create file & discuss | `create_file("graph/review_workflow.json", ...)` → User reviews design |
| 5. Refine | Iterate on feedback | User: "Add iteration loop" → Agent updates with `update_file` |
| 6. Register | Save to system | User approves → `register_graph_from_document("graph/review_workflow.json")` |

### Optimizing Existing Workflow

| Stage | Action | Details |
|-------|--------|---------|
| 1. Export | Get current config | `export_graph_to_document("code_pipeline")` → Creates `graph/code_pipeline.json` |
| 2. Review | User identifies changes | "Add quality check loop", "Improve prompts" |
| 3. Modify | Update configuration | Agent edits JSON using `update_file` or `rewrite_file` |
| 4. Refine | Iterate until satisfied | Multiple rounds of user feedback and adjustments |
| 5. Update | Re-register | `register_graph_from_document("graph/code_pipeline.json")` → Updates workflow |

### Creating Workflow Variations

| Stage | Action | Result |
|-------|--------|--------|
| 1. Export base | `export_graph_to_document("research_workflow")` | `graph/research_workflow.json` |
| 2. Duplicate | `create_file("graph/analysis_workflow.json")` | Copy of research workflow config |
| 3. Customize | Modify for different domain | Change node instructions, tools, connections |
| 4. Register | `register_graph_from_document("graph/analysis_workflow.json")` | New analysis workflow |


## Human-AI Collaboration

### Agent Responsibilities

- Ask clarifying questions before designing
- Explain configuration options clearly
- Present draft for review before registering
- Listen to feedback and adjust accordingly
- Ensure user satisfaction before finalizing

## Integration with Other Tools

**+ File Tool:** Workflow deliverables managed as files
- Nodes use `create_file`, `update_file` for outputs
- Structured handoffs between workflow stages
- Version history for all deliverables

**+ Sub-agent:** Workflows can use sub-agents within nodes
- Node delegates subtasks to specialists
- Combines workflow orchestration with task delegation
- Clean separation of concerns

**+ Agent Creator:** Design specialists for workflow nodes
- Create domain-specific Agents
- Reference them in workflow nodes
- Consistent capabilities across workflows

## Related Documentation

- [File Tool](file-tool.md) - Manage workflow deliverables
- [Sub-agent](sub-agent.md) - Delegate tasks within nodes
- [Agent Configuration](../agent/config.md) - Configure workflow nodes
- [Graph Execution](../graph/execution.md) - How workflows run
- [Handoffs](../graph/handoffs.md) - Dynamic flow control
