"""
项目文档服务
提供项目文件管理的业务逻辑，供API路由使用
"""
import logging
from typing import Dict, Any, Optional, List
from app.infrastructure.database.mongodb.client import mongodb_client
from app.infrastructure.storage.object_storage.project_document_manager import project_document_manager
from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager

logger = logging.getLogger(__name__)


class ProjectDocumentService:
    """项目文档服务"""

    async def get_all_files(self, project_id: str, user_id: str) -> Dict[str, Any]:
        """
        获取项目所有文件列表

        Args:
            project_id: 项目ID
            user_id: 用户ID

        Returns:
            {"success": True, "project_id": "...", "total_count": 3, "files": [...]}
        """
        try:
            # 验证项目归属
            project = await mongodb_client.project_repository.get_project(project_id, user_id)
            if not project:
                return {
                    "success": False,
                    "error": "项目不存在或无权限访问",
                    "project_id": project_id,
                    "total_count": 0,
                    "files": []
                }

            # 获取所有文件元数据
            documents = await mongodb_client.project_repository.get_all_files_metadata(project_id)
            files = [file["filename"] for file in documents.get("files", [])]

            return {
                "success": True,
                "project_id": project_id,
                "total_count": len(files),
                "files": files
            }

        except Exception as e:
            logger.error(f"获取文件列表失败: {str(e)}")
            return {
                "success": False,
                "error": f"获取文件列表失败: {str(e)}",
                "project_id": project_id,
                "total_count": 0,
                "files": []
            }

    async def get_file(self, project_id: str, filename: str, user_id: str) -> Dict[str, Any]:
        """
        获取单个文件（最新版本）

        Args:
            project_id: 项目ID
            filename: 文件名
            user_id: 用户ID

        Returns:
            {"success": True, "file": {...}}
        """
        try:
            # 验证项目归属
            project = await mongodb_client.project_repository.get_project(project_id, user_id)
            if not project:
                return {
                    "success": False,
                    "error": "项目不存在或无权限访问"
                }

            # 获取文件元数据
            file_meta = await mongodb_client.project_repository.get_file_metadata(project_id, filename)
            if not file_meta:
                return {
                    "success": False,
                    "error": f"文件不存在：{filename}"
                }

            # 读取文件内容
            content = await project_document_manager.read_file(
                user_id=user_id,
                project_id=project_id,
                filename=filename
            )

            if content is None:
                return {
                    "success": False,
                    "error": f"读取文件内容失败：{filename}"
                }

            # 获取版本列表
            versions = await project_document_manager.list_versions(
                user_id=user_id,
                project_id=project_id,
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

    async def get_file_version(
        self,
        project_id: str,
        filename: str,
        version_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        获取文件特定版本

        Args:
            project_id: 项目ID
            filename: 文件名
            version_id: 版本ID
            user_id: 用户ID

        Returns:
            {"success": True, "file": {...}}
        """
        try:
            # 验证项目归属
            project = await mongodb_client.project_repository.get_project(project_id, user_id)
            if not project:
                return {
                    "success": False,
                    "error": "项目不存在或无权限访问"
                }

            # 获取文件元数据
            file_meta = await mongodb_client.project_repository.get_file_metadata(project_id, filename)
            if not file_meta:
                return {
                    "success": False,
                    "error": f"文件不存在：{filename}"
                }

            # 读取特定版本的内容
            content = await project_document_manager.read_file(
                user_id=user_id,
                project_id=project_id,
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

    async def create_file(
        self,
        project_id: str,
        filename: str,
        summary: str,
        content: str,
        log: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        创建新文件（用户手动创建）

        Args:
            project_id: 项目ID
            filename: 文件名
            summary: 摘要
            content: 内容
            log: 操作日志
            user_id: 用户ID

        Returns:
            {"success": True, "message": "...", "file": {...}}
        """
        try:
            # 验证项目归属
            project = await mongodb_client.project_repository.get_project(project_id, user_id)
            if not project:
                return {
                    "success": False,
                    "message": "项目不存在或无权限访问"
                }

            # 检查文件是否已存在
            file_exists = await mongodb_client.project_repository.file_exists(project_id, filename)
            if file_exists:
                return {
                    "success": False,
                    "message": f"文件已存在：{filename}"
                }

            # 创建文件到MinIO
            minio_result = await project_document_manager.create_file(
                user_id=user_id,
                project_id=project_id,
                filename=filename,
                content=content
            )

            if not minio_result:
                return {
                    "success": False,
                    "message": f"创建文件到存储失败：{filename}"
                }

            # 添加元数据到MongoDB
            success = await mongodb_client.project_repository.add_file_metadata(
                project_id=project_id,
                filename=filename,
                summary=summary,
                size=minio_result["size"],
                version_id=minio_result["version_id"],
                agent="user",
                comment=log
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

    async def save_file(
        self,
        project_id: str,
        filename: str,
        content: str,
        summary: str,
        log: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        保存文件（用户编辑后保存）

        Args:
            project_id: 项目ID
            filename: 文件名
            content: 内容
            summary: 摘要
            log: 操作日志
            user_id: 用户ID

        Returns:
            {"success": True, "message": "...", "file": {...}}
        """
        try:
            # 验证项目归属
            project = await mongodb_client.project_repository.get_project(project_id, user_id)
            if not project:
                return {
                    "success": False,
                    "message": "项目不存在或无权限访问"
                }

            # 检查文件是否存在
            file_exists = await mongodb_client.project_repository.file_exists(project_id, filename)
            if not file_exists:
                return {
                    "success": False,
                    "message": f"文件不存在：{filename}"
                }

            # 更新文件到MinIO
            minio_result = await project_document_manager.update_file(
                user_id=user_id,
                project_id=project_id,
                filename=filename,
                content=content
            )

            if not minio_result:
                return {
                    "success": False,
                    "message": f"保存文件到存储失败：{filename}"
                }

            # 更新元数据
            success = await mongodb_client.project_repository.update_file_metadata(
                project_id=project_id,
                filename=filename,
                summary=summary,
                size=minio_result["size"],
                version_id=minio_result["version_id"],
                agent="user",
                comment=log
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

    async def delete_file(
        self,
        project_id: str,
        filename: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        删除文件及其所有历史版本

        Args:
            project_id: 项目ID
            filename: 文件名
            user_id: 用户ID

        Returns:
            {"success": True, "message": "...", "filename": "...", "deleted_versions": N}
        """
        try:
            # 验证项目归属
            project = await mongodb_client.project_repository.get_project(project_id, user_id)
            if not project:
                return {
                    "success": False,
                    "message": "项目不存在或无权限访问",
                    "filename": filename,
                    "deleted_versions": 0
                }

            # 获取版本数
            versions = await project_document_manager.list_versions(
                user_id=user_id,
                project_id=project_id,
                filename=filename
            )
            version_count = len(versions)

            # 删除MinIO中的文件
            minio_success = await project_document_manager.delete_file(
                user_id=user_id,
                project_id=project_id,
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
            meta_success = await mongodb_client.project_repository.remove_file_metadata(
                project_id=project_id,
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

    async def push_file_from_conversation(
        self,
        conversation_id: str,
        project_id: str,
        filename: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        从conversation推送文件到project

        Args:
            conversation_id: 源Conversation ID
            project_id: 目标Project ID
            filename: 要推送的文件名
            user_id: 用户ID

        Returns:
            推送结果
        """
        try:
            # 验证conversation权限
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            if not conversation or conversation.get("user_id") != user_id:
                return {
                    "success": False,
                    "message": "Conversation不存在或无权限访问"
                }

            # 验证project权限
            project = await mongodb_client.project_repository.get_project(project_id, user_id)
            if not project:
                return {
                    "success": False,
                    "message": "Project不存在或无权限访问"
                }

            # 检查conversation中是否存在该文件
            conv_file_meta = await mongodb_client.conversation_repository.get_file_metadata(
                conversation_id, filename
            )
            if not conv_file_meta:
                return {
                    "success": False,
                    "message": f"Conversation中不存在文件：{filename}"
                }

            # 检查project中是否已存在同名文件
            project_file_exists = await mongodb_client.project_repository.file_exists(project_id, filename)
            if project_file_exists:
                return {
                    "success": False,
                    "message": f"Project中已存在同名文件：{filename}"
                }

            # 从conversation读取文件内容
            content = await conversation_document_manager.read_file(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename
            )

            if content is None:
                return {
                    "success": False,
                    "message": f"读取Conversation文件失败：{filename}"
                }

            # 写入到project
            minio_result = await project_document_manager.create_file(
                user_id=user_id,
                project_id=project_id,
                filename=filename,
                content=content
            )

            if not minio_result:
                return {
                    "success": False,
                    "message": f"推送文件到Project存储失败：{filename}"
                }

            # 添加元数据到project
            success = await mongodb_client.project_repository.add_file_metadata(
                project_id=project_id,
                filename=filename,
                summary=conv_file_meta.get("summary", ""),
                size=minio_result["size"],
                version_id=minio_result["version_id"],
                agent="user",
                comment=f"从conversation {conversation_id}推送"
            )

            if success:
                logger.info(
                    f"文件推送成功: {filename} (从conversation {conversation_id} -> project {project_id})"
                )
                return {
                    "success": True,
                    "message": "文件推送成功",
                    "filename": filename,
                    "source_conversation_id": conversation_id,
                    "target_project_id": project_id
                }
            else:
                return {
                    "success": False,
                    "message": f"添加文件元数据到Project失败：{filename}"
                }

        except Exception as e:
            logger.error(f"推送文件失败 ({conversation_id} -> {project_id}, {filename}): {str(e)}")
            return {
                "success": False,
                "message": f"推送文件失败：{str(e)}"
            }


# 全局实例
project_document_service = ProjectDocumentService()
