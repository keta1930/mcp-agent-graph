"""
系统工具：create_file
创建新文件
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
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

        conversation_id = kwargs.get("conversation_id")
        filename = kwargs.get("filename", "")
        summary = kwargs.get("summary", "")
        content = kwargs.get("content", "")
        log = kwargs.get("log", "")
        agent = kwargs.get("agent_id", "assistant")

        if not conversation_id or not filename:
            return {
                "success": False,
                "message": "缺少必需参数：conversation_id或filename",
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
            return {
                "success": False,
                "message": f"文件已存在：{filename}。请使用 update_file 或 rewrite_file 来修改现有文件",
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
            return {
                "success": False,
                "message": f"创建文件到存储失败：{filename}",
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
            return {
                "success": True,
                "message": f"成功创建文件：{filename}",
                "filename": filename
            }
        else:
            return {
                "success": False,
                "message": f"创建文件元数据失败：{filename}",
                "filename": filename
            }

    except Exception as e:
        logger.error(f"create_file 执行失败: {str(e)}")
        return {
            "success": False,
            "message": f"创建文件失败：{str(e)}",
            "filename": kwargs.get("filename", "")
        }
