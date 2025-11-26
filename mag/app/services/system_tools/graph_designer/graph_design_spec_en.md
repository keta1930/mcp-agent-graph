# MAG (MCP Agent Graph) Graph Design Specification

## Overview

MAG is a powerful multi-agent workflow system that builds complex agent collaboration processes through Nodes and Connections. Each node represents a specialized agent, and the connections between nodes determine the information flow and execution order.

This document is divided into three major parts:
1. **Basic Parameters and Descriptions** - Ensure Agent generates correct Graph configurations
2. **Design Best Practices** - Improve Graph design quality and collaboration efficiency
3. **Graph Creation Process** - Standardized Graph creation and optimization workflow

---

# Part One: Basic Parameters and Descriptions

## 1.1 Graph Top-Level Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | - | Unique name of the Graph, used to identify and reference this Graph. Cannot contain special characters (`/`, `\`, `.`) |
| `description` | string | No | `""` | Functional description of the Graph, explaining its purpose and application scenarios |
| `nodes` | array | Yes | - | List of node configurations, must contain at least one node |
| `end_template` | string | No | `null` | Final output format template, can use placeholders to reference node outputs |

## 1.2 Node Core Parameters

Each node represents an agent responsible for executing specific tasks.

### Required Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | Yes | - | Unique identifier for the node. Cannot contain special characters (`/`, `\`, `.`) |
| `description` | string | No | `""` | Detailed description of the node's function, explaining its responsibilities and outputs |

### Agent Configuration

**Configuration Method 1: Reference Registered Agent (Recommended)**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agent_name` | string | Yes* | - | Name of the registered Agent to reference. The node will inherit all Agent configurations |

When using `agent_name`, the node inherits all default configurations from the Agent (model, system_prompt, tools, etc.). Parameters explicitly specified in the node will **override** the Agent's defaults.

**Configuration Method 2: Manual Model and Prompt Configuration**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `model_name` | string | Yes* | - | Name of the AI model to use (required when not using `agent_name`) |
| `system_prompt` | string | No | `""` | System prompt defining the agent's role, capabilities, and behavior rules |
| `user_prompt` | string | No | `""` | User prompt containing specific task instructions and output requirements |

*Note: At least one of `agent_name` or `model_name` must be provided.

### Tool Configuration

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `mcp_servers` | string[] | No | `[]` | List of MCP service names available (e.g., web_search, github, etc.) |
| `system_tools` | string[] | No | `[]` | List of system tool names available (see Section 1.5) |
| `max_iterations` | number | No | `50` | Maximum number of tool calls (range: 1-200), used to limit node execution rounds |

### Connection Configuration

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `input_nodes` | string[] | No | `[]` | List of nodes providing input. `"start"` indicates receiving user's initial input |
| `output_nodes` | string[] | No | `[]` | List of nodes receiving output. `"end"` indicates output to final result |

**Data Flow Explanation:**
- Node receives outputs from all `input_nodes` as context
- Node's output is sent **in parallel** to all `output_nodes` (unless using handoffs, see below)
- Use `"start"` to mark the workflow's starting point, use `"end"` to mark the workflow's endpoint

### Advanced Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `handoffs` | number | No | `null` | **Important**: Enables dynamic flow control. When set, the node can **choose one** from `output_nodes` to jump to, instead of parallel output |
| `output_enabled` | boolean | No | `true` | Whether to include model's text output. When set to `false`, node only calls tools without generating text output |

**Important Notes about `handoffs` Parameter:**

- **Without `handoffs`**: Node's output is sent **in parallel** to all nodes in `output_nodes`
- **With `handoffs`**: Node must **choose one** node from `output_nodes` to jump to, enabling conditional branching and loops
- The value of `handoffs` indicates the maximum number of times this node can perform flow redirection
- Node automatically receives `transfer_to_<node_name>` tools for selecting target nodes

**Handoffs Use Cases:**
- **Conditional Branching**: Choose different subsequent nodes based on execution results (e.g., return for rework when quality check fails)
- **Loop Optimization**: Implement iterative optimization processes (e.g., code review-modify-review again)
- **Dynamic Routing**: Choose different processing paths based on task complexity

### Subgraph Configuration

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `is_subgraph` | boolean | No | `false` | Marks whether this node is a subgraph node |
| `subgraph_name` | string | Yes* | `null` | Subgraph name (required only when `is_subgraph` is `true`) |

*Subgraph nodes must set both `is_subgraph: true` and `subgraph_name`.

## 1.3 Placeholder Syntax

In `system_prompt`, `user_prompt`, and `end_template`, you can use placeholders to reference other nodes' outputs or registered prompt templates.

### Placeholder Types

| Syntax | Description | Example | Use Case |
|--------|-------------|---------|----------|
| `{{node_name}}` | Reference latest output of specified node | `{{research_agent}}` | Get latest result from a single node |
| `{{node_name:N}}` | Reference recent N outputs of specified node | `{{analyzer:3}}` | View node's multiple execution history |
| `{{node_name:all}}` | Reference all historical outputs of that node | `{{collector:all}}` | Get complete execution history of node |
| `{{@prompt_name}}` | Reference registered prompt template | `{{@code_review_template}}` | Reuse standardized prompt templates |
| `{{node1:2\|node2:3}}` | Joint reference of multiple nodes' outputs | `{{agent1:2\|agent2:3}}` | Integrate historical outputs from multiple nodes |

### Placeholder Usage Example

```json
{
  "name": "report_generator",
  "user_prompt": "Generate a comprehensive report based on the following information:\n\n## Research Results\n{{research_agent}}\n\n## Data Analysis\n{{data_analyzer:2}}\n\nPlease integrate this information and generate a well-structured professional report."
}
```

## 1.4 System Tools Description

System tools are built-in functional modules of MAG, configured through the `system_tools` parameter. **Important**: Use **tool names** (not class names) when configuring.

### File Operations Tools (file_creator)

**Core Capability**: Provides complete document management capabilities, enabling document-based task handoffs and work collaboration between nodes.

**Available Tools:**
- `create_file` - Create new files (supports directory structure, e.g., `research/report.md`)
- `read_file` - Batch read file contents, summaries, and operation history
- `update_file` - Make precise local modifications through string replacement
- `rewrite_file` - Completely rewrite file contents, suitable for large-scale modifications
- `delete_files` - Delete unwanted files
- `list_all_files` - List all file inventory
- `list_files_by_directory` - List file inventory by directory

**Features:**
- All files are stored at **conversation level**, accessible to all nodes in the same Graph
- Automatically maintains **version history and operation logs**, traceable for every modification
- Supports directory structure for organizing complex projects

**Core Value:**
File tools are the most important collaboration mechanism in Graph design. They allow nodes to persist work results as documents for subsequent nodes to read, edit, and deliver. This document-based collaboration model enables complex tasks to be broken down into clear workflows.

### Sub-Agent Tools (subagent)

**Core Capability**: Call other specialized Agents within a node to handle specific subtasks, enabling capability composition and expansion.

**Available Tools:**
- `agent_task_executor` - Call other Agents to execute tasks, supports batch calls and history inheritance
- `list_agent_categories` - List all Agent categories
- `list_agents_in_category` - List Agents in specified category
- `get_agent_details` - Get detailed information about an Agent (capabilities, model, tools, etc.)

**Features:**
- Supports **delegating multiple tasks simultaneously** to different Agents
- Each task has an independent `task_id`, execution history can be tracked
- If `task_id` already exists, sub-Agent will **inherit complete conversation history** to continue execution
- Automatically prevents recursive calls (sub-Agents won't call `agent_task_executor` again)

**Core Value:**
Sub-agent tools allow complex multi-Agent collaboration within a single node, delegating specific tasks to specialized Agents. This provides more flexible collaboration than multi-node Graphs, suitable for handling complex tasks requiring multiple specialized capabilities.

### Memory Management Tools (memory_tools)

**Core Capability**: Provides persistent memory capabilities to remember user preferences, learn experiences, and contextual information.

**Available Tools:**
- `add_memory` - Add new memory
- `get_memory` - Retrieve memory content
- `update_memory` - Update memory content
- `delete_memory` - Delete memory
- `list_memory_categories` - List all memory categories

**Core Value:**
Accumulate and utilize historical knowledge in workflows, enabling cross-session contextual memory and learning capabilities.

---

# Part Two: Design Best Practices

This part introduces how to design high-quality Graphs and fully utilize system tools to achieve efficient multi-agent collaboration.

## 2.1 Core Design Principles

### Principle 1: Document-Based Work Handoff

**Core Idea**: Use file tools to persist each node's work results as documents, enabling clear task handoffs.

**Why It's Important:**
- **Persistence**: Documents persist throughout the entire Graph execution, accessible to all nodes
- **Traceability**: Version history records every modification, facilitating review and rollback
- **Clear Handoff**: Explicit document structure makes collaboration between nodes more standardized
- **Parallel Collaboration**: Multiple nodes can read documents simultaneously, providing suggestions and checks

**Design Patterns:**

1. **Single Document Owner Pattern** (Recommended)
   - Each document is created and modified by one node
   - Other nodes only read and check, using handoffs to request owner modifications
   - Avoids conflicts from multiple nodes modifying the same document simultaneously

2. **Collaborative Editing Pattern**
   - Multiple nodes collaborate to edit different documents
   - Each node is responsible for specific types of documents (e.g., research docs, code docs, test docs)
   - Organize different types of work results through document directory structure

**Example Scenario: Software Development Workflow**

```
Requirements Analysis Node → Creates requirements/spec.md
     ↓
