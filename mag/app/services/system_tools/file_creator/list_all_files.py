"""
系统工具：list_all_files
列出本次会话创建的所有文件
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "list_all_files",
        "description": "列出本次会话创建的所有文件，返回文件名列表（含路径）。",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
}

async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """列出本次会话所有文件"""
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client

        conversation_id = kwargs.get("conversation_id")
        if not conversation_id:
            return {"success": False, "error": "缺少conversation_id参数", "total_count": 0, "files": []}

        documents = await mongodb_client.conversation_repository.get_all_files_metadata(conversation_id)
        files = [file["filename"] for file in documents.get("files", [])]

        return {"success": True, "total_count": len(files), "files": files}

    except Exception as e:
        logger.error(f"list_all_files 执行失败: {str(e)}")
        return {"success": False, "error": f"列出文件失败: {str(e)}", "total_count": 0, "files": []}
