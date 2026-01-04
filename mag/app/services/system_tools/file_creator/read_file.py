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
            "description": "批量读取一个或多个文件，每个文件可独立指定需要读取的字段（logs、summary、content）和来源（conversation/project）。支持一次调用读取多个文件。",
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
                                },
                                "scope": {
                                    "type": "string",
                                    "enum": ["conversation", "project"],
                                    "description": "文件来源，'conversation'表示会话文件，'project'表示项目共享文件（默认：conversation）"
                                }
                            },
                            "required": ["filename", "fields"]
                        },
                        "description": "要读取的文件列表，每个文件指定文件名、字段和来源"
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
            "description": "Batch read one or more files, each file can independently specify the fields to read (logs, summary, content) and source (conversation/project). Supports reading multiple files in one call.",
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
                                },
                                "scope": {
                                    "type": "string",
                                    "enum": ["conversation", "project"],
                                    "description": "File source, 'conversation' for session files, 'project' for project shared files (default: conversation)"
                                }
                            },
                            "required": ["filename", "fields"]
                        },
                        "description": "List of files to read, each file specifies filename, fields, and source"
                    }
                },
                "required": ["files"]
            }
        }
    }
}

async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """批量读取文件，支持从conversation或project读取"""
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
        from app.infrastructure.storage.object_storage.project_document_manager import project_document_manager
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

        # 获取conversation的project_id（用于project scope验证）
        conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
        project_id = conversation.get("project_id") if conversation else None

        result_files = []

        for file_req in files:
            filename = file_req["filename"]
            fields = file_req["fields"]
            scope = file_req.get("scope", "conversation")  # 默认为conversation

            file_data = {"filename": filename, "scope": scope}

            # 根据scope选择repository和document_manager
            if scope == "project":
                if not project_id:
                    if language == "en":
                        file_data["error"] = "Conversation does not belong to any project"
                    else:
                        file_data["error"] = "会话不属于任何项目"
                    result_files.append(file_data)
                    continue

                repository = mongodb_client.project_repository
                document_manager = project_document_manager
                resource_id = project_id
            else:
                repository = mongodb_client.conversation_repository
                document_manager = conversation_document_manager
                resource_id = conversation_id

            # 获取元数据（如果需要logs或summary）
            if "logs" in fields or "summary" in fields:
                if scope == "project":
                    file_meta = await repository.get_file_metadata(resource_id, filename)
                else:
                    file_meta = await repository.get_file_metadata(resource_id, filename)

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
                if scope == "project":
                    content = await document_manager.read_file(
                        user_id=user_id,
                        project_id=resource_id,
                        filename=filename
                    )
                else:
                    content = await document_manager.read_file(
                        user_id=user_id,
                        conversation_id=resource_id,
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
