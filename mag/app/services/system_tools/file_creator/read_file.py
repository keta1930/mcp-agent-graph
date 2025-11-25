"""
系统工具：read_file
批量读取一个或多个文件
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "批量读取一个或多个文件，每个文件可独立指定需要读取的字段（logs、summary、content）。支持一次调用读取多个文件。",
            "parameters": {
                "type": "object",
                "properties": {
                    "files": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "filename": {
                                    "type": "string",
                                    "description": "文件名（含路径）"
                                },
                                "fields": {
                                    "type": "array",
                                    "items": {
                                        "type": "string",
                                        "enum": ["logs", "summary", "content"]
                                    },
                                    "description": "要读取的字段列表，可选：'logs'（操作日志）、'summary'（摘要）、'content'（内容）"
                                }
                            },
                            "required": ["filename", "fields"]
                        },
                        "description": "要读取的文件列表，每个文件指定文件名和需要读取的字段"
                    }
                },
                "required": ["files"]
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Batch read one or more files, each file can independently specify the fields to read (logs, summary, content). Supports reading multiple files in one call.",
            "parameters": {
                "type": "object",
                "properties": {
                    "files": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "filename": {
                                    "type": "string",
                                    "description": "Filename (with path)"
                                },
                                "fields": {
                                    "type": "array",
                                    "items": {
                                        "type": "string",
                                        "enum": ["logs", "summary", "content"]
                                    },
                                    "description": "List of fields to read, options: 'logs' (operation logs), 'summary' (summary), 'content' (content)"
                                }
                            },
                            "required": ["filename", "fields"]
                        },
                        "description": "List of files to read, each file specifies filename and fields to read"
                    }
                },
                "required": ["files"]
            }
        }
    }
}

async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """批量读取文件"""
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
        from app.services.system_tools.registry import get_current_language

        # 获取当前用户语言
        language = get_current_language()

        conversation_id = kwargs.get("conversation_id")
        files = kwargs.get("files", [])

        if not conversation_id:
            if language == "en":
                error = "Missing conversation_id parameter"
            else:
                error = "缺少conversation_id参数"
            return {"success": False, "error": error, "files": []}

        result_files = []

        for file_req in files:
            filename = file_req["filename"]
            fields = file_req["fields"]

            file_data = {"filename": filename}

            # 获取元数据（如果需要logs或summary）
            if "logs" in fields or "summary" in fields:
                file_meta = await mongodb_client.conversation_repository.get_file_metadata(conversation_id, filename)
                if not file_meta:
                    if language == "en":
                        file_data["error"] = f"File does not exist: {filename}"
                    else:
                        file_data["error"] = f"文件不存在：{filename}"
                    result_files.append(file_data)
                    continue

                if "logs" in fields:
                    file_data["logs"] = file_meta.get("logs", [])
                if "summary" in fields:
                    file_data["summary"] = file_meta.get("summary", "")

            # 读取内容（如果需要）
            if "content" in fields:
                content = await conversation_document_manager.read_file(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    filename=filename
                )
                if content is None:
                    if language == "en":
                        file_data["error"] = f"Failed to read file content: {filename}"
                    else:
                        file_data["error"] = f"读取文件内容失败：{filename}"
                else:
                    file_data["content"] = content

            result_files.append(file_data)

        return {"success": True, "files": result_files}

    except Exception as e:
        logger.error(f"read_file 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error = f"Failed to read files: {str(e)}"
        else:
            error = f"读取文件失败: {str(e)}"
        return {"success": False, "error": error, "files": []}
