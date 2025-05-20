## MCP Agent Graph (MAG)

English | [中文](README.md)

MCP Agent Graph (MAG) is an agent development framework for quickly building agent systems. This project uses graphs, nodes, and MCP to rapidly construct complex Agent systems.

### ✨ Core Features

#### 1️⃣ Graph-based Agent Development Framework
Provides an intuitive visual environment that lets you easily design and build complex agent systems.

#### 2️⃣ Nodes as Agents
Each node in the graph is an independent agent that can utilize the tool capabilities of MCP server to complete specific tasks.

#### 3️⃣ Graph Nesting (Hierarchical Worlds)
Supports using an entire graph as a node in another graph, enabling hierarchical agent architectures, creating "worlds within worlds."

#### 4️⃣ Graph to MCP Server
Export any graph as a standard MCP server Python script, making it available as a standalone tool that can be called by other systems.

#### 5️⃣ Agent Exchange and Transfer
Package complete agent systems with all dependencies (configurations, prompts, documents) into self-contained, portable units that can be easily shared, transferred, and deployed between different environments. Automatic documentation generation creates comprehensive README files, enabling recipients to quickly understand your agent's functionality and requirements. This feature provides solutions for agent marketplace trading, sharing within organizations, and sharing outside organizations.

Contributions welcome! We invite everyone to join us in developing and building this project. Your contributions will help make this project better!

<details>
<summary>🌐 System Architecture</summary>

MAG follows a HOST-CLIENT-SERVER architecture:
- **HOST**: Central service that manages graph execution and coordinates communication between components
- **CLIENT**: MCP client that interacts with MCP servers
- **SERVER**: MCP server that provides specialized tools and functionalities

```
HOST  → CLIENT  → SERVER 
(Graph) → (Agent) <==> (MCP Server)
```
</details>

## 📋 Complete Feature List

MAG provides a rich set of features for building powerful agent systems:

| Feature | Brief Description | Detailed Description | Usage | Purpose |
|---------|-------------------|----------------------|-------|---------|
| **Execution Control** |
| Parallel Execution | Execute multiple nodes simultaneously | All nodes at the same level execute concurrently, significantly reducing total execution time for independent tasks in complex workflows. The system automatically manages dependencies. | Set `parallel: true` when executing the graph | Improve efficiency of independent tasks in complex workflows |
| Serial Execution | Execute nodes in sequence | Execute nodes in a controlled order based on node level and dependencies, ensuring each node receives fully processed input from preceding nodes. Provides predictable execution flow. | Set `parallel: false` (default) during execution | Ensure correct execution order and predictable results for dependent tasks |
| Loop Processing | Create workflow loops with branches | Enable nodes to redirect the flow back to previous nodes or different paths based on their analysis, creating dynamic, iterative workflows. Supports decision trees and improvement loops. | Set `handoffs: <number>` in node configuration | Build iterative workflows with conditional branches and improvement loops |
| Breakpoint Continuation | Resume execution from interruption point | Allow paused or interrupted executions to continue from their last state, preserving all context. Critical for long-running processes that might be interrupted due to timeouts or manual stops. | Use `continue_from_checkpoint: true` | Recover from interruptions and support long-running processes across sessions |
| **Prompt Features** |
| Node Output Placeholders | Reference other nodes in prompts | Use simple placeholder syntax to dynamically insert any node's output into prompt text. The system automatically resolves these references at runtime, creating context-aware adaptive prompts. | Use `{node_name}` in prompts | Create dynamic prompts that include outputs from earlier processing stages |
| External Prompt Templates | Import prompts from external files | Load prompt content from separate text files, enabling better organization, version control, and sharing of complex prompts across multiple agents or projects. | Reference files using `{filename.txt}` | Maintain clean, reusable, and shareable prompt libraries |
| **Context Passing** |
| Global Output | Set node output as global variable | Nodes set as global outputs will have their outputs available in any other node, and in loop tasks, global variables will be retained according to rounds. | Use `global: true` | Implement precise context control |
| Context Import | Control how global outputs are accessed | Regulate the global output results received by nodes through various access patterns: all history, only the latest output, or a specific number of recent outputs. | Use `context_mode: "all"/"latest"/"latest_n"` | Control information flow and prevent context overload in complex systems |
| **Result Storage** |
| Node Output Saving | Automatically save node outputs to files | Automatically save important node outputs as files in various formats (Markdown, HTML, Python, etc.), making them accessible for sharing and integration with other toolsets. | Set `save: "md"/"html"/"py"/etc` | Persist key outputs in appropriate formats for reference or external use |
| Multi-format Results | Store results in multiple formats | Automatically generate formatted documents in multiple formats (Markdown, JSON, HTML) for each execution, including interactive visualizations and execution history. | Automatic with each execution | View and share results in different formats according to different needs |
| Output Templates | Format final results using templates | Define custom templates for final output using placeholders that reference node results, creating beautiful, presentation-ready documents. | Use `end_template` with node references | Create professional, consistently formatted outputs from complex workflows |
| **Integration** |
| MCP Server Integration | Connect to specialized tool servers | Integrate nodes with MCP servers that provide specialized capabilities (like web search, code execution, data analysis, etc.). Each node can access multiple servers simultaneously. | Configure via `mcp_servers` array | Access specialized external capabilities to extend agent functionality |
| Graph to MCP | Export graphs as MCP servers | Convert entire agent graphs into standalone MCP servers that can be used as tools by other agents or systems, enabling complex compositions of agent systems. | Use MCP export functionality | Make complete agent systems available as tools for other agents |
| **Modularity and Nesting** |
| Subgraph Support | Use graphs as nodes | Embed entire graphs as single nodes in other graphs, creating modular, reusable components and enabling hierarchical organization of complex systems. | Configure `is_subgraph: true` | Create reusable agent components and hierarchical architectures |
| Infinite Nesting | Build "worlds within worlds" | Create unlimited nesting levels: graphs can contain subgraphs, which can contain their own subgraphs, and so on. Graphs can also use MCP servers created by other graphs, enabling extraordinary compositional complexity. | Combine subgraphs and MCP integration | Build complex, layered agent systems with specialized components at each level |
| **Agent Management** |
| Graph Import/Export | Share graphs between systems | Export and import complete graph configurations between different MAG installations or users, facilitating collaboration and knowledge sharing. | Use import/export UI functionality | Facilitate collaboration and modular development across organizations |
| Agent Packaging | Create complete, portable agent packages | Bundle graphs with all dependencies (prompts, configurations, documentation) into self-contained packages that can be easily shared, archived, or deployed. | Use packaging functionality | Enable agent trading, versioning, and marketplace exchange |
| Automatic Documentation | Generate comprehensive documentation | System automatically creates detailed README files for each agent graph, documenting its purpose, components, connections, and usage requirements. | Generated automatically during packaging | Help others quickly understand your agent's capabilities and requirements |

## 🛠️ Agent Configuration Reference

Each agent node in MAG is defined by a configuration object with the following parameters:

## Complete Parameter Reference for Agent Nodes

The table below provides all available configuration parameters for agent nodes in MAG. Whether you're creating a simple single-node agent or a complex multi-node system, this reference table will help you understand what each parameter does and how to use it.