Architecture Design Node → Reads spec.md, creates design/architecture.md
     ↓
Code Implementation Node → Reads architecture.md, creates code/main.py
     ↓
Code Review Node → Reads code/main.py
     ↓ (if issues found)
  Uses handoffs to return to Code Implementation Node with improvement suggestions
     ↓ (if passes review)
  Ends process
```

### Principle 2: Use Subagent to Isolate Context

**Core Idea**: Use `agent_task_executor` within a single node to call specialized Agents to handle subtasks, avoiding context pollution.

**Why It's Important:**
- **Context Isolation**: Each subtask has independent conversation context, no mutual interference
- **Specialized Division**: Fully utilize specialized Agents' capabilities and prompts
- **Flexible Composition**: Implement complex multi-Agent collaboration within a single node
- **Traceability**: Each subtask has independent task_id, can view complete execution history

**When to Use Subagent vs Multi-Node Graph:**

| Scenario | Use Subagent | Use Multi-Node Graph |
|----------|--------------|---------------------|
| Task Relationship | Parallel independent subtasks | Clear sequential workflow |
| Context | Need to isolate context | Need to share context |
| Complexity | Medium complexity task decomposition | Large complex workflows |
| Visualization | Don't need to visualize subtask flow | Need clear flowchart |

**Example: Deep Research Node Using Subagent**

```json
{
  "name": "research_coordinator",
  "description": "Coordinate multiple research subtasks",
  "system_prompt": "You are a research coordinator. Use agent_task_executor to assign research tasks to specialized researchers.",
  "user_prompt": "Please research the following topic: {{start}}\n\nBreak down the task into multiple subtasks, assign them to different researchers for parallel execution. Integrate all research results into research/findings.md document.",
  "system_tools": ["agent_task_executor", "list_agent_categories", "list_agents_in_category", "get_agent_details", "create_file", "update_file"],
  "input_nodes": ["start"],
  "output_nodes": ["report_writer"]
}
```

The research coordinator node can:
1. Use `list_agent_categories`, `list_agents_in_category`, and `get_agent_details` to find available researcher Agents
2. Use `agent_task_executor` to create multiple research tasks simultaneously
3. Wait for all subtasks to complete, integrate results into document
4. Pass document to report writing node

### Principle 3: Use Handoffs for Branching and Loops

**Core Idea**: Use the `handoffs` parameter to implement dynamic flow control, rather than fixed parallel output.

**How Handoffs Work:**
- After setting `handoffs` parameter, the node's `output_nodes` become a **selectable target list**
- Node automatically receives `transfer_to_<node_name>` tools
- Node must call one of the transfer tools to select the next step
- The value of `handoffs` limits the maximum number of times this node can be re-executed

**Three Core Scenarios:**

#### Scenario 1: Quality Check and Rework Loop

```json
{
  "nodes": [
    {
      "name": "content_creator",
      "description": "Create content",
      "system_tools": ["create_file", "update_file"],
      "input_nodes": ["start"],
      "output_nodes": ["quality_checker"]
    },
    {
      "name": "quality_checker",
      "description": "Check quality, decide to pass or rework",
      "system_prompt": "You are a quality check expert. If content is qualified, use transfer_to_end; if needs improvement, use transfer_to_content_creator with detailed problem descriptions.",
      "system_tools": ["read_file"],
      "input_nodes": ["content_creator"],
      "output_nodes": ["content_creator", "end"],
      "handoffs": 3
    }
  ]
}
```

**Process Explanation:**
- After content creation node completes, flow enters quality check node
- Quality check node reads document, evaluates quality
- If issues found: calls `transfer_to_content_creator`, flow returns to creation node (with improvement suggestions)
- If quality is good: calls `transfer_to_end`, ends process
- `handoffs: 3` limits maximum 3 rework iterations, avoiding infinite loops

#### Scenario 2: Conditional Branch Processing

```json
{
  "name": "task_router",
  "description": "Route to different processing nodes based on task type",
  "system_prompt": "Analyze task type:\n- Coding task → transfer_to_coding_expert\n- Data analysis → transfer_to_data_analyst\n- Documentation → transfer_to_doc_writer",
  "input_nodes": ["start"],
  "output_nodes": ["coding_expert", "data_analyst", "doc_writer"],
  "handoffs": 1
}
```

#### Scenario 3: Iterative Optimization Process

```json
{
  "nodes": [
    {
      "name": "solution_designer",
      "description": "Design solution",
      "system_tools": ["create_file"],
      "input_nodes": ["start"],
      "output_nodes": ["solution_evaluator"]
    },
    {
      "name": "solution_evaluator",
      "description": "Evaluate solution, decide if optimization needed",
      "system_prompt": "Evaluate solution quality. If needs improvement use transfer_to_solution_optimizer; if satisfied use transfer_to_end.",
      "system_tools": ["read_file"],
      "input_nodes": ["solution_designer", "solution_optimizer"],
      "output_nodes": ["solution_optimizer", "end"],
      "handoffs": 2
    },
    {
      "name": "solution_optimizer",
      "description": "Optimize solution based on evaluation feedback",
      "system_tools": ["read_file", "update_file"],
      "input_nodes": ["solution_evaluator"],
      "output_nodes": ["solution_evaluator"]
    }
  ]
}
```

**Key Design Points:**
- **Clear Decision Logic**: Clearly explain in system_prompt when to choose which node
- **Limit Loop Count**: Avoid infinite loops through `handoffs` value
- **Carry Feedback Information**: Should include specific improvement suggestions when reworking

### Principle 4: Single Node as Single Agent

**Core Idea**: Each node is a complete agent that can fully utilize system tools and MCP tools to achieve complex tasks.

**Node Capability Boundaries:**
- Node can call multiple tools to complete complex tasks
- Node can create, read, and modify multiple documents
- Node can call multiple sub-Agents to handle parallel subtasks
- Node can make flow decisions through handoffs

**Example: Comprehensive Research Node**

```json
{
  "name": "comprehensive_researcher",
  "description": "Execute complete research process: search, analyze, organize, document",
  "agent_name": "senior_researcher",
  "mcp_servers": ["web_search", "arxiv_search"],
  "system_tools": [
    "agent_task_executor",
    "list_agents_in_category",
    "create_file",
    "update_file",
    "read_file"
  ],
  "max_iterations": 100,
  "input_nodes": ["start"],
  "output_nodes": ["report_generator"]
}
```

This node can:
1. Use MCP tools to search for information
2. Use subagent tools to delegate specialized Agents to analyze specific domains
3. Use file tools to organize research results into structured documents
4. Complete entire research process within a single node

## 2.2 Node Design Principles

### Principle 1: Single Responsibility

Each node should focus on one clear task, making it easy to understand, test, and maintain.

**Good Design:**
```json
{
  "name": "requirements_analyzer",
  "description": "Analyze user requirements, extract key features and constraints"
}
```

**Bad Design:**
```json
{
  "name": "full_stack_processor",
  "description": "Analyze requirements, design architecture, write code, test, deploy"
}
```

**Signals to Split Complex Tasks:**
- Node description exceeds 2 sentences
- Node needs to configure more than 10 tools
- Node's max_iterations needs to be set very large (> 150)
- Node needs to handle multiple completely different tasks

### Principle 2: Clear Input and Output

Each node should clearly define:
- **Input Expectations**: What information is needed from input_nodes
- **Output Commitment**: What results will be provided to output_nodes
- **Deliverables**: What documents will be created, document structure and content

**Example: Clear Delivery Requirements**

```json
{
  "name": "api_designer",
  "user_prompt": "Design RESTful API based on requirements document.\n\nRequirements: {{requirements_analyzer}}\n\n## Delivery Requirements\n\n1. **API Design Document**\n   - File path: `design/api_spec.md`\n   - Format: Markdown\n   - Content: Endpoint list, request/response formats, authentication methods, error handling\n   - Quality standards: Follow RESTful best practices, include complete examples\n\n2. **OpenAPI Specification**\n   - File path: `design/openapi.yaml`\n   - Format: YAML\n   - Content: Complete OpenAPI 3.0 specification\n\n## Acceptance Criteria\n\n- [ ] All endpoints have clear purpose descriptions\n- [ ] Include complete request and response examples\n- [ ] All data models are defined\n- [ ] Include error handling approach"
}
```

### Principle 3: Appropriate Tool Configuration

**Configure on Demand Principle:**
- Only configure tools that the node actually needs
- Avoid configuring all tools for all nodes
- Consider tool performance and cost impact

**Tool Combination Strategies:**

| Node Type | Recommended Tool Combination | Description |
|-----------|------------------------------|-------------|
| Information Gathering | MCP services + `create_file` | Search information and save to documents |
| Content Creation | `create_file`, `update_file` | Create and modify documents |
| Quality Check | `read_file` + handoffs | Read documents and make flow decisions |
| Coordinator Node | `agent_task_executor`, `list_agents_in_category`, file tools | Delegate subtasks and integrate results |
| Analysis Node | `read_file`, `create_file`, specific MCP services | Read data, analyze, output reports |

### Principle 4: Clear Role Definition

In `system_prompt`, clearly define the agent's:
- **Role Identity**: Expert type, scope of responsibilities
- **Capability Boundaries**: What it's good at, what it's not good at
- **Behavioral Norms**: How it should work, what to avoid
- **Decision Criteria**: (when using handoffs) When to choose which branch

## 2.3 Prompt Design Best Practices

### Best Practice 1: Structured Prompts

Use headings and lists to organize prompts, making them easy to understand and maintain.

```json
{
  "user_prompt": "# Task Objective\n\nGenerate technical documentation for the user authentication module.\n\n# Input Content\n\nRequirements Document: {{requirements}}\nArchitecture Design: {{architecture}}\n\n# Output Requirements\n\n1. **Functional Overview**: Briefly explain the purpose of the authentication module\n2. **Technical Implementation**: Describe technologies and algorithms used\n3. **API Interface**: List all related APIs\n4. **Security Considerations**: Explain security measures and best practices\n\n# Deliverables\n\n- File path: `docs/authentication.md`\n- Format: Markdown, organized with level-2 headings\n- Length: 800-1200 words"
}
```

### Best Practice 2: Clear Delivery Checklist

**Why Delivery Checklist is Needed:**
- Ensure node output meets expectations
- Standardize document storage location and naming
- Define output format and quality standards
- Facilitate downstream node validation and usage

**Delivery Checklist Template:**

```
## Delivery Requirements

