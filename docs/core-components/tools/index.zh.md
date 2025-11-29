# 内置工具

为 Agent 提供扩展系统能力的工具集。

## 什么是内置工具

内置工具是平台为 Agent 预置的能力增强工具，使 Agent 能够执行超越基础对话的操作。Agent 通过这些工具可以创建资源、管理文件、调用其他 Agent 协作，实现复杂的自动化任务。

内置工具与 MCP 服务器的区别：

| 对比项 | 内置工具 | MCP 服务器 |
|--------|---------|-----------|
| **来源** | 平台预置 | 外部扩展 |
| **配置** | 直接选用 | 需先注册服务器 |
| **用途** | 管理平台资源 | 连接外部数据和服务 |

## 工具分类

### 资源创建工具

帮助 Agent 创建和管理平台核心资源。

| 工具 | 功能 | 典型场景 |
|------|------|---------|
| [Agent Creator](agent-creator.zh.md) | 创建和配置新 Agent | 根据需求设计专业 Agent |
| [Graph Designer](graph-designer.zh.md) | 设计多智能体工作流 | 构建复杂协作系统 |
| [MCP Builder](mcp-builder.zh.md) | 构建 MCP 工具服务器 | 扩展外部能力 |
| [Prompt Generator](prompt-generator.zh.md) | 创建提示词模板 | 统一管理可复用提示词 |
| [Task Manager](task-manager.zh.md) | 设置定时任务 | 实现工作流自动化执行 |

### 协作工具

使 Agent 能够调用其他 Agent 或管理对话文件。

| 工具 | 功能 | 典型场景 |
|------|------|---------|
| [Sub-agent](sub-agent.zh.md) | 委托任务给专业 Agent | 多 Agent 协作处理复杂任务 |
| [File Tool](file-tool.zh.md) | 管理对话中的文件 | 创建结构化文档体系 |

### 记忆与查询工具

提供持久化存储和系统资源查询能力。

| 工具 | 功能 | 典型场景 |
|------|------|---------|
| [Memory Tool](memory-tool.zh.md) | 存储用户偏好和 Agent 经验 | 跨对话保持连续性 |
| [System Operations](system-operations.zh.md) | 查询系统资源和配置 | 了解可用模型和工具 |

## 工具使用方式

Agent 配置时选择需要的工具：

```mermaid
graph LR
    A[配置 Agent] --> B[选择模型]
    B --> C[选择 MCP 服务]
    C --> D[选择内置工具]
    D --> E[设置提示词]
```

工具会根据 Agent 当前语言自动显示对应描述，Agent 可以在对话中调用工具完成任务。

## 下一步

**资源创建：**
- [Agent Creator](agent-creator.zh.md) - 创建专业 Agent
- [Graph Designer](graph-designer.zh.md) - 设计工作流
- [MCP Builder](mcp-builder.zh.md) - 构建 MCP 工具
- [Prompt Generator](prompt-generator.zh.md) - 管理提示词
- [Task Manager](task-manager.zh.md) - 设置定时任务

**协作与文件：**
- [Sub-agent](sub-agent.zh.md) - 多 Agent 协作
- [File Tool](file-tool.zh.md) - 文件管理

**记忆与查询：**
- [Memory Tool](memory-tool.zh.md) - 持久化记忆
- [System Operations](system-operations.zh.md) - 系统查询
