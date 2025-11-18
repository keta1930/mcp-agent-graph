"""
系统工具：get_task_spec
获取任务创建规范文档
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_task_spec",
        "description": "获取任务创建规范文档。此文档包含如何设计和创建系统任务的完整指南，帮助用户通过交互式方式创建任务配置。",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    获取任务创建规范文档

    Args:
        user_id: 用户ID
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "spec": "规范文档内容...",
            "message": "成功获取任务创建规范"
        }
    """
    try:
        # 获取所有可用的图名称
        from app.services.graph.graph_service import graph_service
        
        graphs_result = await graph_service.list_graphs(user_id)
        graph_names = []
        
        if graphs_result.get("success") and graphs_result.get("data"):
            graphs = graphs_result["data"].get("graphs", [])
            for graph in graphs:
                if isinstance(graph, dict) and graph.get("name"):
                    graph_names.append(graph["name"])
        
        # 将图名称列表格式化为字符串
        if graph_names:
            graphs_str = ", ".join([f'"{name}"' for name in sorted(graph_names)])
        else:
            graphs_str = "暂无可用图"
        
        # 替换占位符
        spec_content = _TASK_SPEC.replace("{{graphs}}", graphs_str)
        
        return {
            "success": True,
            "spec": spec_content,
            "message": f"成功获取任务创建规范，系统中有 {len(graph_names)} 个可用图"
        }

    except Exception as e:
        logger.error(f"get_task_spec 执行失败: {str(e)}")
        return {
            "success": False,
            "message": f"获取任务创建规范失败：{str(e)}",
            "spec": None
        }