Please complete the following deliverables:

1. **[Deliverable Name]**
   - File path: `[specific path]`
   - Format requirements: [Markdown/JSON/code, etc.]
   - Content requirements: [specific instructions]
   - Quality standards: [evaluation criteria]

2. **[Deliverable Name]**
   - ...

## Acceptance Criteria

- [ ] All files created at specified paths
- [ ] Content is complete, includes all required parts
- [ ] Format is standardized, meets requirements
- [ ] Quality meets standards
```

### Best Practice 3: Using Placeholder References

**Placeholder Purposes:**
- Reference upstream node outputs
- Reuse standardized prompt templates
- Reference node execution history

**Best Practices:**
- Add context labels to placeholders explaining what content is referenced
- Use history references (like `{{node:3}}`) to view multiple executions
- Avoid passing too much redundant information, only reference necessary content

**Example:**

```json
{
  "user_prompt": "Generate comprehensive report based on the following content:\n\n## Market Research Results\n{{market_research}}\n\n## Competitor Analysis (last 2 analyses)\n{{competitor_analysis:2}}\n\n## User Research Feedback\n{{user_research}}\n\nPlease integrate this information and generate a well-structured market analysis report, save to reports/market_analysis.md."
}
```

### Best Practice 4: Decision Instructions When Using Handoffs

When using handoffs, must clearly specify decision logic in prompts.

**Template:**

```
## Flow Decision

