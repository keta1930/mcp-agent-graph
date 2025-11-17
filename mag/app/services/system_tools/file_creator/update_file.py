"""
系统工具：update_file
更新文件（字符串替换）
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "update_file",
        "description": "可用于更新文件内容或摘要。使用字符串替换机制：old_content必须在文件中唯一存在且完全匹配（包括空格、换行、缩进）。适用于小范围修改/插入/新增/删除某一个段落或语句。",
        "parameters": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "要更新的文件名（含路径）"
                },
                "update_type": {
                    "type": "string",
                    "enum": ["content", "summary"],
                    "description": "更新类型：'content'更新文件内容，'summary'更新文件摘要"
                },
                "old_content": {
                    "type": "string",
                    "description": "要被替换的原始字符串。必须在文件中唯一存在且完全匹配（包括所有空格、换行符、缩进）"
                },
                "new_content": {
                    "type": "string",
                    "description": "用于替换的新字符串"
                },
                "log": {
                    "type": "string",
                    "description": "本次操作的日志说明"
                }
            },
            "required": ["filename", "update_type", "old_content", "new_content", "log"]
        }
    }
}

async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """更新文件（字符串替换）"""
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager

        conversation_id = kwargs.get("conversation_id")
        filename = kwargs.get("filename", "")
        update_type = kwargs.get("update_type", "content")
        old_content = kwargs.get("old_content", "")
        new_content = kwargs.get("new_content", "")
        log = kwargs.get("log", "")
        agent = kwargs.get("agent", "assistant")

        if not conversation_id or not filename:
            return {"success": False, "message": "缺少必需参数：conversation_id或filename", "filename": filename}

        file_meta = await mongodb_client.conversation_repository.get_file_metadata(conversation_id, filename)
        if not file_meta:
            return {"success": False, "message": f"文件不存在：{filename}", "filename": filename}

        if update_type == "content":
            current_content = await conversation_document_manager.read_file(
                user_id=user_id, conversation_id=conversation_id, filename=filename
            )

            if current_content is None:
                return {"success": False, "message": f"读取文件内容失败：{filename}", "filename": filename}

            occurrences = current_content.count(old_content)
            if occurrences == 0:
                return {
                    "success": False,
                    "message": "在文件中未找到要替换的字符串。请确保old_content完全匹配（包括空格、换行符、缩进）",
                    "filename": filename,
                    "hint": "检查空格、制表符、换行符是否一致。可以先使用read_file查看文件实际内容"
                }
            elif occurrences > 1:
                return {
                    "success": False,
                    "message": f"old_content在文件中出现了{occurrences}次，不唯一。请提供更具体的字符串以确保唯一性",
                    "filename": filename,
                    "occurrences": occurrences,
                    "hint": "建议包含更多上下文代码，例如完整的函数定义"
                }

            new_file_content = current_content.replace(old_content, new_content, 1)

            minio_result = await conversation_document_manager.update_file(
                user_id=user_id, conversation_id=conversation_id, filename=filename, content=new_file_content
            )

            if not minio_result:
                return {"success": False, "message": f"更新文件到存储失败：{filename}", "filename": filename}

            success = await mongodb_client.conversation_repository.update_file_metadata(
                conversation_id=conversation_id, filename=filename, size=minio_result["size"],
                version_id=minio_result["version_id"], log_comment=log, agent=agent
            )

            return {"success": True, "message": f"成功更新文件：{filename}", "filename": filename} if success else {
                "success": False, "message": f"更新文件元数据失败：{filename}", "filename": filename}

        elif update_type == "summary":
            current_summary = file_meta.get("summary", "")
            if old_content != current_summary:
                return {"success": False, "message": "当前摘要与提供的old_content不匹配", "filename": filename, "current_summary": current_summary}

            success = await mongodb_client.conversation_repository.update_file_metadata(
                conversation_id=conversation_id, filename=filename, summary=new_content, log_comment=log, agent=agent
            )

            return {"success": True, "message": f"成功更新文件摘要：{filename}", "filename": filename} if success else {
                "success": False, "message": f"更新文件摘要失败：{filename}", "filename": filename}

        else:
            return {"success": False, "message": f"无效的update_type：{update_type}", "filename": filename}

    except Exception as e:
        logger.error(f"update_file 执行失败: {str(e)}")
        return {"success": False, "message": f"更新文件失败：{str(e)}", "filename": kwargs.get("filename", "")}
