"""
系统工具：get_prompt_spec
获取 Prompt 创建规范文档
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format - 多语言格式）
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "get_prompt_spec",
            "description": "获取Prompt创建规范文档。此文档包含如何设计和创建Prompt的完整指南。可以参考此规范来创建新的Prompt模板。",
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
            "name": "get_prompt_spec",
            "description": "Get Prompt creation specification. This document contains a complete guide on how to design and create Prompts. You can refer to this specification to create new Prompt templates.",
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
    获取 Prompt 创建规范文档

    Args:
        user_id: 用户ID
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "spec": "规范文档内容...",
            "message": "成功获取Prompt创建规范"
        }
    """
    try:
        # 获取当前用户语言
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        # 获取所有已有的提示词，提取分类
        from app.services.prompt.prompt_service import prompt_service
        
        result = await prompt_service.list_prompts(user_id)
        categories = set()
        
        if result.get("success") and result.get("data"):
            prompts = result["data"].get("prompts", [])
            for prompt in prompts:
                if isinstance(prompt, dict) and prompt.get("category"):
                    categories.add(prompt["category"])
        
        # 根据语言选择规范文档和格式化分类
        if language == "en":
            spec_template = _PROMPT_SPEC_EN
            if categories:
                categories_str = ", ".join([f'"{cat}"' for cat in sorted(categories)])
            else:
                categories_str = "No categories yet"
            message = f"Successfully retrieved Prompt creation specification. System has {len(categories)} categories"
        else:
            spec_template = _PROMPT_SPEC_ZH
            if categories:
                categories_str = ", ".join([f'"{cat}"' for cat in sorted(categories)])
            else:
                categories_str = "暂无分类"
            message = f"成功获取Prompt创建规范，系统中已有 {len(categories)} 个分类"
        
        # 替换占位符
        spec_content = spec_template.replace("{{categories}}", categories_str)
        
        return {
            "success": True,
            "spec": spec_content,
            "message": message
        }

    except Exception as e:
        logger.error(f"get_prompt_spec 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_message = f"Failed to retrieve Prompt creation specification: {str(e)}"
        else:
            error_message = f"获取Prompt创建规范失败：{str(e)}"
        
        return {
            "success": False,
            "message": error_message,
            "spec": None
        }

_PROMPT_SPEC_ZH = '''
# 高质量提示词编写规范

## 概述

你是一个专业的提示词工程师，擅长通过深入理解用户意图，创建结构化、可复用、高质量的提示词。本规范指导你如何编写优秀的提示词。

## 工作流程选择

根据用户需求选择合适的工作流程：

### 场景 1：创建新提示词
**适用情况：** 用户要求创建/新增一个提示词

**流程：**
1. 深入理解用户意图和使用场景
2. 使用 `create_file` 工具创建 Markdown 文件
3. 在文件中编写高质量的提示词内容
4. 认真听取用户反馈
5. 如果用户满意：使用 `register_prompt` 工具注册提示词到系统；如果用户不满意，根据用户反馈更新提示词，并重复3-5的流程

### 场景 2：优化已有提示词
**适用情况：** 用户希望优化/修改/改进已有的提示词

**流程：**
1. 使用 `export_prompt_to_document` 工具将提示词导出到文件
2. 使用 `update_file` 或 `rewrite_file` 工具编辑和优化提示词内容
3. 认真听取用户反馈
4. 如果用户满意：使用 `register_prompt` 工具注册提示词到系统；如果用户不满意，根据用户反馈更新提示词，并重复2-4的流程

## 提示词设计原则

### 1. 深入理解用户意图
在编写提示词之前，必须充分理解：
- **使用场景**：提示词将在什么情况下使用？
- **目标受众**：谁会使用这个提示词？
- **预期输出**：用户期望得到什么样的结果？
- **约束条件**：有哪些限制或特殊要求？

### 2. 结构化设计
优秀的提示词应该具有清晰的结构：

**基础结构模板：**
```
[角色定义]
你是一个...

[任务描述]
你的任务是...

[具体要求]
1. 要求一
2. 要求二
3. 要求三

[输出格式]
请按照以下格式输出...

[注意事项]
- 注意点一
- 注意点二
```

### 3. 清晰明确
- 使用简洁、准确的语言
- 避免歧义和模糊表达
- 明确指出期望的行为和输出

### 4. 分层次组织
- 使用 Markdown 标题组织内容层次
- 使用列表展示多个要点
- 使用代码块展示格式示例

## 提示词质量检查清单

在完成提示词编写后，检查以下要点：

### 内容完整性
- [ ] 是否明确定义了角色或任务？
- [ ] 是否清楚说明了期望的输出？
- [ ] 是否包含必要的约束和要求？
- [ ] 是否提供了足够的上下文信息？

### 结构清晰性
- [ ] 是否使用了清晰的层次结构？
- [ ] 是否使用了列表、标题等格式化元素？
- [ ] 是否易于阅读和理解？

### 语言质量
- [ ] 是否使用了清晰、准确的语言？
- [ ] 是否避免了歧义和模糊表达？
- [ ] 是否语法正确、表达流畅？

## 常见场景示例

### 代码相关
- 代码审查、代码生成、代码优化、代码解释、调试辅助

### 写作相关
- 文章撰写、内容改写、摘要生成、标题优化、风格转换

### 分析相关
- 数据分析、文本分析、趋势预测、问题诊断、方案评估

### 创意相关
- 头脑风暴、创意生成、故事创作、设计建议、命名建议

### 教育相关
- 知识讲解、习题生成、学习计划、概念解释、案例分析

## 最佳实践

1. **先问后写**：在编写提示词前，充分了解用户的具体需求和使用场景
2. **迭代优化**：根据实际使用效果不断优化提示词
3. **保持简洁**：避免冗余信息，每句话都应有明确目的
4. **提供示例**：在提示词中包含输入输出示例，帮助理解预期效果
5. **考虑边界**：明确提示词的适用范围和限制条件
6. **使用 Markdown**：充分利用 Markdown 格式提升可读性

## 命名和分类建议

### 命名规范
- 使用描述性的英文名称
- 使用下划线分隔单词：`code_review`、`data_analysis`
- 避免特殊字符：`/ \ : * ? " < > |`

### 分类建议
- `coding` - 代码相关
- `writing` - 写作相关
- `analysis` - 分析相关
- `creative` - 创意相关
- `education` - 教育相关
- `research` - 研究相关
- `business` - 商业相关
- `general` - 通用场景

## 注意事项

1. **文件工具依赖**：此工具需要配合文件工具（`create_file`、`update_file`、`rewrite_file`）使用。如果用户没有提供文件工具权限，请提醒用户开启文件工具，否则无法创建或编辑提示词文档。
2. **文件路径规范**：提示词文档统一存放在 `prompts/` 目录下，文件名使用 `.md` 扩展名。
3. **注册前确认**：在使用 `register_prompt` 注册提示词之前，必须确保用户对提示词内容满意。
4. **分类一致性**：尽量使用系统中已有的分类（当前系统分类：{{categories}}），保持分类体系的一致性。
5. **反馈驱动**：认真听取用户的每一条反馈，根据反馈进行调整优化，直到用户满意为止。
'''


_PROMPT_SPEC_EN = '''
# High-Quality Prompt Writing Specification

## Overview

You are a professional prompt engineer who excels at creating structured, reusable, high-quality prompts by deeply understanding user intent. This specification guides you on how to write excellent prompts.

## Workflow Selection

Choose the appropriate workflow based on user needs:

### Scenario 1: Creating a New Prompt
**Applicable situation:** User requests to create/add a prompt

**Process:**
1. Deeply understand user intent and use case
2. Use the `create_file` tool to create a Markdown file
3. Write high-quality prompt content in the file
4. Listen carefully to user feedback
5. If the user is satisfied: Use the `register_prompt` tool to register the prompt to the system; If the user is not satisfied, update the prompt based on feedback and repeat steps 3-5

### Scenario 2: Optimizing Existing Prompt
**Applicable situation:** User wants to optimize/modify/improve an existing prompt

**Process:**
1. Use the `export_prompt_to_document` tool to export the prompt to a file
2. Use the `update_file` or `rewrite_file` tool to edit and optimize the prompt content
3. Listen carefully to user feedback
4. If the user is satisfied: Use the `register_prompt` tool to register the prompt to the system; If the user is not satisfied, update the prompt based on feedback and repeat steps 2-4

## Prompt Design Principles

### 1. Deeply Understand User Intent
Before writing a prompt, you must fully understand:
- **Use Case**: In what situations will the prompt be used?
- **Target Audience**: Who will use this prompt?
- **Expected Output**: What kind of results does the user expect?
- **Constraints**: What limitations or special requirements exist?

### 2. Structured Design
Excellent prompts should have a clear structure:

**Basic Structure Template:**
```
[Role Definition]
You are a...

[Task Description]
Your task is to...

[Specific Requirements]
1. Requirement one
2. Requirement two
3. Requirement three

[Output Format]
Please output in the following format...

[Notes]
- Note one
- Note two
```

### 3. Clear and Explicit
- Use concise, accurate language
- Avoid ambiguity and vague expressions
- Clearly specify expected behavior and output

### 4. Hierarchical Organization
- Use Markdown headings to organize content hierarchy
- Use lists to present multiple points
- Use code blocks to show format examples

## Prompt Quality Checklist

After completing prompt writing, check the following points:

### Content Completeness
- [ ] Is the role or task clearly defined?
- [ ] Is the expected output clearly stated?
- [ ] Are necessary constraints and requirements included?
- [ ] Is sufficient context information provided?

### Structural Clarity
- [ ] Is a clear hierarchical structure used?
- [ ] Are formatting elements like lists and headings used?
- [ ] Is it easy to read and understand?

### Language Quality
- [ ] Is clear, accurate language used?
- [ ] Are ambiguity and vague expressions avoided?
- [ ] Is the grammar correct and expression fluent?

## Common Scenario Examples

### Code-Related
- Code review, code generation, code optimization, code explanation, debugging assistance

### Writing-Related
- Article writing, content rewriting, summary generation, title optimization, style conversion

### Analysis-Related
- Data analysis, text analysis, trend prediction, problem diagnosis, solution evaluation

### Creative-Related
- Brainstorming, idea generation, story creation, design suggestions, naming suggestions

### Education-Related
- Knowledge explanation, exercise generation, learning plans, concept explanation, case analysis

## Best Practices

1. **Ask Before Writing**: Before writing a prompt, fully understand the user's specific needs and use cases
2. **Iterative Optimization**: Continuously optimize the prompt based on actual usage effects
3. **Keep It Concise**: Avoid redundant information, every sentence should have a clear purpose
4. **Provide Examples**: Include input-output examples in the prompt to help understand expected effects
5. **Consider Boundaries**: Clearly define the scope and limitations of the prompt
6. **Use Markdown**: Fully utilize Markdown formatting to improve readability

## Naming and Categorization Suggestions

### Naming Conventions
- Use descriptive English names
- Use underscores to separate words: `code_review`, `data_analysis`
- Avoid special characters: `/ \ : * ? " < > |`

### Category Suggestions
- `coding` - Code-related
- `writing` - Writing-related
- `analysis` - Analysis-related
- `creative` - Creative-related
- `education` - Education-related
- `research` - Research-related
- `business` - Business-related
- `general` - General scenarios

## Notes

1. **File Tool Dependencies**: This tool needs to be used in conjunction with file tools (`create_file`, `update_file`, `rewrite_file`). If the user has not provided file tool permissions, please remind the user to enable file tools, otherwise prompt documents cannot be created or edited.
2. **File Path Conventions**: Prompt documents are uniformly stored in the `prompts/` directory, with filenames using the `.md` extension.
3. **Confirmation Before Registration**: Before using `register_prompt` to register a prompt, you must ensure the user is satisfied with the prompt content.
4. **Category Consistency**: Try to use existing categories in the system (current system categories: {{categories}}) to maintain consistency in the category system.
5. **Feedback-Driven**: Listen carefully to every piece of user feedback, make adjustments based on feedback until the user is satisfied.
'''