Choose the next step based on the following criteria:

1. **If [Condition 1]**
   - Use transfer_to_[node_1]
   - Explanation: [Why choose this node]

2. **If [Condition 2]**
   - Use transfer_to_[node_2]
   - Explanation: [Why choose this node]

3. **If [Condition 3]**
   - Use transfer_to_end
   - Explanation: Work is complete

When making a choice, please briefly explain your reasoning.
```

**Example: Code Review Decision Logic**

```json
{
  "system_prompt": "You are a senior code review expert. Review code quality, readability, performance, and security.",
  "user_prompt": "Please review the following code:\n\n{{code_generator}}\n\n## Review Standards\n\n- Code logic correctness\n- Compliance with coding standards\n- No obvious performance issues\n- No security vulnerabilities\n- Good code readability\n\n## Flow Decision\n\n1. **If serious issues found** (logic errors, security vulnerabilities)\n   - Use transfer_to_code_generator\n   - List all issues and improvement suggestions in detail\n\n2. **If minor issues found** (style issues, optimization opportunities)\n   - Based on number and severity of issues:\n     - Many issues or significant impact: transfer_to_code_generator\n     - Few issues and limited impact: transfer_to_end, and note in review comments\n\n3. **If code quality is excellent**\n   - Use transfer_to_end\n   - Explain reasons why code passes review\n\nPlease complete detailed review first, then make decision.",
  "handoffs": 3
}
```

## 2.4 Complete Workflow Design Patterns

### Pattern 1: Parallel Fork-Join

**Applicable Scenarios**: Multiple independent tasks can execute in parallel, then converge results.

**Structure:**
```
start → Distributor Node ⟹ Node1
                        ⟹ Node2  → Converger Node → end
                        ⟹ Node3
```

**Example: Multi-Perspective Research Workflow**

```json
{
  "name": "parallel_research",
  "nodes": [
    {
      "name": "research_coordinator",
      "description": "Distribute research tasks",
      "input_nodes": ["start"],
      "output_nodes": ["tech_researcher", "market_researcher", "user_researcher"]
    },
    {
      "name": "tech_researcher",
      "description": "Technical feasibility research",
      "system_tools": ["create_file"],
      "mcp_servers": ["web_search", "arxiv"],
      "input_nodes": ["research_coordinator"],
      "output_nodes": ["report_integrator"]
    },
    {
      "name": "market_researcher",
      "description": "Market research",
      "system_tools": ["create_file"],
      "mcp_servers": ["web_search"],
      "input_nodes": ["research_coordinator"],
      "output_nodes": ["report_integrator"]
    },
    {
      "name": "user_researcher",
      "description": "User requirements research",
      "system_tools": ["create_file"],
      "input_nodes": ["research_coordinator"],
      "output_nodes": ["report_integrator"]
    },
    {
      "name": "report_integrator",
      "description": "Integrate all research results",
      "system_tools": ["read_file", "create_file"],
      "input_nodes": ["tech_researcher", "market_researcher", "user_researcher"],
      "output_nodes": ["end"]
    }
  ]
}
```

### Pattern 2: Quality Loop (Using Handoffs)

**Applicable Scenarios**: Need repeated checking and improvement until quality standards are met.

**Structure:**
```
start → Creation Node → Check Node ⟲ Return to Creation Node (if not qualified)
                          ↓
                         end (if qualified)
```

**Example: Code Development and Review**

```json
{
  "name": "code_development_cycle",
  "nodes": [
    {
      "name": "requirement_analyst",
      "description": "Analyze requirements, create requirements document",
      "system_tools": ["create_file"],
      "input_nodes": ["start"],
      "output_nodes": ["code_developer"]
    },
    {
      "name": "code_developer",
      "description": "Develop code based on requirements and feedback",
      "system_tools": ["read_file", "create_file", "update_file"],
      "input_nodes": ["requirement_analyst", "code_reviewer"],
      "output_nodes": ["code_reviewer"]
    },
    {
      "name": "code_reviewer",
      "description": "Review code, decide to pass or rework",
      "system_prompt": "Review code quality. If issues found use transfer_to_code_developer; if code is qualified use transfer_to_test_engineer.",
      "system_tools": ["read_file"],
      "input_nodes": ["code_developer"],
      "output_nodes": ["code_developer", "test_engineer"],
      "handoffs": 3
    },
    {
      "name": "test_engineer",
      "description": "Write and execute tests",
      "system_tools": ["read_file", "create_file"],
      "input_nodes": ["code_reviewer"],
      "output_nodes": ["end"]
    }
  ]
}
```

### Pattern 3: Conditional Routing (Using Handoffs)

**Applicable Scenarios**: Based on input characteristics or intermediate results, choose different processing paths.

**Structure:**
```
start → Router Node ⟹ Path1 → end
                   ⟹ Path2 → end
                   ⟹ Path3 → end
