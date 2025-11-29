# 快速开始

## 管理员：团队管理

**位置：** 管理面板（用户菜单 → 管理）

作为管理员，你的首要任务是团队设置：

### 1. 创建邀请码

邀请团队成员加入平台：

**了解更多：** [创建邀请码](../core-components/team/invite-code.zh.md)

### 2. 管理团队成员

控制团队访问权限：

**了解更多：** [管理团队](../core-components/team/manage.zh.md)

---

## 用户：开始使用

登录后，探索预配置的资源并学习平台：

### 可用资源

系统提供即用型资源：

| 资源 | 数量 | 你可以做什么 |
|-----|------|-------------|
| **欢迎对话** | 1 | 交互式教程展示核心功能 |
| **LLM 模型** | 7 | 预配置模型（添加你的 API Key）|
| **创建器 Agent** | 5 | 帮助创建 Agent、Graph、Prompt、Task，查看资源 |
| **演示工作流** | 1 | 多 Agent 协作示例 Graph |
| **欢迎提示词** | 1 | 基础系统提示词模板 |

### 1. 从欢迎对话开始

欢迎对话通过示例教学:

| 轮次 | 主题 | 演示内容 |
|-----|------|---------|
| 1 | 系统概览 | Agent、Graph、工具、记忆功能 |
| 2 | Subagent 演示 | Agent 委托文件创建任务 |
| 3 | 记忆演示 | 存储和检索用户偏好 |
| 4 | 文件系统 | 文件作为协作机制 |
| 5 | 下一步 | 准备开始构建 |

**包含文件:** `WELCOME.md` - 快速参考指南

### 2. 添加你的 API Key

预配置模型需要你的 API Key：

| 模型 | 提供商 | 获取密钥 |
|-----|--------|---------|
| claude-sonnet-4-5 | Anthropic | https://console.anthropic.com |
| gpt-5 | OpenAI | https://platform.openai.com |
| gemini-2-5-flash | Google | https://aistudio.google.com |
| deepseek-v3-2-exp | DeepSeek | https://platform.deepseek.com |
| qwen3-235b-a22b-thinking-2507 | 阿里云 | https://dashscope.aliyun.com |
| kimi-k2-turbo-preview | Moonshot | https://platform.moonshot.cn |
| MiniMax-M2 | MiniMax | https://platform.minimaxi.com |

**步骤:**
1. 点击模型进行编辑
2. 用实际 API Key 替换占位符
3. 保存

只需一个可用模型即可开始。

### 3. 尝试演示工作流

运行 `welcome-workflow` 图:

1. 选择该图
2. 点击运行(输入可选)
3. 观察工作流执行

**执行过程:**

| 节点 | 动作 | 使用工具 |
|-----|------|---------|
| greeter | 创建欢迎文档 | `create_file` |
| checker | 验证完整性 | `read_file` + handoffs |
| finalizer | 添加系统信息 | `update_file` |

**结果:** 生成 `WELCOME.md` 文件，展示多节点协作

### 4. 使用创建器 Agent

预配置 Agent 通过对话帮助构建:

| Agent | 用途 | 示例请求 |
|------|------|---------|
| agent-creator | 创建 Agent | "设计一个代码审查 Agent" |
| graph-creator | 设计工作流 | "创建数据分析流程图" |
| prompt-creator | 管理提示词 | "创建博客写作提示词" |
| task-creator | 计划任务 | "创建每日摘要任务" |
| system-resource-viewer | 浏览资源 | "有哪些可用模型?" |

**使用方法:**
1. 在聊天设置(⚙️)中启用 `agent_task_executor`
2. 询问: "使用 agent-creator 设计..."
3. 遵循 Agent 指导

## 下一步

| 学习内容 | 文档 |
|---------|------|
| Agent 基础 | [Agent](../core-components/agent/index.zh.md) |
| Agent 配置 | [配置](../core-components/agent/config.zh.md) |
| 工作流图 | [Graph](../core-components/graph/index.zh.md) |
| 外部工具 | [MCP](../core-components/mcp/index.zh.md) |
| 系统工具 | [工具](../core-components/tools/index.zh.md) |
| 记忆系统 | [记忆](../core-components/memory/index.zh.md) |

## 故障排查

| 问题 | 解决方案 |
|-----|---------|
| "模型未配置" | 在模型管理器中添加 API Key |
| "工具不可用" | 在聊天设置(⚙️)中启用该工具 |
| Graph 执行失败 | 检查节点模型是否有有效的 API Key |
| Subagent 不工作 | 在系统工具中启用 `agent_task_executor` |
