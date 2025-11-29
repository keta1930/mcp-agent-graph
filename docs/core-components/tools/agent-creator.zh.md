# Agent Creator（智能体创建器）

通过人机协作和迭代优化，设计并创建专业的 Agent。

## 核心能力

Agent Creator 通过对话提供引导式 Agent 设计：

| 能力 | 优势 | 示例 |
|------|------|------|
| **需求收集** | Agent 询问问题以理解需求 | 用户说"创建编程 Agent" → Agent 询问语言、工具、使用场景 |
| **规范指导** | 提供完整设计规范，解释所有参数 | 了解 `instruction`、`max_actions`、`mcp` 等字段的含义和配置方法 |
| **配置文件化** | Agent 设计为 JSON 文件，用户可审查和编辑 | 在对话中创建 `agent/code_reviewer.json`，文件系统中可见 |
| **导出现有 Agent** | 研究成功 Agent 的配置 | 导出 `data_analyst` 配置，学习如何设计新的分析 Agent |
| **迭代优化** | 根据反馈修改设计直到满意 | 草稿 → 用户反馈 → 调整 → 重复直到完美 |

**协作模式：**

1. 用户用自然语言表达需求
2. Agent Creator 询问澄清问题（语言、工具、场景）
3. 获取规范以理解所有配置选项
4. 基于用户需求设计 Agent 配置
5. 创建 JSON 文件供用户审查
6. 用户提供反馈，Agent 调整设计
7. 重复直到用户批准
8. 将最终 Agent 注册到系统

## 可用操作

| 操作 | 目的 | 何时使用 |
|------|------|---------|
| `get_agent_spec` | 获取完整 Agent 设计规范 | 开始新 Agent 设计，了解参数 |
| `export_agent_to_document` | 导出现有 Agent 配置到 JSON 文件 | 学习成功 Agent 或创建变体 |
| `register_agent` | 将 Agent 设计保存到系统 | 用户批准最终配置后 |

**注意：** Agent Creator 与文件工具配合使用，创建/编辑 JSON 配置文件。

## 常见工作流

### 创建新 Agent

| 阶段 | 动作 | 详情 |
|------|------|------|
| 1. 需求 | Agent 询问问题 | "这个 Agent 要执行什么任务？"、"需要什么工具？"、"用哪个模型？" |
| 2. 规范 | 获取设计指南 | `get_agent_spec` 检索参数解释和示例 |
| 3. 设计 | 起草配置 | Agent 设计 `card`、`instruction`，选择 `model`、`tools`、`category` |
| 4. 审查 | 创建文件并讨论 | `create_file("agent/reviewer.json", ...)` → 用户审查设计 |
| 5. 优化 | 根据反馈迭代 | 用户："添加 Python 重点" → Agent 用 `update_file` 更新 |
| 6. 注册 | 保存到系统 | 用户批准 → `register_agent("agent/reviewer.json")` |

### 优化现有 Agent

| 阶段 | 动作 | 详情 |
|------|------|------|
| 1. 导出 | 获取当前配置 | `export_agent_to_document("code_analyzer")` → 创建 `agent/code_analyzer.json` |
| 2. 审查 | 用户确定更改 | "让它更详细"、"添加安全重点" |
| 3. 修改 | 更新配置 | Agent 用 `update_file` 或 `rewrite_file` 编辑 JSON |
| 4. 优化 | 迭代直到满意 | 多轮用户反馈和调整 |
| 5. 更新 | 重新注册 | `register_agent("agent/code_analyzer.json")` → 更新现有 Agent |

### 创建 Agent 变体

| 阶段 | 动作 | 结果 |
|------|------|------|
| 1. 导出基础 | `export_agent_to_document("python_expert")` | `agent/python_expert.json` |
| 2. 复制 | `create_file("agent/javascript_expert.json")` | Python 专家配置的副本 |
| 3. 定制 | 修改语言特定细节 | 为 JavaScript 更改 instruction、tools、tags |
| 4. 注册 | `register_agent("agent/javascript_expert.json")` | 新的 JavaScript 专家 Agent |

## 设计原则

规范指导 Agent 遵循这些原则：

**清晰的能力：** Agent 应有明确定义的目的和范围

**详细描述：** `card` 字段解释 Agent 做什么以及何时使用

**精确指令：** `instruction` 准确定义 Agent 的角色和行为

**合适的工具：** 选择与 Agent 领域匹配的工具（审查者用代码工具，分析师用文件工具）

**语义化命名：** 清晰的名称和标签帮助发现

**合理限制：** 根据任务复杂度设置 `max_actions`

## 与其他工具集成

**+ 文件工具：** Agent 配置是用文件操作管理的 JSON 文件
- `create_file` 创建初始设计
- `read_file` 审查当前配置
- `update_file` 针对性更改
- `rewrite_file` 重大修订

**+ Sub-agent：** 创建的 Agent 可通过 Sub-agent 工具使用
- 设计专业 Agent
- 委托任务给它们
- 根据性能迭代其配置

## 相关文档

- [文件工具](file-tool.zh.md) - 管理 Agent 配置文件
- [Sub-agent](sub-agent.zh.md) - 使用创建的 Agent 进行委托
- [Agent 配置](../agent/config.zh.md) - 详细配置参考