```

**Example: Customer Service Intelligent Routing**

```json
{
  "name": "customer_service_router",
  "nodes": [
    {
      "name": "request_classifier",
      "description": "Analyze customer request type",
      "system_prompt": "Analyze request: technical issue → transfer_to_tech_support; billing issue → transfer_to_billing_support; general inquiry → transfer_to_general_support",
      "input_nodes": ["start"],
      "output_nodes": ["tech_support", "billing_support", "general_support"],
      "handoffs": 1
    },
    {
      "name": "tech_support",
      "description": "Handle technical support requests",
      "system_tools": ["create_file"],
      "mcp_servers": ["knowledge_base"],
      "input_nodes": ["request_classifier"],
      "output_nodes": ["end"]
    },
    {
      "name": "billing_support",
      "description": "Handle billing-related issues",
      "system_tools": ["create_file"],
      "input_nodes": ["request_classifier"],
      "output_nodes": ["end"]
    },
    {
      "name": "general_support",
      "description": "Handle general inquiries",
      "system_tools": ["create_file"],
      "input_nodes": ["request_classifier"],
      "output_nodes": ["end"]
    }
  ]
}
```

### Pattern 4: Iterative Optimization (Using Handoffs)

**Applicable Scenarios**: Need multiple rounds of optimization and improvement, each round based on evaluation feedback.

**Structure:**
```
start → Design Node → Evaluation Node ⟲ Optimization Node → Evaluation Node
                          ↓
                         end (when satisfied)
```

**Example: Solution Iterative Optimization**

```json
{
  "name": "solution_optimization",
  "nodes": [
    {
      "name": "initial_designer",
      "description": "Create initial solution",
      "system_tools": ["create_file"],
      "input_nodes": ["start"],
      "output_nodes": ["solution_evaluator"]
    },
    {
      "name": "solution_evaluator",
      "description": "Evaluate solution, decide if optimization needed",
      "system_prompt": "Evaluate solution feasibility, completeness, and innovation. If needs improvement use transfer_to_optimizer; if satisfied use transfer_to_end.",
      "system_tools": ["read_file"],
      "input_nodes": ["initial_designer", "optimizer"],
      "output_nodes": ["optimizer", "end"],
      "handoffs": 3
    },
    {
      "name": "optimizer",
      "description": "Optimize solution based on evaluation feedback",
      "system_tools": ["read_file", "update_file"],
      "input_nodes": ["solution_evaluator"],
      "output_nodes": ["solution_evaluator"]
    }
  ]
}
```


---

# Part Three: Graph Creation Process

This part details how to create and optimize Graphs in a standardized manner, including tools used, interaction process, and best practices.

## 3.1 Graph Designer System Tools

Before creating a Graph, you must understand the Graph Designer toolset functionality.

### Available Tools

| Tool Name | Function | Use Case |
|-----------|----------|----------|
| `get_graph_spec` | Get Graph design specification document (this document) | Understand Graph configuration parameters and design principles |
| `export_graph_to_document` | Export registered Graph as JSON document | View existing Graph configuration, use as design reference or for optimization |
| `register_graph_from_document` | Register Graph to system from JSON document | Create new Graph or update existing Graph |

### Other Auxiliary Tools

When designing Graphs, it's recommended to use the following tools in conjunction:

**Resource Exploration Tools (system_operations):**
- `list_agents_in_category` - View available Agents
- `get_agent_details` - Get detailed Agent configuration
- `list_all_mcps` - View available MCP services
- `get_mcp_details` - Get MCP service tool list
- `list_system_tools` - View all system tools
- `list_all_models` - View available models
- `list_all_prompts` - View prompt templates
- `get_prompt_content` - Get prompt template content

**File Tools (file_creator):**
- `create_file` - Create Graph configuration document (required)
- `read_file` - Read existing configuration
- `update_file` - Make small-scale modifications to configuration
- `rewrite_file` - Large-scale rewrite of configuration
- `delete_files` - Delete unwanted configuration documents

## 3.2 Complete Process for Creating New Graph

### Step 1: Requirements Confirmation and Resource Exploration

Before starting design, you must fully understand user requirements and available resources.

**Requirements Confirmation Checklist:**

Ask the user the following key information:
- What is the main purpose and application scenario of the Graph?
- What tasks or workflows need to be completed?
- What are the expected inputs? What are the expected outputs?
- What are the key steps in the workflow? How do steps depend on each other?
- Do you need quality checking, conditional branching, or iterative optimization?
- Do you need to process multiple subtasks in parallel?
- Are there any special requirements or constraints?

**Resource Exploration Checklist:**

Use system tools to explore available resources:

```json
{
  "system_tools": [
    "list_agents_in_category",
    "get_agent_details",
    "list_all_mcps",
    "get_mcp_details",
    "list_system_tools",
    "list_all_models"
  ]
}
```

**Exploration Steps:**
1. Use `list_agents_in_category` to view Agents in relevant categories
2. Use `get_agent_details` to view candidate Agents' capabilities and tools
3. Use `list_all_mcps` to view available MCP services
4. Use `list_system_tools` to understand available system tools

**Only after the user clearly answers requirement questions and resource exploration is complete, can you proceed to the next step.**

### Step 2: Architecture Design and Solution Presentation

Based on requirements and available resources, design Graph architecture.

**Architecture Design Points:**

1. **Node Design**
   - Determine number and type of nodes
   - Define clear responsibilities for each node
   - Choose appropriate Agent or configure model
   - Determine tools and services needed for each node
   - Design node prompts and delivery checklists

2. **Connection Design**
   - Determine input-output relationships between nodes
   - Identify parts that need parallel processing
   - Identify parts that need conditional branching or loops
   - Determine handoffs usage locations and count limits

3. **Document Flow Design** (if using document collaboration)
   - Plan document directory structure
   - Determine documents each node is responsible for
   - Define document format and content standards
   - Design document version management strategy

4. **Decision Logic Design** (if using handoffs)
   - Clarify decision criteria for each decision node
   - Design clear flow transfer logic
   - Set reasonable loop count limits

**Solution Presentation Format:**

Use text description or simple flowchart to present design solution to user.

**Example:**

```
# Graph Architecture Solution: Code Development Workflow

## Workflow Overview

This Graph implements a complete code development process, including requirements analysis, code development, code review, and testing. Uses document-based collaboration mode and handoffs to implement quality loops.

## Node Design

1. **Requirements Analysis Node** (requirement_analyst)
   - Responsibility: Analyze user requirements, create requirements document
   - Uses: Professional requirements analysis Agent
   - Tools: create_file
   - Input: User's initial requirements description
   - Output: requirements/spec.md document
   - Flow: Code development node

