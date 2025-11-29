# Prompt Generator（提示词生成器）

通过人机协作创建可复用的高质量提示词模板，可在 Agents 和工作流中引用。

## 为什么使用 Prompt Generator

- 集中的提示词库
- 一致的结构和质量
- 通过占位符引用轻松复用
- 在一处迭代和改进提示词

**协作模式：**

1. 用户描述需要的提示词模板
2. Agent 询问使用场景、受众、预期输出
3. 获取规范以理解结构指南
4. 设计包含清晰部分的提示词（角色、任务、需求、格式）
5. 创建 Markdown 文件供用户审查
6. 用户提供反馈，Agent 优化
7. 重复直到批准
8. 使用分类注册提示词以便组织

## 可用操作

| 操作 | 目的 | 何时使用 |
|------|------|---------|
| `get_prompt_spec` | 获取提示词设计规范 | 开始新提示词以学习结构指南 |
| `export_prompt_to_document` | 导出现有提示词到 Markdown 文件 | 研究成功提示词或创建变体 |
| `register_prompt` | 将提示词模板保存到系统 | 用户批准最终版本后 |

**注意：** Prompt Generator 与文件工具配合使用，创建/编辑 Markdown 文件。

## 常见工作流

### 创建新提示词

| 阶段 | 动作 | 详情 |
|------|------|------|
| 1. 理解 | Agent 询问问题 | "这个提示词指导什么任务？"、"受众是谁？"、"什么输出格式？" |
| 2. 学习 | 获取规范 | `get_prompt_spec` 检索结构指南和质量检查清单 |
| 3. 设计 | 起草结构化提示词 | 创建部分：角色、任务、需求、输出格式、注意事项 |
| 4. 审查 | 创建文件并讨论 | `create_file("prompt/data_analysis.md", ...)` → 用户审查结构 |
| 5. 优化 | 根据反馈迭代 | 用户："添加示例" → Agent 用 `update_file` 更新 |
| 6. 注册 | 保存并分类 | 用户批准 → `register_prompt("prompt/data_analysis.md", category="analysis")` |

### 优化现有提示词

| 阶段 | 动作 | 详情 |
|------|------|------|
| 1. 导出 | 获取当前内容 | `export_prompt_to_document("code_review")` → 创建 `prompt/code_review.md` |
| 2. 审查 | 用户确定改进 | "让需求更具体"、"添加输出示例" |
| 3. 修改 | 更新 Markdown | Agent 用 `update_file` 或 `rewrite_file` 编辑 |
| 4. 优化 | 迭代直到满意 | 多轮反馈和调整 |
| 5. 更新 | 重新注册 | `register_prompt("prompt/code_review.md", category="coding")` → 更新现有 |

### 创建提示词变体

| 阶段 | 动作 | 结果 |
|------|------|------|
| 1. 导出基础 | `export_prompt_to_document("python_review")` | `prompt/python_review.md` |
| 2. 复制 | `create_file("prompt/javascript_review.md")` | Python 审查提示词的副本 |
| 3. 定制 | 修改语言特定部分 | 为 JavaScript 调整需求、示例 |
| 4. 注册 | `register_prompt("prompt/javascript_review.md", category="coding")` | 新的 JavaScript 审查提示词 |

## 与其他工具集成

**+ 文件工具：** 提示词是用文件操作管理的 Markdown 文件
- `create_file` 创建初始草稿
- `read_file` 审查当前内容
- `update_file` 针对性编辑
- `rewrite_file` 重大修订

**+ Agent Creator：** 在 Agent 指令中包含提示词
- 在 `instruction` 字段中使用注册的提示词

**+ Graph Designer：** 在节点配置中使用提示词
- 通过 `{{@prompt_name}}` 占位符注入模板

## 相关文档

- [文件工具](file-tool.zh.md) - 管理提示词 Markdown 文件
- [Agent 配置](../agent/config.zh.md) - 在 Agent 指令中使用提示词
- [Graph 配置](../graph/config.zh.md) - 在 Graph 节点中引用提示词
