# MAG (MCP Agent Graph) 图设计规范

## 概述

MAG是一个强大的多智能体工作流系统，通过节点和连接构建复杂的智能体协作流程。每个节点代表一个专门的智能体，节点间的连接决定信息流向和执行顺序。本文档提供完整的Graph配置规范、JSON Schema说明、节点配置示例和设计最佳实践。

## Graph配置JSON Schema

### 完整Schema定义

```json
{
  "type": "object",
  "required": ["name", "nodes"],
  "properties": {
    "name": {
      "type": "string",
      "description": "图的唯一名称，用于标识和引用该图",
      "pattern": "^[a-zA-Z0-9_-]+$"
    },
    "description": {
      "type": "string",
      "description": "图的功能描述，说明该图的用途和目标"
    },
    "nodes": {
      "type": "array",
      "description": "包含所有节点配置的数组",
      "minItems": 1,
      "items": {
        "$ref": "#/definitions/node"
      }
    },
    "end_template": {
      "type": "string",
      "description": "最终输出格式模板，使用占位符引用节点输出"
    }
  },
  "definitions": {
    "node": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": {
          "type": "string",
          "description": "节点的唯一标识符，在图中必须唯一"
        },
        "description": {
          "type": "string",
          "description": "节点功能的详细描述"
        },
        "model_name": {
          "type": "string",
          "description": "使用的AI模型名称（普通节点必需）"
        },
        "mcp_servers": {
          "type": "array",
          "description": "节点可使用的MCP服务列表",
          "items": {
            "type": "string"
          }
        },
        "system_prompt": {
          "type": "string",
          "description": "系统提示词，定义智能体的角色和能力"
        },
        "user_prompt": {
          "type": "string",
          "description": "用户提示词，包含具体任务指令"
        },
        "save": {
          "type": "string",
          "description": "输出自动保存的文件格式扩展名（如md、html、py）"
        },
        "input_nodes": {
          "type": "array",
          "description": "提供输入的节点名称列表，'start'表示接收用户输入",
          "items": {
            "type": "string"
          }
        },
        "output_nodes": {
          "type": "array",
          "description": "接收本节点输出的节点名称列表，'end'表示输出到最终结果",
          "items": {
            "type": "string"
          }
        },
        "handoffs": {
          "type": "integer",
          "description": "节点可以重定向流程的最大次数",
          "minimum": 0
        },
        "output_enabled": {
          "type": "boolean",
          "description": "是否在响应中包含输出",
          "default": true
        },
        "is_subgraph": {
          "type": "boolean",
          "description": "是否为子图节点",
          "default": false
        },
        "subgraph_name": {
          "type": "string",
          "description": "子图名称（仅当is_subgraph为true时需要）"
        },
        "position": {
          "type": "object",
          "description": "节点在可视化界面中的位置",
          "properties": {
            "x": {"type": "number"},
            "y": {"type": "number"}
          }
        },
        "level": {
          "type": "integer",
          "description": "节点在执行层级中的位置"
        }
      }
    }
  }
}
```

## 节点配置参数详解

### 核心参数

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `name` | string | 是 | - | 节点的唯一标识符，避免使用特殊字符(/, \\, .) |
| `description` | string | 否 | `""` | 节点功能的详细描述 |
| `model_name` | string | 是* | - | 使用的AI模型名称（普通节点必需） |
| `mcp_servers` | string[] | 否 | `[]` | 可使用的MCP服务名称列表 |
| `system_prompt` | string | 否 | `""` | 系统提示词，定义智能体角色 |
| `user_prompt` | string | 否 | `""` | 用户提示词，包含任务指令 |
| `save` | string | 否 | `null` | 输出自动保存的文件格式（如md、html、py） |

### 连接参数

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `input_nodes` | string[] | 否 | `[]` | 提供输入的节点列表，`"start"`表示用户输入 |
| `output_nodes` | string[] | 否 | `[]` | 接收输出的节点列表，`"end"`表示最终输出 |