2. **Code Development Node** (code_developer)
   - Responsibility: Develop code based on requirements document, respond to review feedback
   - Uses: Advanced programming Agent
   - Tools: read_file, create_file, update_file
   - Input: Requirements document + review feedback (if any)
   - Output: code/main.py and other code files
   - Flow: Code review node

3. **Code Review Node** (code_reviewer) - uses handoffs
   - Responsibility: Review code quality, decide to pass or rework
   - Uses: Code review expert Agent
   - Tools: read_file
   - Input: Code files
   - Decision logic:
     - Issues found → transfer_to_code_developer (with detailed improvement suggestions)
     - Code qualified → transfer_to_test_engineer
   - Handoffs limit: Maximum 3 reworks

4. **Test Engineering Node** (test_engineer)
   - Responsibility: Write and execute test cases
   - Uses: Testing expert Agent
   - Tools: read_file, create_file
   - Input: Code that passed review
   - Output: Test files and test reports in tests/ directory
   - Flow: End

## Flowchart

start
  ↓
Requirements Analysis Node
  ↓
Code Development Node ⟲ Code Review Node (handoffs: 3)
  ↓
Test Engineering Node
  ↓
end

## Key Design Decisions

- Use document collaboration mode, all work results persisted as documents
- Use handoffs to implement code review-development quality loop
- Limit maximum 3 reworks to avoid infinite loops
- Each node has clear delivery checklist to ensure output quality
```

**Wait for user confirmation before proceeding to next step.**

### Step 3: Create Configuration Document

Use `create_file` tool to create Graph configuration document.

**File Path Convention:**
- Uniformly stored in `graph/` directory
- File name uses descriptive name, extension is `.json`
- Example: `graph/code_development_workflow.json`

**Configuration Document Structure:**

```json
{
  "name": "graph_name",
  "description": "Graph functional description",
  "nodes": [
    {
      "name": "node_1",
      "description": "Node functional description",
      "agent_name": "agent_name",
      "system_tools": ["tool1", "tool2"],
      "mcp_servers": ["mcp1"],
      "max_iterations": 50,
      "input_nodes": ["start"],
      "output_nodes": ["node_2"]
    },
    {
      "name": "node_2",
      "description": "Node functional description",
      "model_name": "claude-3-5-sonnet-20241022",
      "system_prompt": "System prompt",
      "user_prompt": "User prompt with placeholders: {{node_1}}",
      "system_tools": ["tool3"],
      "input_nodes": ["node_1"],
      "output_nodes": ["end"]
    }
  ],
  "end_template": "Final output template: {{node_2}}"
}
```

**Key Considerations:**
- Ensure JSON format is correct without syntax errors
- Ensure all required fields are filled in
- Ensure node names are unique and don't contain special characters
- Ensure referenced Agents, models, and tools exist
- Ensure input_nodes and output_nodes connections are correct
- Ensure nodes using handoffs have clear decision logic

### Step 4: Iterative Optimization

Make adjustments and optimizations based on user feedback.

**Optimization Process:**

1. **Present Configuration to User**
   - Inform user that configuration document has been created and can be viewed/edited in frontend document manager
   - Briefly explain key contents of configuration to user (number of nodes, main process, special design, etc.)
   - Ask if adjustments are needed

2. **Listen to User Feedback**
   - Carefully listen to every piece of user feedback
   - Understand user's concerns and improvement suggestions
   - Confirm specific content that needs modification

3. **Execute Modifications**
   - **Small-scale modifications**: Use `update_file` tool for precise replacement
   - **Large-scale modifications**: Use `rewrite_file` tool to rewrite entire file

4. **Explain Changes**
   - After each modification, clearly explain what adjustments were made to user
   - Explain reasons for modifications and expected effects
   - Ask if further adjustments are needed

5. **Continue Iteration**
   - Repeat steps 1-4 until user is satisfied
   - Ensure user explicitly expresses satisfaction before proceeding to next step

**Common Optimization Scenarios:**

| User Feedback | Optimization Solution | Tool Used |
|---------------|---------------------|-----------|
| Need to add new node | Add new node configuration in nodes array, update related node connections | `update_file` or `rewrite_file` |
| Need to modify prompts | Update specified node's system_prompt or user_prompt | `update_file` |
| Need to adjust tool configuration | Update node's system_tools or mcp_servers | `update_file` |
| Need to change process logic | Modify node's input_nodes, output_nodes, or handoffs | `update_file` |
| Need to redesign architecture | Re-plan nodes and connection relationships | `rewrite_file` |

### Step 5: Register Graph

After user confirms satisfaction, use `register_graph_from_document` to register Graph.

**Pre-Registration Checklist:**

- [ ] User explicitly expresses satisfaction, no need to continue modifications
- [ ] JSON format is correct without syntax errors
- [ ] All required fields are filled in
- [ ] Node names are unique and valid
- [ ] Referenced resources (Agents, models, tools) exist
- [ ] Node connection relationships are reasonable, no isolated nodes
- [ ] Nodes using handoffs have clear decision logic

**Registration Command:**

```json
{
  "tool": "register_graph_from_document",
  "arguments": {
    "file_path": "graph/your_graph_config.json"
  }
}
```

**Registration Results:**
- Success: Graph is registered to system, user can see and use it in interface
- Failure: System returns specific error information, modify configuration according to error and re-register

**Post-Registration Explanation:**

Explain to user:
- Graph successfully registered, name is `xxx`
- User can find and use it in Graph list in interface
- If subsequent modifications are needed, can export-modify-register again

## 3.3 Process for Optimizing Existing Graph

### Step 1: Export Existing Configuration

Use `export_graph_to_document` to export Graph configuration.

**Export Command:**

```json
{
  "tool": "export_graph_to_document",
  "arguments": {
    "graph_name": "existing_graph_name",
    "target_path": "graph/existing_graph_config.json"
  }
}
```

**After Export:**
- Use `read_file` to read exported configuration
- Briefly explain current Graph structure to user
- Understand what user wants to optimize

### Step 2: Understand Optimization Requirements

Ask user about specific content they want to optimize:

**Common Optimization Requirements:**
- Add/delete/modify nodes
- Adjust connection relationships between nodes
- Optimize prompts to improve output quality
- Adjust tool configuration to enhance node capabilities
- Add quality checking and loop mechanisms
- Improve performance or error handling
- Introduce document collaboration mode
- Redesign workflow architecture

### Step 3: Execute Optimization

Modify configuration according to user requirements.

**Optimization Strategies:**
- **Small-scale modifications**: Use `update_file` for precise replacement
- **Large-scale modifications**: Use `rewrite_file` to rewrite entire configuration

**Optimization Examples:**

**Scenario 1: Add Quality Check Loop**

Original configuration:
```
content_creator → end
```

Optimized:
```
content_creator → quality_checker (handoffs) ⟲ content_creator
                                          ↓
                                         end
