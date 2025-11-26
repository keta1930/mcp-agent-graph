# MAG (MCP Agent Graph) 图设计规范

## 概述

MAG 是一个强大的多智能体工作流系统，通过节点（Nodes）和连接（Connections）构建复杂的智能体协作流程。每个节点代表一个专门的智能体，节点间的连接决定信息流向和执行顺序。

本文档分为三大部分：
1. **基本参数与说明** - 确保 Agent 生成正确的 Graph 配置
2. **设计最佳实践** - 提升 Graph 设计质量和协作效率
3. **创建 Graph 的流程** - 规范化的 Graph 创建和优化流程

---

# 第一部分：基本参数与说明

## 1.1 Graph 顶层配置

| 字段 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | string | 是 | - | Graph 的唯一名称，用于标识和引用该 Graph。不能包含特殊字符 (`/`, `\`, `.`) |
| `description` | string | 否 | `""` | Graph 的功能描述，说明该 Graph 的用途和应用场景 |
| `nodes` | array | 是 | - | 节点配置列表，至少包含一个节点 |
| `end_template` | string | 否 | `null` | 最终输出格式模板，可使用占位符引用节点输出 |

**示例：**
```json
{
  "name": "research_and_report",
  "description": "执行深度研究并生成专业报告的工作流",
  "nodes": [...],
  "end_template": "研究报告已完成。\n\n{{report_generator}}"
}
```

## 1.2 节点核心参数

每个节点代表一个智能体，负责执行特定任务。

### 必需参数

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `name` | string | 是 | - | 节点的唯一标识符。不能包含特殊字符 (`/`, `\`, `.`) |
| `description` | string | 否 | `""` | 节点功能的详细描述，说明该节点的职责和输出 |

### 智能体配置

**配置方式一：引用已注册的 Agent（推荐）**

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `agent_name` | string | 是* | - | 引用已注册的 Agent 名称。节点会继承 Agent 的所有配置 |

使用 `agent_name` 时，节点会继承 Agent 的所有默认配置（model、system_prompt、tools 等）。节点中显式指定的参数会**覆盖** Agent 的默认值。

**配置方式二：手动配置模型和提示词**

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `model_name` | string | 是* | - | 使用的 AI 模型名称（当不使用 `agent_name` 时必需） |
| `system_prompt` | string | 否 | `""` | 系统提示词，定义智能体的角色、能力和行为规则 |
| `user_prompt` | string | 否 | `""` | 用户提示词，包含具体的任务指令和输出要求 |

*注：`agent_name` 和 `model_name` 至少提供其中一个。

### 工具配置

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `mcp_servers` | string[] | 否 | `[]` | 可使用的 MCP 服务名称列表（如 web_search、github 等） |
| `system_tools` | string[] | 否 | `[]` | 可使用的系统工具名称列表（详见第 1.5 节） |
| `max_iterations` | number | 否 | `50` | 最大工具调用次数（范围：1-200），用于限制节点的执行轮次 |

### 连接配置

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `input_nodes` | string[] | 否 | `[]` | 提供输入的节点列表。`"start"` 表示接收用户的初始输入 |
| `output_nodes` | string[] | 否 | `[]` | 接收输出的节点列表。`"end"` 表示输出到最终结果 |

**数据流说明：**
- 节点会接收所有 `input_nodes` 的输出作为上下文
- 节点的输出会**并行**发送给所有 `output_nodes`（除非使用 handoffs，见下文）
- 使用 `"start"` 标记工作流的起点，使用 `"end"` 标记工作流的终点

### 高级参数

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `handoffs` | number | 否 | `null` | **重要**：启用动态流程控制。设置后，节点可以从 `output_nodes` 中**选择一个**进行跳转，而非并行输出 |
| `output_enabled` | boolean | 否 | `true` | 是否包含模型的文本输出。设为 `false` 时节点仅调用工具，不生成文本输出 |

**关于 `handoffs` 参数的重要说明：**

- **不设置 `handoffs`**：节点的输出会**并行**发送给 `output_nodes` 中的所有节点
- **设置 `handoffs`**：节点必须从 `output_nodes` 中**选择一个**节点进行跳转，实现条件分支和循环
- `handoffs` 的值表示该节点最多可以执行多少次流程重定向
- 节点会自动获得 `transfer_to_<node_name>` 工具，用于选择目标节点

**handoffs 使用场景：**
- **条件分支**：根据执行结果选择不同的后续节点（如质量检查失败时返回重做）
- **循环优化**：实现迭代优化流程（如代码审查-修改-再审查）
- **动态路由**：根据任务复杂度选择不同的处理路径

### 子图配置

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `is_subgraph` | boolean | 否 | `false` | 标记该节点是否为子图节点 |
| `subgraph_name` | string | 是* | `null` | 子图名称（仅当 `is_subgraph` 为 `true` 时需要） |

*子图节点必须同时设置 `is_subgraph: true` 和 `subgraph_name`。

## 1.3 占位符语法

在 `system_prompt`、`user_prompt` 和 `end_template` 中，可以使用占位符引用其他节点的输出或已注册的提示词模板。

### 占位符类型

| 语法 | 描述 | 示例 | 用途 |
|------|------|------|------|
| `{{node_name}}` | 引用指定节点的最新输出 | `{{research_agent}}` | 获取单个节点的最新结果 |
| `{{node_name:N}}` | 引用指定节点的最近 N 次输出 | `{{analyzer:3}}` | 查看节点的多次执行历史 |
| `{{node_name:all}}` | 引用该节点的所有历史输出 | `{{collector:all}}` | 获取节点的完整执行历史 |
| `{{@prompt_name}}` | 引用已注册的提示词模板 | `{{@code_review_template}}` | 复用标准化的提示词模板 |
| `{{node1:2\|node2:3}}` | 联合引用多个节点的输出 | `{{agent1:2\|agent2:3}}` | 整合多个节点的历史输出 |

### 占位符使用示例

```json
{
  "name": "report_generator",
  "user_prompt": "基于以下信息生成综合报告：\n\n## 研究结果\n{{research_agent}}\n\n## 数据分析\n{{data_analyzer:2}}\n\n请整合这些信息，生成结构清晰的专业报告。"
}
```

## 1.4 节点配置完整示例

### 示例 1：使用已注册的 Agent

```json
{
  "name": "data_collector",
  "description": "收集和整理原始数据",
  "agent_name": "data_collection_expert",
  "input_nodes": ["start"],
  "output_nodes": ["data_analyzer"]
}
```

### 示例 2：手动配置节点

```json
{
  "name": "quality_checker",
  "description": "检查输出质量，决定是否需要重新处理",
  "model_name": "claude-3-5-sonnet-20241022",
  "system_prompt": "你是一个严格的质量检查专家，负责评估输出质量。",
  "user_prompt": "请检查以下输出：\n\n{{content_generator}}\n\n如果质量合格，选择 transfer_to_final_output；如果需要改进，选择 transfer_to_content_generator 并说明改进建议。",
  "system_tools": ["create_file", "read_file"],
  "input_nodes": ["content_generator"],
  "output_nodes": ["content_generator", "final_output"],
  "handoffs": 5,
  "max_iterations": 30
}
```

### 示例 3：使用 handoffs 实现循环优化

```json
{
  "nodes": [
    {
      "name": "code_writer",
      "description": "编写代码实现",
      "agent_name": "coding_expert",
      "system_tools": ["create_file", "update_file"],
      "input_nodes": ["start"],
      "output_nodes": ["code_reviewer"]
    },
    {
      "name": "code_reviewer",
      "description": "审查代码质量，决定是否通过",
      "model_name": "claude-3-5-sonnet-20241022",
      "system_prompt": "你是代码审查专家。审查代码后，如果发现问题使用 transfer_to_code_writer 要求修改；如果代码合格使用 transfer_to_end 结束流程。",
      "user_prompt": "请审查以下代码：\n\n{{code_writer}}\n\n检查代码质量、可读性和最佳实践。",
      "system_tools": ["read_file"],
      "input_nodes": ["code_writer"],
      "output_nodes": ["code_writer", "end"],
      "handoffs": 3
    }
  ]
}
```

## 1.5 系统工具说明

系统工具是 MAG 内置的功能模块，通过 `system_tools` 参数配置。**重要**：配置时使用**工具名称**（而非类名）。

### 文件操作工具（file_creator）

**核心能力**：提供完整的文档管理能力，实现节点间基于文档的任务交接和工作协作。

**可用工具：**
- `create_file` - 创建新文件（支持目录结构，如 `research/report.md`）
- `read_file` - 批量读取文件内容、摘要和操作历史
- `update_file` - 通过字符串替换进行精确的局部修改
- `rewrite_file` - 完全重写文件内容，适用于大范围修改
- `delete_files` - 删除不需要的文件
- `list_all_files` - 列出所有文件清单
- `list_files_by_directory` - 按目录列出文件清单

**特性：**
- 所有文件存储在**对话级别**，同一 Graph 的所有节点都可以访问
- 自动维护**版本历史和操作日志**，可追溯每次修改
- 支持目录结构，便于组织复杂项目

**核心价值：**
文件工具是 Graph 设计中最重要的协作机制。它允许节点将工作成果持久化为文档，供后续节点读取、编辑和交付。这种基于文档的协作模式使得复杂任务可以被分解为清晰的工作流。

### 子智能体工具（subagent）

**核心能力**：在节点内部调用其他专业 Agent 处理特定子任务，实现能力的组合和扩展。

**可用工具：**
- `agent_task_executor` - 调用其他 Agent 执行任务，支持批量调用和历史继承
- `list_agent_categories` - 列出所有 Agent 分类
- `list_agents_in_category` - 列出指定分类下的 Agent
- `get_agent_details` - 获取 Agent 的详细信息（能力、模型、工具等）

**特性：**
- 支持**同时委托多个任务**给不同的 Agent
- 每个任务有独立的 `task_id`，可追踪执行历史
- 如果 `task_id` 已存在，子 Agent 会**继承完整对话历史**继续执行
- 自动防止递归调用（子 Agent 不会再调用 `agent_task_executor`）

**核心价值：**
子智能体工具允许在单个节点内实现复杂的多 Agent 协作，将特定任务委托给专业 Agent。这提供了比多节点 Graph 更灵活的协作方式，适合处理需要多种专业能力的复杂任务。

### 记忆管理工具（memory_tools）

**核心能力**：提供持久化记忆能力，可以记住用户偏好、学习经验和上下文信息。

**可用工具：**
- `add_memory` - 添加新记忆
- `get_memory` - 获取记忆内容
- `update_memory` - 更新记忆内容
- `delete_memory` - 删除记忆
- `list_memory_categories` - 列出所有记忆分类

**核心价值：**
在工作流中积累和利用历史知识，实现跨会话的上下文记忆和学习能力。

---

# 第二部分：设计最佳实践

本部分介绍如何设计高质量的 Graph，充分利用系统工具实现高效的多智能体协作。

## 2.1 核心设计理念

### 理念 1：基于文档的工作交接

**核心思想**：使用文件工具将每个节点的工作成果持久化为文档，实现清晰的任务交接。

**为什么重要：**
- **持久化**：文档在整个 Graph 执行过程中持续存在，所有节点都可以访问
- **可追溯**：版本历史记录每次修改，便于审查和回溯
- **清晰交接**：明确的文档结构使节点间的协作更加规范
- **并行协作**：多个节点可以同时读取文档，提供建议和检查

**设计模式：**

1. **单一文档所有者模式**（推荐）
   - 每个文档由一个节点负责创建和修改
   - 其他节点只读取和检查，通过 handoffs 要求所有者修改
   - 避免多节点同时修改同一文档导致的冲突

2. **协作编辑模式**
   - 多个节点协作编辑不同的文档
   - 每个节点负责特定类型的文档（如研究文档、代码文档、测试文档）
   - 通过文档目录结构组织不同类型的工作成果

**示例场景：软件开发工作流**

```
需求分析节点 → 创建 requirements/spec.md
     ↓
架构设计节点 → 读取 spec.md，创建 design/architecture.md
     ↓
代码实现节点 → 读取 architecture.md，创建 code/main.py
     ↓
代码审查节点 → 读取 code/main.py
     ↓ (如果发现问题)
  使用 handoffs 返回代码实现节点，附带改进建议
     ↓ (如果通过审查)
  结束流程
```

### 理念 2：使用 Subagent 隔离上下文

**核心思想**：在单个节点内使用 `agent_task_executor` 调用专业 Agent 处理子任务，避免上下文污染。

**为什么重要：**
- **上下文隔离**：每个子任务有独立的对话上下文，不会相互干扰
- **专业分工**：充分利用专业 Agent 的能力和提示词
- **灵活组合**：在单个节点内实现复杂的多 Agent 协作
- **可追溯性**：每个子任务有独立的 task_id，可查看完整执行历史

**何时使用 Subagent vs 多节点 Graph：**

| 场景 | 使用 Subagent | 使用多节点 Graph |
|------|--------------|-----------------|
| 任务关系 | 并行的独立子任务 | 有明确顺序的工作流 |
| 上下文 | 需要隔离上下文 | 需要共享上下文 |
| 复杂度 | 中等复杂的任务分解 | 大型复杂工作流 |
| 可视化 | 不需要可视化子任务流程 | 需要清晰的流程图 |

**示例：深度研究节点使用 Subagent**

```json
{
  "name": "research_coordinator",
  "description": "协调多个研究子任务",
  "system_prompt": "你是研究协调员。使用 agent_task_executor 将研究任务分配给专业研究员。",
  "user_prompt": "请研究以下主题：{{start}}\n\n将任务分解为多个子任务，分配给不同的研究员并行执行。将所有研究结果整合到 research/findings.md 文档中。",
  "system_tools": ["agent_task_executor", "list_agent_categories", "list_agents_in_category", "get_agent_details", "create_file", "update_file"],
  "input_nodes": ["start"],
  "output_nodes": ["report_writer"]
}
```

研究协调节点可以： 
1. 使用 `list_agents_in_category` 查找可用的研究员 Agent
2. 使用 `agent_task_executor` 同时创建多个研究任务
3. 等待所有子任务完成，整合结果到文档
4. 将文档传递给报告撰写节点

### 理念 3：使用 Handoffs 实现分支和循环

**核心思想**：使用 `handoffs` 参数实现动态的流程控制，而非固定的并行输出。

**Handoffs 的工作机制：**
- 设置 `handoffs` 参数后，节点的 `output_nodes` 变为**可选择的目标列表**
- 节点会自动获得 `transfer_to_<node_name>` 工具
- 节点必须调用其中一个 transfer 工具来选择下一步
- `handoffs` 的值限制该节点最多可以被重新执行的次数

**三种核心场景：**

#### 场景 1：质量检查与返工循环

```json
{
  "nodes": [
    {
      "name": "content_creator",
      "description": "创建内容",
      "system_tools": ["create_file", "update_file"],
      "input_nodes": ["start"],
      "output_nodes": ["quality_checker"]
    },
    {
      "name": "quality_checker",
      "description": "检查质量，决定通过或返工",
      "system_prompt": "你是质量检查专家。如果内容合格，使用 transfer_to_end；如果需要改进，使用 transfer_to_content_creator 并详细说明问题。",
      "system_tools": ["read_file"],
      "input_nodes": ["content_creator"],
      "output_nodes": ["content_creator", "end"],
      "handoffs": 3
    }
  ]
}
```

**流程说明：**
- 内容创建节点完成后，流程进入质量检查节点
- 质量检查节点读取文档，评估质量
- 如果发现问题：调用 `transfer_to_content_creator`，流程返回创建节点（携带改进建议）
- 如果质量合格：调用 `transfer_to_end`，结束流程
- `handoffs: 3` 限制最多返工 3 次，避免无限循环

#### 场景 2：条件分支处理

```json
{
  "name": "task_router",
  "description": "根据任务类型路由到不同的处理节点",
  "system_prompt": "分析任务类型：\n- 编码任务 → transfer_to_coding_expert\n- 数据分析 → transfer_to_data_analyst\n- 文档撰写 → transfer_to_doc_writer",
  "input_nodes": ["start"],
  "output_nodes": ["coding_expert", "data_analyst", "doc_writer"],
  "handoffs": 1
}
```

#### 场景 3：迭代优化流程

```json
{
  "nodes": [
    {
      "name": "solution_designer",
      "description": "设计解决方案",
      "system_tools": ["create_file"],
      "input_nodes": ["start"],
      "output_nodes": ["solution_evaluator"]
    },
    {
      "name": "solution_evaluator",
      "description": "评估方案，决定是否需要优化",
      "system_prompt": "评估方案质量。如果需要优化使用 transfer_to_solution_optimizer；如果方案满意使用 transfer_to_end。",
      "system_tools": ["read_file"],
      "input_nodes": ["solution_designer", "solution_optimizer"],
      "output_nodes": ["solution_optimizer", "end"],
      "handoffs": 2
    },
    {
      "name": "solution_optimizer",
      "description": "根据评估反馈优化方案",
      "system_tools": ["read_file", "update_file"],
      "input_nodes": ["solution_evaluator"],
      "output_nodes": ["solution_evaluator"]
    }
  ]
}
```

**关键设计要点：**
- **明确的决策逻辑**：在 system_prompt 中清楚说明何时选择哪个节点
- **限制循环次数**：通过 `handoffs` 值避免无限循环
- **携带反馈信息**：返工时应包含具体的改进建议

### 理念 4：单节点即单智能体

**核心思想**：每个节点是一个完整的智能体，可以充分利用系统工具和 MCP 工具实现复杂任务。

**节点的能力边界：**
- 节点可以调用多个工具完成复杂任务
- 节点可以创建、读取、修改多个文档
- 节点可以调用多个子 Agent 处理并行子任务
- 节点可以通过 handoffs 做出流程决策

**示例：全能的研究节点**

```json
{
  "name": "comprehensive_researcher",
  "description": "执行完整的研究流程：搜索、分析、整理、文档化",
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

这个节点可以：
1. 使用 MCP 工具搜索信息
2. 使用 subagent 工具委托专业 Agent 分析特定领域
3. 使用文件工具整理研究结果到结构化文档
4. 在单个节点内完成完整的研究流程

## 2.2 节点设计原则

### 原则 1：单一职责

每个节点应专注于一个明确的任务，便于理解、测试和维护。

**好的设计：**
```json
{
  "name": "requirements_analyzer",
  "description": "分析用户需求，提取关键功能点和约束条件"
}
```

**不好的设计：**
```json
{
  "name": "full_stack_processor",
  "description": "分析需求、设计架构、编写代码、测试、部署"
}
```

**拆分复杂任务的信号：**
- 节点描述超过 2 句话
- 节点需要配置超过 10 个工具
- 节点的 max_iterations 需要设置很大（> 150）
- 节点需要处理多种完全不同的任务

### 原则 2：清晰的输入输出

每个节点应该明确：
- **输入期望**：需要从 input_nodes 获取什么信息
- **输出承诺**：会向 output_nodes 提供什么结果
- **交付物**：会创建哪些文档，文档的结构和内容是什么

**示例：明确的交付要求**

```json
{
  "name": "api_designer",
  "user_prompt": "基于需求文档设计 RESTful API。\n\n需求：{{requirements_analyzer}}\n\n## 交付要求\n\n1. **API 设计文档**\n   - 文件路径：`design/api_spec.md`\n   - 格式：Markdown\n   - 内容：端点列表、请求/响应格式、认证方式、错误处理\n   - 质量标准：遵循 RESTful 最佳实践，包含完整的示例\n\n2. **OpenAPI 规范**\n   - 文件路径：`design/openapi.yaml`\n   - 格式：YAML\n   - 内容：完整的 OpenAPI 3.0 规范\n\n## 验收标准\n\n- [ ] 所有端点都有清晰的用途说明\n- [ ] 包含完整的请求和响应示例\n- [ ] 定义了所有数据模型\n- [ ] 包含错误处理方案"
}
```

### 原则 3：合理的工具配置

**按需配置原则：**
- 只配置节点实际需要的工具和服务
- 避免为所有节点配置所有工具
- 考虑工具的性能和成本影响

**工具组合策略：**

| 节点类型 | 推荐工具组合 | 说明 |
|---------|-------------|------|
| 信息收集 | MCP 服务 + `create_file` | 搜索信息并保存到文档 |
| 内容创建 | `create_file`, `update_file` | 创建和修改文档 |
| 质量检查 | `read_file` + handoffs | 读取文档并决策流程 |
| 协调节点 | `agent_task_executor`, `list_agents_in_category`, 文件工具 | 委托子任务并整合结果 |
| 分析节点 | `read_file`, `create_file`, 特定 MCP 服务 | 读取数据、分析、输出报告 |

### 原则 4：清晰的角色定义

在 `system_prompt` 中明确定义智能体的：
- **角色身份**：专家类型、职责范围
- **能力边界**：擅长什么、不擅长什么
- **行为规范**：应该如何工作、避免什么
- **决策标准**：（使用 handoffs 时）何时选择哪个分支

**示例：优秀的系统提示词**

```
你是一位资深的软件架构师，拥有 15 年的大型系统设计经验。

## 你的职责
- 根据需求文档设计系统架构
- 选择合适的技术栈和设计模式
- 识别潜在的技术风险和性能瓶颈
- 创建清晰的架构文档供开发团队使用

## 你的能力
- 熟悉微服务、事件驱动、CQRS 等架构模式
- 精通 AWS/Azure/GCP 云服务
- 擅长性能优化和可扩展性设计

## 工作规范
1. 先完整阅读需求文档（使用 read_file）
2. 识别关键的功能模块和数据流
3. 选择合适的架构模式，并说明理由
4. 设计详细的组件图和数据流图
5. 将架构设计保存到 design/architecture.md

## 输出标准
- 架构设计必须包含：组件图、数据流图、技术栈选择、部署架构
- 必须说明设计决策的理由和权衡
- 必须识别技术风险并提供缓解方案
```

## 2.3 提示词设计最佳实践

### 最佳实践 1：结构化的提示词

使用标题和列表组织提示词，使其易于理解和维护。

```json
{
  "user_prompt": "# 任务目标\n\n生成用户认证模块的技术文档。\n\n# 输入内容\n\n需求文档：{{requirements}}\n架构设计：{{architecture}}\n\n# 输出要求\n\n1. **功能概述**：简要说明认证模块的用途\n2. **技术实现**：描述使用的技术和算法\n3. **API 接口**：列出所有相关的 API\n4. **安全考虑**：说明安全措施和最佳实践\n\n# 交付物\n\n- 文件路径：`docs/authentication.md`\n- 格式：Markdown，使用二级标题组织内容\n- 长度：800-1200 字"
}
```

### 最佳实践 2：明确的交付清单

**为什么需要交付清单：**
- 确保节点输出符合预期
- 规范文档的存储位置和命名
- 定义输出的格式和质量标准
- 便于下游节点验证和使用

**交付清单模板：**

```
## 交付要求

请完成以下交付物：

1. **[交付物名称]**
   - 文件路径：`[具体路径]`
   - 格式要求：[Markdown/JSON/代码等]
   - 内容要求：[具体说明]
   - 质量标准：[评判标准]

2. **[交付物名称]**
   - ...

## 验收标准

- [ ] 所有文件已创建在指定路径
- [ ] 内容完整，包含所有必需部分
- [ ] 格式规范，符合要求
- [ ] 质量达标，满足标准
```

### 最佳实践 3：使用占位符引用

**占位符的用途：**
- 引用上游节点的输出
- 复用标准化的提示词模板
- 引用节点的执行历史

**最佳实践：**
- 给占位符添加上下文标签，说明引用的内容是什么
- 使用历史引用（如 `{{node:3}}`）查看节点的多次执行
- 避免传递过多冗余信息，只引用必要的内容

**示例：**

```json
{
  "user_prompt": "基于以下内容生成综合报告：\n\n## 市场研究结果\n{{market_research}}\n\n## 竞品分析（最近 2 次分析）\n{{competitor_analysis:2}}\n\n## 用户调研反馈\n{{user_research}}\n\n请整合这些信息，生成结构清晰的市场分析报告，保存到 reports/market_analysis.md。"
}
```

### 最佳实践 4：使用 Handoffs 时的决策指令

使用 handoffs 时，必须在提示词中明确决策逻辑。

**模板：**

```
## 流程决策

根据以下标准选择下一步：

1. **如果 [条件 1]**
   - 使用 transfer_to_[node_1]
   - 说明：[为什么选择这个节点]

2. **如果 [条件 2]**
   - 使用 transfer_to_[node_2]
   - 说明：[为什么选择这个节点]

3. **如果 [条件 3]**
   - 使用 transfer_to_end
   - 说明：工作已完成

在选择时，请简要说明你的判断理由。
```

**示例：代码审查的决策逻辑**

```json
{
  "system_prompt": "你是代码审查专家。审查代码质量、可读性、性能和安全性。",
  "user_prompt": "请审查以下代码：\n\n{{code_generator}}\n\n## 审查标准\n\n- 代码逻辑正确性\n- 符合编码规范\n- 没有明显的性能问题\n- 没有安全漏洞\n- 代码可读性良好\n\n## 流程决策\n\n1. **如果发现严重问题（逻辑错误、安全漏洞）**\n   - 使用 transfer_to_code_generator\n   - 详细列出所有问题和改进建议\n\n2. **如果发现轻微问题（风格问题、可优化的地方）**\n   - 根据问题的数量和严重程度决定：\n     - 问题较多或影响较大：transfer_to_code_generator\n     - 问题较少且影响有限：transfer_to_end，并在评审意见中说明\n\n3. **如果代码质量合格**\n   - 使用 transfer_to_end\n   - 说明代码通过审查的理由\n\n请先完成审查，然后做出决策。",
  "handoffs": 3
}
```

## 2.4 完整的工作流设计模式

### 模式 1：线性工作流

**适用场景**：任务有明确的执行顺序，后续步骤依赖前序步骤的输出。

**结构：**
```
start → 节点1 → 节点2 → 节点3 → end
```

**示例：内容生成工作流**

```json
{
  "name": "content_generation_pipeline",
  "nodes": [
    {
      "name": "topic_researcher",
      "description": "研究主题，收集素材",
      "system_tools": ["create_file"],
      "mcp_servers": ["web_search"],
      "input_nodes": ["start"],
      "output_nodes": ["content_writer"]
    },
    {
      "name": "content_writer",
      "description": "撰写初稿",
      "system_tools": ["read_file", "create_file"],
      "input_nodes": ["topic_researcher"],
      "output_nodes": ["editor"]
    },
    {
      "name": "editor",
      "description": "编辑和润色",
      "system_tools": ["read_file", "update_file"],
      "input_nodes": ["content_writer"],
      "output_nodes": ["end"]
    }
  ]
}
```

### 模式 2：并行分支-汇聚

**适用场景**：多个独立任务可以并行执行，最后汇聚结果。

**结构：**
```
start → 分发节点 ⟹ 节点1
                ⟹ 节点2  → 汇聚节点 → end
                ⟹ 节点3
```

**示例：多角度研究工作流**

```json
{
  "name": "parallel_research",
  "nodes": [
    {
      "name": "research_coordinator",
      "description": "分配研究任务",
      "input_nodes": ["start"],
      "output_nodes": ["tech_researcher", "market_researcher", "user_researcher"]
    },
    {
      "name": "tech_researcher",
      "description": "技术可行性研究",
      "system_tools": ["create_file"],
      "mcp_servers": ["web_search", "arxiv"],
      "input_nodes": ["research_coordinator"],
      "output_nodes": ["report_integrator"]
    },
    {
      "name": "market_researcher",
      "description": "市场调研",
      "system_tools": ["create_file"],
      "mcp_servers": ["web_search"],
      "input_nodes": ["research_coordinator"],
      "output_nodes": ["report_integrator"]
    },
    {
      "name": "user_researcher",
      "description": "用户需求研究",
      "system_tools": ["create_file"],
      "input_nodes": ["research_coordinator"],
      "output_nodes": ["report_integrator"]
    },
    {
      "name": "report_integrator",
      "description": "整合所有研究结果",
      "system_tools": ["read_file", "create_file"],
      "input_nodes": ["tech_researcher", "market_researcher", "user_researcher"],
      "output_nodes": ["end"]
    }
  ]
}
```

### 模式 3：质量循环（使用 Handoffs）

**适用场景**：需要反复检查和改进，直到满足质量标准。

**结构：**
```
start → 创建节点 → 检查节点 ⟲ 返回创建节点（如果不合格）
                          ↓
                         end（如果合格）
```

**示例：代码开发与审查**

```json
{
  "name": "code_development_cycle",
  "nodes": [
    {
      "name": "requirement_analyst",
      "description": "分析需求，创建需求文档",
      "system_tools": ["create_file"],
      "input_nodes": ["start"],
      "output_nodes": ["code_developer"]
    },
    {
      "name": "code_developer",
      "description": "根据需求和反馈开发代码",
      "system_tools": ["read_file", "create_file", "update_file"],
      "input_nodes": ["requirement_analyst", "code_reviewer"],
      "output_nodes": ["code_reviewer"]
    },
    {
      "name": "code_reviewer",
      "description": "审查代码，决定通过或返工",
      "system_prompt": "审查代码质量。发现问题使用 transfer_to_code_developer；代码合格使用 transfer_to_test_engineer。",
      "system_tools": ["read_file"],
      "input_nodes": ["code_developer"],
      "output_nodes": ["code_developer", "test_engineer"],
      "handoffs": 3
    },
    {
      "name": "test_engineer",
      "description": "编写和执行测试",
      "system_tools": ["read_file", "create_file"],
      "input_nodes": ["code_reviewer"],
      "output_nodes": ["end"]
    }
  ]
}
```

### 模式 4：条件路由（使用 Handoffs）

**适用场景**：根据输入特征或中间结果，选择不同的处理路径。

**结构：**
```
start → 路由节点 ⟹ 路径1 → end
                ⟹ 路径2 → end
                ⟹ 路径3 → end
```

**示例：客户服务智能路由**

```json
{
  "name": "customer_service_router",
  "nodes": [
    {
      "name": "request_classifier",
      "description": "分析客户请求类型",
      "system_prompt": "分析请求：技术问题 → transfer_to_tech_support；账单问题 → transfer_to_billing_support；一般咨询 → transfer_to_general_support",
      "input_nodes": ["start"],
      "output_nodes": ["tech_support", "billing_support", "general_support"],
      "handoffs": 1
    },
    {
      "name": "tech_support",
      "description": "处理技术支持请求",
      "system_tools": ["create_file"],
      "mcp_servers": ["knowledge_base"],
      "input_nodes": ["request_classifier"],
      "output_nodes": ["end"]
    },
    {
      "name": "billing_support",
      "description": "处理账单相关问题",
      "system_tools": ["create_file"],
      "input_nodes": ["request_classifier"],
      "output_nodes": ["end"]
    },
    {
      "name": "general_support",
      "description": "处理一般咨询",
      "system_tools": ["create_file"],
      "input_nodes": ["request_classifier"],
      "output_nodes": ["end"]
    }
  ]
}
```

### 模式 5：迭代优化（使用 Handoffs）

**适用场景**：需要多轮优化和改进，每次优化基于评估反馈。

**结构：**
```
start → 设计节点 → 评估节点 ⟲ 优化节点 → 评估节点
                          ↓
                         end（满意后）
```

**示例：方案迭代优化**

```json
{
  "name": "solution_optimization",
  "nodes": [
    {
      "name": "initial_designer",
      "description": "创建初始方案",
      "system_tools": ["create_file"],
      "input_nodes": ["start"],
      "output_nodes": ["solution_evaluator"]
    },
    {
      "name": "solution_evaluator",
      "description": "评估方案，决定是否需要优化",
      "system_prompt": "评估方案的可行性、完整性和创新性。需要改进使用 transfer_to_optimizer；满意使用 transfer_to_end。",
      "system_tools": ["read_file"],
      "input_nodes": ["initial_designer", "optimizer"],
      "output_nodes": ["optimizer", "end"],
      "handoffs": 3
    },
    {
      "name": "optimizer",
      "description": "根据评估反馈优化方案",
      "system_tools": ["read_file", "update_file"],
      "input_nodes": ["solution_evaluator"],
      "output_nodes": ["solution_evaluator"]
    }
  ]
}
```

---

# 第三部分：创建 Graph 的流程

本部分详细说明如何规范化地创建和优化 Graph，包括使用的工具、交互流程和最佳实践。

## 3.1 Graph Designer 系统工具

在创建 Graph 之前，必须了解 Graph Designer 工具集的功能。

### 可用工具

| 工具名称 | 功能 | 使用场景 |
|---------|------|---------|
| `get_graph_spec` | 获取 Graph 设计规范文档（本文档） | 了解 Graph 的配置参数和设计原则 |
| `export_graph_to_document` | 将已注册的 Graph 导出为 JSON 文档 | 查看现有 Graph 配置，作为设计参考或进行优化 |
| `register_graph_from_document` | 从 JSON 文档注册 Graph 到系统 | 创建新 Graph 或更新现有 Graph |

### 其他辅助工具

在设计 Graph 时，建议配合使用以下工具：

**资源勘探工具（system_operations）：**
- `list_agents_in_category` - 查看可用的 Agent
- `get_agent_details` - 获取 Agent 的详细配置
- `list_all_mcps` - 查看可用的 MCP 服务
- `get_mcp_details` - 获取 MCP 服务的工具列表
- `list_system_tools` - 查看所有系统工具
- `list_all_models` - 查看可用的模型
- `list_all_prompts` - 查看提示词模板
- `get_prompt_content` - 获取提示词模板内容

**文件工具（file_creator）：**
- `create_file` - 创建 Graph 配置文档（必需）
- `read_file` - 读取现有配置
- `update_file` - 小范围修改配置
- `rewrite_file` - 大范围重写配置
- `delete_files` - 删除不需要的配置文档

## 3.2 创建新 Graph 的完整流程

### 第一步：需求确认与资源勘探

在开始设计之前，必须充分了解用户需求和可用资源。

**需求确认清单：**

向用户询问以下关键信息：
- Graph 的主要用途和应用场景是什么？
- 需要完成什么样的任务或工作流？
- 期望的输入是什么？期望的输出是什么？
- 工作流中有哪些关键步骤？步骤间的依赖关系如何？
- 是否需要质量检查、条件分支或迭代优化？
- 是否需要并行处理多个子任务？
- 有什么特殊要求或限制？

**资源勘探清单：**

使用系统工具勘探可用资源：

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

**勘探步骤：**
1. 使用 `list_agents_in_category` 查看相关分类的 Agent
2. 使用 `get_agent_details` 查看候选 Agent 的能力和工具
3. 使用 `list_all_mcps` 查看可用的 MCP 服务
4. 使用 `list_system_tools` 了解可用的系统工具

**只有在用户明确回答需求问题，并完成资源勘探后，才能进入下一步。**

### 第二步：架构设计与方案展示

基于需求和可用资源，设计 Graph 架构。

**架构设计要点：**

1. **节点设计**
   - 确定节点数量和类型
   - 为每个节点定义清晰的职责
   - 选择合适的 Agent 或配置模型
   - 确定每个节点需要的工具和服务
   - 设计节点的提示词和交付清单

2. **连接设计**
   - 确定节点间的输入输出关系
   - 识别需要并行处理的部分
   - 识别需要条件分支或循环的部分
   - 确定 handoffs 的使用位置和次数限制

3. **文档流转设计**（如果使用文档协作）
   - 规划文档的目录结构
   - 确定每个节点负责的文档
   - 定义文档的格式和内容标准
   - 设计文档的版本管理策略

4. **决策逻辑设计**（如果使用 handoffs）
   - 明确每个决策节点的判断标准
   - 设计清晰的流程转移逻辑
   - 设置合理的循环次数限制

**方案展示格式：**

使用文字描述或简单的流程图向用户展示设计方案。

**示例：**

```
# Graph 架构方案：代码开发工作流

## 工作流概述

本 Graph 实现完整的代码开发流程，包括需求分析、代码开发、代码审查和测试。使用基于文档的协作模式和 handoffs 实现质量循环。

## 节点设计

1. **需求分析节点**（requirement_analyst）
   - 职责：分析用户需求，创建需求文档
   - 使用：专业需求分析 Agent
   - 工具：create_file
   - 输入：用户的初始需求描述
   - 输出：requirements/spec.md 文档
   - 流向：代码开发节点

2. **代码开发节点**（code_developer）
   - 职责：根据需求文档开发代码，响应审查反馈
   - 使用：高级编程 Agent
   - 工具：read_file, create_file, update_file
   - 输入：需求文档 + 审查反馈（如果有）
   - 输出：code/main.py 等代码文件
   - 流向：代码审查节点

3. **代码审查节点**（code_reviewer）- 使用 handoffs
   - 职责：审查代码质量，决定通过或返工
   - 使用：代码审查专家 Agent
   - 工具：read_file
   - 输入：代码文件
   - 决策逻辑：
     - 发现问题 → transfer_to_code_developer（附带改进建议）
     - 代码合格 → transfer_to_test_engineer
   - Handoffs 限制：最多返工 3 次

4. **测试工程节点**（test_engineer）
   - 职责：编写和执行测试用例
   - 使用：测试专家 Agent
   - 工具：read_file, create_file
   - 输入：通过审查的代码
   - 输出：tests/ 目录下的测试文件和测试报告
   - 流向：结束

## 流程图

start
  ↓
需求分析节点
  ↓
代码开发节点 ⟲ 代码审查节点（handoffs: 3）
  ↓
测试工程节点
  ↓
end

## 关键设计决策

- 使用文档协作模式，所有工作成果持久化为文档
- 使用 handoffs 实现代码审查-开发的质量循环
- 限制最多返工 3 次，避免无限循环
- 每个节点有明确的交付清单，确保输出质量
```

**等待用户确认后再继续下一步。**

### 第三步：创建配置文档

使用 `create_file` 工具创建 Graph 配置文档。

**文件路径规范：**
- 统一存放在 `graph/` 目录下
- 文件名使用描述性名称，扩展名为 `.json`
- 示例：`graph/code_development_workflow.json`

**配置文档结构：**

```json
{
  "name": "graph_name",
  "description": "Graph 的功能描述",
  "nodes": [
    {
      "name": "node_1",
      "description": "节点功能描述",
      "agent_name": "agent_name",
      "system_tools": ["tool1", "tool2"],
      "mcp_servers": ["mcp1"],
      "max_iterations": 50,
      "input_nodes": ["start"],
      "output_nodes": ["node_2"]
    },
    {
      "name": "node_2",
      "description": "节点功能描述",
      "model_name": "claude-3-5-sonnet-20241022",
      "system_prompt": "系统提示词",
      "user_prompt": "用户提示词，包含占位符：{{node_1}}",
      "system_tools": ["tool3"],
      "input_nodes": ["node_1"],
      "output_nodes": ["end"]
    }
  ],
  "end_template": "最终输出模板：{{node_2}}"
}
```

**关键注意事项：**
- 确保 JSON 格式正确，没有语法错误
- 确保所有必需字段都已填写
- 确保节点名称唯一，不包含特殊字符
- 确保引用的 Agent、模型、工具都存在
- 确保 input_nodes 和 output_nodes 的连接关系正确
- 确保使用 handoffs 的节点有明确的决策逻辑

### 第四步：迭代优化

根据用户反馈进行调整和优化。

**优化流程：**

1. **向用户展示配置**
   - 告知用户配置文档已创建，可以在前端文档管理器中查看和编辑
   - 向用户简要说明配置的关键内容（节点数量、主要流程、特殊设计等）
   - 询问是否需要调整

2. **听取用户反馈**
   - 认真听取用户的每一条反馈
   - 理解用户的关注点和改进建议
   - 确认具体需要修改的内容

3. **执行修改**
   - **小范围修改**：使用 `update_file` 工具进行精确替换
   - **大范围修改**：使用 `rewrite_file` 工具重写整个文件

4. **说明改动**
   - 每次修改后，清晰地向用户说明做了哪些调整
   - 解释修改的原因和预期效果
   - 询问是否还需要进一步调整

5. **持续迭代**
   - 重复步骤 1-4，直到用户满意
   - 确保用户明确表示满意后才进入下一步

**优化的常见场景：**

| 用户反馈 | 优化方案 | 使用工具 |
|---------|---------|---------|
| 需要添加新节点 | 在 nodes 数组中添加新节点配置，更新相关节点的连接 | `update_file` 或 `rewrite_file` |
| 需要修改提示词 | 更新指定节点的 system_prompt 或 user_prompt | `update_file` |
| 需要调整工具配置 | 更新节点的 system_tools 或 mcp_servers | `update_file` |
| 需要改变流程逻辑 | 修改节点的 input_nodes、output_nodes 或 handoffs | `update_file` |
| 需要重新设计架构 | 重新规划节点和连接关系 | `rewrite_file` |

### 第五步：注册 Graph

用户确认满意后，使用 `register_graph_from_document` 注册 Graph。

**注册前检查清单：**

- [ ] 用户明确表示满意，不需要继续修改
- [ ] JSON 格式正确，没有语法错误
- [ ] 所有必需字段都已填写
- [ ] 节点名称唯一且有效
- [ ] 引用的资源（Agent、模型、工具）都存在
- [ ] 节点连接关系合理，没有孤立节点
- [ ] 使用 handoffs 的节点有明确的决策逻辑

**注册命令：**

```json
{
  "tool": "register_graph_from_document",
  "arguments": {
    "file_path": "graph/your_graph_config.json"
  }
}
```

**注册结果：**
- 成功：Graph 已注册到系统，用户可以在界面中看到并使用
- 失败：系统会返回具体的错误信息，根据错误修改配置后重新注册

**注册后的说明：**

向用户说明：
- Graph 已成功注册，名称为 `xxx`
- 用户可以在界面的 Graph 列表中找到并使用
- 如果后续需要修改，可以再次导出-修改-注册

## 3.3 优化已有 Graph 的流程

### 第一步：导出现有配置

使用 `export_graph_to_document` 导出 Graph 配置。

**导出命令：**

```json
{
  "tool": "export_graph_to_document",
  "arguments": {
    "graph_name": "existing_graph_name",
    "target_path": "graph/existing_graph_config.json"
  }
}
```

**导出后：**
- 使用 `read_file` 读取导出的配置
- 向用户简要说明当前的 Graph 结构
- 了解用户希望优化的内容

### 第二步：了解优化需求

询问用户希望优化的具体内容：

**常见优化需求：**
- 添加/删除/修改节点
- 调整节点间的连接关系
- 优化提示词，改进输出质量
- 调整工具配置，增强节点能力
- 添加质量检查和循环机制
- 改进性能或错误处理
- 引入文档协作模式
- 重新设计工作流架构

### 第三步：执行优化

根据用户需求修改配置。

**优化策略：**
- **小范围修改**：使用 `update_file` 精确替换
- **大范围修改**：使用 `rewrite_file` 重写整个配置

**优化示例：**

**场景 1：添加质量检查循环**

原始配置：
```
content_creator → end
```

优化后：
```
content_creator → quality_checker (handoffs) ⟲ content_creator
                                          ↓
                                         end
```

**场景 2：引入文档协作**

为每个节点添加文件工具，并在提示词中添加交付清单。

**场景 3：添加并行处理**

将单个复杂节点拆分为多个专业节点，并行执行后汇聚结果。

### 第四步：迭代优化

与创建新 Graph 的流程相同，根据用户反馈持续优化。

### 第五步：重新注册

用户确认满意后，使用 `register_graph_from_document` 重新注册。

**注意：**重新注册会更新现有的 Graph 配置，不会创建新的 Graph。

## 3.4 交互原则与最佳实践

### 交互原则

1. **需求优先**
   - 在开始设计之前，必须先问清楚用户的具体需求
   - 不要基于假设进行设计，要基于用户的明确需求

2. **资源勘探**
   - 使用系统工具勘探可用的 Agent、MCP 服务和工具
   - 基于实际可用的资源进行设计

3. **架构先行**
   - 完成架构设计后，向用户展示方案
   - 等待用户确认后再开始创建配置文档

4. **反馈驱动**
   - 认真听取用户的每一条反馈
   - 不要忽视任何建议，即使看起来很小

5. **说明改动**
   - 每次修改后，清晰地向用户说明做了哪些调整
   - 解释修改的原因和预期效果

6. **持续优化**
   - 询问用户是否还需要进一步调整
   - 直到用户明确表示满意

7. **谨慎注册**
   - 只在用户明确满意后才注册 Graph
   - 不要滥用注册工具

### 最佳实践

#### 实践 1：渐进式设计

**不要一次性生成完整的 Graph**，而是：
1. 先设计核心流程（3-5 个关键节点）
2. 与用户确认核心流程
3. 逐步添加细节节点和优化机制
4. 每次添加后都与用户确认

#### 实践 2：提供多个方案

当有多种设计选择时，向用户展示不同的方案及其优缺点：

```
## 方案 A：使用 Handoffs 实现质量循环

优点：
- 可以多次迭代优化
- 流程控制灵活

缺点：
- 配置稍复杂
- 需要明确的决策逻辑

## 方案 B：简单的线性流程

优点：
- 配置简单
- 易于理解和维护

缺点：
- 无法迭代优化
- 输出质量依赖单次执行

您希望使用哪个方案？
```

#### 实践 3：验证配置正确性

在注册前，进行基本的配置验证：
- 检查 JSON 语法
- 检查必需字段
- 检查节点连接的完整性
- 检查引用的资源是否存在

#### 实践 4：提供使用说明

注册 Graph 后，向用户说明：
- 如何在界面中找到和使用这个 Graph
- Graph 的输入格式和输出格式
- 使用时的注意事项
- 后续如何优化和修改

## 3.5 常见问题与解决方案

### 问题 1：用户需求不明确

**症状**：用户只说"帮我创建一个 Graph"，没有提供具体需求。

**解决方案**：
- 使用第 3.2 节的需求确认清单，逐项询问
- 提供常见场景的示例，帮助用户明确需求
- 询问用户是否有现有的工作流可以参考

### 问题 2：节点职责不清

**症状**：节点的描述过于宽泛，或者多个节点的职责重叠。

**解决方案**：
- 应用单一职责原则，重新划分节点
- 为每个节点明确定义输入、处理、输出
- 使用文档交付清单明确节点的交付物

### 问题 3：流程逻辑复杂

**症状**：节点间的连接关系复杂，难以理解。

**解决方案**：
- 简化流程，拆分为多个子 Graph
- 使用 handoffs 简化条件分支
- 提供清晰的流程图和说明

### 问题 4：Handoffs 使用不当

**症状**：handoffs 节点没有明确的决策逻辑，或者循环次数设置不合理。

**解决方案**：
- 在提示词中明确决策标准和流程转移逻辑
- 合理设置 handoffs 次数限制（通常 2-5 次）
- 提供明确的退出条件

### 问题 5：文档协作混乱

**症状**：多个节点修改同一文档，导致版本冲突。

**解决方案**：
- 应用单一文档所有者模式
- 使用目录结构组织不同类型的文档
- 明确每个节点负责的文档范围

### 问题 6：工具配置不当

**症状**：节点配置了不需要的工具，或者缺少必要的工具。

**解决方案**：
- 根据节点职责精确配置工具
- 使用 `list_system_tools` 和 `get_mcp_details` 了解工具功能
- 遵循按需配置原则

### 问题 7：提示词质量低

**症状**：提示词过于简单，或者没有明确的输出要求。

**解决方案**：
- 使用结构化的提示词模板
- 添加明确的交付清单
- 提供输出示例和质量标准
- 对于 handoffs 节点，明确决策逻辑

## 3.6 完整示例：创建一个高质量的 Graph

**场景**：创建一个技术博客文章生成 Graph

**第一步：需求确认**

用户需求：
- 根据给定的技术主题，生成一篇高质量的技术博客文章
- 需要包含技术研究、内容撰写、代码示例和质量审查
- 如果质量不达标，需要修改和完善

**第二步：资源勘探**

- Agent：有 `tech_researcher`、`technical_writer`、`code_expert`、`content_editor`
- MCP 服务：有 `web_search`、`github_search`
- 系统工具：可用文件工具、subagent 工具

**第三步：架构设计**

```
# Graph 架构：技术博客生成工作流

## 节点设计

1. 技术研究节点（tech_research）
   - 使用 tech_researcher Agent
   - 工具：web_search, github_search, create_file
   - 输出：research/findings.md

2. 代码示例节点（code_examples）
   - 使用 code_expert Agent
   - 工具：read_file, create_file
   - 输入：研究文档
   - 输出：code/examples.py

3. 文章撰写节点（article_writer）
   - 使用 technical_writer Agent
   - 工具：read_file, create_file
   - 输入：研究文档 + 代码示例
   - 输出：article/draft.md

4. 内容审查节点（content_reviewer）- handoffs
   - 使用 content_editor Agent
   - 工具：read_file
   - 决策：发现问题 → 返回撰写节点；内容合格 → 结束
   - Handoffs：3 次

## 流程图

start → 技术研究 → 代码示例 ↘
                               文章撰写 ⟲ 内容审查（handoffs: 3）
                                             ↓
                                            end
```

**第四步：创建配置**

```json
{
  "name": "tech_blog_generator",
  "description": "生成高质量技术博客文章的完整工作流",
  "nodes": [
    {
      "name": "tech_research",
      "description": "研究技术主题，收集资料和最佳实践",
      "agent_name": "tech_researcher",
      "mcp_servers": ["web_search", "github_search"],
      "system_tools": ["create_file"],
      "max_iterations": 80,
      "input_nodes": ["start"],
      "output_nodes": ["code_examples", "article_writer"]
    },
    {
      "name": "code_examples",
      "description": "基于研究结果创建代码示例",
      "agent_name": "code_expert",
      "system_tools": ["read_file", "create_file"],
      "max_iterations": 50,
      "input_nodes": ["tech_research"],
      "output_nodes": ["article_writer"]
    },
    {
      "name": "article_writer",
      "description": "撰写技术博客文章",
      "agent_name": "technical_writer",
      "system_prompt": "你是技术博客作家，擅长将复杂技术概念转化为易懂的文章。",
      "user_prompt": "基于以下内容撰写技术博客文章：\n\n## 技术研究\n{{tech_research}}\n\n## 代码示例\n{{code_examples}}\n\n## 交付要求\n\n1. **博客文章**\n   - 文件路径：`article/draft.md`\n   - 格式：Markdown\n   - 内容：包含引言、技术背景、实现细节、代码示例、最佳实践、总结\n   - 长度：1500-2000 字\n   - 风格：专业但易懂，面向中高级开发者\n\n## 验收标准\n\n- [ ] 结构清晰，逻辑连贯\n- [ ] 技术内容准确\n- [ ] 代码示例清晰可读\n- [ ] 包含实用的最佳实践\n- [ ] 语言流畅，无错别字",
      "system_tools": ["read_file", "create_file"],
      "max_iterations": 60,
      "input_nodes": ["tech_research", "code_examples", "content_reviewer"],
      "output_nodes": ["content_reviewer"]
    },
    {
      "name": "content_reviewer",
      "description": "审查文章质量，决定通过或修改",
      "agent_name": "content_editor",
      "system_prompt": "你是资深技术内容编辑。审查文章的技术准确性、可读性、结构完整性和实用性。",
      "user_prompt": "请审查以下技术文章：\n\n{{article_writer}}\n\n## 审查标准\n\n- 技术内容准确性\n- 文章结构和逻辑\n- 代码示例质量\n- 语言表达和可读性\n- 实用性和价值\n\n## 流程决策\n\n1. **如果发现明显问题**（技术错误、结构混乱、代码问题）\n   - 使用 transfer_to_article_writer\n   - 详细列出所有问题和改进建议\n\n2. **如果发现轻微问题**（措辞、格式等）\n   - 如果问题较多：transfer_to_article_writer\n   - 如果问题很少：transfer_to_end，并在评审意见中说明\n\n3. **如果文章质量优秀**\n   - 使用 transfer_to_end\n   - 说明文章的优点\n\n请先完成详细审查，然后做出决策。",
      "system_tools": ["read_file"],
      "max_iterations": 30,
      "input_nodes": ["article_writer"],
      "output_nodes": ["article_writer", "end"],
      "handoffs": 3
    }
  ],
  "end_template": "技术博客文章已完成！\n\n{{article_writer}}\n\n编辑评审：\n{{content_reviewer}}"
}
```

**第五步：迭代优化**

- 向用户展示配置
- 根据反馈调整节点配置、提示词和流程
- 持续优化直到用户满意

**第六步：注册 Graph**

```json
{
  "tool": "register_graph_from_document",
  "arguments": {
    "file_path": "graph/tech_blog_generator.json"
  }
}
```

---

# 附录

## A. 快速参考

### Graph 配置必需字段

```json
{
  "name": "必需：Graph 名称",
  "nodes": [
    {
      "name": "必需：节点名称",
      "agent_name": "或 model_name，二选一",
      "model_name": "或 agent_name，二选一"
    }
  ]
}
```

### 常用工具组合

| 场景 | 推荐工具 |
|------|---------|
| 信息收集 | MCP 服务 + `create_file` |
| 内容创作 | `create_file`, `update_file` |
| 质量检查 | `read_file` + handoffs |
| 任务协调 | `agent_task_executor`, `list_agents_in_category`, 文件工具 |
| 迭代优化 | `read_file`, `update_file` + handoffs |

### Handoffs 使用清单

- [ ] 设置了 `handoffs` 参数
- [ ] `output_nodes` 包含多个候选节点
- [ ] 提示词中有明确的决策逻辑
- [ ] 设置了合理的循环次数限制
- [ ] 有明确的退出条件

## B. 术语表

- **Node（节点）**：Graph 中的基本执行单元，代表一个智能体
- **Agent（智能体）**：已注册的可复用智能体配置
- **Handoffs（流程转移）**：动态选择下一个执行节点的机制
- **MCP Server**：Model Context Protocol 服务，提供外部工具
- **System Tools（系统工具）**：MAG 内置的功能工具
- **Subagent（子智能体）**：在节点内调用的其他专业 Agent
- **Placeholder（占位符）**：引用节点输出或提示词模板的语法
- **Conversation（对话）**：Graph 的执行实例，包含所有节点的执行历史
- **Document（文档）**：通过文件工具创建的持久化文件

## C. 设计检查清单

创建 Graph 前，使用此清单检查设计质量：

### 整体设计

- [ ] Graph 有明确的用途和应用场景
- [ ] 工作流程清晰，易于理解
- [ ] 节点数量合理（通常 3-8 个）
- [ ] 有明确的输入和输出

### 节点设计

- [ ] 每个节点有单一、明确的职责
- [ ] 节点名称描述性强
- [ ] 节点有详细的功能描述
- [ ] 配置了必要的工具和服务
- [ ] max_iterations 设置合理

### 连接设计

- [ ] 节点连接关系清晰
- [ ] 没有孤立的节点
- [ ] 并行和串行关系合理
- [ ] Handoffs 使用恰当

### 提示词设计

- [ ] 系统提示词明确定义了角色
- [ ] 用户提示词包含具体的任务指令
- [ ] 包含明确的交付清单
- [ ] 占位符使用正确
- [ ] Handoffs 节点有决策逻辑

### 文档协作

- [ ] 规划了文档目录结构
- [ ] 明确了文档所有者
- [ ] 定义了文档格式和内容标准
- [ ] 避免了文档冲突

### 质量保证

- [ ] 包含质量检查机制
- [ ] 有明确的验收标准
- [ ] 设置了合理的循环限制
- [ ] 有错误处理机制

---

**本规范的目标是帮助 Agent 设计高质量、可维护、高效的 Graph。通过遵循本规范，Agent 可以充分利用 MAG 的强大能力，构建复杂的多智能体协作系统。**