### 高级参数

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `handoffs` | number | 否 | `null` | 可重定向流程的最大次数，用于条件分支 |
| `output_enabled` | boolean | 否 | `true` | 是否包含模型输出，false时只调用工具 |
| `is_subgraph` | boolean | 否 | `false` | 是否为子图节点 |
| `subgraph_name` | string | 是* | `null` | 子图名称（仅当is_subgraph为true时需要） |
| `position` | object | 否 | - | 可视化界面中的位置坐标 |
| `level` | number | 否 | - | 执行层级位置 |

*注：`model_name`对普通节点必需，`subgraph_name`对子图节点必需

## 占位符语法规范

在`system_prompt`、`user_prompt`和`end_template`中可以使用占位符引用其他节点的输出或注册的提示词模板。

### 基本语法

| 语法 | 描述 | 示例 |
|------|------|------|
| `{{node_name}}` | 引用指定节点的最新输出 | `{{research_agent}}` |
| `{{node_name:N}}` | 引用指定节点最近N次输出 | `{{analyzer:3}}` |
| `{{node_name:all}}` | 引用该节点的所有历史输出 | `{{collector:all}}` |
| `{{@prompt_name}}` | 引用已注册的提示词模板 | `{{@code_review_template}}` |
| `{{node1:2\|node2:3}}` | 联合引用多个节点的历史输出 | `{{agent1:2\|agent2:3}}` |

### 占位符使用示例

```json
{
  "name": "summarizer",
  "system_prompt": "你是一个专业的总结专家。",
  "user_prompt": "请总结以下研究结果：\n\n{{research_agent}}\n\n以及分析结果：\n\n{{analyzer:2}}",
  "input_nodes": ["research_agent", "analyzer"],
  "output_nodes": ["end"]
}
```

## 节点配置示例

### 示例1：简单的研究智能体

```json
{
  "name": "research_agent",
  "description": "研究指定主题并收集相关信息",
  "model_name": "gpt-4-turbo",
  "mcp_servers": ["brave-search"],
  "system_prompt": "你是一个专业的研究助手，擅长收集和整理信息。",
  "user_prompt": "请研究以下主题：{{start}}\n\n提供详细的研究报告，包括关键发现和数据支持。",
  "input_nodes": ["start"],
  "output_nodes": ["analyzer", "end"],
  "save": "md"
}
```

### 示例2：带条件分支的路由节点

```json
{
  "name": "router",
  "description": "根据用户请求类型路由到不同的处理节点",
  "model_name": "gpt-4",
  "system_prompt": "你是一个智能路由器，根据用户请求类型决定下一步处理。",
  "user_prompt": "分析用户请求：{{start}}\n\n如果是技术问题，转发给tech_agent；如果是业务问题，转发给business_agent。",
  "input_nodes": ["start"],
  "output_nodes": ["tech_agent", "business_agent"],
  "handoffs": 1
}
```

### 示例3：数据分析节点

```json
{
  "name": "data_analyzer",
  "description": "分析数据并生成可视化报告",
  "model_name": "gpt-4-turbo",
  "mcp_servers": ["filesystem", "python-executor"],
  "system_prompt": "你是一个数据分析专家，擅长使用Python进行数据分析和可视化。",
  "user_prompt": "分析以下数据：\n\n{{data_collector}}\n\n生成分析报告和可视化图表。",
  "input_nodes": ["data_collector"],
  "output_nodes": ["report_generator"],
  "save": "html"
}
```

### 示例4：子图节点

```json
{
  "name": "code_review_workflow",
  "description": "执行完整的代码审查工作流",
  "is_subgraph": true,
  "subgraph_name": "code_review_graph",
  "input_nodes": ["start"],
  "output_nodes": ["end"],
  "output_enabled": true
}
```

### 示例5：工具调用节点（无模型输出）

```json
{
  "name": "file_saver",
  "description": "将结果保存到文件系统",
  "model_name": "gpt-4",
  "mcp_servers": ["filesystem"],
  "system_prompt": "你负责将内容保存到文件。",
  "user_prompt": "将以下内容保存到文件：\n\n{{formatter}}",
  "input_nodes": ["formatter"],
  "output_nodes": ["end"],
  "output_enabled": false
}
```

