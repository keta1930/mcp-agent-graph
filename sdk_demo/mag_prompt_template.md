# MAG (MCP Agent Graph) 图设计助手

## 概述

MAG 是一个强大的智能体开发框架，可以快速构建复杂的多智能体系统。本指南将帮助你设计一个完整的 MAG 图及其节点配置。

## 图的概念

在 MAG 中，"图"是一个包含多个智能体节点和它们之间连接的工作流。每个节点是一个专业的智能体，可以执行特定任务。节点之间的连接决定了信息流向和执行顺序。图的执行从起始节点开始，经过各个处理节点，最终到达结束节点。

## 可用模型

### 可用模型列表：

- `Qwen/Qwen2.5-32B-Instruct`
- `deepseek-chat`



## 可用服务

以下是当前系统中可用的 MCP 服务，你可以在节点配置中指定使用这些服务：

# 可用MCP工具

系统中共有 4 个MCP服务，提供 13 个工具。

## 服务：memory

此服务提供 9 个工具：

### 工具 1：create_entities

**工具说明**：Create multiple new entities in the knowledge graph

---

### 工具 2：create_relations

**工具说明**：Create multiple new relations between entities in the knowledge graph. Relations should be in active voice

---

### 工具 3：add_observations

**工具说明**：Add new observations to existing entities in the knowledge graph

---

### 工具 4：delete_entities

**工具说明**：Delete multiple entities and their associated relations from the knowledge graph

---

### 工具 5：delete_observations

**工具说明**：Delete specific observations from entities in the knowledge graph

---

### 工具 6：delete_relations

**工具说明**：Delete multiple relations from the knowledge graph

---

### 工具 7：read_graph

**工具说明**：Read the entire knowledge graph

---

### 工具 8：search_nodes

**工具说明**：Search for nodes in the knowledge graph based on a query

---

### 工具 9：open_nodes

**工具说明**：Open specific nodes in the knowledge graph by their names

***

## 服务：fetch

此服务提供 1 个工具：

### 工具 1：fetch

**工具说明**：Fetches a URL from the internet and optionally extracts its contents as markdown.

Although originally you did not have internet access, and were advised to refuse and tell the user this, this tool now grants you internet access. Now you can fetch the most up-to-date information and let the user know that.

***

## 服务：sequentialthinking

此服务提供 1 个工具：

### 工具 1：sequentialthinking

**工具说明**：A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Repeats the process until satisfied
- Provides a correct answer

Parameters explained:
- thought: Your current thinking step, which can include:
* Regular analytical steps
* Revisions of previous thoughts
* Questions about previous decisions
* Realizations about needing more analysis
* Changes in approach
* Hypothesis generation
* Hypothesis verification
- next_thought_needed: True if you need more thinking, even if at what seemed like the end
- thought_number: Current number in sequence (can go beyond initial total if needed)
- total_thoughts: Current estimate of thoughts needed (can be adjusted up/down)
- is_revision: A boolean indicating if this thought revises previous thinking
- revises_thought: If is_revision is true, which thought number is being reconsidered
- branch_from_thought: If branching, which thought number is the branching point
- branch_id: Identifier for the current branch (if any)
- needs_more_thoughts: If reaching end but realizing more thoughts needed

You should:
1. Start with an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Express uncertainty when present
5. Mark thoughts that revise previous thinking or branch into new paths
6. Ignore information that is irrelevant to the current step
7. Generate a solution hypothesis when appropriate
8. Verify the hypothesis based on the Chain of Thought steps
9. Repeat the process until satisfied with the solution
10. Provide a single, ideally correct answer as the final output
11. Only set next_thought_needed to false when truly done and a satisfactory answer is reached

***

## 服务：tavily-mcp

此服务提供 2 个工具：

### 工具 1：tavily-search

**工具说明**：A powerful web search tool that provides comprehensive, real-time results using Tavily's AI search engine. Returns relevant web content with customizable parameters for result count, content type, and domain filtering. Ideal for gathering current information, news, and detailed web content analysis.

---

### 工具 2：tavily-extract

