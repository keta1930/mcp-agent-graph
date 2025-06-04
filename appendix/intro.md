## 📋 Complete Feature List

MAG provides rich functionality for building powerful agent systems:

| Feature | Brief Description | Detailed Description | Usage | Purpose |
|---------|-------------------|----------------------|-------|---------|
| **Execution Control** |
| Parallel Execution | Execute multiple nodes simultaneously | All nodes at the same level execute concurrently, significantly reducing total execution time for independent tasks in complex workflows. System automatically manages dependencies. | Set `parallel: true` when executing graph | Improve efficiency of independent tasks in complex workflows |
| Serial Execution | Execute nodes sequentially in order | Execute nodes in controlled order based on node levels and dependencies, ensuring each node receives fully processed input from predecessor nodes. Provides predictable execution flow. | Set `parallel: false` when executing (default) | Ensure correct execution order and predictable results for dependent tasks |
| Loop Processing | Create workflows with conditional branching | Enables nodes to redirect flow back to previous nodes or different paths based on their analysis, creating dynamic, iterative workflows. Supports decision trees and improvement loops. | Set `handoffs: <count>` in node configuration | Build iterative workflows with conditional branching and improvement loops |
| Checkpoint Resume | Resume execution from interruption point | Allows paused or interrupted executions to continue from their last state, preserving all context. Critical for long-running processes that might be interrupted due to timeouts or manual stops. | Use `continue_from_checkpoint: true` | Recover from interruptions and support long-running cross-session processes |
| **Prompt Features** |
| Node Output Placeholders | Reference other nodes in prompts | Use simple placeholder syntax to dynamically insert any node's output into prompt text. System automatically resolves these references at runtime, creating context-aware adaptive prompts. | Use `{node_name}` in prompts | Create dynamic prompts containing outputs from earlier processing stages |
| External Prompt Templates | Import prompts from external files | Load prompt content from separate text files, enabling better organization, version control, and sharing of complex prompts across multiple agents or projects. | Use `{filename.txt}` to reference files | Maintain clean, reusable, and shareable prompt libraries |
| **Context Passing** |
| Global Output | Set node output as global variable | Nodes set as global output can have their outputs called by any other node, and in loop tasks, global variables are preserved by iteration round. | Use `global: true` | Achieve precise context control |
| Context Import | Control how to access global outputs | Regulate global output results received by nodes through various access modes: all history, latest output only, or specific number of recent outputs. | Use `context_mode: "all"/"latest"/"latest_n"` | Control information flow and prevent context overload in complex systems |
| **Result Storage** |
| Node Output Saving | Automatically save node outputs to files | Automatically save important node outputs as files in various formats (Markdown, HTML, Python, etc.) for easy access, sharing, and integration with other tools. | Set `save: "md"/"html"/"py"/etc` | Persist key outputs in appropriate formats for reference or external use |
| Multi-format Results | Store results in multiple formats | Automatically generate formatted documents in multiple formats (Markdown, JSON, HTML) for each execution, including interactive visualizations and execution history. | Automatic with each execution | View and share results in different formats based on different needs |
| Output Templates | Use templates to format final results | Define custom templates for final output using placeholders that reference node results, creating polished, presentation-ready documents. | Use `end_template` with node references | Create professional, consistently formatted output from complex workflows |
| **MCP Integration** |
| MCP Server Integration | Connect to specialized tool servers | Integrate nodes with MCP servers that provide specialized capabilities (web search, code execution, data analysis, etc.). Each node can access multiple servers simultaneously. | Configure via `mcp_servers` array | Access specialized external capabilities to extend agent functionality |
| Graph to MCP | Export graphs as MCP servers | Convert entire agent graphs into standalone MCP servers that can be used as tools by other agents or systems, enabling complex composition of agent systems. | Use MCP export functionality | Make complete agent systems available as tools for other agents |
| **Modularity and Nesting** |
| Subgraph Support | Use graphs as nodes | Embed entire graphs as single nodes within other graphs, creating modular, reusable components and enabling hierarchical organization of complex systems. | Configure `is_subgraph: true` | Create reusable agent components and hierarchical architectures |
| Infinite Nesting | Build "worlds within worlds" | Create unlimited nesting levels: graphs can contain subgraphs, which can contain their own subgraphs, and so on. Graphs can also use MCP servers created by other graphs, enabling extraordinary compositional complexity. | Combine subgraph and MCP integration | Build complex, hierarchical agent systems with specialized components at each layer |
| **Agent Management** |
| Graph Import/Export | Share graphs between systems | Export and import complete graph configurations between different MAG installations or users, facilitating collaboration and knowledge sharing. | Use import/export UI functionality | Facilitate cross-organizational collaboration and modular development |
| Agent Packaging | Create complete, portable agent packages | Bundle graphs with all dependencies (prompts, configurations, documentation) into self-contained packages that can be easily shared, archived, or deployed. | Use packaging functionality | Enable agent trading, version control, and marketplace exchange |
| Auto Documentation | Generate comprehensive documentation | System automatically creates detailed README files for each agent graph, documenting its purpose, components, connections, and usage requirements. | Automatically generated during packaging | Help others quickly understand your agent's capabilities and requirements |

