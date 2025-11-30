# Agent Skills 与上下文工程

引入 Anthropic 提出的 Agent Skills 机制，通过渐进式信息披露提升 Agent 能力和效率。

## 什么是 Agent Skills

Agent Skills 是 Anthropic 在 2025 年提出的上下文工程实现方式，让 Agent 能够按需加载专业化的指令、脚本和资源。

### 核心理念

**渐进式信息披露（Progressive Disclosure）**

像一本组织良好的手册，从目录开始，然后是具体章节，最后到详细附录——Skills 让 Claude 仅在需要时加载信息，而不是一次性加载所有内容。

### 工作原理

| 特性 | 说明 |
|------|------|
| 文件夹组织 | Skills 是包含指令、脚本和资源的文件夹 |
| 按需加载 | 仅在需要时加载相关 Skill，减少上下文开销 |
| 可组合性 | 多个 Skills 可以组合使用，满足复杂需求 |
| 专业能力 | 为特定任务提供深度专业化的能力 |

## 规划方向

平台将探索集成 Agent Skills 机制：

### 可能的能力

- **Skills 库**：预置常用的专业技能包（如 Excel 处理、数据分析、文档生成）
- **自定义 Skills**：用户创建和管理自己的技能包
- **Skills 共享**：在团队内分享和复用 Skills
- **智能加载**：根据任务自动选择和组合 Skills

### 预期价值

| 价值 | 说明 |
|------|------|
| **效率提升** | 按需加载减少上下文长度，降低成本和延迟 |
| **能力扩展** | 快速为 Agent 添加专业领域能力 |
| **标准化** | 将最佳实践封装为可复用的 Skills |

## 了解更多

Agent Skills 和上下文工程是 AI Agent 发展的重要方向：

- [Anthropic: Agent Skills 介绍](https://www.anthropic.com/news/skills)
- [为真实世界配备 Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [AI Agent 的有效上下文工程](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Claude Agent Skills 文档](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)

---

*Agent Skills 将为平台带来更强大、更高效的专业化 Agent 能力。*
