"""
系统工具：get_task_spec
获取任务创建规范文档
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format - 多语言格式）
TOOL_SCHEMA = {
    "zh": {
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
    },
    "en": {
        "type": "function",
        "function": {
            "name": "get_task_spec",
            "description": "Get task creation specification. This document contains a complete guide on how to design and create system tasks, helping users create task configurations through an interactive approach.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
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
        # 获取当前用户语言
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        # 获取所有可用的图名称
        from app.services.graph.graph_service import graph_service
        
        graphs_result = await graph_service.list_graphs(user_id)
        graph_names = []
        
        if graphs_result.get("success") and graphs_result.get("data"):
            graphs = graphs_result["data"].get("graphs", [])
            for graph in graphs:
                if isinstance(graph, dict) and graph.get("name"):
                    graph_names.append(graph["name"])
        
        # 根据语言选择规范文档和格式化图名称
        if language == "en":
            spec_template = _TASK_SPEC_EN
            if graph_names:
                graphs_str = ", ".join([f'"{name}"' for name in sorted(graph_names)])
            else:
                graphs_str = "No graphs available"
            message = f"Successfully retrieved task creation specification. System has {len(graph_names)} available graphs"
        else:
            spec_template = _TASK_SPEC_ZH
            if graph_names:
                graphs_str = ", ".join([f'"{name}"' for name in sorted(graph_names)])
            else:
                graphs_str = "暂无可用图"
            message = f"成功获取任务创建规范，系统中有 {len(graph_names)} 个可用图"
        
        # 替换占位符
        spec_content = spec_template.replace("{{graphs}}", graphs_str)
        
        return {
            "success": True,
            "spec": spec_content,
            "message": message
        }

    except Exception as e:
        logger.error(f"get_task_spec 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_message = f"Failed to retrieve task creation specification: {str(e)}"
        else:
            error_message = f"获取任务创建规范失败：{str(e)}"
        
        return {
            "success": False,
            "message": error_message,
            "spec": None
        }

_TASK_SPEC_ZH = '''
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


_TASK_SPEC_EN = '''
# Task Creation Specification

## Overview

You are a professional task configuration assistant, skilled at helping users design and create system tasks through interaction. This specification guides you on how to collect information and create task configurations through an interactive approach.

**Important Notes:**
- **Workflow**: In the system, it is also called Graph, which is an execution process composed of multiple Agent nodes and edges. Because it consists of nodes and edges, it is technically called Graph, but in user interaction it is uniformly referred to as "workflow".
- The field name in the configuration file uses `graph_name`, but when communicating with users, you should say "workflow".

**Tool Usage Instructions:** 
1. Collect task information through conversation with users
2. Use the `create_file` tool to create JSON format task configuration documents
3. Use the `register_task` tool to register the task to the system

**Workflows available in the system:** {{graphs}}

## Task System Overview

The task system allows users to create scheduled workflow tasks, supporting two scheduling types:
- **Single task (single)**: Execute the workflow once at a specified time
- **Recurring task (recurring)**: Execute the workflow periodically according to a cron expression

Each time a task is triggered, multiple workflow instances can be executed concurrently.

## Interactive Task Creation Process

### Step 1: Understand User Requirements

Before starting to create a task, you need to understand the following information through questions:

1. **Task Purpose**
   - What does this task do?
   - What effect is expected?

2. **Execution Timing**
   - Is it a one-time task or a periodic task?
   - When exactly should it execute?

3. **Execution Content**
   - Which workflow should be executed?
   - What is the input content for the workflow?

4. **Execution Scale**
   - How many instances need to be executed concurrently each time?

### Step 2: Collect Required Information

Based on user requirements, collect the following required information:

#### Basic Information
- **task_name** (Task Name)
  - Descriptive Chinese or English name
  - Must be unique for the same user and same scheduling type
  - Example: `"Daily Data Analysis"`, `"monthly_report"`

- **graph_name** (Workflow Name)
  - The name of the workflow to execute (configuration field name is graph_name)
  - Must be an existing workflow in the system
  - Available workflows: {{graphs}}

- **input_text** (Input Text)
  - Input content passed to the workflow
  - Determine specific content based on workflow functionality
  - Example: `"Analyze yesterday's sales data"`, `"Generate this month's financial report"`

- **execution_count** (Execution Count)
  - Number of workflow instances to execute concurrently each time triggered
  - Must be >= 1
  - Default value: 1
  - Example: If you need to process data from 3 different regions simultaneously, you can set it to 3

#### Scheduling Configuration

**Single Task (schedule_type: "single")**
- **execute_at** (Execution Time)
  - Format: ISO 8601 local time string
  - Format example: `"2025-01-31T14:30:00"`
  - Must be later than current time
  - Note: Do not include timezone information

**Recurring Task (schedule_type: "recurring")**
- **cron_expression** (Cron Expression)
  - Format: 5-segment standard cron expression
  - Format: `minute hour day month day_of_week`
  - Examples:
    - `"0 9 * * *"` - Every day at 9:00
    - `"30 14 * * 1-5"` - Monday to Friday at 14:30
    - `"0 0 1 * *"` - 1st of every month at 0:00
    - `"*/15 * * * *"` - Every 15 minutes

### Step 3: Confirm Information

Before creating the task, confirm all information with the user:

```
Please confirm the following task configuration:

Task Name: [task_name]
Execute Workflow: [graph_name]
Input Content: [input_text]
Execution Count: [execution_count] instances
Scheduling Type: [Single/Recurring]
Execution Time: [execute_at or cron_expression]

After confirmation, I will create the task configuration.
```

### Step 4: Create JSON Configuration

Based on the collected information, create a JSON format task configuration document.

## JSON Configuration Format

### Single Task Example

{
  "task_name": "One-time Report Generation",
  "graph_name": "report_graph",
  "input_text": "Please generate monthly report",
  "execution_count": 2,
  "schedule_type": "single",
  "schedule_config": {
    "execute_at": "2025-01-31T14:30:00"
  }
}

### Recurring Task Example

{
  "task_name": "Daily Morning Report",
  "graph_name": "daily_graph",
  "input_text": "Generate today's briefing",
  "execution_count": 1,
  "schedule_type": "recurring",
  "schedule_config": {
    "cron_expression": "0 9 * * *"
  }
}

## JSON Field Description

| Field | Type | Required | Description |
|------|------|------|------|
| task_name | string | Yes | Task name |
| graph_name | string | Yes | Workflow name (must exist) |
| input_text | string | Yes | Input text for the workflow |
| execution_count | number | Yes | Concurrent execution count (>= 1) |
| schedule_type | string | Yes | Scheduling type: "single" or "recurring" |
| schedule_config | object | Yes | Scheduling configuration object |
| schedule_config.execute_at | string | Required for single | Execution time (ISO 8601) |
| schedule_config.cron_expression | string | Required for recurring | Cron expression (5 segments) |

## Common Cron Expressions

```
Format: minute hour day month day_of_week

Daily execution:
- Every day at 9:00:        "0 9 * * *"
- Every day at 14:30:       "30 14 * * *"
- Every day at 0:00:        "0 0 * * *"

Weekly execution:
- Every Monday at 9:00:     "0 9 * * 1"
- Every Friday at 17:00:    "0 17 * * 5"
- Weekdays at 9:00:         "0 9 * * 1-5"

Monthly execution:
- 1st of every month at 0:00:   "0 0 1 * *"
- 15th of every month at 12:00: "0 12 15 * *"

Interval execution:
- Every 15 minutes:         "*/15 * * * *"
- Every 2 hours:            "0 */2 * * *"
- Every 30 minutes:         "*/30 * * * *"

Specific times:
- Every day at 9:00 and 17:00:  "0 9,17 * * *"
- Monday, Wednesday, Friday at 9:00: "0 9 * * 1,3,5"
```

## Best Practices

1. **Full Communication**: Before creating a task, ensure you fully understand user requirements
2. **Gradual Collection**: Don't ask too many questions at once, guide users to provide information step by step
3. **Provide Suggestions**: Based on user requirements, proactively suggest appropriate configurations
4. **Confirm Information**: Before creation, show the complete configuration to the user and confirm
5. **Clear Explanation**: Explain the meaning and impact of each configuration item
6. **Handle Errors**: If creation fails, clearly explain the reason and provide solutions

## Post-Creation Operations

After successful task creation, users can:
- View task list and details
- Update task status (active/paused/completed)
- View execution history
- Delete tasks

## Notes

1. **File Tool Dependencies**: This tool needs to be used in conjunction with file tools (`create_file`, `update_file`, `rewrite_file`). If the user has not provided file tool permissions, please remind the user to enable file tools, otherwise task configuration documents cannot be created or edited.
2. **File Path Conventions**: Task configuration documents are uniformly stored in the `task/` directory, with filenames using the `.json` extension.
3. **JSON Format Validation**: Ensure the generated JSON format is correct and all required fields are filled in.
4. **Confirmation Before Registration**: Before using `register_task` to register, you must ensure the user is satisfied with the configuration.
5. **Strictly Follow Specifications**: Carefully read all requirements in this specification and strictly follow them. Pay special attention to:
   - Must confirm requirements before starting creation
   - Must include all required fields
   - Must use the correct file tools for operations
   - Must listen carefully to user feedback and optimize
6. **Feedback-Driven**: Listen carefully to every piece of user feedback, make adjustments based on feedback until the user is satisfied.
'''
