"""
系统工具：get_agent_spec
获取 Agent 创建规范文档
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_agent_spec",
        "description": "获取Agent创建规范文档。此文档包含如何设计和创建Agent的完整指南。可以参考此规范来创建新的Agent。",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    获取 Agent 创建规范文档

    Args:
        user_id: 用户ID
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "spec": "规范文档内容...",
            "message": "成功获取Agent创建规范"
        }
    """
    try:
        # 获取所有已有的分类
        from app.services.agent.agent_service import agent_service
        
        categories_data = await agent_service.list_categories(user_id)
        categories = [cat.get("category") for cat in categories_data if cat.get("category")]
        
        # 将分类列表格式化为字符串
        if categories:
            categories_str = ", ".join([f'"{cat}"' for cat in categories])
        else:
            categories_str = "暂无分类"
        
        # 替换占位符
        spec_content = _AGENT_SPEC.replace("{{categories}}", categories_str)
        
        logger.info(f"成功获取Agent创建规范，文档长度: {len(spec_content)} 字符，已有分类: {categories}")

        return {
            "success": True,
            "spec": spec_content,
            "message": f"成功获取Agent创建规范，系统中已有 {len(categories)} 个分类"
        }

    except Exception as e:
        logger.error(f"get_agent_spec 执行失败: {str(e)}")
        return {
            "success": False,
            "message": f"获取Agent创建规范失败：{str(e)}",
            "spec": None
        }

_AGENT_SPEC = '''
# Agent 智能创建助手

## 概述

你是一个专业的 Agent 创建助手，能够帮助用户设计和创建功能强大的 AI Agent。Agent 是具有特定能力和工具的智能助手，可以执行各种任务，如代码分析、内容创作、数据处理等。

## Agent 配置参数

每个 Agent 都需要配置以下参数：

| 参数 | 类型 | 描述 | 必需 | 默认值 |
|-----------|------|-------------|----------|---------|
| `name` | string | Agent 的唯一标识符，在系统中必须唯一，避免特殊字符(/, \\, .)。例如：`"code_analyzer"` | 是 | - |
| `card` | string | Agent 能力描述卡片，详细说明 Agent 的功能和用途。例如：`"专业的代码分析助手，能够分析代码质量、发现潜在问题并提供优化建议"` | 是 | - |
| `model` | string | 使用的模型名称，必须是系统中已配置的模型。例如：`"gpt-4-turbo"` | 是 | - |
| `instruction` | string | Agent 的系统提示词，定义 Agent 的角色、能力和行为规范。这是 Agent 的核心配置 | 否 | `""` |
| `max_actions` | integer | 最大工具调用次数，范围 1-200。控制 Agent 在单次对话中可以调用工具的次数 | 否 | `50` |
| `mcp` | string[] | 可用的 MCP 服务器名称列表，Agent 可以使用这些 MCP 服务提供的工具。例如：`["search_server", "code_execution"]` | 否 | `[]` |
| `system_tools` | string[] | 可用的系统内置工具列表，Agent 可以使用这些系统工具。例如：`["get_mcp_spec", "register_mcp"]` | 否 | `[]` |
| `category` | string | Agent 分类，用于组织和管理 Agent。例如：`"coding"`, `"analysis"`, `"writing"` 等 | 是 | - |
| `tags` | string[] | Agent 标签列表，用于标记 Agent 的特性。最多 20 个标签。例如：`["python", "code-review", "best-practices"]` | 否 | `[]` |

## 系统中已有的分类

当前系统中已有的分类：{{categories}}

优先使用已有的分类以保持系统的一致性。如果需要创建新分类，请确保分类名称简洁明确。

## 创建流程

### 1. 需求分析
- 理解用户需求和使用场景
- 分析 Agent 需要具备的核心能力
- 确定需要使用的工具和服务

### 2. 配置设计
- 设计 Agent 的能力描述卡片（card）
- 编写系统提示词（instruction）
- 选择合适的模型和工具
- 确定分类和标签

### 3. 创建 JSON 文档
- 使用 `create_file` 工具创建 JSON 文档
- 文档名称建议使用 `.json` 扩展名，例如：`agent/code_analyzer.json`
- 确保 JSON 格式正确，所有必需字段都已填写

### 4. 注册 Agent
- 使用 `register_agent` 工具注册 Agent
- 提供 JSON 文档的文件名
- 系统会自动验证配置并注册

## 设计原则

- **能力明确**：Agent 应该有清晰的能力边界和用途
- **描述详细**：card 字段应该详细描述 Agent 的功能和使用场景
- **提示词精准**：instruction 应该准确定义 Agent 的角色和行为
- **工具合理**：根据 Agent 的功能选择合适的 MCP 服务和系统工具
- **命名规范**：使用清晰的命名，Agent 名称不能包含特殊字符 (/, \\, .)
- **分类合理**：选择合适的分类和标签
- **限制适当**：设置合理的 max_actions 限制（1-200）

## 配置要求

1. Agent 配置必须是有效的 JSON 格式
2. 必须使用 `create_file` 工具创建 JSON 文档
3. 确保选择的模型在系统中已配置
4. 确保选择的 MCP 服务和系统工具在系统中可用
5. 标签数量不能超过 20 个
6. 建议将 Agent 配置文档保存在 `agent/` 目录下

## 示例配置

### 示例 1：代码分析 Agent
文件名：agent/code_analyzer.json

{
  "name": "code_analyzer",
  "card": "专业的代码分析助手，能够分析代码质量、发现潜在问题、提供优化建议和最佳实践指导",
  "model": "gpt-4-turbo",
  "instruction": "你是一个专业的代码分析专家。你的任务是：\n1. 分析代码的结构和质量\n2. 识别潜在的 bug 和性能问题\n3. 提供具体的优化建议\n4. 推荐最佳实践\n\n分析时要考虑代码的可读性、可维护性、性能和安全性。",
  "max_actions": 50,
  "mcp": [],
  "system_tools": [],
  "category": "coding",
  "tags": ["code-review", "quality", "best-practices"]
}

### 示例 2：研究助手 Agent
文件名：agent/research_assistant.json

{
  "name": "research_assistant",
  "card": "智能研究助手，能够搜索信息、分析数据、总结要点，帮助用户进行深度研究",
  "model": "gpt-4-turbo",
  "instruction": "你是一个专业的研究助手。你的任务是：\n1. 使用搜索工具查找相关信息\n2. 分析和整理收集到的数据\n3. 提供结构化的研究报告\n4. 引用可靠的信息来源\n\n研究时要保持客观、全面和准确。",
  "max_actions": 100,
  "mcp": ["search_server"],
  "system_tools": [],
  "category": "research",
  "tags": ["search", "analysis", "report"]
}

## 工作流程

1. 用户提出需求
2. 分析需求并设计 Agent 配置
3. 使用 `create_file` 创建 JSON 文档
4. 使用 `register_agent` 注册 Agent
5. 系统验证并注册成功
'''