| Parameter | Type | Description | Required | Default Value |
|-----------|------|-------------|----------|---------|
| `name` | string | Unique identifier for the node. Must be unique within the graph and is used to identify this node in connections and references. Avoid special characters (/, \\, .). Example: `"name": "research_agent"`. | Yes | - |
| `description` | string | Detailed description of the node's functionality. Helps users understand the purpose of the node and is also used for documentation generation. Good descriptions help others understand your agent system. Example: `"description": "Researches scientific topics and provides detailed analysis"` | No | `""` |
| `model_name` | string | Name of the AI model to use, typically an OpenAI model (like "gpt-4") or your custom configured model name. Regular nodes must set this parameter, but subgraph nodes don't need it. Example: `"model_name": "gpt-4-turbo"` | Yes* | - |
| `mcp_servers` | string[] | List of MCP server names to use. These servers provide special tool capabilities to the node (like search, code execution, etc.). Multiple servers can be specified, allowing the node to access multiple tool sets simultaneously. Example: `"mcp_servers": ["search_server", "code_execution"]` | No | `[]` |
| `system_prompt` | string | System prompt sent to the model, defining the agent's role, capabilities, and guidelines. Supports placeholders (like `{node_name}`) to reference other nodes' outputs, as well as external file references (like `{instructions.txt}`). Example: `"system_prompt": "You are a research assistant specialized in {topic}."` | No | `""` |
| `user_prompt` | string | User prompt sent to the model, containing specific task instructions. Typically includes the `{input}` placeholder to receive input content, and can also reference other node outputs or external files. Example: `"user_prompt": "Research the following based on: {input}"` | No | `""` |
| `save` | string | Specifies the file format extension for automatically saving the node's output. Supports md, html, py, txt, and other formats. Saved files are stored in the session directory for easy reference or export. Example: `"save": "md"` saves output as a Markdown file | No | `null` |
| `input_nodes` | string[] | List of node names that provide input. The special value `"start"` indicates receiving the user's original input. Multiple input nodes can be specified, and the system will automatically merge their outputs. Example: `"input_nodes": ["start", "research_node"]` | No | `[]` |
| `output_nodes` | string[] | List of node names that receive this node's output. The special value `"end"` indicates the output will be included in the final result. When using handoffs, output will be directed to one of the nodes in this list. Example: `"output_nodes": ["analysis_node", "end"]` | No | `[]` |
| `is_start` | boolean | Specifies whether this node is a starting node (receives user initial input). If set to true, equivalent to adding `"start"` to `input_nodes`. A graph can have multiple starting nodes. Example: `"is_start": true` | No | `false` |
| `is_end` | boolean | Specifies whether this node is an ending node (output included in final result). If set to true, equivalent to adding `"end"` to `output_nodes`. A graph can have multiple ending nodes. Example: `"is_end": true` | No | `false` |
| `handoffs` | number | Maximum number of times the node can redirect the flow, enabling conditional branching and loop functionality. When set, the node will choose which destination node to output to, creating dynamic paths. Used for implementing iterative improvements, decision trees, and other complex logic. Example: `"handoffs": 3` allows the node to redirect up to 3 times | No | `null` |
| `global_output` | boolean | Whether to add the node's output to the global context, making it accessible to other nodes via the context parameter. Useful for nodes that produce important intermediate results. Example: `"global_output": true` | No | `false` |
| `context` | string[] | List of global node names to reference. Allows the node to access outputs from other nodes that aren't directly connected (provided those nodes have `global_output: true`). Example: `"context": ["research_results", "user_preferences"]` | No | `[]` |
| `context_mode` | string | Mode for accessing global content: `"all"` gets all historical outputs, `"latest"` gets only the most recent output, `"latest_n"` gets the n most recent outputs. Example: `"context_mode": "latest"` only retrieves the latest output | No | `"all"` |
| `context_n` | number | Number of latest outputs to retrieve when using `context_mode: "latest_n"`. Example: `"context_n": 3` retrieves the 3 most recent outputs | No | `1` |
| `output_enabled` | boolean | Controls whether the node includes output in the response. Some intermediate nodes may only need to process data without producing output. Setting to false can speed up processing and reduce token usage. Example: `"output_enabled": false` | No | `true` |
| `is_subgraph` | boolean | Specifies whether this node represents a subgraph (nested graph). If true, model_name is not used, and instead subgraph_name references another graph to use as a subgraph. Example: `"is_subgraph": true` | No | `false` |
| `subgraph_name` | string | Name of the subgraph, required only when `is_subgraph: true`. Specifies the name of the graph to execute as this node. Subgraphs can have their own multiple nodes and complex logic. Example: `"subgraph_name": "research_process"` | Yes* | `null` |
| `position` | object | Position coordinates of the node on the visual editor canvas, typically set automatically by the editor. Format is `{"x": number, "y": number}`. Doesn't affect node functionality, used only for UI layout. Example: `"position": {"x": 150, "y": 200}` | No | `null` |
| `level` | number | Execution level of the node, determining the order of execution in the flow. If not specified, the system automatically calculates it based on node dependencies. Lower level nodes execute first. Example: `"level": 2` indicates third level execution (starting from 0) | No | Auto-calculated |
| `end_template` | string | (Graph-level parameter) Defines the format template for final output, supporting references to nodes' outputs. Use `{node_name}` format to reference node results. Example: `"end_template": "# Report\n\n{summary_node}"` | No | `null` |

