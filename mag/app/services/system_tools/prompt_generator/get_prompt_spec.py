"""
系统工具：get_prompt_spec
获取 Prompt 创建规范文档
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
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
        # 获取所有已有的提示词，提取分类
        from app.services.prompt.prompt_service import prompt_service
        
        result = await prompt_service.list_prompts(user_id)
        categories = set()
        
        if result.get("success") and result.get("data"):
            prompts = result["data"].get("prompts", [])
            for prompt in prompts:
                if isinstance(prompt, dict) and prompt.get("category"):
                    categories.add(prompt["category"])
        
        # 将分类列表格式化为字符串
        if categories:
            categories_str = ", ".join([f'"{cat}"' for cat in sorted(categories)])
        else:
            categories_str = "暂无分类"
        
        # 替换占位符
        spec_content = _PROMPT_SPEC.replace("{{categories}}", categories_str)
        
        return {
            "success": True,
            "spec": spec_content,
            "message": f"成功获取Prompt创建规范，系统中已有 {len(categories)} 个分类"
        }

    except Exception as e:
        logger.error(f"get_prompt_spec 执行失败: {str(e)}")
        return {
            "success": False,
            "message": f"获取Prompt创建规范失败：{str(e)}",
            "spec": None
        }

_PROMPT_SPEC = '''
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
