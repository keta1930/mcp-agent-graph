"""
系统工具：rewrite_file
完全重写文件
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "rewrite_file",
        "description": "完全重写文件，提供新的完整内容和摘要。适用于大范围修改、结构性变更或多处修改。",
        "parameters": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "要重写的文件名（含路径）"
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
                    "description": "本次操作的日志说明，需要简短记录"
                }
            },
            "required": ["filename", "summary", "content", "log"]
        }
    }
}

async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """完全重写文件"""
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager

        conversation_id = kwargs.get("conversation_id")
        filename = kwargs.get("filename", "")
        summary = kwargs.get("summary", "")
        content = kwargs.get("content", "")
        log = kwargs.get("log", "")
        agent = kwargs.get("agent", "assistant")

        if not conversation_id or not filename:
            return {"success": False, "message": "缺少必需参数：conversation_id或filename", "filename": filename}

        file_exists = await mongodb_client.conversation_repository.file_exists(conversation_id, filename)
        if not file_exists:
            return {"success": False, "message": f"文件不存在：{filename}", "filename": filename}

        minio_result = await conversation_document_manager.update_file(
            user_id=user_id, conversation_id=conversation_id, filename=filename, content=content
        )

        if not minio_result:
            return {"success": False, "message": f"重写文件到存储失败：{filename}", "filename": filename}

        success = await mongodb_client.conversation_repository.update_file_metadata(
            conversation_id=conversation_id, filename=filename, summary=summary,
            size=minio_result["size"], version_id=minio_result["version_id"], log_comment=log, agent=agent
        )

        return {"success": True, "message": f"成功重写文件：{filename}", "filename": filename} if success else {
            "success": False, "message": f"更新文件元数据失败：{filename}", "filename": filename}

    except Exception as e:
        logger.error(f"rewrite_file 执行失败: {str(e)}")
        return {"success": False, "message": f"重写文件失败：{str(e)}", "filename": kwargs.get("filename", "")}