```

**Scenario 2: Introduce Document Collaboration**

Add file tools to each node and add delivery checklists in prompts.

**Scenario 3: Add Parallel Processing**

Split single complex node into multiple specialized nodes, execute in parallel then converge results.

### Step 4: Iterative Optimization

Same as process for creating new Graph, continuously optimize based on user feedback.

### Step 5: Re-register

After user confirms satisfaction, use `register_graph_from_document` to re-register.

**Note:** Re-registration updates existing Graph configuration, doesn't create new Graph.

## 3.4 Interaction Principles and Best Practices

### Interaction Principles

1. **Requirements First**
   - Before starting design, must first clarify user's specific requirements
   - Don't design based on assumptions, design based on user's explicit requirements

2. **Resource Exploration**
   - Use system tools to explore available Agents, MCP services, and tools
   - Design based on actually available resources

3. **Architecture First**
   - After completing architecture design, present solution to user
   - Wait for user confirmation before starting to create configuration document

4. **Feedback Driven**
   - Carefully listen to every piece of user feedback
   - Don't ignore any suggestion, even if it seems small

5. **Explain Changes**
   - After each modification, clearly explain what adjustments were made to user
   - Explain reasons for modifications and expected effects

6. **Continuous Optimization**
   - Ask user if further adjustments are needed
   - Until user explicitly expresses satisfaction

7. **Cautious Registration**
   - Only register Graph when user is explicitly satisfied
   - Don't abuse registration tool

### Best Practices

#### Practice 1: Progressive Design

**Don't generate complete Graph all at once**, instead:
1. First design core process (3-5 key nodes)
2. Confirm core process with user
3. Gradually add detail nodes and optimization mechanisms
4. Confirm with user after each addition

#### Practice 2: Provide Multiple Solutions

When there are multiple design choices, present different solutions and their pros/cons to user:

```
## Solution A: Use Handoffs to Implement Quality Loop

Pros:
- Can iterate and optimize multiple times
- Flexible flow control

Cons:
- Configuration slightly complex
- Need clear decision logic

## Solution B: Simple Linear Process

Pros:
- Simple configuration
- Easy to understand and maintain

Cons:
- Cannot iterate and optimize
- Output quality depends on single execution

Which solution do you prefer?
```

#### Practice 3: Validate Configuration Correctness

Before registration, perform basic configuration validation:
- Check JSON syntax
- Check required fields
- Check integrity of node connections
- Check if referenced resources exist

#### Practice 4: Provide Usage Instructions

After registering Graph, explain to user:
- How to find and use this Graph in interface
- Graph's input format and output format
- Considerations when using
- How to optimize and modify subsequently

## 3.5 Common Problems and Solutions

### Problem 1: User Requirements Unclear

**Symptoms**: User only says "help me create a Graph" without providing specific requirements.

**Solution:**
- Use requirements confirmation checklist from Section 3.2 to ask item by item
- Provide common scenario examples to help user clarify requirements
- Ask if user has existing workflow they can reference

### Problem 2: Unclear Node Responsibilities

**Symptoms**: Node descriptions are too broad, or multiple nodes have overlapping responsibilities.

**Solution:**
- Apply single responsibility principle, re-divide nodes
- Clearly define input, processing, output for each node
- Use document delivery checklists to clarify node deliverables

### Problem 3: Complex Process Logic

**Symptoms**: Complex connection relationships between nodes, difficult to understand.

**Solution:**
- Simplify process, split into multiple sub-Graphs
- Use handoffs to simplify conditional branches
- Provide clear flowchart and explanations

### Problem 4: Improper Handoffs Usage

**Symptoms**: Handoffs nodes lack clear decision logic, or unreasonable loop count settings.

**Solution:**
- Clearly specify decision criteria and flow transfer logic in prompts
- Set reasonable handoffs count limits (usually 2-5 times)
- Provide clear exit conditions

### Problem 5: Chaotic Document Collaboration

**Symptoms**: Multiple nodes modify same document, causing version conflicts.

**Solution:**
- Apply single document owner pattern
- Use directory structure to organize different types of documents
- Clarify each node's document scope responsibility

### Problem 6: Improper Tool Configuration

**Symptoms**: Node configured with unnecessary tools, or missing necessary tools.

**Solution:**
- Precisely configure tools based on node responsibilities
- Use `list_system_tools` and `get_mcp_details` to understand tool functionality
- Follow configure-on-demand principle

### Problem 7: Low Quality Prompts

**Symptoms**: Prompts are too simple, or lack clear output requirements.

**Solution:**
- Use structured prompt templates
- Add clear delivery checklists
- Provide output examples and quality standards
- For handoffs nodes, clarify decision logic

## 3.6 Complete Example: Creating a High-Quality Graph

**Scenario**: Create a technical blog article generation Graph

**Step 1: Requirements Confirmation**

User requirements:
- Generate high-quality technical blog article based on given technical topic
- Need to include technical research, content writing, code examples, and quality review
- If quality doesn't meet standards, need to modify and improve

**Step 2: Resource Exploration**

- Agents: Available `tech_researcher`, `technical_writer`, `code_expert`, `content_editor`
- MCP services: Available `web_search`, `github_search`
- System tools: Available file tools, subagent tools

**Step 3: Architecture Design**

```
# Graph Architecture: Technical Blog Generation Workflow

## Node Design

1. Technical Research Node (tech_research)
   - Uses tech_researcher Agent
   - Tools: web_search, github_search, create_file
   - Output: research/findings.md

2. Code Examples Node (code_examples)
   - Uses code_expert Agent
   - Tools: read_file, create_file
   - Input: Research document
   - Output: code/examples.py

3. Article Writing Node (article_writer)
   - Uses technical_writer Agent
   - Tools: read_file, create_file
   - Input: Research document + code examples
   - Output: article/draft.md

4. Content Review Node (content_reviewer) - handoffs
   - Uses content_editor Agent
   - Tools: read_file
   - Decision: Issues found → return to writing node; content qualified → end
   - Handoffs: 3 times

## Flowchart

start → Technical Research → Code Examples ↘
                               Article Writing ⟲ Content Review (handoffs: 3)
                                             ↓
                                            end
