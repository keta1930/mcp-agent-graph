"""
系统工具：list_files_by_directory
列出指定目录下的所有文件
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "list_files_by_directory",
        "description": "列出指定目录下的所有文件（包含子目录），返回文件名列表。",
        "parameters": {
            "type": "object",
            "properties": {
                "directory": {
                    "type": "string",
                    "description": "目录路径，例如：'note', 'code/src', 'docs/api'。"
                }
            },
            "required": ["directory"]
        }
    }
}

async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """列出指定目录下的文件"""
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client

        conversation_id = kwargs.get("conversation_id")
        directory = kwargs.get("directory", "")

        if not conversation_id:
            return {"success": False, "error": "缺少conversation_id参数", "directory": directory, "file_count": 0, "files": []}

        await mongodb_client.conversation_repository.initialize_documents_field(conversation_id)
        documents = await mongodb_client.conversation_repository.get_all_files_metadata(conversation_id)

        directory_normalized = directory.rstrip('/')
        filtered_files = []
        for file in documents.get("files", []):
            filename = file["filename"]
            if filename.startswith(directory_normalized + '/') or filename.startswith(directory_normalized):
                filtered_files.append(filename)

        return {"success": True, "directory": directory, "file_count": len(filtered_files), "files": filtered_files}

    except Exception as e:
        logger.error(f"list_files_by_directory 执行失败: {str(e)}")
        return {"success": False, "error": f"列出目录文件失败: {str(e)}", "directory": kwargs.get("directory", ""), "file_count": 0, "files": []}