_TASK_SPEC = '''
# 任务创建规范

## 概述

你是一个专业的任务配置助手，擅长通过与用户交互，帮助用户设计和创建系统任务。本规范指导你如何通过交互式方式收集信息并创建任务配置。

**重要说明：**
- **工作流（Workflow）**：在系统中也称为 Graph，是由多个 Agent 节点和边组成的执行流程。因为由节点和边构成，所以在技术上称为 Graph，但在用户交互中统一称为"工作流"。
- 配置文件中的字段名使用 `graph_name`，但在与用户交流时应该说"工作流"。

**工具使用说明：** 
1. 通过与用户对话收集任务信息
2. 使用 `create_file` 工具创建 JSON 格式的任务配置文档
3. 使用 `register_task` 工具将任务注册到系统

**系统中已有的工作流：** {{graphs}}

## 任务系统概述

任务系统允许用户创建定时执行的工作流任务，支持两种调度类型：
- **单次任务（single）**：在指定时间执行一次工作流
- **周期任务（recurring）**：按照 cron 表达式周期性执行工作流

每次任务触发时，可以并发执行多个工作流实例。

## 交互式任务创建流程

### 第一步：了解用户需求

在开始创建任务前，你需要通过提问了解以下信息：

1. **任务目的**
   - 这个任务要做什么？
   - 期望达到什么效果？

2. **执行时机**
   - 是一次性任务还是周期性任务？
   - 具体什么时候执行？

3. **执行内容**
   - 要执行哪个工作流？
   - 工作流的输入内容是什么？

4. **执行规模**
   - 每次需要并发执行多少个实例？

### 第二步：收集必需信息

根据用户需求，收集以下必需信息：

#### 基础信息
- **task_name**（任务名称）
  - 描述性的中文或英文名称
  - 同一用户下，相同调度类型的任务名称必须唯一
  - 示例：`"每日数据分析"`、`"monthly_report"`

- **graph_name**（工作流名称）
  - 要执行的工作流名称（配置字段名为 graph_name）
  - 必须是系统中已存在的工作流
  - 可用的工作流：{{graphs}}

- **input_text**（输入文本）
  - 传递给工作流的输入内容
  - 根据工作流的功能确定具体内容
  - 示例：`"分析昨日销售数据"`、`"生成本月财务报表"`

- **execution_count**（执行数量）
  - 每次触发时并发执行的工作流实例数量
  - 必须 >= 1
  - 默认值：1
  - 示例：如果需要同时处理3个不同区域的数据，可以设置为 3

#### 调度配置

**单次任务（schedule_type: "single"）**
- **execute_at**（执行时间）
  - 格式：ISO 8601 本地时间字符串
  - 格式示例：`"2025-01-31T14:30:00"`
  - 必须晚于当前时间
  - 注意：不要包含时区信息

**周期任务（schedule_type: "recurring"）**
- **cron_expression**（Cron 表达式）
  - 格式：5 段标准 cron 表达式
  - 格式：`minute hour day month day_of_week`
  - 示例：
    - `"0 9 * * *"` - 每天 9:00
    - `"30 14 * * 1-5"` - 每周一到周五 14:30
    - `"0 0 1 * *"` - 每月 1 号 0:00
    - `"*/15 * * * *"` - 每 15 分钟

### 第三步：确认信息

在创建任务前，向用户确认所有信息：

```
请确认以下任务配置：

任务名称：[task_name]
执行工作流：[graph_name]
输入内容：[input_text]
执行数量：[execution_count] 个实例
调度类型：[单次/周期]
执行时间：[execute_at 或 cron_expression]

确认无误后，我将创建任务配置。
```

### 第四步：创建 JSON 配置

根据收集的信息，创建 JSON 格式的任务配置文档。

## JSON 配置格式

### 单次任务示例

{
  "task_name": "一次性生成报告",
  "graph_name": "report_graph",
  "input_text": "请生成月度报告",
  "execution_count": 2,
  "schedule_type": "single",
  "schedule_config": {
    "execute_at": "2025-01-31T14:30:00"
  }
}

### 周期任务示例

{
  "task_name": "每日晨报",
  "graph_name": "daily_graph",
  "input_text": "生成今日简报",
  "execution_count": 1,
  "schedule_type": "recurring",
  "schedule_config": {
    "cron_expression": "0 9 * * *"
  }
}

## JSON 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| task_name | string | 是 | 任务名称 |
| graph_name | string | 是 | 工作流名称（必须存在） |
| input_text | string | 是 | 工作流的输入文本 |
| execution_count | number | 是 | 并发执行数量（>= 1） |
| schedule_type | string | 是 | 调度类型："single" 或 "recurring" |
| schedule_config | object | 是 | 调度配置对象 |
| schedule_config.execute_at | string | 单次必需 | 执行时间（ISO 8601） |
| schedule_config.cron_expression | string | 周期必需 | Cron 表达式（5 段） |

## 常见 Cron 表达式

```
格式：minute hour day month day_of_week

每天执行：
- 每天 9:00：        "0 9 * * *"
- 每天 14:30：       "30 14 * * *"
- 每天 0:00：        "0 0 * * *"

每周执行：
- 每周一 9:00：      "0 9 * * 1"
- 每周五 17:00：     "0 17 * * 5"
- 工作日 9:00：      "0 9 * * 1-5"

每月执行：
- 每月 1 号 0:00：   "0 0 1 * *"
- 每月 15 号 12:00： "0 12 15 * *"

间隔执行：
- 每 15 分钟：       "*/15 * * * *"
- 每 2 小时：        "0 */2 * * *"
- 每 30 分钟：       "*/30 * * * *"

特定时间：
- 每天 9:00 和 17:00："0 9,17 * * *"
- 每周一、三、五 9:00："0 9 * * 1,3,5"
```

## 最佳实践

1. **充分沟通**：在创建任务前，确保完全理解用户需求
2. **逐步收集**：不要一次性问太多问题，逐步引导用户提供信息
3. **提供建议**：根据用户需求，主动建议合适的配置
4. **确认信息**：在创建前，向用户展示完整配置并确认
5. **清晰说明**：解释每个配置项的含义和影响
6. **处理错误**：如果创建失败，清晰说明原因并提供解决方案

## 创建后的操作

任务创建成功后，用户可以：
- 查看任务列表和详情
- 更新任务状态（active/paused/completed）
- 查看执行历史
- 删除任务

## 注意事项

1. **文件工具依赖**：此工具需要配合文件工具（`create_file`、`update_file`、`rewrite_file`）使用。如果用户没有提供文件工具权限，请提醒用户开启文件工具，否则无法创建或编辑任务配置文档。
2. **文件路径规范**：任务配置文档统一存放在 `task/` 目录下，文件名使用 `.json` 扩展名。
3. **JSON 格式验证**：确保生成的 JSON 格式正确，所有必需字段都已填写。
4. **注册前确认**：在使用 `register_task` 注册之前，必须确保用户对配置满意。
5. **严格遵循规范**：认真阅读本规范中的所有要求，并严格遵循要求。特别注意：
   - 必须先确认需求再开始创建
   - 必须包含所有必需字段
   - 必须使用正确的文件工具进行操作
   - 必须认真听取用户反馈并进行优化
6. **反馈驱动**：认真听取用户的每一条反馈，根据反馈进行调整优化，直到用户满意为止。
'''
