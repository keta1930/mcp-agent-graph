"""
系统工具：update_file
更新文件（字符串替换）
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

TOOL_SCHEMA = {
    "zh": {
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
    },
    "en": {
        "type": "function",
        "function": {
            "name": "update_file",
            "description": "Can be used to update file content or summary. Uses string replacement mechanism: old_content must exist uniquely in the file and match exactly (including spaces, newlines, indentation). Suitable for small-scale modifications/insertions/additions/deletions of a paragraph or statement.",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "Filename to update (with path)"
                    },
                    "update_type": {
                        "type": "string",
                        "enum": ["content", "summary"],
                        "description": "Update type: 'content' updates file content, 'summary' updates file summary"
                    },
                    "old_content": {
                        "type": "string",
                        "description": "Original string to be replaced. Must exist uniquely in the file and match exactly (including all spaces, newlines, indentation)"
                    },
                    "new_content": {
                        "type": "string",
                        "description": "New string to replace with"
                    },
                    "log": {
                        "type": "string",
                        "description": "Log description for this operation"
                    }
                },
                "required": ["filename", "update_type", "old_content", "new_content", "log"]
            }
        }
    }
}

async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """更新文件（字符串替换）"""
    try:
        from app.infrastructure.database.mongodb.client import mongodb_client
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
        from app.services.system_tools.registry import get_current_language

        # 获取当前用户语言
        language = get_current_language()

        conversation_id = kwargs.get("conversation_id")
        filename = kwargs.get("filename", "")
        update_type = kwargs.get("update_type", "content")
        old_content = kwargs.get("old_content", "")
        new_content = kwargs.get("new_content", "")
        log = kwargs.get("log", "")
        agent = kwargs.get("agent", "assistant")

        if not conversation_id or not filename:
            if language == "en":
                message = "Missing required parameters: conversation_id or filename"
            else:
                message = "缺少必需参数：conversation_id或filename"
            return {"success": False, "message": message, "filename": filename}

        file_meta = await mongodb_client.conversation_repository.get_file_metadata(conversation_id, filename)
        if not file_meta:
            if language == "en":
                message = f"File does not exist: {filename}"
            else:
                message = f"文件不存在：{filename}"
            return {"success": False, "message": message, "filename": filename}

        if update_type == "content":
            current_content = await conversation_document_manager.read_file(
                user_id=user_id, conversation_id=conversation_id, filename=filename
            )

            if current_content is None:
                if language == "en":
                    message = f"Failed to read file content: {filename}"
                else:
                    message = f"读取文件内容失败：{filename}"
                return {"success": False, "message": message, "filename": filename}

            occurrences = current_content.count(old_content)
            if occurrences == 0:
                if language == "en":
                    message = "String to replace not found in file. Please ensure old_content matches exactly (including spaces, newlines, indentation)"
                    hint = "Check if spaces, tabs, and newlines are consistent. You can use read_file to view the actual file content first"
                else:
                    message = "在文件中未找到要替换的字符串。请确保old_content完全匹配（包括空格、换行符、缩进）"
                    hint = "检查空格、制表符、换行符是否一致。可以先使用read_file查看文件实际内容"
                return {
                    "success": False,
                    "message": message,
                    "filename": filename,
                    "hint": hint
                }
            elif occurrences > 1:
                if language == "en":
                    message = f"old_content appears {occurrences} times in the file, not unique. Please provide a more specific string to ensure uniqueness"
                    hint = "Recommend including more context code, such as a complete function definition"
                else:
                    message = f"old_content在文件中出现了{occurrences}次，不唯一。请提供更具体的字符串以确保唯一性"
                    hint = "建议包含更多上下文代码，例如完整的函数定义"
                return {
                    "success": False,
                    "message": message,
                    "filename": filename,
                    "occurrences": occurrences,
                    "hint": hint
                }

            new_file_content = current_content.replace(old_content, new_content, 1)

            minio_result = await conversation_document_manager.update_file(
                user_id=user_id, conversation_id=conversation_id, filename=filename, content=new_file_content
            )

            if not minio_result:
                if language == "en":
                    message = f"Failed to update file to storage: {filename}"
                else:
                    message = f"更新文件到存储失败：{filename}"
                return {"success": False, "message": message, "filename": filename}

            success = await mongodb_client.conversation_repository.update_file_metadata(
                conversation_id=conversation_id, filename=filename, size=minio_result["size"],
                version_id=minio_result["version_id"], log_comment=log, agent=agent
            )

            if language == "en":
                success_msg = f"Successfully updated file: {filename}"
                fail_msg = f"Failed to update file metadata: {filename}"
            else:
                success_msg = f"成功更新文件：{filename}"
                fail_msg = f"更新文件元数据失败：{filename}"

            return {"success": True, "message": success_msg, "filename": filename} if success else {
                "success": False, "message": fail_msg, "filename": filename}

        elif update_type == "summary":
            current_summary = file_meta.get("summary", "")
            if old_content != current_summary:
                if language == "en":
                    message = "Current summary does not match the provided old_content"
                else:
                    message = "当前摘要与提供的old_content不匹配"
                return {"success": False, "message": message, "filename": filename, "current_summary": current_summary}

            success = await mongodb_client.conversation_repository.update_file_metadata(
                conversation_id=conversation_id, filename=filename, summary=new_content, log_comment=log, agent=agent
            )

            if language == "en":
                success_msg = f"Successfully updated file summary: {filename}"
                fail_msg = f"Failed to update file summary: {filename}"
            else:
                success_msg = f"成功更新文件摘要：{filename}"
                fail_msg = f"更新文件摘要失败：{filename}"

            return {"success": True, "message": success_msg, "filename": filename} if success else {
                "success": False, "message": fail_msg, "filename": filename}

        else:
            if language == "en":
                message = f"Invalid update_type: {update_type}"
            else:
                message = f"无效的update_type：{update_type}"
            return {"success": False, "message": message, "filename": filename}

    except Exception as e:
        logger.error(f"update_file 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            message = f"Failed to update file: {str(e)}"
        else:
            message = f"更新文件失败：{str(e)}"
        return {"success": False, "message": message, "filename": kwargs.get("filename", "")}