```

**Step 4: Create Configuration**

```json
{
  "name": "tech_blog_generator",
  "description": "Complete workflow for generating high-quality technical blog articles",
  "nodes": [
    {
      "name": "tech_research",
      "description": "Research technical topic, collect materials and best practices",
      "agent_name": "tech_researcher",
      "mcp_servers": ["web_search", "github_search"],
      "system_tools": ["create_file"],
      "max_iterations": 80,
      "input_nodes": ["start"],
      "output_nodes": ["code_examples", "article_writer"]
    },
    {
      "name": "code_examples",
      "description": "Create code examples based on research results",
      "agent_name": "code_expert",
      "system_tools": ["read_file", "create_file"],
      "max_iterations": 50,
      "input_nodes": ["tech_research"],
      "output_nodes": ["article_writer"]
    },
    {
      "name": "article_writer",
      "description": "Write technical blog article",
      "agent_name": "technical_writer",
      "system_prompt": "You are a technical blog writer, skilled at transforming complex technical concepts into easy-to-understand articles.",
      "user_prompt": "Write technical blog article based on the following content:\n\n## Technical Research\n{{tech_research}}\n\n## Code Examples\n{{code_examples}}\n\n## Delivery Requirements\n\n1. **Blog Article**\n   - File path: `article/draft.md`\n   - Format: Markdown\n   - Content: Include introduction, technical background, implementation details, code examples, best practices, summary\n   - Length: 1500-2000 words\n   - Style: Professional but easy to understand, targeted at intermediate-advanced developers\n\n## Acceptance Criteria\n\n- [ ] Clear structure, coherent logic\n- [ ] Accurate technical content\n- [ ] Code examples clear and readable\n- [ ] Include practical best practices\n- [ ] Fluent language, no typos",
      "system_tools": ["read_file", "create_file"],
      "max_iterations": 60,
      "input_nodes": ["tech_research", "code_examples", "content_reviewer"],
      "output_nodes": ["content_reviewer"]
    },
    {
      "name": "content_reviewer",
      "description": "Review article quality, decide to pass or modify",
      "agent_name": "content_editor",
      "system_prompt": "You are a senior technical content editor. Review article's technical accuracy, readability, structural integrity, and practicality.",
      "user_prompt": "Please review the following technical article:\n\n{{article_writer}}\n\n## Review Standards\n\n- Technical content accuracy\n- Article structure and logic\n- Code example quality\n- Language expression and readability\n- Practicality and value\n\n## Flow Decision\n\n1. **If serious issues found** (technical errors, structural chaos, code problems)\n   - Use transfer_to_article_writer\n   - List all issues and improvement suggestions in detail\n\n2. **If minor issues found** (wording, formatting, etc.)\n   - Based on number and severity of issues:\n     - Many issues or significant impact: transfer_to_article_writer\n     - Few issues and limited impact: transfer_to_end, note in review comments\n\n3. **If article quality is excellent**\n   - Use transfer_to_end\n   - Explain reasons why article passes review\n\nPlease complete detailed review first, then make decision.",
      "system_tools": ["read_file"],
      "max_iterations": 30,
      "input_nodes": ["article_writer"],
      "output_nodes": ["article_writer", "end"],
      "handoffs": 3
    }
  ],
  "end_template": "Technical blog article completed!\n\n{{article_writer}}\n\nEditor Review:\n{{content_reviewer}}"
}
```

**Step 5: Iterative Optimization**

- Present configuration to user
- Adjust node configuration, prompts, and process based on feedback
- Continue optimizing until user is satisfied

**Step 6: Register Graph**

```json
{
  "tool": "register_graph_from_document",
  "arguments": {
    "file_path": "graph/tech_blog_generator.json"
  }
}
```

---

# Appendix

## A. Quick Reference

### Graph Configuration Required Fields

```json
{
  "name": "Required: Graph name",
  "nodes": [
    {
      "name": "Required: Node name",
      "agent_name": "Or model_name, choose one",
      "model_name": "Or agent_name, choose one"
    }
  ]
}
```

### Common Tool Combinations

| Scenario | Recommended Tools |
|----------|------------------|
| Information Gathering | MCP services + `create_file` |
| Content Creation | `create_file`, `update_file` |
| Quality Check | `read_file` + handoffs |
| Task Coordination | `agent_task_executor`, `list_agents_in_category`, file tools |
| Iterative Optimization | `read_file`, `update_file` + handoffs |

### Handoffs Usage Checklist

- [ ] Set `handoffs` parameter
- [ ] `output_nodes` contains multiple candidate nodes
- [ ] Clear decision logic in prompts
- [ ] Set reasonable loop count limit
- [ ] Has clear exit conditions

## B. Glossary

- **Node**: Basic execution unit in Graph, represents an agent
- **Agent**: Registered reusable agent configuration
- **Handoffs**: Mechanism for dynamically selecting next execution node
- **MCP Server**: Model Context Protocol service, provides external tools
- **System Tools**: Built-in functional tools in MAG
- **Subagent**: Other specialized Agents called within a node
- **Placeholder**: Syntax for referencing node outputs or prompt templates
- **Conversation**: Graph execution instance, includes all node execution history
- **Document**: Persistent file created through file tools

## C. Design Checklist

Before creating Graph, use this checklist to check design quality:

### Overall Design

- [ ] Graph has clear purpose and application scenario
- [ ] Workflow is clear and easy to understand
- [ ] Reasonable number of nodes (usually 3-8)
- [ ] Has clear inputs and outputs

### Node Design

- [ ] Each node has single, clear responsibility
- [ ] Node names are descriptive
- [ ] Nodes have detailed functional descriptions
- [ ] Configured with necessary tools and services
- [ ] max_iterations set reasonably

### Connection Design

- [ ] Node connection relationships are clear
- [ ] No isolated nodes
- [ ] Parallel and serial relationships are reasonable
- [ ] Handoffs usage is appropriate

### Prompt Design

- [ ] System prompts clearly define roles
- [ ] User prompts contain specific task instructions
- [ ] Include clear delivery checklists
- [ ] Placeholders used correctly
- [ ] Handoffs nodes have decision logic

### Document Collaboration

- [ ] Planned document directory structure
- [ ] Clarified document owners
- [ ] Defined document format and content standards
- [ ] Avoided document conflicts

### Quality Assurance

- [ ] Includes quality check mechanism
- [ ] Has clear acceptance criteria
- [ ] Set reasonable loop limits
- [ ] Has error handling mechanism

---

**The goal of this specification is to help Agents design high-quality, maintainable, and efficient Graphs. By following this specification, Agents can fully utilize MAG's powerful capabilities to build complex multi-agent collaboration systems.**
