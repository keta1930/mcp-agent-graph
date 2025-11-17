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

**工具使用说明：** 
1. 通过与用户对话收集任务信息
2. 使用 `create_file` 工具创建 JSON 格式的任务配置文档
3. 使用 `register_task` 工具将任务注册到系统

**系统中已有的图（Graph）：** {{graphs}}

## 任务系统概述

任务系统允许用户创建定时执行的图（Graph）任务，支持两种调度类型：
- **单次任务（single）**：在指定时间执行一次
- **周期任务（recurring）**：按照 cron 表达式周期性执行

每次任务触发时，可以并发执行多个图实例。

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
   - 要执行哪个图（Graph）？
   - 图的输入内容是什么？

4. **执行规模**
   - 每次需要并发执行多少个实例？

### 第二步：收集必需信息

根据用户需求，收集以下必需信息：

#### 基础信息
- **task_name**（任务名称）
  - 描述性的中文或英文名称
  - 同一用户下，相同调度类型的任务名称必须唯一
  - 示例：`"每日数据分析"`、`"monthly_report"`

- **graph_name**（图名称）
  - 要执行的图的名称
  - 必须是系统中已存在的图
  - 可用的图：{{graphs}}

- **input_text**（输入文本）
  - 传递给图的输入内容
  - 根据图的功能确定具体内容
  - 示例：`"分析昨日销售数据"`、`"生成本月财务报表"`

- **execution_count**（执行数量）
  - 每次触发时并发执行的图实例数量
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
执行图：[graph_name]
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
| graph_name | string | 是 | 图名称（必须存在） |
| input_text | string | 是 | 图的输入文本 |
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

## 注意事项

### 时间格式
- 使用本地时间，不要包含时区信息
- 格式：`YYYY-MM-DDTHH:MM:SS`
- 示例：`"2025-01-31T14:30:00"`

### 单次任务
- 执行时间必须晚于当前时间
- 执行后任务状态会自动变为 `completed`
- 过期的单次任务无法创建

### 周期任务
- Cron 表达式必须是 5 段格式
- 系统会按照表达式持续调度
- 可以通过更新状态来暂停或恢复

### 图名称验证
- 图名称必须在系统中存在
- 创建任务前会验证图是否存在
- 如果图不存在，任务创建会失败

### 唯一性约束
- 同一用户下，相同调度类型的任务名称必须唯一
- 例如：不能有两个名为 "每日报告" 的周期任务
- 但可以有一个单次任务和一个周期任务都叫 "每日报告"

## 最佳实践

1. **充分沟通**：在创建任务前，确保完全理解用户需求
2. **逐步收集**：不要一次性问太多问题，逐步引导用户提供信息
3. **提供建议**：根据用户需求，主动建议合适的配置
4. **确认信息**：在创建前，向用户展示完整配置并确认
5. **清晰说明**：解释每个配置项的含义和影响
6. **处理错误**：如果创建失败，清晰说明原因并提供解决方案

## 错误处理

### 常见错误及解决方案

1. **图不存在**
   - 错误：`图 'xxx' 不存在`
   - 解决：检查图名称是否正确，或选择其他可用的图

2. **时间已过期**
   - 错误：`单次任务执行时间已过期`
   - 解决：选择未来的时间

3. **Cron 表达式无效**
   - 错误：`无效的cron表达式`
   - 解决：检查 cron 表达式格式，确保是 5 段

4. **任务名称冲突**
   - 错误：`任务名称已存在`
   - 解决：使用不同的任务名称

5. **执行数量无效**
   - 错误：`execution_count 必须 >= 1`
   - 解决：设置为 1 或更大的数字

## 创建后的操作

任务创建成功后，用户可以：
- 查看任务列表和详情
- 更新任务状态（active/paused/completed）
- 查看执行历史
- 删除任务

任务状态说明：
- `active`：活跃，正常调度
- `paused`：已暂停，不会执行
- `completed`：已完成（单次任务执行后）
- `error`：异常（如过期的单次任务）
'''