## 完整Graph配置示例

### 示例：科研论文分析工作流

```json
{
  "name": "research_paper_analyzer",
  "description": "分析科研论文并生成综合报告",
  "nodes": [
    {
      "name": "paper_fetcher",
      "description": "获取论文内容",
      "model_name": "gpt-4",
      "mcp_servers": ["brave-search", "filesystem"],
      "system_prompt": "你是一个论文检索专家。",
      "user_prompt": "获取以下论文的内容：{{start}}",
      "input_nodes": ["start"],
      "output_nodes": ["content_analyzer"],
      "save": "md"
    },
    {
      "name": "content_analyzer",
      "description": "分析论文内容",
      "model_name": "gpt-4-turbo",
      "system_prompt": "你是一个科研论文分析专家。",
      "user_prompt": "分析以下论文内容：\n\n{{paper_fetcher}}\n\n提取关键发现、方法论和结论。",
      "input_nodes": ["paper_fetcher"],
      "output_nodes": ["methodology_reviewer", "results_evaluator"]
    },
    {
      "name": "methodology_reviewer",
      "description": "评审研究方法",
      "model_name": "gpt-4",
      "system_prompt": "你是一个研究方法论专家。",
      "user_prompt": "评审论文的研究方法：\n\n{{content_analyzer}}\n\n评估方法的科学性和可靠性。",
      "input_nodes": ["content_analyzer"],
      "output_nodes": ["report_synthesizer"]
    },
    {
      "name": "results_evaluator",
      "description": "评估研究结果",
      "model_name": "gpt-4",
      "system_prompt": "你是一个研究结果评估专家。",
      "user_prompt": "评估论文的研究结果：\n\n{{content_analyzer}}\n\n分析结果的有效性和影响。",
      "input_nodes": ["content_analyzer"],
      "output_nodes": ["report_synthesizer"]
    },
    {
      "name": "report_synthesizer",
      "description": "综合生成最终报告",
      "model_name": "gpt-4-turbo",
      "system_prompt": "你是一个报告撰写专家。",
      "user_prompt": "综合以下分析结果生成完整报告：\n\n方法论评审：\n{{methodology_reviewer}}\n\n结果评估：\n{{results_evaluator}}",
      "input_nodes": ["methodology_reviewer", "results_evaluator"],
      "output_nodes": ["end"],
      "save": "md"
    }
  ],
  "end_template": "# 论文分析报告\n\n## 论文内容\n{{paper_fetcher}}\n\n## 综合分析\n{{report_synthesizer}}"
}
```

## 设计最佳实践

### 1. 节点设计原则

#### 单一职责原则
- 每个节点应专注于一个明确的任务
- 避免在单个节点中处理多个不相关的功能
- 复杂任务应拆分为多个协作节点

**好的示例：**
```json
{
  "name": "data_validator",
  "description": "验证输入数据的格式和完整性"
}
```

**不好的示例：**
```json
{
  "name": "data_processor",
  "description": "验证数据、转换格式、生成报告、发送通知"
}
```

#### 清晰的命名
- 使用描述性的节点名称
- 名称应反映节点的主要功能
- 使用一致的命名约定（如snake_case）

### 2. 连接设计原则

#### 明确的数据流
- 清晰定义节点间的输入输出关系
- 避免循环依赖（除非使用handoffs实现有意的循环）
- 使用`start`和`end`标记工作流的起点和终点

#### 合理的并行处理
- 独立的任务可以并行执行
- 使用多个output_nodes实现并行分支
- 在需要时使用汇聚节点整合并行结果

**示例：**
```json
{
  "name": "data_collector",
  "output_nodes": ["analyzer_1", "analyzer_2", "analyzer_3"]
}
```

### 3. 提示词设计原则

#### 角色定义清晰
- 在system_prompt中明确定义智能体的角色和能力
- 提供必要的背景知识和约束条件
- 使用专业术语建立专家身份

