// src/pages/SystemToolsManager.tsx
import React, { useEffect, useState } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  message,
  Modal,
  Empty,
  Spin,
  Descriptions,
  Tag,
  Tooltip,
  Space,
  Typography,
  Input
} from 'antd';
import { Wrench, Eye, Search, ChevronRight, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  listSystemTools,
  getSystemToolDetail,
  SystemToolSchema,
  ToolCategory
} from '../services/systemToolsService';
import { useTranslation } from '../i18n/hooks';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const SystemToolsManager: React.FC = () => {
  const { t, locale } = useTranslation();
  
  // 获取类别 README 内容
  const getCategoryReadme = (category: string): string => {
    const readmeData: Record<string, { zh: string; en: string }> = {
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
    
    const data = readmeData[category];
    if (!data) return '';
    return locale === 'zh' ? data.zh : data.en;
  };
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState<SystemToolSchema | null>(null);
  const [searchText, setSearchText] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [readmeModalVisible, setReadmeModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // 加载系统工具列表
  const loadTools = async () => {
    setLoading(true);
    try {
      const response = await listSystemTools();
      setCategories(response.categories || []);
      setFilteredCategories(response.categories || []);
    } catch (error: any) {
      message.error(t('pages.systemToolsManager.loadFailed', { error: error.message || t('errors.unknown') }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  // 初始化所有分类为折叠状态
  useEffect(() => {
    if (categories.length > 0) {
      setCollapsedCategories(new Set(categories.map(cat => cat.category)));
    }
  }, [categories]);

  // 搜索过滤
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredCategories(categories);
      return;
    }

    const filtered = categories.map((category) => {
      const filteredTools = category.tools.filter((tool) =>
        tool.name.toLowerCase().includes(value.toLowerCase()) ||
        tool.schema.function.description.toLowerCase().includes(value.toLowerCase())
      );
      return {
        ...category,
        tools: filteredTools,
        tool_count: filteredTools.length
      };
    }).filter((category) => category.tools.length > 0);
    
    setFilteredCategories(filtered);
  };

  // 切换分类折叠状态
  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // 显示工具详情
  const showToolDetail = async (toolName: string) => {
    try {
      const response = await getSystemToolDetail(toolName);
      if (response.success) {
        setSelectedTool({
          name: response.name,
          schema: response.schema
        });
        setDetailModalVisible(true);
      }
    } catch (error: any) {
      message.error(t('pages.systemToolsManager.loadDetailFailed', { error: error.message || t('errors.unknown') }));
    }
  };

  // 显示类别说明
  const showCategoryReadme = (category: string) => {
    setSelectedCategory(category);
    setReadmeModalVisible(true);
  };

  // 渲染参数信息
  const renderParameters = (parameters: any) => {
    if (!parameters || !parameters.properties) {
      return (
        <Text style={{ color: 'rgba(45, 45, 45, 0.45)', fontStyle: 'italic' }}>
          {t('pages.systemToolsManager.detailModal.noParameters')}
        </Text>
      );
    }

    const props = parameters.properties;
    const required = parameters.required || [];

    return (
      <div>
        {Object.entries(props).map(([key, value]: [string, any]) => (
          <div key={key} style={{
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid rgba(139, 115, 85, 0.1)'
          }}>
            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag style={{
                background: required.includes(key) ? 'rgba(184, 88, 69, 0.08)' : 'rgba(139, 115, 85, 0.08)',
                color: required.includes(key) ? '#b85845' : '#8b7355',
                border: `1px solid ${required.includes(key) ? 'rgba(184, 88, 69, 0.25)' : 'rgba(139, 115, 85, 0.2)'}`,
                borderRadius: '4px',
                fontWeight: 500,
                fontSize: '12px',
                padding: '2px 8px'
              }}>
                {key}
              </Tag>
              {required.includes(key) && (
                <Tag style={{
                  background: 'rgba(184, 88, 69, 0.08)',
                  color: '#b85845',
                  border: '1px solid rgba(184, 88, 69, 0.25)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  padding: '2px 6px'
                }}>
                  {t('pages.systemToolsManager.detailModal.required')}
                </Tag>
              )}
              <Tag style={{
                background: 'rgba(212, 165, 116, 0.08)',
                color: '#d4a574',
                border: '1px solid rgba(212, 165, 116, 0.25)',
                borderRadius: '4px',
                fontSize: '11px',
                padding: '2px 6px'
              }}>
                {value.type}
              </Tag>
            </div>
            <Text style={{
              fontSize: '13px',
              color: 'rgba(45, 45, 45, 0.65)',
              lineHeight: '1.6'
            }}>
              {value.description || t('pages.systemToolsManager.detailModal.noDescription')}
            </Text>
          </div>
        ))}
      </div>
    );
  };

  const totalTools = categories.reduce((sum, cat) => sum + cat.tool_count, 0);

  return (
    <Layout style={{ height: '100vh', background: '#faf8f5', display: 'flex', flexDirection: 'column' }}>
      {/* Header 顶栏 */}
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative'
      }}>
        {/* 装饰性底部渐变线 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          {/* 左侧：图标 + 标题 + 统计标签 */}
          <Space size="large">
            <Wrench size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              {t('pages.systemToolsManager.title')}
            </Title>
            <Tag style={{
              background: 'rgba(184, 88, 69, 0.08)',
              color: '#b85845',
              border: '1px solid rgba(184, 88, 69, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {t('pages.systemToolsManager.toolsCount', { count: totalTools })}
            </Tag>
            <Tag style={{
              background: 'rgba(139, 115, 85, 0.08)',
              color: '#8b7355',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {t('pages.systemToolsManager.categoriesCount', { count: categories.length })}
            </Tag>
          </Space>

          {/* 右侧：搜索框 */}
          <Input
            placeholder={t('pages.systemToolsManager.searchPlaceholder')}
            prefix={<Search size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{
              width: 320,
              height: '40px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)'
            }}
          />
        </div>
      </Header>

      {/* Content 内容区 */}
      <Content style={{
        flex: 1,
        padding: '32px 48px',
        overflow: 'auto'
      }}>

        {/* 工具列表 */}
        {loading && categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <Empty
            description={searchText ? t('pages.systemToolsManager.noSearchResults') : t('pages.systemToolsManager.noTools')}
            style={{ marginTop: '80px' }}
          />
        ) : (
          <>
            {filteredCategories.map((category) => {
              const isCollapsed = collapsedCategories.has(category.category);
              
              return (
                <div key={category.category} style={{ marginBottom: '40px' }}>
                  {/* 类别标题 */}
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#2d2d2d',
                    letterSpacing: '0.5px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Tag style={{
                        background: 'rgba(184, 88, 69, 0.08)',
                        color: '#b85845',
                        border: '1px solid rgba(184, 88, 69, 0.25)',
                        borderRadius: '6px',
                        fontWeight: 500,
                        padding: '4px 12px',
                        fontSize: '13px'
                      }}>
                        {category.category}
                      </Tag>
                      <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '13px' }}>
                        {t('pages.systemToolsManager.categoryLabel', { count: category.tool_count })}
                      </Text>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* 说明按钮 */}
                      <Tooltip title={t('pages.systemToolsManager.viewCategoryReadme')}>
                        <div
                          onClick={() => showCategoryReadme(category.category)}
                          style={{
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            color: '#8b7355'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
                            e.currentTarget.style.color = '#b85845';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#8b7355';
                          }}
                        >
                          <BookOpen size={18} strokeWidth={1.5} />
                        </div>
                      </Tooltip>

                      {/* 折叠按钮 */}
                      <div
                        onClick={() => toggleCategoryCollapse(category.category)}
                        style={{
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          color: '#8b7355'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
                          e.currentTarget.style.color = '#b85845';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#8b7355';
                        }}
                      >
                        <ChevronRight 
                          size={20} 
                          strokeWidth={2}
                          style={{
                            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(90deg)',
                            transition: 'transform 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                {/* 该类别下的工具卡片 */}
                {!isCollapsed && (
                  <Row gutter={[16, 16]}>
                    {category.tools.map((tool) => (
                    <Col xs={24} sm={12} md={12} lg={8} xl={6} key={tool.name}>
                      <Card
                        hoverable
                        style={{
                          borderRadius: '6px',
                          border: '1px solid rgba(139, 115, 85, 0.15)',
                          boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                          background: 'rgba(255, 255, 255, 0.85)',
                          transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                        styles={{
                          body: { 
                            padding: '16px',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column'
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
                          e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
                          e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                        }}
                      >
                        {/* 工具名称 */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px'
                        }}>
                          <Wrench size={16} strokeWidth={1.5} style={{ color: '#b85845', flexShrink: 0 }} />
                          <Tooltip title={tool.name}>
                            <Text strong style={{
                              fontSize: '14px',
                              color: '#2d2d2d',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1
                            }}>
                              {tool.name}
                            </Text>
                          </Tooltip>
                        </div>

                        {/* 工具描述 */}
                        <Text style={{
                          fontSize: '13px',
                          color: 'rgba(45, 45, 45, 0.65)',
                          lineHeight: '1.6',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          marginBottom: '12px'
                        }}>
                          {tool.schema.function.description}
                        </Text>

                        {/* 查看详情按钮 */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(139, 115, 85, 0.1)'
                        }}>
                          <Tooltip title={t('pages.systemToolsManager.viewDetail')}>
                            <div
                              style={{
                                padding: '4px',
                                borderRadius: '4px',
                                color: '#8b7355',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => showToolDetail(tool.name)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#b85845';
                                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#8b7355';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Eye size={16} strokeWidth={1.5} />
                            </div>
                          </Tooltip>
                        </div>
                      </Card>
                    </Col>
                    ))}
                  </Row>
                )}
              </div>
            );
            })}
          </>
        )}

      </Content>

      {/* 类别说明 Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={20} strokeWidth={1.5} style={{ color: '#b85845' }} />
            <Text strong style={{ fontSize: '16px', color: '#2d2d2d' }}>
              {t('pages.systemToolsManager.readmeModal.title', { category: selectedCategory })}
            </Text>
          </div>
        }
        open={readmeModalVisible}
        onCancel={() => setReadmeModalVisible(false)}
        footer={null}
        width={800}
        styles={{
          body: { 
            padding: '24px',
            maxHeight: '70vh',
            overflowY: 'auto'
          }
        }}
        style={{
          top: 40
        }}
      >
        <div style={{
          fontSize: '14px',
          lineHeight: '1.8',
          color: '#2d2d2d'
        }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#2d2d2d',
                  marginBottom: '16px',
                  marginTop: '0'
                }}>
                  {children}
                </h1>
              ),
              p: ({ children }) => (
                <p style={{
                  marginBottom: '12px',
                  lineHeight: '1.8'
                }}>
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong style={{
                  fontWeight: 700,
                  color: '#b85845'
                }}>
                  {children}
                </strong>
              ),
              code: ({ children }) => (
                <code style={{
                  background: 'rgba(139, 115, 85, 0.08)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '13px',
                  fontFamily: 'Monaco, "Courier New", monospace',
                  color: '#8b7355'
                }}>
                  {children}
                </code>
              )
            }}
          >
            {getCategoryReadme(selectedCategory) || t('pages.systemToolsManager.readmeModal.noContent')}
          </ReactMarkdown>
        </div>
      </Modal>

      {/* 详情 Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wrench size={20} strokeWidth={1.5} style={{ color: '#b85845' }} />
            <Text strong style={{ fontSize: '16px', color: '#2d2d2d' }}>
              {t('pages.systemToolsManager.detailModal.title', { name: selectedTool?.name || '' })}
            </Text>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={900}
        styles={{
          body: { 
            padding: '24px',
            maxHeight: '70vh',
            overflowY: 'auto'
          }
        }}
        style={{
          top: 40
        }}
      >
        {selectedTool && (
          <div>
            <Descriptions 
              bordered 
              column={1}
              labelStyle={{
                background: 'rgba(245, 243, 240, 0.6)',
                color: '#8b7355',
                fontWeight: 500,
                fontSize: '13px',
                width: '120px'
              }}
              contentStyle={{
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#2d2d2d',
                fontSize: '13px'
              }}
            >
              <Descriptions.Item label={t('pages.systemToolsManager.detailModal.toolName')}>
                <code style={{
                  fontSize: '13px',
                  background: 'rgba(139, 115, 85, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  color: '#b85845'
                }}>
                  {selectedTool.schema.function.name}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.systemToolsManager.detailModal.description')}>
                <Text style={{ color: 'rgba(45, 45, 45, 0.85)' }}>
                  {selectedTool.schema.function.description}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.systemToolsManager.detailModal.parameters')}>
                {renderParameters(selectedTool.schema.function.parameters)}
              </Descriptions.Item>
            </Descriptions>

            {/* JSON Schema */}
            <div style={{ marginTop: '24px' }}>
              <Text strong style={{
                fontSize: '14px',
                color: '#2d2d2d',
                display: 'block',
                marginBottom: '12px'
              }}>
                {t('pages.systemToolsManager.detailModal.fullSchema')}
              </Text>
              <pre 
                className="custom-scrollbar"
                style={{
                  background: '#faf8f5',
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.15)',
                  overflow: 'auto',
                  maxHeight: '300px',
                  fontSize: '12px',
                  color: '#2d2d2d',
                  lineHeight: '1.6',
                  margin: 0
                }}
              >
                {JSON.stringify(selectedTool.schema, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* 自定义滚动条样式 */}
      <style>{`
        /* Modal 滚动条样式 */
        .ant-modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .ant-modal-body::-webkit-scrollbar-track {
          background: rgba(245, 243, 240, 0.3);
          border-radius: 4px;
        }

        .ant-modal-body::-webkit-scrollbar-thumb {
          background: rgba(139, 115, 85, 0.3);
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .ant-modal-body::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 115, 85, 0.5);
        }

        /* Schema 区域滚动条样式 */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(245, 243, 240, 0.5);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(184, 88, 69, 0.3);
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(184, 88, 69, 0.5);
        }

        /* Firefox 滚动条样式 */
        .ant-modal-body {
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 115, 85, 0.3) rgba(245, 243, 240, 0.3);
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(184, 88, 69, 0.3) rgba(245, 243, 240, 0.5);
        }
      `}</style>
    </Layout>
  );
};

export default SystemToolsManager;
