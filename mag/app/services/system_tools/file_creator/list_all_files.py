"""
系统工具：list_all_files
列出本次会话创建的所有文件
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "list_all_files",
            "description": "列出本次会话创建的所有文件，以及所属项目的共享文件（如果有）。返回文件列表，每个文件包含文件名和来源（conversation/project）。",
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
            "name": "list_all_files",
            "description": "List all files created in this session, and shared files from the project (if any). Returns a list of files, each containing filename and source (conversation/project).",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
}

async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """列出本次会话所有文件，包含project共享文件（如果有）"""
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.services.system_tools.registry import get_current_language

        # 获取当前用户语言
        language = get_current_language()

        conversation_id = kwargs.get("conversation_id")
        if not conversation_id:
            if language == "en":
                error = "Missing conversation_id parameter"
            else:
                error = "缺少conversation_id参数"
            return {"success": False, "error": error, "total_count": 0, "files": []}

        # 获取conversation文件
        documents = await mongodb_client.conversation_repository.get_all_files_metadata(conversation_id)
        conversation_files = [
            {"filename": file["filename"], "source": "conversation"}
            for file in documents.get("files", [])
        ]

        # 检查是否属于project
        conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
        project_files = []
        project_id = None

        if conversation and conversation.get("project_id"):
            project_id = conversation.get("project_id")
            project_docs = await mongodb_client.project_repository.get_all_files_metadata(project_id)
            project_files = [
                {"filename": file["filename"], "source": "project"}
                for file in project_docs.get("files", [])
            ]

        # 合并文件列表
        all_files = conversation_files + project_files

        return {
            "success": True,
            "total_count": len(all_files),
            "files": all_files,
            "project_id": project_id
        }

    except Exception as e:
        logger.error(f"list_all_files 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()

        if language == "en":
            error = f"Failed to list files: {str(e)}"
        else:
            error = f"列出文件失败: {str(e)}"
        return {"success": False, "error": error, "total_count": 0, "files": []}
