"""
会话文档服务
提供会话文件管理的业务逻辑，供API路由使用
"""
import logging
from typing import Dict, Any, Optional, List
from app.infrastructure.database.mongodb.client import mongodb_client
from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager

logger = logging.getLogger(__name__)


class ConversationDocumentService:
    """会话文档服务"""

    async def get_all_files(self, conversation_id: str, user_id: str) -> Dict[str, Any]:
        """
        获取会话所有文件列表

        Args:
            conversation_id: 会话ID
            user_id: 用户ID

        Returns:
            {"success": True, "conversation_id": "...", "total_count": 3, "files": [...]}
        """
        try:
            # 验证会话归属
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            if not conversation or conversation.get("user_id") != user_id:
                return {
                    "success": False,
                    "error": "会话不存在或无权限访问",
                    "conversation_id": conversation_id,
                    "total_count": 0,
                    "files": []
                }

            # 获取所有文件元数据
            documents = await mongodb_client.conversation_repository.get_all_files_metadata(conversation_id)
            files = [file["filename"] for file in documents.get("files", [])]

            return {
                "success": True,
                "conversation_id": conversation_id,
                "total_count": len(files),
                "files": files
            }

        except Exception as e:
            logger.error(f"获取文件列表失败: {str(e)}")
            return {
                "success": False,
                "error": f"获取文件列表失败: {str(e)}",
                "conversation_id": conversation_id,
                "total_count": 0,
                "files": []
            }

    async def get_file(self, conversation_id: str, filename: str, user_id: str) -> Dict[str, Any]:
        """
        获取单个文件（最新版本）

        Args:
            conversation_id: 会话ID
            filename: 文件名
            user_id: 用户ID

        Returns:
            {"success": True, "file": {...}}
        """
        try:
            # 验证会话归属
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            if not conversation or conversation.get("user_id") != user_id:
                return {
                    "success": False,
                    "error": "会话不存在或无权限访问"
                }

            # 获取文件元数据
            file_meta = await mongodb_client.conversation_repository.get_file_metadata(conversation_id, filename)
            if not file_meta:
                return {
                    "success": False,
                    "error": f"文件不存在：{filename}"
                }

            # 读取文件内容
            content = await conversation_document_manager.read_file(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename
            )

            if content is None:
                return {
                    "success": False,
                    "error": f"读取文件内容失败：{filename}"
                }

            # 获取版本列表
            versions = await conversation_document_manager.list_versions(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename
            )

            file_detail = {
                "filename": filename,
                "summary": file_meta.get("summary", ""),
                "content": content,
                "current_version_id": file_meta.get("current_version_id", ""),
                "versions": versions
            }

            return {
                "success": True,
                "file": file_detail
            }

        except Exception as e:
            logger.error(f"获取文件失败: {str(e)}")
            return {
                "success": False,
                "error": f"获取文件失败: {str(e)}"
            }

    async def get_file_version(self, conversation_id: str, filename: str,
                               version_id: str, user_id: str) -> Dict[str, Any]:
        """
        获取文件特定版本

        Args:
            conversation_id: 会话ID
            filename: 文件名
            version_id: 版本ID
            user_id: 用户ID

        Returns:
            {"success": True, "file": {...}}
        """
        try:
            # 验证会话归属
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            if not conversation or conversation.get("user_id") != user_id:
                return {
                    "success": False,
                    "error": "会话不存在或无权限访问"
                }

            # 获取文件元数据
            file_meta = await mongodb_client.conversation_repository.get_file_metadata(conversation_id, filename)
            if not file_meta:
                return {
                    "success": False,
                    "error": f"文件不存在：{filename}"
                }

            # 读取特定版本的内容
            content = await conversation_document_manager.read_file(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename,
                version_id=version_id
            )

            if content is None:
                return {
                    "success": False,
                    "error": f"读取文件版本失败：{filename} (版本: {version_id})"
                }

            is_current = file_meta.get("current_version_id") == version_id

            file_detail = {
                "filename": filename,
                "version_id": version_id,
                "summary": file_meta.get("summary", ""),
                "content": content,
                "is_current": is_current
            }

            return {
                "success": True,
                "file": file_detail
            }

        except Exception as e:
            logger.error(f"获取文件版本失败: {str(e)}")
            return {
                "success": False,
                "error": f"获取文件版本失败: {str(e)}"
            }

    async def create_file(self, conversation_id: str, filename: str, summary: str,
                         content: str, log: str, user_id: str) -> Dict[str, Any]:
        """
        创建新文件（用户手动创建）

        Args:
            conversation_id: 会话ID
            filename: 文件名
            summary: 摘要
            content: 内容
            log: 操作日志
            user_id: 用户ID

        Returns:
            {"success": True, "message": "...", "file": {...}}
        """
        try:
            # 验证会话归属
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            if not conversation or conversation.get("user_id") != user_id:
                return {
                    "success": False,
                    "message": "会话不存在或无权限访问"
                }

            # 初始化documents字段
            await mongodb_client.conversation_repository.initialize_documents_field(conversation_id)

            # 检查文件是否已存在
            file_exists = await mongodb_client.conversation_repository.file_exists(conversation_id, filename)
            if file_exists:
                return {
                    "success": False,
                    "message": f"文件已存在：{filename}"
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
                    "message": f"创建文件到存储失败：{filename}"
                }

            # 添加元数据到MongoDB
            success = await mongodb_client.conversation_repository.add_file_metadata(
                conversation_id=conversation_id,
                filename=filename,
                summary=summary,
                size=minio_result["size"],
                version_id=minio_result["version_id"],
                agent="user"
            )

            if success:
                from datetime import datetime
                return {
                    "success": True,
                    "message": "文件创建成功",
                    "file": {
                        "filename": filename,
                        "size": minio_result["size"],
                        "version_id": minio_result["version_id"],
                        "created_at": datetime.now().isoformat()
                    }
                }
            else:
                return {
                    "success": False,
                    "message": f"创建文件元数据失败：{filename}"
                }

        except Exception as e:
            logger.error(f"创建文件失败: {str(e)}")
            return {
                "success": False,
                "message": f"创建文件失败：{str(e)}"
            }

    async def save_file(self, conversation_id: str, filename: str, content: str,
                       summary: str, log: str, user_id: str) -> Dict[str, Any]:
        """
        保存文件（用户编辑后保存）

        Args:
            conversation_id: 会话ID
            filename: 文件名
            content: 内容
            summary: 摘要
            log: 操作日志
            user_id: 用户ID

        Returns:
            {"success": True, "message": "...", "file": {...}}
        """
        try:
            # 验证会话归属
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            if not conversation or conversation.get("user_id") != user_id:
                return {
                    "success": False,
                    "message": "会话不存在或无权限访问"
                }

            # 检查文件是否存在
            file_exists = await mongodb_client.conversation_repository.file_exists(conversation_id, filename)
            if not file_exists:
                return {
                    "success": False,
                    "message": f"文件不存在：{filename}"
                }

            # 更新文件到MinIO
            minio_result = await conversation_document_manager.update_file(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename,
                content=content
            )

            if not minio_result:
                return {
                    "success": False,
                    "message": f"保存文件到存储失败：{filename}"
                }

            # 更新元数据
            success = await mongodb_client.conversation_repository.update_file_metadata(
                conversation_id=conversation_id,
                filename=filename,
                summary=summary,
                size=minio_result["size"],
                version_id=minio_result["version_id"],
                log_comment=log,
                agent="user"
            )

            if success:
                from datetime import datetime
                return {
                    "success": True,
                    "message": "文件保存成功",
                    "file": {
                        "filename": filename,
                        "version_id": minio_result["version_id"],
                        "size": minio_result["size"],
                        "updated_at": datetime.now().isoformat()
                    }
                }
            else:
                return {
                    "success": False,
                    "message": f"更新文件元数据失败：{filename}"
                }

        except Exception as e:
            logger.error(f"保存文件失败: {str(e)}")
            return {
                "success": False,
                "message": f"保存文件失败：{str(e)}"
            }

    async def delete_file(self, conversation_id: str, filename: str, user_id: str) -> Dict[str, Any]:
        """
        删除文件及其所有历史版本

        Args:
            conversation_id: 会话ID
            filename: 文件名
            user_id: 用户ID

        Returns:
            {"success": True, "message": "...", "filename": "...", "deleted_versions": N}
        """
        try:
            # 验证会话归属
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            if not conversation or conversation.get("user_id") != user_id:
                return {
                    "success": False,
                    "message": "会话不存在或无权限访问",
                    "filename": filename,
                    "deleted_versions": 0
                }

            # 获取版本数
            versions = await conversation_document_manager.list_versions(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename
            )
            version_count = len(versions)

            # 删除MinIO中的文件
            minio_success = await conversation_document_manager.delete_file(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename
            )

            if not minio_success:
                return {
                    "success": False,
                    "message": f"删除存储文件失败：{filename}",
                    "filename": filename,
                    "deleted_versions": 0
                }

            # 删除MongoDB中的元数据
            meta_success = await mongodb_client.conversation_repository.remove_file_metadata(
                conversation_id=conversation_id,
                filename=filename
            )

            if meta_success:
                return {
                    "success": True,
                    "message": "文件已删除",
                    "filename": filename,
                    "deleted_versions": version_count
                }
            else:
                return {
                    "success": False,
                    "message": f"删除文件元数据失败：{filename}",
                    "filename": filename,
                    "deleted_versions": 0
                }

        except Exception as e:
            logger.error(f"删除文件失败: {str(e)}")
            return {
                "success": False,
                "message": f"删除文件失败：{str(e)}",
                "filename": filename,
                "deleted_versions": 0
            }


# 全局实例
conversation_document_service = ConversationDocumentService()