\* `model_name` is required for regular nodes, while `subgraph_name` is required for subgraph nodes.

## Complete Agent Configuration Example

To help you understand how to build effective agents, here's a complete example of a multi-agent loop system showcasing many of MAG's advanced features:

### Example: Research and Analysis System
#### Flow Chart:
![img.png](fig/img10.png)

```json
{
  "name": "easy_search",
  "description": "Knowledge exploration system that collects information from the bilibili video platform and explores and integrates information",
  "nodes": [
    {
      "name": "planning_node",
      "model_name": "deepseek-chat",
      "description": "Plan knowledge exploration path",
      "system_prompt": "{prompt.md}",
      "user_prompt": "Based on the following question, please list 2 knowledge points that need in-depth exploration, each clearly marked with a number and title. Format as follows:\n\nKnowledge point 1: [Title]\n[Brief explanation of exploration direction]\n\nKnowledge point 2: [Title]\n[Brief explanation of exploration direction]\n\nAnd so on...\n\nQuestion: {start}",
      "input_nodes": [
        "start"
      ],
      "output_nodes": [
        "knowledge_exploration_node"
      ],
      "output_enabled": true,
      "level": 0,
      "handoffs": null,
      "global_output": true
    },
    {
      "name": "knowledge_exploration_node",
      "model_name": "deepseek-chat",
      "description": "Explore knowledge points in depth",
      "mcp_servers": [
        "bilibili"
      ],
      "system_prompt": "You are a professional knowledge explorer. You need to explore a knowledge point in depth and provide detailed information. Remember, you cannot call multiple tools simultaneously.",
      "user_prompt": "Please select an unexplored knowledge point from the following list for in-depth exploration. You need to use the bilibili tool to find information first, and your output must begin with \"Explored: Knowledge Point X: [Title]\", where X is the knowledge point number. Then provide detailed background, concept explanations, and practical applications.\n\nKnowledge points list:\n{planning_node}\n\nHistory of explored knowledge points:\n\n{exploration_summary_node}\n\n",
      "input_nodes": [
        "planning_node"
      ],
      "output_nodes": [
        "exploration_summary_node"
      ],
      "output_enabled": true,
      "level": 1,
      "handoffs": null,
      "global_output": true,
      "context": [
        "exploration_summary_node"
      ],
      "context_mode": "all"
    },
    {
      "name": "exploration_summary_node",
      "model_name": "deepseek-chat",
      "description": "Summarize explored knowledge points and exploration progress",
      "system_prompt": "You are a knowledge summary expert. You need to concisely summarize the content of explored knowledge points.",
      "user_prompt": "Please concisely summarize the following explored knowledge point. Your output must begin with \"Explored: Knowledge Point X: [Title]\", where X is the knowledge point number. Then provide 1-2 sentences summarizing the knowledge point.\n\nLatest knowledge point content:\n{knowledge_exploration_node}\n\nPlease organize the summary in a concise manner.",
      "input_nodes": [
        "knowledge_exploration_node"
      ],
      "output_nodes": [
        "decision_node"
      ],
      "output_enabled": true,
      "level": 2,
      "handoffs": null,
      "global_output": true,
      "context": [
        "knowledge_exploration_node"
      ],
      "context_mode": "latest"
    },
    {
      "name": "decision_node",
      "model_name": "deepseek-chat",
      "description": "Determine whether to continue exploring knowledge points or generate final answer",
      "system_prompt": "You are a decision expert. You need to determine whether all knowledge points have been explored based on the knowledge exploration summary, and make accurate decisions.",
      "user_prompt": "Please analyze the following knowledge exploration summary and determine whether all planned knowledge points have been explored.\n\nPlanned knowledge points:\n{planning_node}\n\nKnowledge exploration summary:\n{exploration_summary_node}\n\nPlease follow these steps:\n1. Based on the summary, confirm the total number of knowledge points to be explored\n2. Confirm the numbers and titles of completed knowledge points\n3. Calculate how many knowledge points remain unexplored\n4. If there are still unexplored knowledge points, select the tool \"Continue exploring knowledge points\"\n5. If all knowledge points have been explored, select the tool \"Integrate knowledge points\".",
      "input_nodes": [
        "exploration_summary_node"
      ],
      "output_nodes": [
        "knowledge_exploration_node",
        "integration_node"
      ],
      "output_enabled": true,
      "level": 3,
      "handoffs": 5,
      "global_output": false,
      "context": [
        "planning_node",
        "exploration_summary_node"
      ],
      "context_mode": "all"
    },
    {
      "name": "integration_node",
      "model_name": "deepseek-chat",
      "description": "Integrate all explored knowledge",
      "system_prompt": "You are a knowledge integration expert. You need to integrate all explored knowledge points into a coherent whole.",
      "user_prompt": "Please integrate all the following explored knowledge points into a coherent knowledge system, ensuring good logical connections between content and eliminating any duplications. When integrating, maintain the original numbering and title structure of knowledge points, but make the content cohesive and comprehensive.\n\nKnowledge exploration summary:\n{exploration_summary_node}\n\nExplored knowledge points:\n{knowledge_exploration_node}\n\n",
      "input_nodes": [
        "decision_node"
      ],
      "output_nodes": [
        "answer_node"
      ],
      "output_enabled": true,
      "level": 4,
      "handoffs": null,
      "global_output": true,
      "context": [
        "exploration_summary_node",
        "knowledge_exploration_node"
      ],
      "context_mode": "all"
    },
    {
      "name": "answer_node",
      "model_name": "deepseek-chat",
      "description": "Generate final answer",
      "system_prompt": "You are a professional answer generation expert. You need to generate a clear, comprehensive final answer based on the integrated knowledge.",
      "user_prompt": "Based on the following integrated knowledge, please provide a comprehensive, clear, and well-structured answer to the original question. Ensure the answer directly addresses the question and is easy to understand.\n\nOriginal question: {start}\n\nIntegrated knowledge:\n{integration_node}",
      "input_nodes": [
        "integration_node"
      ],
      "output_nodes": [
        "end"
      ],
      "output_enabled": true,
      "is_end": true,
      "level": 5,
      "handoffs": null,
      "global_output": false,
      "context": [
        "start",
        "integration_node"
      ],
      "context_mode": "all",
    }
  ],
  "end_template": "# Knowledge Exploration and Answer Generation System\n\n## Original Question\n{start}\n\n## Knowledge Planning\n{planning_node}\n\n## Knowledge Point Summary Collection\n{exploration_summary_node:all}\n\n## Knowledge Integration\n{integration_node}\n\n## Final Answer\n{answer_node}"
}
```

