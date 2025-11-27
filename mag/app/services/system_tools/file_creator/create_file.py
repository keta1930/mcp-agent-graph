"""
系统工具：create_file
创建新文件
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format)
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "create_file",
            "description": "创建新文件。文件名支持目录结构。只支持文本文件。",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "文件名，例如：'note/user_preferences.md', 'code/src/main.py', 'README.md'"
                    },
                    "summary": {
                        "type": "string",
                        "description": "摘要，用于描述文件的主要内容或用途。"
                    },
                    "content": {
                        "type": "string",
                        "description": "文件的完整内容"
                    },
                    "log": {
                        "type": "string",
                        "description": "本次操作的日志，简短记录。例如：'初始化配置文件'、'创建API文档'"
                    }
                },
                "required": ["filename", "summary", "content", "log"]
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "create_file",
            "description": "Create a new file. Filename supports directory structure. Only text files are supported.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "Filename, for example: 'note/user_preferences.md', 'code/src/main.py', 'README.md'"
                    },
                    "summary": {
                        "type": "string",
                        "description": "Summary describing the main content or purpose of the file."
                    },
                    "content": {
                        "type": "string",
                        "description": "Complete content of the file"
                    },
                    "log": {
                        "type": "string",
                        "description": "Log for this operation, brief record. For example: 'Initialize configuration file', 'Create API documentation'"
                    }
                },
                "required": ["filename", "summary", "content", "log"]
            }
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    创建新文件

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（conversation_id, filename, summary, content, log）

    Returns:
        {
            "success": True,
            "message": "成功创建文件：...",
            "filename": "..."
        }
    """
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
        from ._common import validate_filename
        from app.services.system_tools.registry import get_current_language

        # 获取当前用户语言
        language = get_current_language()

        conversation_id = kwargs.get("conversation_id")
        filename = kwargs.get("filename", "")
        summary = kwargs.get("summary", "")
        content = kwargs.get("content", "")
        log = kwargs.get("log", "")
        agent = kwargs.get("agent_id", "assistant")

        if not conversation_id or not filename:
            if language == "en":
                message = "Missing required parameters: conversation_id or filename"
            else:
                message = "缺少必需参数：conversation_id或filename"
            return {
                "success": False,
                "message": message,
                "filename": filename
            }

        # 验证文件名
        is_valid, error_msg = validate_filename(filename)
        if not is_valid:
            return {
                "success": False,
                "message": error_msg,
                "filename": filename
            }

        # 检查文件是否已存在
        file_exists = await mongodb_client.conversation_repository.file_exists(conversation_id, filename)
        if file_exists:
            if language == "en":
                message = f"File already exists: {filename}. Please use update_file or rewrite_file to modify existing files"
            else:
                message = f"文件已存在：{filename}。请使用 update_file 或 rewrite_file 来修改现有文件"
            return {
                "success": False,
                "message": message,
                "filename": filename
            }

        # 创建文件到MinIO
        minio_result = await conversation_document_manager.create_file(
            user_id=user_id,
            conversation_id=conversation_id,
            filename=filename,
            content=content
        )

        if not minio_result:
            if language == "en":
                message = f"Failed to create file in storage: {filename}"
            else:
                message = f"创建文件到存储失败：{filename}"
            return {
                "success": False,
                "message": message,
                "filename": filename
            }

        # 添加元数据到MongoDB
        success = await mongodb_client.conversation_repository.add_file_metadata(
            conversation_id=conversation_id,
            filename=filename,
            summary=summary,
            size=minio_result["size"],
            version_id=minio_result["version_id"],
            agent=agent,
            comment=log
        )

        if success:
            if language == "en":
                message = f"Successfully created file: {filename}"
            else:
                message = f"成功创建文件：{filename}"
            return {
                "success": True,
                "message": message,
                "filename": filename
            }
        else:
            if language == "en":
                message = f"Failed to create file metadata: {filename}"
            else:
                message = f"创建文件元数据失败：{filename}"
            return {
                "success": False,
                "message": message,
                "filename": filename
            }

    except Exception as e:
        logger.error(f"create_file 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            message = f"Failed to create file: {str(e)}"
        else:
            message = f"创建文件失败：{str(e)}"
        return {
            "success": False,
            "message": message,
            "filename": kwargs.get("filename", "")
        }
