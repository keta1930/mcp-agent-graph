# 导入 Agent

批量导入 Agent 配置，支持多种文件格式。导入时会自动验证配置，已存在的 Agent 会被更新并自动备份。

## 支持格式

| 格式 | 扩展名 | 适用场景 |
|------|--------|---------|
| **JSON** | `.json` | 单个或少量 Agent，易于手动编辑 |
| **JSONL** | `.jsonl` | 大量 Agent，逐行处理 |
| **Excel** | `.xlsx`, `.xls` | 非技术用户，表格编辑 |
| **Parquet** | `.parquet` | 数据分析场景，高效存储 |

## JSON 格式

### 单个 Agent

```json
{
  "name": "code-reviewer",
  "card": "审查代码质量和安全性",
  "model": "claude-sonnet-4.5",
  "category": "编程",
  "instruction": "专注于代码质量、安全性和最佳实践",
  "max_actions": 30,
  "mcp": ["github"],
  "system_tools": ["code_analyzer"],
  "tags": ["代码", "审查"]
}
```

### 多个 Agent

```json
[
  {
    "name": "code-reviewer",
    "card": "审查代码质量和安全性",
    "model": "claude-sonnet-4.5",
    "category": "编程"
  },
  {
    "name": "data-analyst",
    "card": "分析数据并生成图表",
    "model": "gpt-5",
    "category": "分析"
  }
]
```

## JSONL 格式

每行一个 Agent 配置：

```jsonl
{"name": "code-reviewer", "card": "审查代码质量", "model": "claude-sonnet-4.5", "category": "编程"}
{"name": "data-analyst", "card": "分析数据", "model": "gpt-5", "category": "分析"}
{"name": "doc-writer", "card": "生成技术文档", "model": "deepseek-v3", "category": "写作"}
```

## Excel 格式

### 列定义

| 列名 | 必填 | 说明 | 示例 |
|------|------|------|------|
| **name** | 是 | Agent 名称 | `code-reviewer` |
| **card** | 是 | 简要描述 | `审查代码质量` |
| **model** | 是 | 模型名称 | `claude-sonnet-4.5` |
| **category** | 是 | 分类 | `编程` |
| **instruction** | 否 | 系统提示词 | `专注于代码质量` |
| **max_actions** | 否 | 最大步数 | `30` |
| **mcp** | 否 | MCP 服务器（逗号分隔） | `github,gitlab` |
| **system_tools** | 否 | 系统工具（逗号分隔） | `code_analyzer,linter` |
| **tags** | 否 | 标签（逗号分隔） | `代码,审查,质量` |

### 示例表格

| name | card | model | category | instruction | max_actions | mcp | system_tools | tags |
|------|------|-------|----------|-------------|-------------|-----|--------------|------|
| code-reviewer | 审查代码质量 | claude-sonnet-4.5 | 编程 | 专注于代码质量 | 30 | github | code_analyzer | 代码,审查 |
| data-analyst | 分析数据 | gpt-5 | 分析 | 数据分析专家 | 50 | database | data_tools | 数据,分析 |

## Parquet 格式

与 Excel 格式相同的列定义，但使用 Parquet 文件格式存储。列表字段（`mcp`、`system_tools`、`tags`）可以是：
- 逗号分隔的字符串：`"github,gitlab"`
- 数组类型：`["github", "gitlab"]`

## 导入行为

| 情况 | 处理方式 |
|------|---------|
| **新 Agent** | 直接创建 |
| **已存在** | 自动备份原配置，然后更新 |
| **配置无效** | 跳过该 Agent，继续处理其他 |
| **模型不存在** | 导入失败，提示错误 |
| **MCP 服务器不存在** | 导入失败，提示错误 |

### 备份命名

更新时自动创建备份：`{原名称}_backup_{时间戳}`

**示例：** `code-reviewer` → `code-reviewer_backup_20241201_143022`

## 导入结果

导入完成后显示统计信息：

| 统计项 | 说明 |
|--------|------|
| **创建** | 新创建的 Agent 数量 |
| **更新** | 更新的 Agent 数量（含备份） |
| **失败** | 导入失败的 Agent 数量 |

每个 Agent 的详细结果包含：
- 名称
- 状态（创建/更新/失败）
- 错误信息（如果失败）
- 备份名称（如果更新）

## 注意事项

- 文件必须使用 UTF-8 编码
- 必填字段不能为空
- 模型和 MCP 服务器必须提前配置
- 导入前建议先导出现有配置作为备份
- 大文件建议使用 JSONL 或 Parquet 格式

## 下一步

- **[Agent 配置](config.zh.md)** - 了解配置字段详情
- **[构建第一个 Agent](first-agent.zh.md)** - 手动创建 Agent
- **[模型管理](../model/index.zh.md)** - 配置可用模型