### Key Feature Explanations

Let's break down the advanced features used in this knowledge exploration system:

#### 1. Loop Exploration and Decision Control
```json
"handoffs": 5,
"output_nodes": ["knowledge_exploration_node", "integration_node"]
```
The `decision_node` uses the `handoffs` parameter to implement loop exploration control. It can return to the `knowledge_exploration_node` multiple times to continue exploring new knowledge points when exploration is incomplete, or proceed to the `integration_node` when all knowledge points have been explored. This implements intelligent workflow decision paths.

#### 2. Global Context and History Management
```json
"global_output": true,
"context": ["exploration_summary_node"],
"context_mode": "all"
```
Multiple nodes (such as `planning_node`, `knowledge_exploration_node`, `exploration_summary_node`, etc.) use `global_output: true` settings, making their outputs available to other nodes. The `knowledge_exploration_node` accesses the history of `exploration_summary_node` through the `context` parameter, enabling tracking of already explored knowledge and avoiding repetition.

#### 3. External Prompt Templates
```json
"system_prompt": "{prompt.md}"
```
The `planning_node` uses an external Markdown file as a system prompt, allowing more complex, structured prompts to be maintained in separate files, improving readability and maintainability.

#### 4. Specialized Tool Integration
```json
"mcp_servers": ["bilibili"]
```
The `knowledge_exploration_node` integrates a specialized Bilibili search tool through an MCP server, enabling the agent to find information on the Chinese video platform and effectively explore knowledge in specific domains.

