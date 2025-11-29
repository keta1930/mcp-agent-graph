# Build Complex Workflows with Agents

Design and create sophisticated multi-agent workflows through conversational collaboration with Graph Designer.

## Overview

Complex workflows combine multiple specialized Agents working together through structured connections, conditional routing, and dynamic decision-making. Graph Designer enables you to build these workflows through natural conversation without manual configuration.

## What Makes a Workflow Complex

| Feature | Simple Workflow | Complex Workflow |
|---------|----------------|------------------|
| **Nodes** | 2-3 linear steps | Multiple specialized nodes with different roles |
| **Flow** | Sequential execution | Conditional branching, loops, parallel processing |
| **Logic** | Fixed routing | Dynamic path selection based on results |
| **Tools** | Single tool category | Multiple tool types (MCP, File, Sub-agent, Memory) |
| **Refinement** | Single pass | Iterative improvement with quality loops |

## Building Complex Workflows

Graph Designer provides conversational workflow design. Instead of manual configuration, describe your needs and collaborate with the Agent to create the workflow.

### Design Process

| Stage | What Happens | Your Role |
|-------|--------------|-----------|
| **Describe Goals** | Tell Graph Designer what process you want to automate | "I need to automate code review with quality checks" |
| **Clarify Requirements** | Agent asks about stages, tools, quality gates, branching logic | Answer questions about workflow details |
| **Review Draft** | Agent creates workflow configuration as a JSON file | Review the design in the file system |
| **Refine Iteratively** | Provide feedback on what to improve | "Add a retry loop for failed checks" |
| **Approve & Deploy** | Agent registers the workflow to the system | Confirm when satisfied with the design |

## Get Started

To build complex workflows, use the **Graph Designer** tool which provides:

- Complete design specification with all configuration options
- Conversational guidance through the design process
- Export existing workflows to learn from successful patterns
- Iterative refinement based on your feedback
- Validation and registration to the system

**→ [Learn how to use Graph Designer](../tools/graph-designer.md)**

## Related Documentation

- [Graph Designer](../tools/graph-designer.md) - Design workflows through conversation
- [Agent Handoffs](handoffs.md) - Dynamic flow control and conditional routing
- [Graph Execution](execution.md) - How workflows execute and pass data
- [File Tool](../tools/file-tool.md) - Manage workflow deliverables
- [Sub-agent](../tools/sub-agent.md) - Delegate subtasks within nodes
