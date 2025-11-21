// src/constants/systemToolsData.ts

/**
 * 系统工具分类 README 数据
 */
export const CATEGORY_README_DATA: Record<string, { zh: string; en: string }> = {
  'task_manager': {
    zh: `# Task Manager

Task Manager 为 Agent 提供**创建和管理定时任务**的能力，使 Agent 能够设置工作流的自动化执行。

该工具集支持获取**任务创建规范**（包含交互式创建流程、JSON 配置格式、Cron 表达式说明和常见场景示例），以及从 JSON 文档**注册任务**到调度系统。Agent 可以通过规范学习如何设计任务，包括选择**单次任务或周期任务**、配置**执行时间或 Cron 表达式**、指定要执行的**工作流**、设置**输入文本和并发执行数量**。注册功能会验证任务配置的完整性和正确性，检查时间格式、Cron 表达式、工作流是否存在，创建任务记录并添加到调度器中。任务支持两种调度类型：**单次任务**在指定时间执行一次，**周期任务**按 Cron 表达式周期性执行。每次任务触发时可以**并发执行多个工作流实例**，适用于批量处理场景。

这使得 Agent 能够像运维工程师一样管理自动化任务，为用户设置定时报告、周期性数据分析、定期内容生成等场景，实现工作流的无人值守执行。`,
    en: `# Task Manager

Task Manager provides Agents with the ability to **create and manage scheduled tasks**, enabling automated workflow execution.

This toolset supports retrieving **task creation specifications** (including interactive creation process, JSON configuration format, Cron expression instructions, and common scenario examples), as well as **registering tasks** from JSON documents to the scheduling system. Agents can learn how to design tasks through specifications, including choosing between **one-time or periodic tasks**, configuring **execution time or Cron expressions**, specifying **workflows** to execute, and setting **input text and concurrent execution count**. The registration function validates task configuration completeness and correctness, checks time formats, Cron expressions, workflow existence, creates task records, and adds them to the scheduler. Tasks support two scheduling types: **one-time tasks** execute once at a specified time, **periodic tasks** execute periodically according to Cron expressions. Each task trigger can **execute multiple workflow instances concurrently**, suitable for batch processing scenarios.

This enables Agents to manage automated tasks like operations engineers, setting up scheduled reports, periodic data analysis, regular content generation, and achieving unattended workflow execution.`
  },
  'agent_creator': {
    zh: `# Agent Creator

Agent Creator 为 Agent 提供**创建和管理其他 Agent** 的能力，使 Agent 能够根据需求设计新的专业 Agent 或优化现有 Agent。

该工具集支持获取 **Agent 创建规范**（包含配置参数说明、设计原则和系统已有分类），将现有 Agent 的配置**导出为 JSON 文档**以便查看和修改，以及从 JSON 文档**注册新 Agent** 到系统中。Agent 可以通过这些工具学习如何设计一个功能明确、配置合理的 Agent，包括定义**能力描述**、选择**合适的模型**、配置 **MCP 服务和系统工具**、设置**系统提示词**等。导出功能使 Agent 能够参考现有 Agent 的配置，进行优化改进或创建变体。注册功能支持创建全新的 Agent 或更新已有 Agent 的配置。

这使得 Agent 能够像架构师一样设计智能体系统，根据具体任务需求创建专门的 Agent，不断扩展系统的能力边界。`,
    en: `# Agent Creator

Agent Creator provides Agents with the ability to **create and manage other Agents**, enabling them to design new specialized Agents or optimize existing ones based on requirements.

This toolset supports retrieving **Agent creation specifications** (including configuration parameter descriptions, design principles, and existing system categories), **exporting** existing Agent configurations as JSON documents for viewing and modification, and **registering new Agents** from JSON documents into the system. Agents can learn how to design functionally clear and well-configured Agents through these tools, including defining **capability descriptions**, selecting **appropriate models**, configuring **MCP services and system tools**, and setting **system prompts**. The export function enables Agents to reference existing Agent configurations for optimization improvements or creating variants. The registration function supports creating brand new Agents or updating existing Agent configurations.

This enables Agents to design intelligent agent systems like architects, creating specialized Agents based on specific task requirements and continuously expanding the system's capability boundaries.`
  },
  'mcp_builder': {
    zh: `# MCP Builder

MCP Builder 为 Agent 提供**构建和注册 MCP 工具**的能力，使 Agent 能够通过 FastMCP 框架创建自定义的外部工具服务器。

该工具集支持获取 **MCP 开发规范**（包含 FastMCP 框架使用指南、代码模板、XML 标签说明和开发流程），以及从文档中**解析 MCP 配置并注册**到系统。Agent 可以通过规范学习如何使用 FastMCP 创建工具服务器，包括定义**工具函数**、设置**参数**、编写**文档**和配置**依赖**。注册功能会解析文档中的 **XML 标签**（\`folder_name\`、\`script_files\`、\`dependencies\`、\`readme\`），自动创建工具文件夹、安装依赖、配置虚拟环境，并将工具注册到 MCP 配置中。

这使得 Agent 能够像开发者一样扩展系统能力，根据用户需求创建专门的工具服务器，为 AI 系统连接外部数据源和服务，不断丰富系统的工具生态。`,
    en: `# MCP Builder

MCP Builder provides Agents with the ability to **build and register MCP tools**, enabling them to create custom external tool servers through the FastMCP framework.

This toolset supports retrieving **MCP development specifications** (including FastMCP framework usage guide, code templates, XML tag descriptions, and development process), as well as **parsing MCP configurations from documents and registering** them to the system. Agents can learn how to use FastMCP to create tool servers through specifications, including defining **tool functions**, setting **parameters**, writing **documentation**, and configuring **dependencies**. The registration function parses **XML tags** in documents (\`folder_name\`, \`script_files\`, \`dependencies\`, \`readme\`), automatically creates tool folders, installs dependencies, configures virtual environments, and registers tools to MCP configuration.

This enables Agents to extend system capabilities like developers, creating specialized tool servers based on user needs, connecting AI systems to external data sources and services, and continuously enriching the tool ecosystem.`
  },
  'subagent': {
    zh: `# Subagent

Subagent 为 Agent 提供**调用其他专业 Agent** 的能力，实现多 Agent 协作和任务委托。

该工具集支持列出所有 **Agent 分类**以了解系统中的 Agent 组织结构，列出指定分类下的 Agent 及其标签以快速定位合适的协作者，获取 Agent 的**详细信息**（包括完整能力描述、使用的模型和工具）以确认其专业能力，以及执行**任务委托**将复杂任务分配给专门的 Agent 处理。Agent 可以通过任务执行器**同时委托多个任务**给不同的 Agent，每个任务都有独立的 ID 用于追踪历史，如果任务 ID 已存在则子 Agent 会**继承完整对话历史**继续执行，实现长期的任务跟踪和迭代优化。

这使得 Agent 能够像团队协作一样工作，将代码审查交给代码专家，将数据分析交给分析专家，将内容创作交给写作专家，充分发挥每个 Agent 的专长，完成单个 Agent 难以胜任的复杂任务。`,
    en: `# Subagent

Subagent provides Agents with the ability to **invoke other specialized Agents**, enabling multi-Agent collaboration and task delegation.

This toolset supports listing all **Agent categories** to understand the Agent organizational structure in the system, listing Agents and their tags under specified categories to quickly locate suitable collaborators, retrieving **detailed information** about Agents (including complete capability descriptions, models and tools used) to confirm their expertise, and executing **task delegation** to assign complex tasks to specialized Agents for processing. Agents can **delegate multiple tasks simultaneously** to different Agents through the task executor, each task has an independent ID for tracking history, and if a task ID already exists, the sub-Agent will **inherit the complete conversation history** to continue execution, enabling long-term task tracking and iterative optimization.

This enables Agents to work like team collaboration, delegating code reviews to code experts, data analysis to analysis experts, and content creation to writing experts, fully leveraging each Agent's expertise to complete complex tasks that a single Agent would struggle with.`
  },
  'system_operations': {
    zh: `# System Operations

System Operations 为 Agent 提供**查询系统资源和配置**的能力，使 Agent 能够了解系统中可用的模型、MCP 服务、工作流和提示词。

该工具集支持列出所有已配置的**模型名称**，列出所有 **MCP 服务器**及其连接状态和工具概览（已连接服务器显示前 3 个工具），获取指定 MCP 服务器的**详细配置和完整工具列表**，列出所有**工作流及其描述**，获取指定工作流的**完整配置详情**（包括所有节点和连接关系），列出所有**提示词及其分类**，以及获取指定提示词的**完整内容**。这些查询功能使 Agent 能够在设计 Agent、创建工作流或编写提示词时，了解系统中有哪些资源可以使用，避免重复创建，选择合适的模型和工具，引用已有的提示词模板。

这使得 Agent 能够像系统管理员一样查看系统状态，为用户提供准确的资源信息，辅助决策和配置选择。`,
    en: `# System Operations

System Operations provides Agents with the ability to **query system resources and configurations**, enabling them to understand available models, MCP services, workflows, and prompts in the system.

This toolset supports listing all configured **model names**, listing all **MCP servers** with their connection status and tool overview (connected servers display the first 3 tools), retrieving **detailed configuration and complete tool list** of specified MCP servers, listing all **workflows and their descriptions**, retrieving **complete configuration details** of specified workflows (including all nodes and connection relationships), listing all **prompts and their categories**, and retrieving **complete content** of specified prompts. These query functions enable Agents to understand what resources are available in the system when designing Agents, creating workflows, or writing prompts, avoiding duplicate creation, selecting appropriate models and tools, and referencing existing prompt templates.

This enables Agents to view system status like system administrators, providing users with accurate resource information and assisting in decision-making and configuration selection.`
  },
  'prompt_generator': {
    zh: `# Prompt Generator

Prompt Generator 为 Agent 提供**创建和管理提示词模板**的能力，使 Agent 能够设计高质量、可复用的提示词。

该工具集支持获取**提示词创建规范**（包含结构化设计原则、质量检查清单、常见场景示例和命名建议），将现有提示词**导出为 Markdown 文档**以便优化编辑，以及从 Markdown 文档**注册提示词**到系统中。Agent 可以通过规范学习如何编写优秀的提示词，包括明确**角色定义**、清晰**任务描述**、具体**要求列表**、**输出格式说明**和**注意事项**。导出功能使 Agent 能够获取现有提示词内容进行改进优化。注册功能会从文件名提取提示词名称，读取 Markdown 内容，并按**分类组织管理**。提示词可以在 Graph 的节点配置中通过**占位符语法**（\`{{@prompt_name}}\`）引用，实现提示词的复用和统一管理。

这使得 Agent 能够像提示词工程师一样工作，为不同场景设计专业的提示词模板，提升系统的输出质量和一致性。`,
    en: `# Prompt Generator

Prompt Generator provides Agents with the ability to **create and manage prompt templates**, enabling them to design high-quality, reusable prompts.

This toolset supports retrieving **prompt creation specifications** (including structured design principles, quality checklists, common scenario examples, and naming suggestions), **exporting** existing prompts as Markdown documents for optimization editing, and **registering prompts** from Markdown documents into the system. Agents can learn how to write excellent prompts through specifications, including defining clear **role definitions**, clear **task descriptions**, specific **requirement lists**, **output format instructions**, and **notes**. The export function enables Agents to retrieve existing prompt content for improvement and optimization. The registration function extracts prompt names from filenames, reads Markdown content, and organizes management by **categories**. Prompts can be referenced in Graph node configurations through **placeholder syntax** (\`{{@prompt_name}}\`), enabling prompt reuse and unified management.

This enables Agents to work like prompt engineers, designing professional prompt templates for different scenarios and improving system output quality and consistency.`
  },
  'file_creator': {
    zh: `# File Creator

File Creator 为 Agent 提供**完整的文档管理能力**，使 Agent 能够在对话过程中创建、读取、修改和管理各类文本文件。

该工具集支持**创建新文件**（配置文档、代码文件、数据记录等），**批量读取**文件内容、摘要和操作历史，通过**字符串替换**进行精确的局部修改，**完全重写**文件实现大范围变更，**删除**不需要的文件，以及按目录或全局**列出文件清单**。所有文件都存储在**对话级别**，自动维护**版本历史和操作日志**，Agent 可以追溯每次修改的内容和原因。

这使得 Agent 能够像人类开发者一样管理项目文件，创建结构化的文档体系，进行迭代式的内容编辑，并保持清晰的文件组织结构。`,
    en: `# File Creator

File Creator provides Agents with **complete document management capabilities**, enabling them to create, read, modify, and manage various text files during conversations.

This toolset supports **creating new files** (configuration documents, code files, data records, etc.), **batch reading** file content, summaries, and operation history, performing precise local modifications through **string replacement**, **completely rewriting** files for large-scale changes, **deleting** unnecessary files, and **listing file inventories** by directory or globally. All files are stored at the **conversation level**, automatically maintaining **version history and operation logs**, allowing Agents to trace the content and reasons for each modification.

This enables Agents to manage project files like human developers, creating structured document systems, performing iterative content editing, and maintaining clear file organization structures.`
  },
  'memory_tools': {
    zh: `# Memory Tools

Memory Tools 为 Agent 提供**持久化记忆能力**，使 Agent 能够记住用户偏好、学习经验和上下文信息。

该工具集支持两种记忆类型：**用户记忆（user）**用于存储用户的偏好设置、工作习惯和项目背景；**Agent 自身记忆（self）**用于存储 Agent 学习到的模式、任务执行经验和优化建议。记忆按**分类组织管理**，每条记忆都有唯一标识和时间戳，支持完整的**增删改查操作**。Agent 可以通过列出分类了解已有的记忆体系，通过查询获取特定分类的记忆内容，通过添加保存新的学习成果，通过更新修正已有认知，通过删除清理过时信息。

这使得 Agent 能够在多次对话中保持连续性，积累知识和经验，提供更加个性化和智能的服务。`,
    en: `# Memory Tools

Memory Tools provides Agents with **persistent memory capabilities**, enabling them to remember user preferences, learning experiences, and contextual information.

This toolset supports two types of memory: **user memory (user)** for storing user preference settings, work habits, and project backgrounds; **Agent self-memory (self)** for storing patterns learned by Agents, task execution experiences, and optimization suggestions. Memory is **organized and managed by categories**, each memory has a unique identifier and timestamp, supporting complete **CRUD operations**. Agents can understand the existing memory system by listing categories, retrieve memory content of specific categories through queries, save new learning outcomes through additions, correct existing cognition through updates, and clean up outdated information through deletions.

This enables Agents to maintain continuity across multiple conversations, accumulate knowledge and experience, and provide more personalized and intelligent services.`
  },
  'graph_designer': {
    zh: `# Graph Designer

Graph Designer 为 Agent 提供**设计和管理多智能体工作流**的能力，使 Agent 能够构建复杂的智能体协作系统。

该工具集支持获取 **Graph 设计规范**（包含节点配置参数、连接关系、占位符语法和设计原则），将现有 Graph 配置**导出为 JSON 文档**以便查看和修改，以及从 JSON 文档**注册新 Graph** 到系统中。Agent 可以通过规范学习如何设计工作流，包括定义节点的**角色和提示词**、配置**模型和 MCP 服务**、设置**输入输出关系**、使用 **handoffs 实现条件分支**、通过**占位符引用节点输出和提示词模板**。导出功能使 Agent 能够参考现有工作流的设计，进行优化改进或创建变体。注册功能会验证配置的完整性和正确性，确保节点连接合理、引用有效。

这使得 Agent 能够像架构师一样设计智能体系统，将复杂任务分解为多个专业节点，通过节点间的协作和信息流转完成复杂的业务流程。`,
    en: `# Graph Designer

Graph Designer provides Agents with the ability to **design and manage multi-agent workflows**, enabling them to build complex agent collaboration systems.

This toolset supports retrieving **Graph design specifications** (including node configuration parameters, connection relationships, placeholder syntax, and design principles), **exporting** existing Graph configurations as JSON documents for viewing and modification, and **registering new Graphs** from JSON documents into the system. Agents can learn how to design workflows through specifications, including defining node **roles and prompts**, configuring **models and MCP services**, setting **input-output relationships**, using **handoffs to implement conditional branching**, and **referencing node outputs and prompt templates through placeholders**. The export function enables Agents to reference existing workflow designs for optimization improvements or creating variants. The registration function validates configuration completeness and correctness, ensuring reasonable node connections and valid references.

This enables Agents to design intelligent agent systems like architects, decomposing complex tasks into multiple specialized nodes and completing complex business processes through collaboration and information flow between nodes.`
  }
};