## 🛠️ Agent Configuration Reference

Each agent node in MAG is defined by a configuration object containing the following parameters:

## Complete Agent Node Parameter Reference

The following table provides all available configuration parameters for agent nodes in MAG. Whether you're creating simple single-node agents or complex multi-node systems, this reference will help you understand what each parameter does and how to use it.

| Parameter | Type | Description | Required | Default |
|-----------|------|-------------|----------|---------|
| `name` | string | Unique identifier for the node. Must be unique within the graph and is used to identify this node in connections and references. Avoid special characters (/, \\, .). Example: `"name": "research_agent"`. | Yes | - |
| `description` | string | Detailed description of the node's functionality. Helps users understand the node's purpose and is also used for generating documentation. Good descriptions help others understand your agent system. Example: `"description": "Research scientific topics and provide detailed analysis"` | No | `""` |
| `model_name` | string | Name of the AI model to use, typically an OpenAI model (like "gpt-4") or your custom configured model name. Regular nodes must set this parameter, but subgraph nodes don't need it. Example: `"model_name": "gpt-4-turbo"` | Yes* | - |
| `mcp_servers` | string[] | List of MCP server names to use. These servers provide special tool capabilities (like search, code execution, etc.) to the node. Multiple servers can be specified, allowing the node to access multiple tools simultaneously. Example: `"mcp_servers": ["search_server", "code_execution"]` | No | `[]` |
| `system_prompt` | string | System prompt sent to the model, defining the agent's role, capabilities, and guidelines. Supports placeholders (like `{node_name}`) to reference other nodes' outputs, and also supports external file references (like `{instructions.txt}`). Example: `"system_prompt": "You are a research assistant specialized in {topic}."` | No | `""` |
| `user_prompt` | string | User prompt sent to the model, containing specific task instructions. Usually includes `{input}` placeholder to receive input content, and can also reference other node outputs or external files. Example: `"user_prompt": "Research the following content: {input}"` | No | `""` |
| `save` | string | Specifies the file format extension for automatic saving of node output. Supports various formats like md, html, py, txt, etc. Saved files are stored in the session directory for easy reference or export. Example: `"save": "md"` saves output as Markdown file | No | `null` |
| `input_nodes` | string[] | List of node names that provide input. Special value `"start"` indicates receiving user's original input. Multiple input nodes can be specified, and the system will automatically merge their outputs. Example: `"input_nodes": ["start", "research_node"]` | No | `[]` |
| `output_nodes` | string[] | List of node names that receive this node's output. Special value `"end"` indicates output will be included in final results. When using handoffs, output will be directed to one node in this list. Example: `"output_nodes": ["analysis_node", "end"]` | No | `[]` |
| `handoffs` | number | Maximum number of times the node can redirect flow, enabling conditional branching and loop functionality. When set, the node will choose which target node to send output to, creating dynamic paths. Used for implementing iterative improvements, decision trees, and other complex logic. Example: `"handoffs": 3` allows the node to redirect up to 3 times | No | `null` |
| `global_output` | boolean | Whether to add node output to global context, making it accessible to other nodes via context parameter. Very useful for nodes that produce important intermediate results. Example: `"global_output": true` | No | `false` |
| `context` | string[] | List of global node names to reference. Allows node to access outputs from other nodes not directly connected (provided those nodes have `global_output: true` set). Example: `"context": ["research_results", "user_preferences"]` | No | `[]` |
| `context_mode` | string | Mode for accessing global content: `"all"` gets all historical outputs, `"latest"` gets only the newest output, `"latest_n"` gets the latest n outputs. Example: `"context_mode": "latest"` gets only the most recent output | No | `"all"` |
| `context_n` | number | Number of latest outputs to retrieve when using `context_mode: "latest_n"`. Example: `"context_n": 3` gets the latest 3 outputs | No | `1` |
| `output_enabled` | boolean | Controls whether node includes output in response. Some intermediate nodes may only need to process data without output. Setting to false can speed up processing and reduce token usage. Example: `"output_enabled": false` | No | `true` |
| `is_subgraph` | boolean | Specifies whether this node represents a subgraph (nested graph). If true, model_name is not used, instead subgraph_name references another graph as a subgraph. Example: `"is_subgraph": true` | No | `false` |
| `subgraph_name` | string | Name of the subgraph, only needed when `is_subgraph: true`. Specifies the graph name to execute as this node. Subgraphs can have their own multiple nodes and complex logic. Example: `"subgraph_name": "research_process"` | Yes* | `null` |
| `position` | object | Position coordinates of the node in the visual editor canvas, usually set automatically by the editor. Format is `{"x": number, "y": number}`. Doesn't affect node functionality, only used for UI layout. Example: `"position": {"x": 150, "y": 200}` | No | `null` |
| `level` | number | Execution level of the node, determining the node's execution order in the flow. If not specified, system automatically calculates based on node dependencies. Lower level nodes execute first. Example: `"level": 2` means third layer execution (starting from 0) | No | Auto-calculated |
| `end_template` | string | (Graph-level parameter) Defines the format template for final output, supports referencing various node outputs. Use `{node_name}` format to reference node results. Example: `"end_template": "# Report\n\n{summary_node}"` | No | `null` |

