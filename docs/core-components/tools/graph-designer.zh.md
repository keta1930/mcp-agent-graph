# Graph Designer（工作流设计器）

通过人机协作和迭代优化，设计并创建多智能体工作流。

## 核心能力

Graph Designer 通过对话提供引导式工作流设计:

| 能力 | 优势 | 示例 |
|------|------|------|
| **需求收集** | Agent 询问问题以理解工作流需求 | 用户说"自动化代码审查" → Agent 询问步骤、质量检查、工具 |
| **规范指导** | 提供完整设计规范，解释所有参数 | 了解节点配置、连接、handoffs、占位符和设计模式 |
| **配置文件化** | 工作流设计为 JSON 文件,用户可审查和编辑 | 在对话中创建 `graph/code_review_workflow.json`,文件系统中可见 |
| **导出现有工作流** | 研究成功工作流的配置 | 导出 `research_pipeline` 学习多阶段工作流模式 |
| **迭代优化** | 根据反馈修改设计直到满意 | 草稿 → 用户反馈 → 调整 → 重复直到完美 |

## 为什么使用 Graph Designer

- 通过自然语言对话设计工作流
- Agent 询问问题以理解需求
- 提供规范解释所有配置选项
- 可参考现有工作流的模式
- 基于反馈迭代改进

**协作模式:**

1. 用户用自然语言描述期望的工作流
2. Graph Designer 询问澄清问题(阶段、工具、质量检查)
3. 获取规范以理解所有配置选项
4. 基于用户需求设计工作流配置
5. 创建 JSON 文件供用户审查
6. 用户提供反馈,Agent 调整设计
7. 重复直到用户批准
8. 将最终工作流注册到系统

## 可用操作

| 操作 | 目的 | 何时使用 |
|------|------|---------|
| `get_graph_spec` | 获取完整工作流设计规范 | 开始新工作流,了解参数和模式 |
| `export_graph_to_document` | 导出现有工作流配置到 JSON 文件 | 学习成功工作流或创建变体 |
| `register_graph_from_document` | 将工作流设计保存到系统 | 用户批准最终配置后 |

**注意:** Graph Designer 与文件工具配合使用,创建/编辑 JSON 配置文件。

## 常见工作流

### 创建新工作流

| 阶段 | 动作 | 详情 |
|------|------|------|
| 1. 需求 | Agent 询问问题 | "什么阶段?"、"需要质量检查?"、"哪些工具?"、"并行处理?" |
| 2. 规范 | 获取设计指南 | `get_graph_spec` 检索节点配置、连接、handoffs、占位符 |
| 3. 设计 | 起草配置 | Agent 设计节点、连接、提示词、工具分配 |
| 4. 审查 | 创建文件并讨论 | `create_file("graph/review_workflow.json", ...)` → 用户审查设计 |
| 5. 优化 | 根据反馈迭代 | 用户:"添加迭代循环" → Agent 用 `update_file` 更新 |
| 6. 注册 | 保存到系统 | 用户批准 → `register_graph_from_document("graph/review_workflow.json")` |

### 优化现有工作流

| 阶段 | 动作 | 详情 |
|------|------|------|
| 1. 导出 | 获取当前配置 | `export_graph_to_document("code_pipeline")` → 创建 `graph/code_pipeline.json` |
| 2. 审查 | 用户确定更改 | "添加质量检查循环"、"改进提示词" |
| 3. 修改 | 更新配置 | Agent 用 `update_file` 或 `rewrite_file` 编辑 JSON |
| 4. 优化 | 迭代直到满意 | 多轮用户反馈和调整 |
| 5. 更新 | 重新注册 | `register_graph_from_document("graph/code_pipeline.json")` → 更新工作流 |

### 创建工作流变体

| 阶段 | 动作 | 结果 |
|------|------|------|
| 1. 导出基础 | `export_graph_to_document("research_workflow")` | `graph/research_workflow.json` |
| 2. 复制 | `create_file("graph/analysis_workflow.json")` | 研究工作流配置的副本 |
| 3. 定制 | 修改不同领域 | 更改节点指令、工具、连接 |
| 4. 注册 | `register_graph_from_document("graph/analysis_workflow.json")` | 新的分析工作流 |


## 人机协作

### Agent 职责

- 设计前询问澄清问题
- 清晰解释配置选项
- 注册前展示草稿供审查
- 倾听反馈并相应调整
- 确保用户满意后再最终确定

## 与其他工具集成

**+ 文件工具:** 工作流可交付成果作为文件管理
- 节点使用 `create_file`、`update_file` 输出
- 工作流阶段间的结构化交接
- 所有可交付成果的版本历史

**+ Sub-agent:** 工作流可在节点内使用子智能体
- 节点委托子任务给专家
- 结合工作流编排和任务委托
- 清晰的关注点分离

**+ Agent Creator:** 为工作流节点设计专家
- 创建领域特定 Agent
- 在工作流节点中引用它们
- 跨工作流的一致能力

## 相关文档

- [文件工具](file-tool.zh.md) - 管理工作流可交付成果
- [Sub-agent](sub-agent.zh.md) - 在节点内委托任务
- [Agent 配置](../agent/config.zh.md) - 配置工作流节点
- [Graph 执行](../graph/execution.zh.md) - 工作流如何运行
- [Handoffs](../graph/handoffs.zh.md) - 动态流程控制