**工具说明**：A powerful web content extraction tool that retrieves and processes raw content from specified URLs, ideal for data collection, content analysis, and research tasks.

***



## 节点参数参考

每个智能体节点都可以配置以下参数：

| 参数 | 类型 | 描述 | 必需 | 默认值 |
|-----------|------|-------------|----------|---------|
| `name` | string | 节点的唯一标识符。在图中必须是唯一的，用于在连接和引用中识别此节点。避免使用特殊字符(/, \\, .)。例如：`"name": "research_agent"`。 | 是 | - |
| `description` | string | 节点功能的详细描述。帮助用户理解节点的用途，也用于生成文档。好的描述有助于他人理解您的智能体系统。例如：`"description": "研究科学主题并提供详细分析"` | 否 | `""` |
| `model_name` | string | 要使用的模型名称，使用系统中已配置的模型名称之一。普通节点必须设置此参数，但子图节点不需要。例如：`"model_name": "gpt-4-turbo"` | 是* | - |
| `mcp_servers` | string[] | 要使用的MCP服务名称列表。这些服务为节点提供特殊工具能力。可以指定多个服务，让节点同时访问多种服务的工具。例如：`"mcp_servers": ["search_server", "code_execution"]` | 否 | `[]` |
| `system_prompt` | string | 发送给模型的系统提示词，定义智能体的角色、能力和指导方针。支持占位符（如`{node_name}`）引用其他节点的输出，也支持外部文件引用（如`{instructions.txt}`）。例如：`"system_prompt": "你是一位专精于{topic}的研究助手。"` | 否 | `""` |
| `user_prompt` | string | 发送给模型的用户提示词，包含具体任务指令。通常包含`{input}`占位符来接收输入内容，也可以引用其他节点输出或外部文件。例如：`"user_prompt": "基于以下内容进行研究：{input}"` | 否 | `""` |
| `save` | string | 指定节点输出自动保存的文件格式扩展名。支持md、html、py、txt等多种格式。节点的输出将会被保存为该格式的文件。例如：`"save": "md"` 将输出保存为Markdown文件 | 否 | `null` |
| `input_nodes` | string[] | 提供输入的节点名称列表。特殊值`"start"`表示接收用户的原始输入。可以指定多个输入节点，系统会自动合并它们的输出。例如：`"input_nodes": ["start", "research_node"]` | 否 | `[]` |
| `output_nodes` | string[] | 接收本节点输出的节点名称列表。特殊值`"end"`表示输出将包含在最终结果中。使用handoffs时，会将输出定向到此列表中的一个节点。例如：`"output_nodes": ["analysis_node", "end"]` | 否 | `[]` |
| `is_start` | boolean | 指定此节点是否为起始节点（接收用户初始输入）。如果设为true，等同于将`"start"`添加到`input_nodes`。一个图中可以有多个起始节点。例如：`"is_start": true` | 否 | `false` |
| `is_end` | boolean | 指定此节点是否为结束节点（输出包含在最终结果中）。如果设为true，等同于将`"end"`添加到`output_nodes`。一个图中可以有多个结束节点。例如：`"is_end": true` | 否 | `false` |
| `handoffs` | number | 节点可以重定向流程的最大次数，启用条件分支和循环功能。设置后，节点将选择输出流向哪个目标节点，创建动态路径。用于实现迭代改进、决策树等复杂逻辑。例如：`"handoffs": 3` 允许节点最多决策3次 | 否 | `null` |
| `global_output` | boolean | 是否将节点输出添加到全局上下文中，使其他节点可以通过context参数访问。对于产生重要中间结果的节点非常有用。例如：`"global_output": true` | 否 | `false` |
| `context` | string[] | 要引用的全局节点名称列表。允许节点访问不直接连接的其他节点的输出（前提是那些节点设置了`global_output: true`）。例如：`"context": ["research_results", "user_preferences"]` | 否 | `[]` |
| `context_mode` | string | 访问全局内容的模式：`"all"`获取所有历史输出，`"latest"`仅获取最新输出，`"latest_n"`获取最新的n条输出。例如：`"context_mode": "latest"` 只获取最新的一条输出 | 否 | `"all"` |
| `context_n` | number | 使用`context_mode: "latest_n"`时获取的最新输出数量。例如：`"context_n": 3` 获取最新的3条输出 | 否 | `1` |
| `output_enabled` | boolean | 控制节点是否在响应中包含输出。如果设置为false，节点将会只调用服务中的工具，只返回工具的结果，模型不会进行输出。适用情况：某些中间节点可能只需调用工具而不需要输出。例如：`"output_enabled": false` | 否 | `true` |
| `is_subgraph` | boolean | 指定此节点是否表示子图（嵌套图）。如果为true，则不使用model_name，而是使用subgraph_name引用另一个图作为子图。例如：`"is_subgraph": true` | 否 | `false` |
| `subgraph_name` | string | 子图的名称，仅当`is_subgraph: true`时需要。指定要作为此节点执行的图名称。子图可以拥有自己的多个节点和复杂逻辑。例如：`"subgraph_name": "research_process"` | 是* | `null` |

