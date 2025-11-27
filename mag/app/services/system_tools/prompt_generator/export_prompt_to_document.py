"""
系统工具：export_prompt_to_document
将现有 Prompt 内容导出为 Markdown 文档
"""
import logging
from typing import Dict, Any
from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
from app.infrastructure.database.mongodb.client import mongodb_client

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format)
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "export_prompt_to_document",
            "description": "将现有Prompt内容导出为Markdown文档，保存到对话文档系统中。导出的文档可以在文件系统中查看和编辑，用于优化提示词。",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt_name": {
                        "type": "string",
                        "description": "要导出的Prompt名称"
                    },
                    "filename": {
                        "type": "string",
                        "description": "导出的文档名称（含路径），例如：'prompt/code_review.md'。如果不提供，将使用默认名称 'prompt/{prompt_name}.md'"
                    }
                },
                "required": ["prompt_name"]
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "export_prompt_to_document",
            "description": "Export existing Prompt content as a Markdown document and save it to the conversation document system. The exported document can be viewed and edited in the file system for prompt optimization.",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt_name": {
                        "type": "string",
                        "description": "Name of the Prompt to export"
                    },
                    "filename": {
                        "type": "string",
                        "description": "Name of the exported document (with path), for example: 'prompt/code_review.md'. If not provided, the default name 'prompt/{prompt_name}.md' will be used"
                    }
                },
                "required": ["prompt_name"]
            }
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    将Prompt导出为Markdown文档
    
    Args:
        user_id: 用户ID
        prompt_name: Prompt名称
        filename: 文档名称（可选）
        conversation_id: 对话ID
        
    Returns:
        {
            "success": True,
            "filename": "prompt/code_review.md",
            "prompt_name": "code_review",
            "category": "coding",
            "message": "成功导出Prompt到文档"
        }
    """
    try:
        from app.services.prompt.prompt_service import prompt_service
        
        # 获取当前用户语言
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        # 验证必需参数
        prompt_name = kwargs.get("prompt_name")
        conversation_id = kwargs.get("conversation_id")
        agent = kwargs.get("agent_id", "assistant")

        if not prompt_name:
            logger.error("缺少必需参数：prompt_name")
            if language == "en":
                error_message = "Missing required parameter: prompt_name"
            else:
                error_message = "缺少必需参数：prompt_name"
            return {
                "success": False,
                "message": error_message
            }

        # 生成文件名（如果未提供）
        filename = kwargs.get("filename")
        if not filename:
            filename = f"prompt/{prompt_name}.md"
        
        # 从 prompt_service 获取 Prompt 内容
        result = await prompt_service.get_prompt_content_only(prompt_name, user_id)
        
        if not result.get("success"):
            logger.warning(f"Prompt不存在或无权访问: {prompt_name}")
            if language == "en":
                error_message = f"No access to Prompt or Prompt does not exist: {prompt_name}"
            else:
                error_message = f"无权访问Prompt或Prompt不存在: {prompt_name}"
            return {
                "success": False,
                "message": error_message
            }
        
        # 提取内容
        prompt_data = result.get("data", {})
        content = prompt_data.get("content", "")
        
        if not content:
            logger.warning(f"Prompt内容为空: {prompt_name}")
            if language == "en":
                error_message = f"Prompt content is empty: {prompt_name}"
            else:
                error_message = f"Prompt内容为空: {prompt_name}"
            return {
                "success": False,
                "message": error_message
            }
        
        # 检查文件是否已存在
        file_exists = await mongodb_client.conversation_repository.file_exists(
            conversation_id, filename
        )
        
        if file_exists:
            # 文件已存在，更新文件
            minio_result = await conversation_document_manager.update_file(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename,
                content=content
            )
            
            if not minio_result:
                logger.error(f"更新文档失败: {filename}")
                if language == "en":
                    error_message = f"Failed to update document: {filename}"
                else:
                    error_message = f"更新文档失败: {filename}"
                return {
                    "success": False,
                    "message": error_message
                }
            
            # 更新元数据
            summary = f"导出Prompt: {prompt_name}"
            
            success = await mongodb_client.conversation_repository.update_file_metadata(
                conversation_id=conversation_id,
                filename=filename,
                summary=summary,
                size=minio_result["size"],
                version_id=minio_result["version_id"],
                log_comment=summary,
                agent=agent
            )
            
            if not success:
                logger.warning(f"更新文件元数据失败: {filename}")
            
            logger.info(f"成功更新Prompt文档: {filename}")
            if language == "en":
                success_message = f"Successfully exported prompt: {prompt_name} to document: {filename}"
            else:
                success_message = f"成功导出提示词：{prompt_name}到文档: {filename}"
            return {
                "success": True,
                "message": success_message
            }
        else:
            # 文件不存在，创建新文件
            minio_result = await conversation_document_manager.create_file(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename,
                content=content
            )
            
            if not minio_result:
                logger.error(f"创建文档失败: {filename}")
                if language == "en":
                    error_message = f"Failed to create document: {filename}"
                else:
                    error_message = f"创建文档失败: {filename}"
                return {
                    "success": False,
                    "message": error_message
                }
            
            # 添加元数据到 MongoDB
            summary = f"Prompt内容: {prompt_name}"
            
            success = await mongodb_client.conversation_repository.add_file_metadata(
                conversation_id=conversation_id,
                filename=filename,
                summary=summary,
                size=minio_result["size"],
                version_id=minio_result["version_id"],
                agent=agent,
                comment=summary
            )
            
            if not success:
                logger.warning(f"添加文件元数据失败: {filename}")
            
            logger.info(f"成功导出Prompt到文档: {filename}")
            if language == "en":
                success_message = f"Successfully exported prompt {prompt_name} to document: {filename}"
            else:
                success_message = f"成功导出提示词{prompt_name}到文档: {filename}"
            return {
                "success": True,
                "message": success_message
            }
        
    except Exception as e:
        logger.error(f"export_prompt_to_document 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_message = f"Failed to export Prompt: {str(e)}"
        else:
            error_message = f"导出Prompt失败: {str(e)}"
        
        return {
            "success": False,
            "message": error_message
        }