#### 5. Structured Output Template
```json
"end_template": "# Knowledge Exploration and Answer Generation System\n\n## Original Question\n{start}\n\n## Knowledge Planning\n{planning_node}\n\n## Knowledge Point Summary Collection\n{exploration_summary_node:all}\n\n## Knowledge Integration\n{integration_node}\n\n## Final Answer\n{answer_node}"
```
Using `end_template` to create a beautiful final report that references outputs from each key node. Note especially `{exploration_summary_node:all}` which references all historical summaries, providing a complete exploration record.

#### 6. Precise Level Execution Control
```json
"level": 0, "level": 1, "level": 2, "level": 3, "level": 4, "level": 5
```
All nodes are explicitly assigned execution levels from 0 to 5, ensuring the system runs in the precise order: planning → exploration → summary → decision → integration → answer generation.
* When creating nodes, there's no need to create levels; the system automatically calculates levels to ensure nodes execute in the correct order.

#### 7. Diversified Context Modes
```json
"context_mode": "all"  // Used in decision_node to get complete history
"context_mode": "latest"  // Used in exploration_summary_node to get only latest output
```
Different nodes use different context modes as needed: `decision_node` needs comprehensive understanding of exploration history, so it uses `"all"` mode; while `exploration_summary_node` only needs to process the latest exploration result, so it uses `"latest"` mode.

#### 8. Multi-Node Collaborative Work
The system consists of six specialized nodes working together, each with a clear professional role (planner, explorer, summary expert, decision maker, integrator, answer generator), forming a complete knowledge exploration and question-answering system. This modular design allows each node to focus on its core responsibilities while collaborating seamlessly through global context and direct connections.

### Workflow

1. `planning_node` analyzes the original question and plans knowledge points to explore
2. `knowledge_exploration_node` uses the Bilibili tool to search and explore one knowledge point
3. `exploration_summary_node` summarizes the newly explored knowledge point
4. `decision_node` evaluates exploration progress and decides whether to continue exploring or integrate results
5. If there are unexplored knowledge points, return to step 2 to continue exploration
6. When all knowledge points have been explored, `integration_node` integrates all knowledge
7. `answer_node` generates the final answer to the original question

This example demonstrates how MAG supports complex workflows with loops and conditional branches, allowing multiple specialized agents to work together, share context, and ultimately produce high-quality structured output.

## 📝 Advanced Usage Guide

### A. Prompt Features

MAG provides two powerful ways to enhance your prompts:

#### 1. Node Output Placeholders

You can reference other nodes' outputs in your prompts:

- Basic reference: `{node_name}` - Get the latest output from the specified node
- All history: `{node_name:all}` - Get all historical outputs from the node
- Latest N: `{node_name:latest_5}` - Get the 5 most recent outputs

Examples:
```
system_prompt: "You will analyze data based on the following information: {data_processor}"
user_prompt: "Create a summary based on the following content: {input}\n\nConsider the previous analysis: {analyst:all}"
```

#### 2. External Prompt Templates

One of MAG's most powerful features is the ability to import external prompt files, which allows:
- Reusing carefully crafted prompts across multiple agents
- Easier maintenance of complex prompts
- Version control for prompt templates
- Sharing prompt libraries within an organization

**How it works:**
1. Create a text file containing your prompt template (e.g., `researcher_prompt.txt`)
2. Place it in your agent's prompts directory or reference with full path
3. Reference the file in your system or user prompt using the `{filename.txt}` format

