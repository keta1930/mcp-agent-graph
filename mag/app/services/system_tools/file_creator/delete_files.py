"""
系统工具：delete_files
删除一个或多个文件
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "delete_files",
            "description": "删除一个或多个文件。所有历史版本也会被删除。请谨慎使用此功能",
            "parameters": {
                "type": "object",
                "properties": {
                    "filenames": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "要删除的文件名列表（含路径），例如：['note/temp.md', 'code/test.py']"
                    },
                    "scope": {
                        "type": "string",
                        "enum": ["conversation", "project"],
                        "description": "文件来源，'conversation'表示会话文件，'project'表示项目共享文件（默认：conversation）"
                    }
                },
                "required": ["filenames"]
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "delete_files",
            "description": "Delete one or more files. All historical versions will also be deleted. Please use this feature with caution",
            "parameters": {
                "type": "object",
                "properties": {
                    "filenames": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "List of filenames to delete (with paths), for example: ['note/temp.md', 'code/test.py']"
                    },
                    "scope": {
                        "type": "string",
                        "enum": ["conversation", "project"],
                        "description": "File source, 'conversation' for session files, 'project' for project shared files (default: conversation)"
                    }
                },
                "required": ["filenames"]
            }
        }
    }
}

async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """删除文件，支持从conversation或project删除"""
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
        from app.infrastructure.storage.object_storage.project_document_manager import project_document_manager
        from app.services.system_tools.registry import get_current_language

        # 获取当前用户语言
        language = get_current_language()

        conversation_id = kwargs.get("conversation_id")
        filenames = kwargs.get("filenames", [])
        scope = kwargs.get("scope", "conversation")  # 默认为conversation

        if not conversation_id:
            if language == "en":
                message = "Missing conversation_id parameter"
            else:
                message = "缺少conversation_id参数"
            return {"success": False, "message": message, "deleted_count": 0, "deleted_files": [], "failed_files": []}

        # 获取conversation的project_id（用于project scope验证）
        conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
        project_id = conversation.get("project_id") if conversation else None

        # 根据scope选择repository和document_manager
        if scope == "project":
            if not project_id:
                if language == "en":
                    message = "Conversation does not belong to any project"
                else:
                    message = "会话不属于任何项目"
                return {"success": False, "message": message, "deleted_count": 0, "deleted_files": [], "failed_files": []}

            repository = mongodb_client.project_repository
            document_manager = project_document_manager
            resource_id = project_id
        else:
            repository = mongodb_client.conversation_repository
            document_manager = conversation_document_manager
            resource_id = conversation_id

        deleted_files = []
        failed_files = []

        for filename in filenames:
            try:
                # 根据scope选择正确的document_manager删除文件
                if scope == "project":
                    minio_success = await document_manager.delete_file(
                        user_id=user_id, project_id=resource_id, filename=filename
                    )
                else:
                    minio_success = await document_manager.delete_file(
                        user_id=user_id, conversation_id=resource_id, filename=filename
                    )

                if not minio_success:
                    if language == "en":
                        error = "Failed to delete storage file"
                    else:
                        error = "删除存储文件失败"
                    failed_files.append({"filename": filename, "error": error})
                    continue

                meta_success = await repository.remove_file_metadata(
                    resource_id=resource_id, filename=filename
                )

                if meta_success:
                    deleted_files.append(filename)
                else:
                    if language == "en":
                        error = "Failed to delete file metadata"
                    else:
                        error = "删除文件元数据失败"
                    failed_files.append({"filename": filename, "error": error})

            except Exception as e:
                failed_files.append({"filename": filename, "error": str(e)})

        success = len(failed_files) == 0
        if language == "en":
            message = f"Successfully deleted {len(deleted_files)} file(s)" if success else "Some files failed to delete"
        else:
            message = f"成功删除{len(deleted_files)}个文件" if success else "部分文件删除失败"

        return {
            "success": success,
            "message": message,
            "deleted_count": len(deleted_files),
            "deleted_files": deleted_files,
            "failed_files": failed_files
        }

    except Exception as e:
        logger.error(f"delete_files 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            message = f"Failed to delete files: {str(e)}"
        else:
            message = f"删除文件失败：{str(e)}"
        return {"success": False, "message": message, "deleted_count": 0, "deleted_files": [], "failed_files": [{"error": str(e)}]}