#### 任务指令具体
- 在user_prompt中提供具体的任务指令
- 使用占位符引用上游节点的输出
- 明确输出格式和质量要求

#### 上下文管理
- 合理使用历史输出引用（如`{{node:3}}`）
- 避免传递过多冗余信息
- 在需要时使用联合引用整合多个来源

### 4. MCP服务使用原则

#### 按需配置
- 只为节点配置其实际需要的MCP服务
- 避免为所有节点配置所有服务
- 考虑服务的性能和成本影响

#### 服务组合
- 合理组合多个MCP服务实现复杂功能
- 例如：搜索服务 + 文件系统服务 = 研究并保存

**示例：**
```json
{
  "name": "research_and_save",
  "mcp_servers": ["brave-search", "filesystem"]
}
```

### 5. 错误处理和容错

#### 设置合理的handoffs
- 为可能需要重试的节点设置handoffs
- 在路由节点中使用handoffs实现条件分支
- 避免设置过大的handoffs值导致无限循环

#### 输出验证
- 在关键节点后添加验证节点
- 使用条件路由处理异常情况
- 提供降级方案

### 6. 性能优化

#### 模型选择
- 简单任务使用较小的模型
- 复杂推理使用更强大的模型
- 考虑成本和延迟的平衡

#### 并行执行
- 识别可以并行执行的独立任务
- 使用并行分支减少总执行时间
- 在汇聚点整合并行结果

#### 输出控制
- 对于纯工具调用节点，设置`output_enabled: false`
- 使用`save`参数自动保存重要输出
- 避免在中间节点生成不必要的详细输出

### 7. 可维护性

#### 文档化
- 为每个节点提供清晰的description
- 在提示词中包含必要的说明
- 为复杂的Graph提供整体描述

#### 模块化
- 将可复用的工作流封装为子图
- 使用子图节点实现功能复用
- 保持主图的简洁性

#### 版本管理
- 为Graph配置使用有意义的名称
- 在description中记录版本信息
- 保留重要版本的备份

## 常见模式

### 模式1：线性流水线

```
start → processor_1 → processor_2 → processor_3 → end
```

适用于顺序处理的场景，每个节点依赖前一个节点的输出。

### 模式2：并行处理与汇聚

```
        ┌→ analyzer_1 ┐
start → ├→ analyzer_2 ├→ synthesizer → end
        └→ analyzer_3 ┘
```

适用于需要从多个角度分析同一输入的场景。

### 模式3：条件路由

```
        ┌→ handler_A → end
start → router ├→ handler_B → end
        └→ handler_C → end
```

适用于根据输入类型或条件选择不同处理路径的场景。

### 模式4：迭代优化

```
start → generator → reviewer ⟲ (handoffs) → end
```

适用于需要多轮优化的场景，reviewer可以将结果返回给generator。

### 模式5：层级处理

```
start → L1_processor → L2_processor → L3_processor → end
         ↓              ↓              ↓
        end            end            end
```

每层都可以输出到end，提供不同详细程度的结果。

## 调试和测试建议

### 1. 逐步构建
- 从简单的单节点Graph开始
- 逐步添加节点和连接
- 每次添加后进行测试

### 2. 输出检查
- 为关键节点设置`save`参数保存输出
- 检查中间节点的输出是否符合预期
- 使用end_template验证最终输出格式

### 3. 日志分析
- 查看执行日志了解节点执行顺序
- 检查是否有节点被跳过或重复执行
- 分析执行时间识别性能瓶颈

### 4. 边界测试
- 测试空输入、异常输入的处理
- 验证handoffs的循环终止条件
- 测试并行节点的同步机制

## 总结

设计一个优秀的MAG Graph需要：

1. **清晰的目标** - 明确Graph要解决的问题
2. **合理的架构** - 选择合适的节点组织模式
3. **专业的提示词** - 为每个节点设计有效的提示词
4. **适当的工具** - 合理配置MCP服务
5. **充分的测试** - 验证Graph的正确性和性能

遵循本文档的规范和最佳实践，可以构建出高效、可靠、易维护的多智能体工作流系统。