When MAG executes the agent, it automatically:
- Detects file references in curly braces
- Reads the contents of these files
- Replaces the references with the actual file content

Example:
```json
{
  "name": "research_agent",
  "system_prompt": "{researcher_base.txt}",
  "user_prompt": "Topic to research: {input}\n\nFollow the method in {research_method.txt}"
}
```

At execution time, MAG will load the content of both files and inject them into the prompts, allowing you to flexibly maintain complex prompt libraries externally.

### B. Global Context Management

Control how nodes share information:

1. **Make content globally available:**
   ```json
   "global_output": true
   ```

2. **Access global content:**
   ```json
   "context": ["search_results", "previous_analysis"],
   "context_mode": "latest_n",
   "context_n": 3
   ```

### C. Creating Loops with Handoffs

For iterative processes or decision trees:

```json
{
  "name": "decision_maker",
  "handoffs": 5,
  "output_nodes": ["option_a", "option_b", "option_c"]
}
```

The node can hand off decisions to its output nodes up to 5 times.

### D. Subgraph Integration

To use a graph as a node in another graph:

```json
{
  "name": "research_component",
  "description": "Complete research subsystem",
  "is_subgraph": true,
  "subgraph_name": "research_graph",
  "input_nodes": ["start"],
  "output_nodes": ["summary_generator"]
}
```

## 🖼️ Frontend Feature Showcase(The frontend is version V1.1.0, which has not yet been updated to include the backend changes.)

### Visual Agent Graph Editor
Visually create agent workflows by connecting nodes in a graph. Each node represents an agent with its own configuration, behavior, and capabilities.

![Graph Editor Interface - Visual design of nodes and connections](fig/img_3.png)
![Graph Executor Interface - Running agent workflows](fig/img_6.png)
![Graph Executor Interface - Viewing workflow results](fig/img_7.png)

### MCP Server Integration
Enhance your agent capabilities through MCP servers. Each agent node can leverage multiple MCP servers to access specialized capabilities such as web search, code execution, data analysis, and more.

![MCP Manager Interface - Server overview](fig/img.png)
![MCP Manager Interface - Detailed server configuration](fig/img_1.png)
![MCP Manager Interface - Tool capability management](fig/img_2.png)

### Nested Graphs (Graphs as Nodes)
Build hierarchical agent systems by using entire graphs as nodes in larger graphs. This creates modular, reusable agent components and enables "worlds within worlds" architectures.

> This is a nested doll feature 😉

![Nested Graph Interface - Hierarchical agent system design](fig/img_4.png)

### Graph to MCP Server Export
Export any graph as a standalone MCP server, making it available as a tool for other agents or applications. This feature converts your agent graphs into reusable services that can be composed into larger systems.

> This is a nested nested doll feature 😉

![Export MCP Server Interface - Converting graphs to standalone services](fig/img_5.png)
![Calling in Cline](fig/img_8.png)
![Calling in Cline](fig/img_9.png)

## 🚀 Deployment Guide

### Backend Deployment

#### Option 1: Using Conda

```bash
# Create and activate conda environment
conda create -n mag python=3.11
conda activate mag

# Clone repository
git clone https://github.com/keta1930/mcp-agent-graph.git
cd mcp-agent-graph

# Install dependencies
pip install -r requirements.txt

# Run main application
python main.py
```

#### Option 2: Using uv

```bash
# If you don't have uv, install it first
Installation guide: https://docs.astral.sh/uv/getting-started/installation/

# Clone repository
git clone https://github.com/keta1930/mcp-agent-graph.git
cd mcp-agent-graph

# Install dependencies
uv sync
.venv\Scripts\activate.ps1 (powershell)
.venv\Scripts\activate.bat (cmd)

# Directly run with uv
uv run python main.py
```

The backend server will run on port 9999, and the MCP client on port 8765.

### Frontend Deployment

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend development server will run on port 5173.

### Add wechat group
![alt text](fig/76caa615333b0faad3aeff5e647d906.png)