\* `model_name` is required for regular nodes, while `subgraph_name` is required for subgraph nodes.

## Complete Agent Configuration Example

To help you understand how to build effective agents, here's a complete example of a multi-agent loop system that demonstrates many of MAG's advanced features:

### Example: Research and Analysis System
#### Flow Chart:
![img.png](img10.png)

```json
{
  "name": "easy_search",
  "description": "Knowledge exploration system that gathers information based on bilibili video platform and explores and integrates information",
  "nodes": [
    {
      "name": "planning_node",
      "model_name": "deepseek-chat",
      "description": "Plan knowledge exploration paths",
      "system_prompt": "Follow this requirement: {prompt.md}",
      "user_prompt": "Based on the following question, please list 2 knowledge points that need in-depth exploration. Each knowledge point should be clearly marked with a number and title. Format as follows:\n\nKnowledge Point 1: [Title]\n[Brief explanation of exploration direction]\n\nKnowledge Point 2: [Title]\n[Brief explanation of exploration direction]\n\nAnd so on...\n\nQuestion: {start}",
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
      "description": "In-depth exploration of knowledge points",
      "mcp_servers": [
        "bilibili"
      ],
      "system_prompt": "You are a professional knowledge explorer. You need to deeply explore a knowledge point and provide detailed information. Remember, you cannot call multiple tools simultaneously.",
      "user_prompt": "Please select an unexplored knowledge point from the following knowledge point list for in-depth exploration. You need to use the bilibili tool to search for information first, and your output must start with 'Explored: Knowledge Point X: [Title]', where X is the knowledge point number. Then provide detailed background, concept explanation, and practical applications.\n\nKnowledge Point List:\n{planning_node}\n\nHistory of explored knowledge points:\n\n{exploration_summary_node}\n\n",
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
      "system_prompt": "You are a knowledge summary expert. You need to provide concise summaries of explored knowledge point content.",
      "user_prompt": "Please provide a concise summary of the following explored knowledge points. Your output must start with 'Explored: Knowledge Point X: [Title]', where X is the knowledge point number. Then provide 1-2 sentences to summarize the knowledge point.\n\nLatest knowledge point content:\n{knowledge_exploration_node}\n\nPlease organize the summary in a clear and concise manner.",
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
      "system_prompt": "You are a decision expert. You need to determine whether all knowledge points have been explored based on knowledge exploration summaries and make accurate decisions.",
      "user_prompt": "Please analyze the following knowledge exploration summary and determine whether all planned knowledge points have been explored.\n\nPlanned knowledge points:\n{planning_node}\n\nKnowledge exploration summary:\n{exploration_summary_node}\n\nPlease follow these steps:\n1. Based on the summary, confirm the total number of knowledge points that need to be explored\n2. Confirm the numbers and titles of knowledge points that have been explored\n3. Calculate how many knowledge points remain unexplored\n4. If there are still unexplored knowledge points, choose the tool 'Continue exploring knowledge points'\n5. If all knowledge points have been explored, choose the tool 'Integrate knowledge points'.",
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
      "user_prompt": "Please integrate the following explored knowledge points into a coherent knowledge system, ensuring good logical connections between content and eliminating any duplicate content. When integrating, retain the original numbering and title structure of knowledge points, but the content should be well integrated.\n\nKnowledge exploration summary:\n{exploration_summary_node}\n\nExplored knowledge points:\n{knowledge_exploration_node}\n\n",
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
      "system_prompt": "You are a professional answer generation expert. You need to generate clear, comprehensive final answers based on integrated knowledge.",
      "user_prompt": "Please provide a comprehensive, clear, and well-structured answer to the original question based on the following integrated knowledge. Ensure the answer directly responds to the question and the content is easy to understand.\n\nOriginal question: {start}\n\nIntegrated knowledge:\n{integration_node}",
      "input_nodes": [
        "integration_node"
      ],
      "output_nodes": [
        "end"
      ],
      "output_enabled": true,
      "level": 5,
      "handoffs": null,
      "global_output": false,
      "context": [
        "start",
        "integration_node"
      ],
      "context_mode": "all"
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
The `decision_node` uses the `handoffs` parameter to implement loop exploration control. It can return to `knowledge_exploration_node` multiple times when exploration is incomplete to continue exploring new knowledge points, or advance to `integration_node` when all knowledge points have been explored. This implements intelligent workflow decision paths.

#### 2. Global Context and History Management
```json
"global_output": true,
"context": ["exploration_summary_node"],
"context_mode": "all"
```
Multiple nodes (like `planning_node`, `knowledge_exploration_node`, `exploration_summary_node`, etc.) use `global_output: true` settings, making their outputs available to other nodes. `knowledge_exploration_node` accesses historical outputs from `exploration_summary_node` through the `context` parameter, achieving tracking of explored knowledge and avoiding duplicate exploration.

#### 3. External Prompt Templates
```json
"system_prompt": "Follow this requirement: {prompt.md}"
```
`planning_node` uses external Markdown files as system prompts, allowing more complex, structured prompts to be maintained in separate files, improving readability and maintainability.

#### 4. MCP Integration
```json
"mcp_servers": ["bilibili"]
```
`knowledge_exploration_node` integrates specialized Bilibili search tools through MCP servers, enabling agents to search for information on Chinese video platforms for effective exploration of domain-specific knowledge.

#### 5. Structured Output Templates
```json
"end_template": "# Knowledge Exploration and Answer Generation System\n\n## Original Question\n{start}\n\n## Knowledge Planning\n{planning_node}\n\n## Knowledge Point Summary Collection\n{exploration_summary_node:all}\n\n## Knowledge Integration\n{integration_node}\n\n## Final Answer\n{answer_node}"
```
Uses `end_template` to create polished final reports, referencing outputs from various key nodes. Note that `{exploration_summary_node:all}` references all historical summaries, providing a complete exploration record.

#### 6. Precise Level Execution Control
```json
"level": 0, "level": 1, "level": 2, "level": 3, "level": 4, "level": 5
```
All nodes are explicitly assigned execution levels from 0 to 5, ensuring the system runs in precise order: Planning→Exploration→Summary→Decision→Integration→Answer Generation.
* When creating nodes, there's no need to create levels manually; the system automatically calculates levels to ensure nodes execute in the correct order.

#### 7. Context Passing
```json
"context_mode": "all"  // Used in decision_node to get complete history
"context_mode": "latest"  // Used in exploration_summary_node to get only latest output
```
Different nodes use different context passing based on their needs: `decision_node` needs comprehensive understanding of exploration history, so it uses `"all"` mode; while `exploration_summary_node` only needs to process the latest exploration results, so it uses `"latest"` mode.

#### 8. Multi-Node Collaborative Work
The system consists of six collaboratively working specialized nodes, each with a clear professional role (planner, explorer, summary expert, decision maker, integrator, answer generator), together forming a complete knowledge exploration and Q&A system. This modular design allows each node to focus on its core responsibilities while achieving seamless collaboration through global context and direct connections.

### Workflow

1. `planning_node` analyzes the original question and plans knowledge points to explore
2. `knowledge_exploration_node` uses Bilibili tools to search and explore one knowledge point
3. `exploration_summary_node` summarizes the newly explored knowledge point
4. `decision_node` evaluates exploration progress and decides whether to continue exploring or integrate results
5. If there are unexplored knowledge points, return to step 2 to continue exploration
6. After all knowledge points are explored, `integration_node` integrates all knowledge
7. `answer_node` generates the final answer to the original question

This example demonstrates how MAG supports complex workflows with loops and conditional branching, enabling multiple specialized agents to collaborate, share context, and ultimately produce high-quality structured output.

## 📝 Advanced Usage Guide

### A. Prompt Features

MAG provides two powerful ways to enhance your prompts:

#### 1. Node Output Placeholders

You can reference other nodes' outputs in your prompts:

- Basic reference: `{node_name}` - Get the latest output from specified node
- All history: `{node_name:all}` - Get all historical outputs from the node
- Latest N: `{node_name:latest_5}` - Get the 5 most recent outputs

Example:
```
system_prompt: "You will analyze data based on the following information: {data_processor}"
user_prompt: "Create a summary based on the following content: {input}\n\nConsider previous analysis: {analyst:all}"
```

#### 2. External Prompt Templates

One of MAG's most powerful features is the ability to import external prompt files, which enables:
- Reusing carefully crafted prompts across multiple agents
- Easier maintenance of complex prompts
- Version control for prompt templates
- Sharing prompt libraries within organizations

**How it works:**
1. Create text files containing prompt templates (e.g., `researcher_prompt.txt`)
2. Place them in the agent's prompts directory or reference with full paths
3. Reference files in system or user prompts using `{filename.txt}` format

When MAG executes the agent, it automatically:
- Detects file references in curly braces
- Reads the content of those files
- Replaces the references with actual file content

Example:
```json
{
  "name": "research_agent",
  "system_prompt": "{researcher_base.txt}",
  "user_prompt": "Topic to research: {input}\n\nFollow the method in {research_method.txt}"
}
```

At execution, MAG loads both files' content and injects them into the prompts, allowing you to flexibly maintain complex prompt libraries externally.

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

The node can pass decisions to its output nodes up to 5 times.

### D. Subgraph Integration

To use a graph as a node within another graph:

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