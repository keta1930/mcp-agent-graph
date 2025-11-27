"""
系统工具：list_system_tools
列出所有系统工具的分类、名称和功能描述
"""
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "list_system_tools",
            "description": "列出所有系统工具的完整信息。返回按类别组织的工具列表，包括每个类别的整体能力描述、子工具名称和功能说明。",
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
            "name": "list_system_tools",
            "description": "List complete information of all system tools. Returns a categorized tool list, including overall capability descriptions for each category, sub-tool names, and functional descriptions.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
}

# 工具类别的整体能力描述（多语言）
CATEGORY_DESCRIPTIONS = {
    "zh": {
        "agent_creator": "为 Agent 提供创建和管理其他 Agent 的能力，使 Agent 能够根据需求设计新的专业 Agent 或优化现有 Agent。",
        "graph_designer": "为 Agent 提供设计和管理多智能体工作流的能力，使 Agent 能够构建复杂的智能体协作系统。",
        "mcp_builder": "为 Agent 提供构建和注册 MCP 工具的能力，使 Agent 能够通过 FastMCP 框架创建自定义的外部工具服务器。",
        "file_creator": "为 Agent 提供完整的文档管理能力，使 Agent 能够在对话过程中创建、读取、修改和管理各类文本文件。",
        "memory_tools": "为 Agent 提供持久化记忆能力，使 Agent 能够记住用户偏好、学习经验和上下文信息。",
        "prompt_generator": "为 Agent 提供创建和管理提示词模板的能力，使 Agent 能够设计高质量、可复用的提示词。",
        "system_operations": "为 Agent 提供查询系统资源和配置的能力，使 Agent 能够了解系统中可用的模型、MCP 服务、工作流和提示词。",
        "task_manager": "为 Agent 提供创建和管理定时任务的能力，使 Agent 能够设置工作流的自动化执行。",
        "subagent": "为 Agent 提供调用其他专业 Agent 的能力，实现多 Agent 协作和任务委托。"
    },
    "en": {
        "agent_creator": "Provides Agents with the ability to create and manage other Agents, enabling them to design new specialized Agents or optimize existing ones based on requirements.",
        "graph_designer": "Provides Agents with the ability to design and manage multi-agent workflows, enabling them to build complex agent collaboration systems.",
        "mcp_builder": "Provides Agents with the ability to build and register MCP tools, enabling them to create custom external tool servers through the FastMCP framework.",
        "file_creator": "Provides Agents with complete document management capabilities, enabling them to create, read, modify, and manage various text files during conversations.",
        "memory_tools": "Provides Agents with persistent memory capabilities, enabling them to remember user preferences, learning experiences, and contextual information.",
        "prompt_generator": "Provides Agents with the ability to create and manage prompt templates, enabling them to design high-quality, reusable prompts.",
        "system_operations": "Provides Agents with the ability to query system resources and configurations, enabling them to understand available models, MCP services, workflows, and prompts in the system.",
        "task_manager": "Provides Agents with the ability to create and manage scheduled tasks, enabling them to set up automated workflow execution.",
        "subagent": "Provides Agents with the ability to call other specialized Agents, enabling multi-agent collaboration and task delegation."
    }
}

