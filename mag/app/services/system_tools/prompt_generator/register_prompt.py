"""
系统工具：register_prompt
从 Markdown 文档中读取内容并注册为 Prompt
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format - 多语言格式）
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "register_prompt",
            "description": "将提示词文档注册到系统中",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "提示词文档名称（含路径），例如：'prompt/code_review.md'"
                    },
                    "category": {
                        "type": "string",
                        "description": "Prompt 类别，可包含中文、英文字母、数字、连字符和下划线，例如：'代码审查'、'writing'、'analysis'"
                    }
                },
                "required": ["filename", "category"]
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "register_prompt",
            "description": "Register a prompt document to the system",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "Prompt document name (with path), for example: 'prompt/code_review.md'"
                    },
                    "category": {
                        "type": "string",
                        "description": "Prompt category, can contain Chinese, English letters, numbers, hyphens and underscores, for example: 'code review', 'writing', 'analysis'"
                    }
                },
                "required": ["filename", "category"]
            }
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    从 Markdown 文档中读取内容并注册为 Prompt

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（conversation_id, filename, category）

    Returns:
        {
            "success": True,
            "prompt_name": "prompt_name",
            "message": "Prompt 注册成功"
        }
    """
    try:
        # 获取当前用户语言
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
        from app.services.prompt.prompt_service import prompt_service
        from app.models.prompt_schema import PromptCreate, PromptUpdate
        import os

        conversation_id = kwargs.get("conversation_id")
        filename = kwargs.get("filename", "")
        category = kwargs.get("category", "")

        # 1. 验证必需参数
        if not conversation_id:
            if language == "en":
                error_message = "Missing required parameter: conversation_id"
            else:
                error_message = "缺少必需参数：conversation_id"
            return {
                "success": False,
                "message": error_message,
                "prompt_name": None
            }

        if not filename:
            if language == "en":
                error_message = "Missing required parameter: filename"
            else:
                error_message = "缺少必需参数：filename"
            return {
                "success": False,
                "message": error_message,
                "prompt_name": None
            }

        if not category:
            if language == "en":
                error_message = "Missing required parameter: category"
            else:
                error_message = "缺少必需参数：category"
            return {
                "success": False,
                "message": error_message,
                "prompt_name": None
            }

        # 2. 从文件名提取 Prompt 名称（去除路径和扩展名）
        prompt_name = os.path.splitext(os.path.basename(filename))[0]
        
        if not prompt_name:
            if language == "en":
                error_message = f"Unable to extract Prompt name from filename: {filename}"
            else:
                error_message = f"无法从文件名提取 Prompt 名称：{filename}"
            return {
                "success": False,
                "message": error_message,
                "prompt_name": None
            }

        logger.info(f"从文件名 '{filename}' 提取 Prompt 名称: {prompt_name}")

        # 3. 读取 Markdown 文档内容
        logger.info(f"正在读取 Markdown 文档: {filename}")
        content = await conversation_document_manager.read_file(
            user_id=user_id,
            conversation_id=conversation_id,
            filename=filename
        )

        if content is None:
            if language == "en":
                error_message = f"Failed to read document or document does not exist: {filename}"
            else:
                error_message = f"读取文档失败或文档不存在：{filename}"
            return {
                "success": False,
                "message": error_message,
                "prompt_name": None
            }

        # 4. 验证内容不为空
        if not content.strip():
            if language == "en":
                error_message = f"Document content is empty: {filename}"
            else:
                error_message = f"文档内容为空：{filename}"
            return {
                "success": False,
                "message": error_message,
                "prompt_name": None
            }

        logger.info(f"成功读取文档内容，长度: {len(content)} 字符")

        # 5. 检查 Prompt 是否已存在
        existing_result = await prompt_service.get_prompt_content_only(prompt_name, user_id)
        
        if existing_result.get("success"):
            logger.warning(f"Prompt 已存在: {prompt_name}，将进行更新")
            # 更新现有 Prompt
            try:
                update_data = PromptUpdate(
                    content=content,
                    category=category
                )
                result = await prompt_service.update_prompt(
                    name=prompt_name,
                    update_data=update_data,
                    user_id=user_id
                )
                
                if result.get("success"):
                    logger.info(f"成功更新 Prompt: {prompt_name}")
                    if language == "en":
                        success_message = f"Prompt '{prompt_name}' updated successfully (category: {category})"
                    else:
                        success_message = f"Prompt '{prompt_name}' 更新成功（分类: {category}）"
                    return {
                        "success": True,
                        "prompt_name": prompt_name,
                        "message": success_message
                    }
                else:
                    if language == "en":
                        error_message = f"Failed to update Prompt: {result.get('message', 'Unknown error')}"
                    else:
                        error_message = f"更新 Prompt 失败: {result.get('message', '未知错误')}"
                    return {
                        "success": False,
                        "message": error_message,
                        "prompt_name": None
                    }
            except Exception as e:
                logger.error(f"更新 Prompt 失败: {str(e)}")
                if language == "en":
                    error_message = f"Failed to update Prompt: {str(e)}"
                else:
                    error_message = f"更新 Prompt 失败: {str(e)}"
                return {
                    "success": False,
                    "message": error_message,
                    "prompt_name": None
                }
        
        # 6. 创建新 Prompt
        logger.info(f"正在创建 Prompt: {prompt_name}，分类: {category}")
        try:
            prompt_data = PromptCreate(
                name=prompt_name,
                content=content,
                category=category
            )
            result = await prompt_service.create_prompt(
                prompt_data=prompt_data,
                user_id=user_id
            )

            if result.get("success"):
                logger.info(f"成功创建 Prompt: {prompt_name}")
                if language == "en":
                    success_message = f"Prompt '{prompt_name}' registered successfully (category: {category})"
                else:
                    success_message = f"Prompt '{prompt_name}' 注册成功（分类: {category}）"
                return {
                    "success": True,
                    "prompt_name": prompt_name,
                    "message": success_message
                }
            else:
                if language == "en":
                    error_message = f"Failed to create Prompt: {result.get('message', 'Unknown error')}"
                else:
                    error_message = f"创建 Prompt 失败: {result.get('message', '未知错误')}"
                return {
                    "success": False,
                    "message": error_message,
                    "prompt_name": None
                }
        except Exception as e:
            logger.error(f"创建 Prompt 失败: {str(e)}")
            if language == "en":
                error_message = f"Failed to create Prompt: {str(e)}"
            else:
                error_message = f"创建 Prompt 失败: {str(e)}"
            return {
                "success": False,
                "message": error_message,
                "prompt_name": None
            }

    except Exception as e:
        logger.error(f"register_prompt 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_message = f"Failed to register Prompt: {str(e)}"
        else:
            error_message = f"注册 Prompt 失败：{str(e)}"
        
        return {
            "success": False,
            "message": error_message,
            "prompt_name": None
        }
