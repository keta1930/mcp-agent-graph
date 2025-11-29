# Prompt Center

创建、组织和复用 Prompt 模板的中心化库,可用于 Agent 和工作流。

## 什么是 Prompt Center

Prompt Center 存储可复用的 Prompt 模板,可在 Agent 配置和 Graph 节点中引用。无需重复编写,创建一次即可处处使用。

## 核心操作

| 操作 | 用途 | 示例 |
|------|------|------|
| **创建** | 添加新的 Prompt 模板 | 编写带评审标准的"代码审查模板" |
| **编辑** | 更新现有模板 | 优化输出格式要求 |
| **组织** | 按分类分组 | `coding`、`analysis`、`writing` |
| **导入/导出** | 分享或备份 Prompt | 导出模板供团队共享 |
| **引用** | 在配置中使用 | 在 Agent 指令中使用 `{{@code_review}}` |

## 为什么使用 Prompt Center

- 编写一次,处处引用
- 单处更新
- 按分类组织
- 易于分享和备份

## Prompt 结构

每个 Prompt 包含:

| 字段 | 用途 | 示例 |
|------|------|------|
| **名称** | 唯一标识符 | `code_review` |
| **分类** | 组织分组 | `coding` |
| **内容** | Prompt 模板文本 | 角色、任务、要求、格式 |

**分类使用字母数字格式:** 字母、数字、连字符、下划线(如 `data-analysis`、`code_review`、`writing_assistant`)

## 使用 Prompt

### 在 Agent 配置中

在 Agent 指令中引用 Prompt

### 在 Graph 节点中

在节点配置中注入 Prompt:

```json
{
  "node_id": "review",
  "agent": "reviewer",
  "prompt": "{{@code_review}}\n\n代码: {{input}}"
}
```

系统自动将 `{{@prompt_name}}` 替换为实际的 Prompt 内容。

## 常用工作流

### 创建 Prompt

1. 点击**创建**按钮
2. 输入名称和分类
3. 编写 Prompt 内容
4. 保存模板

### 组织 Prompt

Prompt 在界面中自动按分类分组。使用分类按以下方式组织:

- 领域: `coding`、`data`、`writing`
- 任务类型: `review`、`analysis`、`generation`
- 团队: `frontend`、`backend`、`qa`

### 导入 Prompt

1. 点击**导入**按钮
2. 选择文本/Markdown 文件
3. 指定名称和分类
4. 确认添加

### 分享 Prompt

1. 定位要导出的 Prompt
2. 使用导出功能创建归档文件
3. 与团队分享文件
4. 接收者导入到自己的工作区

## 与工具集成

**Prompt Generator 工具**通过引导式对话帮助创建结构良好的 Prompt:

- 获取 Prompt 结构指南规范
- 设计带清晰章节的 Prompt(角色、任务、要求、格式)
- 导出现有 Prompt 进行优化
- 注册带分类的 Prompt

详见 [Prompt Generator](../tools/prompt-generator.zh.md) 了解协作式 Prompt 创建。

## 相关文档

- [创建和编辑 Prompt](create-edit.zh.md) - 详细的 Prompt 管理
- [与 Agent 协作](work-with-agents.zh.md) - 在 Agent 配置中使用 Prompt
- [Prompt Generator 工具](../tools/prompt-generator.zh.md) - 协作式 Prompt 创建