# 每个子工具的功能描述（多语言）
TOOL_DESCRIPTIONS = {
    "zh": {
        # agent_creator
        "get_agent_spec": "获取 Agent 创建规范，包含配置参数说明、设计原则和系统已有分类。帮助 Agent 学习如何设计功能明确、配置合理的 Agent。",
        "export_agent_to_document": "将现有 Agent 的配置导出为 JSON 文档。便于查看、修改和参考现有 Agent 的配置。",
        "register_agent": "从 JSON 文档注册新 Agent 到系统中。支持创建全新的 Agent 或更新已有 Agent 的配置。",
        
        # graph_designer
        "get_graph_spec": "获取 Graph 设计规范，包含节点配置参数、连接关系、占位符语法和设计原则。帮助 Agent 学习如何设计多智能体工作流。",
        "export_graph_to_document": "将现有 Graph 配置导出为 JSON 文档。便于查看、修改和参考现有工作流的设计。",
        "register_graph_from_document": "从 JSON 文档注册新 Graph 到系统中。会验证配置的完整性和正确性，确保节点连接合理、引用有效。",
        
        # mcp_builder
        "get_mcp_spec": "获取 MCP 开发规范，包含 FastMCP 框架使用指南、代码模板、XML 标签说明和开发流程。帮助 Agent 学习如何创建 MCP 工具服务器。",
        "register_mcp": "从文档中解析 MCP 配置并注册到系统。自动创建工具文件夹、安装依赖、配置虚拟环境，并将工具注册到 MCP 配置中。",
        
        # file_creator
        "list_all_files": "列出对话中创建的所有文件。返回文件路径、创建时间和基本信息。",
        "list_files_by_directory": "按目录列出文件清单。支持查看指定目录下的所有文件。",
        "create_file": "创建新文件，支持配置文档、代码文件、数据记录等。文件存储在对话级别，自动维护版本历史和操作日志。",
        "update_file": "通过字符串替换进行精确的局部修改。适用于小范围的内容更新。",
        "rewrite_file": "完全重写文件实现大范围变更。适用于需要大幅修改文件内容的场景。",
        "read_file": "读取文件内容、摘要和操作历史。支持读取单个文件的详细信息。",
        "delete_files": "删除不需要的文件。支持按文件路径列表批量删除文件。",
        
        # memory_tools
        "list_memory_categories": "列出所有记忆分类。帮助 Agent 了解已有的记忆体系。",
        "get_memory": "查询特定分类的记忆内容。支持获取用户记忆或 Agent 自身记忆。",
        "add_memory": "添加新的记忆条目。支持保存用户偏好、学习经验和上下文信息。",
        "update_memory": "更新已有的记忆内容。支持修正已有认知和更新记忆信息。",
        "delete_memory": "删除指定的记忆条目。支持清理过时信息。",
        
        # prompt_generator
        "get_prompt_spec": "获取提示词创建规范，包含结构化设计原则、质量检查清单、常见场景示例和命名建议。帮助 Agent 学习如何编写优秀的提示词。",
        "export_prompt_to_document": "将现有提示词导出为 Markdown 文档。便于优化编辑和参考现有提示词内容。",
        "register_prompt": "从 Markdown 文档注册提示词到系统中。会从文件名提取提示词名称，读取内容，并按分类组织管理。",
        
        # system_operations
        "list_all_models": "列出系统中所有已配置的模型名称。返回所有可用模型的名称列表。",
        "list_all_mcps": "列出所有已配置的 MCP 服务器及其基本信息。返回 MCP 服务器名称、连接状态、工具数量，对于已连接的服务器显示前 3 个工具。",
        "get_mcp_details": "查看指定 MCP 服务器的详细信息。返回服务器的配置信息和所有工具的名称与描述。",
        "list_all_graphs": "列出所有工作流及其描述。返回工作流名称、描述和基本信息。",
        "get_graph_details": "获取指定工作流的完整配置详情。包括所有节点和连接关系。",
        "list_all_prompts": "列出所有提示词及其分类。返回提示词名称和所属分类。",
        "get_prompt_content": "获取指定提示词的完整内容。返回提示词的详细文本内容。",
        "list_system_tools": "列出所有系统工具的完整信息。返回按类别组织的工具列表，包括每个类别的整体能力描述、子工具名称和功能说明。",
        
        # task_manager
        "get_task_spec": "获取任务创建规范，包含交互式创建流程、JSON 配置格式、Cron 表达式说明和常见场景示例。帮助 Agent 学习如何设计定时任务。",
        "register_task": "从 JSON 文档注册任务到调度系统。会验证任务配置的完整性和正确性，创建任务记录并添加到调度器中。",
        
        # subagent
        "list_agent_categories": "列出所有 Agent 分类。帮助 Agent 了解系统中的 Agent 组织结构。",
        "list_agents_in_category": "列出指定分类下的 Agent 及其标签。帮助 Agent 快速定位合适的协作者。",
        "get_agent_details": "获取 Agent 的详细信息。包括完整能力描述、使用的模型和工具，帮助确认其专业能力。",
        "agent_task_executor": "执行任务委托，将复杂任务分配给专门的 Agent 处理。支持同时委托多个任务给不同的 Agent，每个任务都有独立的 ID 用于追踪历史。"
    },
    "en": {
        # agent_creator
        "get_agent_spec": "Get Agent creation specification, including configuration parameter descriptions, design principles, and existing system categories. Helps Agents learn how to design Agents with clear functionality and reasonable configuration.",
        "export_agent_to_document": "Export existing Agent configuration to a JSON document. Facilitates viewing, modifying, and referencing existing Agent configurations.",
        "register_agent": "Register a new Agent to the system from a JSON document. Supports creating brand new Agents or updating existing Agent configurations.",
        
        # graph_designer
        "get_graph_spec": "Get Graph design specification, including node configuration parameters, connection relationships, placeholder syntax, and design principles. Helps Agents learn how to design multi-agent workflows.",
        "export_graph_to_document": "Export existing Graph configuration to a JSON document. Facilitates viewing, modifying, and referencing existing workflow designs.",
        "register_graph_from_document": "Register a new Graph to the system from a JSON document. Validates configuration completeness and correctness, ensuring reasonable node connections and valid references.",
        
        # mcp_builder
        "get_mcp_spec": "Get MCP development specification, including FastMCP framework usage guide, code templates, XML tag descriptions, and development process. Helps Agents learn how to create MCP tool servers.",
        "register_mcp": "Parse MCP configuration from document and register to system. Automatically creates tool folder, installs dependencies, configures virtual environment, and registers tool to MCP configuration.",
        
        # file_creator
        "list_all_files": "List all files created in the conversation. Returns file paths, creation times, and basic information.",
        "list_files_by_directory": "List files by directory. Supports viewing all files in a specified directory.",
        "create_file": "Create new files, supporting configuration documents, code files, data records, etc. Files are stored at conversation level with automatic version history and operation logs.",
        "update_file": "Perform precise local modifications through string replacement. Suitable for small-scale content updates.",
        "rewrite_file": "Completely rewrite file for large-scale changes. Suitable for scenarios requiring significant file content modifications.",
        "read_file": "Read file content, summary, and operation history. Supports reading detailed information of a single file.",
        "delete_files": "Delete unwanted files. Supports batch deletion of files by file path list.",
        
        # memory_tools
        "list_memory_categories": "List all memory categories. Helps Agents understand the existing memory system.",
        "get_memory": "Query memory content of a specific category. Supports retrieving user memory or Agent's own memory.",
        "add_memory": "Add new memory entries. Supports saving user preferences, learning experiences, and contextual information.",
        "update_memory": "Update existing memory content. Supports correcting existing cognition and updating memory information.",
        "delete_memory": "Delete specified memory entries. Supports cleaning up outdated information.",
        
        # prompt_generator
        "get_prompt_spec": "Get prompt creation specification, including structured design principles, quality checklist, common scenario examples, and naming suggestions. Helps Agents learn how to write excellent prompts.",
        "export_prompt_to_document": "Export existing prompt to a Markdown document. Facilitates optimization editing and referencing existing prompt content.",
        "register_prompt": "Register prompt to the system from a Markdown document. Extracts prompt name from filename, reads content, and organizes management by category.",
        
        # system_operations
        "list_all_models": "List all configured model names in the system. Returns a list of all available model names.",
        "list_all_mcps": "List all configured MCP servers and their basic information. Returns MCP server names, connection status, tool count, and displays the first 3 tools for connected servers.",
        "get_mcp_details": "View detailed information of specified MCP servers. Returns server configuration information and all tool names and descriptions.",
        "list_all_graphs": "List all workflows and their descriptions. Returns workflow names, descriptions, and basic information.",
        "get_graph_details": "Get complete configuration details of a specified workflow. Includes all nodes and connection relationships.",
        "list_all_prompts": "List all prompts and their categories. Returns prompt names and their categories.",
        "get_prompt_content": "Get the complete content of a specified prompt. Returns the detailed text content of the prompt.",
        "list_system_tools": "List complete information of all system tools. Returns a categorized tool list, including overall capability descriptions for each category, sub-tool names, and functional descriptions.",
        
        # task_manager
        "get_task_spec": "Get task creation specification, including interactive creation process, JSON configuration format, Cron expression description, and common scenario examples. Helps Agents learn how to design scheduled tasks.",
        "register_task": "Register task to scheduling system from JSON document. Validates task configuration completeness and correctness, creates task record, and adds to scheduler.",
        
        # subagent
        "list_agent_categories": "List all Agent categories. Helps Agents understand the Agent organizational structure in the system.",
        "list_agents_in_category": "List Agents and their tags in a specified category. Helps Agents quickly locate suitable collaborators.",
        "get_agent_details": "Get detailed information of an Agent. Includes complete capability description, models and tools used, helping confirm its professional capabilities.",
        "agent_task_executor": "Execute task delegation, assigning complex tasks to specialized Agents for processing. Supports delegating multiple tasks to different Agents simultaneously, with each task having an independent ID for tracking history."
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    列出所有系统工具的分类、名称和功能描述

    Args:
        user_id: 用户ID
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "categories": [
                {
                    "category": "agent_creator",
                    "description": "为 Agent 提供创建和管理其他 Agent 的能力...",
                    "tools": [
                        {
                            "name": "get_agent_creation_spec",
                            "description": "获取 Agent 创建规范..."
                        }
                    ],
                    "tool_count": 3
                }
            ],
            "total_categories": 9,
            "total_tools": 30
        }
    """
    try:
        from app.services.system_tools.registry import get_tools_by_category, get_current_language

        # 获取当前语言
        language = get_current_language()

        # 获取按类别组织的工具
        categorized_tools = get_tools_by_category()
        
        # 获取对应语言的描述字典
        category_descs = CATEGORY_DESCRIPTIONS.get(language, CATEGORY_DESCRIPTIONS.get("zh"))
        tool_descs = TOOL_DESCRIPTIONS.get(language, TOOL_DESCRIPTIONS.get("zh"))
        
        # 构建结果
        categories = []
        total_tools = 0
        
        for category, tools in categorized_tools.items():
            # 获取类别描述
            category_desc = category_descs.get(category, "System tool category" if language == "en" else "系统工具类别")
            
            # 构建工具列表
            tool_list = []
            for tool in tools:
                tool_name = tool["name"]
                # 从预定义的描述中获取，如果没有则从 schema 中获取
                tool_desc = tool_descs.get(
                    tool_name,
                    tool["schema"]["function"].get("description", "")
                )
                
                tool_list.append({
                    "name": tool_name,
                    "description": tool_desc
                })
            
            categories.append({
                "category": category,
                "description": category_desc,
                "tools": tool_list,
                "tool_count": len(tool_list)
            })
            
            total_tools += len(tool_list)
        
        # 按类别名称排序
        categories.sort(key=lambda x: x["category"])
        
        return {
            "success": True,
            "categories": categories,
            "total_categories": len(categories),
            "total_tools": total_tools
        }

    except Exception as e:
        logger.error(f"list_system_tools 执行失败: {str(e)}")
        
        # 根据语言返回错误消息
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_msg = f"Failed to get system tools list: {str(e)}"
        else:
            error_msg = f"获取系统工具列表失败: {str(e)}"
        
        return {
            "success": False,
            "error": error_msg,
            "categories": [],
            "total_categories": 0,
            "total_tools": 0
        }