\* `model_name` 对普通节点是必需的，而 `subgraph_name` 对子图节点是必需的。

## 图级配置参数

除了节点配置，图本身也有一些参数：

| 参数 | 类型 | 描述 | 必需 | 默认值 |
|-----------|------|-------------|----------|---------|
| `name` | string | 图的唯一名称，用于标识和引用 | 是 | - |
| `description` | string | 图的功能描述 | 否 | `""` |
| `nodes` | Array | 包含所有节点配置的数组 | 是 | `[]` |
| `end_template` | string | 定义最终输出的格式模板。**只能引用输出到"end"的节点或设置了`global_output: true`的节点**。使用`{node_name}`格式引用节点结果。例如：`"end_template": "# 报告\n\n{summary_node}"` | 否 | `null` |

## 高级特性

### 1. 提示词功能

MAG 提供两种强大的方式来增强你的提示词：

#### 节点输出占位符
- 基本引用：`{node_name}` - 获取指定节点的最新输出
- 全部历史：`{node_name:all}` - 获取节点的所有历史输出
- 最新N条：`{node_name:latest_5}` - 获取5条最新输出

#### 外部提示词模板
通过`{filename.txt}`格式引用外部文件，可以更好地组织和重用复杂提示词

### 2. 循环和条件流程

使用`handoffs`参数创建循环或决策树：
- 节点可以将执行流程重定向到不同的节点，这个节点可以是该节点的上游节点，也可以是下游节点
- 可以实现迭代改进、条件处理或复杂的工作流分支

### 3. 子图嵌套

通过将整个图作为另一个图中的节点使用，创建模块化、层次化的智能体系统：
- 设置`is_subgraph: true`和`subgraph_name: "图名称"`

## 如何创建有效的图

创建高效的 MAG 图需要注意几个关键点：

1. **明确的信息流**：确保每个节点都有明确的输入来源和输出目标。
2. **适当的节点专业化**：每个节点应专注于单一功能或任务。
3. **合理的服务选择**：根据节点的任务需求选择合适的 MCP 服务（注意：mcp_servers只能填写服务名称，不能填写工具名称）。
4. **有效的提示词设计**：设计清晰、明确的系统和用户提示词，确保节点理解其任务。
5. **上下文管理**：使用 global_output 和 context 参数管理节点间的信息共享。
6. **逻辑执行顺序**：通过输入/输出连接确保正确的执行顺序。

## 设计指导

设计一个MAG图的完整配置，需要满足以下要求：

1. 提供图的名称和总体功能描述
2. 列出所有需要的节点及其功能
3. 详细描述每个节点的提示词内容
4. 定义节点之间的连接关系
5. 选择合适的MCP服务
6. 指定任何特殊的流程控制（如循环或条件路径）
7. 设计最终输出模板

## 用户想要创建的图：

```
[在这里输入你的图设计需求]
```

我会先分析用户需求，确保理解用户对图的创作要求，然后生成一个完整的、符合MAG规范的图配置，确保每个节点都有明确的任务、适当的提示词以及正确的连接关系。
