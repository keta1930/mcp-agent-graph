"""
项目文档管理器 - 基于 MinIO 原生版本控制
职责：管理项目文档在 MinIO 中的存储和版本历史
支持多用户隔离
"""
import logging
from typing import Optional, Dict, Any, List
from io import BytesIO
from app.core.config import settings
from minio.versioningconfig import VersioningConfig, ENABLED
from app.infrastructure.storage.object_storage.minio_client import minio_client

logger = logging.getLogger(__name__)


class ProjectDocumentManager:
    """项目文档管理器 - 负责MinIO存储和版本控制"""

    STORAGE_PREFIX = "project_doc"

    def __init__(self):
        self._ensure_versioning_enabled()

    def _ensure_versioning_enabled(self):
        """确保 bucket 启用了版本控制"""
        try:
            versioning = minio_client._client.get_bucket_versioning(
                settings.MINIO_BUCKET_NAME
            )

            if versioning.status != "Enabled":
                minio_client._client.set_bucket_versioning(
                    settings.MINIO_BUCKET_NAME,
                    VersioningConfig(ENABLED)
                )
                logger.info(f"✓ 已为 bucket '{settings.MINIO_BUCKET_NAME}' 启用版本控制")
        except Exception as e:
            logger.error(f"启用版本控制失败: {e}")

    def _get_object_name(self, user_id: str, project_id: str, filename: str) -> str:
        """
        构建对象名称

        Args:
            user_id: 用户ID
            project_id: 项目ID
            filename: 文件名（含路径，如 "note/preferences.md"）

        Returns:
            str: MinIO对象路径 (格式: project_doc/{user_id}/{project_id}/{filename})
        """
        return f"{self.STORAGE_PREFIX}/{user_id}/{project_id}/{filename}"

    async def create_file(self, user_id: str, project_id: str, filename: str,
                         content: str) -> Optional[Dict[str, Any]]:
        """
        创建文件（返回version_id和size）

        Args:
            user_id: 用户ID
            project_id: 项目ID
            filename: 文件名（含路径）
            content: 文件内容

        Returns:
            Optional[Dict]: {"version_id": "...", "size": 1024}，失败返回 None
        """
        try:
            object_name = self._get_object_name(user_id, project_id, filename)
            content_bytes = content.encode('utf-8')
            content_stream = BytesIO(content_bytes)

            result = minio_client._client.put_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name,
                data=content_stream,
                length=len(content_bytes),
                content_type="text/plain"
            )

            version_id = result.version_id
            logger.info(f"✓ 创建文件: {filename} (用户: {user_id}, 项目: {project_id}), 版本ID: {version_id}")

            return {
                "version_id": version_id,
                "size": len(content_bytes)
            }

        except Exception as e:
            logger.error(f"创建文件失败 (用户: {user_id}, 项目: {project_id}, 文件: {filename}): {e}")
            return None

    async def update_file(self, user_id: str, project_id: str, filename: str,
                         content: str) -> Optional[Dict[str, Any]]:
        """
        更新文件（创建新版本）

        Args:
            user_id: 用户ID
            project_id: 项目ID
            filename: 文件名（含路径）
            content: 新的文件内容

        Returns:
            Optional[Dict]: {"version_id": "...", "size": 1024}，失败返回 None
        """
        try:
            object_name = self._get_object_name(user_id, project_id, filename)
            content_bytes = content.encode('utf-8')
            content_stream = BytesIO(content_bytes)

            result = minio_client._client.put_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name,
                data=content_stream,
                length=len(content_bytes),
                content_type="text/plain"
            )

            version_id = result.version_id
            logger.info(f"✓ 更新文件: {filename} (用户: {user_id}, 项目: {project_id}), 新版本ID: {version_id}")

            return {
                "version_id": version_id,
                "size": len(content_bytes)
            }

        except Exception as e:
            logger.error(f"更新文件失败 (用户: {user_id}, 项目: {project_id}, 文件: {filename}): {e}")
            return None

    async def read_file(self, user_id: str, project_id: str, filename: str,
                       version_id: Optional[str] = None) -> Optional[str]:
        """
        读取文件内容（可指定版本）

        Args:
            user_id: 用户ID
            project_id: 项目ID
            filename: 文件名（含路径）
            version_id: 版本ID，None表示读取最新版本

        Returns:
            Optional[str]: 文件内容，失败返回 None
        """
        try:
            object_name = self._get_object_name(user_id, project_id, filename)

            if version_id:
                response = minio_client._client.get_object(
                    bucket_name=settings.MINIO_BUCKET_NAME,
                    object_name=object_name,
                    version_id=version_id
                )
            else:
                response = minio_client._client.get_object(
                    bucket_name=settings.MINIO_BUCKET_NAME,
                    object_name=object_name
                )

            content = response.read().decode('utf-8')
            response.close()
            response.release_conn()

            logger.info(f"✓ 读取文件: {filename} (用户: {user_id}, 项目: {project_id})")
            return content

        except Exception as e:
            logger.error(f"读取文件失败 (用户: {user_id}, 项目: {project_id}, 文件: {filename}): {e}")
            return None

    async def delete_file(self, user_id: str, project_id: str, filename: str) -> bool:
        """
        删除文件所有版本

        Args:
            user_id: 用户ID
            project_id: 项目ID
            filename: 文件名（含路径）

        Returns:
            bool: 是否删除成功
        """
        try:
            object_name = self._get_object_name(user_id, project_id, filename)

            # 列出所有版本
            objects = minio_client._client.list_objects(
                bucket_name=settings.MINIO_BUCKET_NAME,
                prefix=object_name,
                include_version=True
            )

            success = True
            for obj in objects:
                if obj.object_name == object_name:  # 确保完全匹配
                    try:
                        minio_client._client.remove_object(
                            bucket_name=settings.MINIO_BUCKET_NAME,
                            object_name=obj.object_name,
                            version_id=obj.version_id
                        )
                    except Exception as e:
                        logger.error(f"删除版本失败 (用户: {user_id}, 项目: {project_id}): {obj.version_id}, 错误: {e}")
                        success = False

            if success:
                logger.info(f"✓ 删除文件所有版本: {filename} (用户: {user_id}, 项目: {project_id})")

            return success

        except Exception as e:
            logger.error(f"删除文件失败 (用户: {user_id}, 项目: {project_id}, 文件: {filename}): {e}")
            return False

    async def list_versions(self, user_id: str, project_id: str, filename: str) -> List[Dict[str, Any]]:
        """
        列出文件所有版本

        Args:
            user_id: 用户ID
            project_id: 项目ID
            filename: 文件名（含路径）

        Returns:
            List[Dict]: 版本列表，格式: [{"version_id": "...", "timestamp": "..."}]
        """
        try:
            object_name = self._get_object_name(user_id, project_id, filename)

            objects = minio_client._client.list_objects(
                bucket_name=settings.MINIO_BUCKET_NAME,
                prefix=object_name,
                include_version=True
            )

            versions = []
            for obj in objects:
                if obj.object_name == object_name:  # 确保完全匹配
                    versions.append({
                        "version_id": obj.version_id,
                        "timestamp": obj.last_modified.isoformat() if obj.last_modified else None
                    })

            # 按时间倒序排列（最新的在前）
            versions.sort(key=lambda x: x["timestamp"] or "", reverse=True)

            logger.info(f"✓ 列出文件版本: {filename} (用户: {user_id}, 项目: {project_id}), 版本数: {len(versions)}")
            return versions

        except Exception as e:
            logger.error(f"列出文件版本失败 (用户: {user_id}, 项目: {project_id}, 文件: {filename}): {e}")
            return []

    async def delete_all_project_files(self, user_id: str, project_id: str) -> bool:
        """
        删除项目所有文件（删除项目时调用）

        Args:
            user_id: 用户ID
            project_id: 项目ID

        Returns:
            bool: 是否全部删除成功
        """
        try:
            prefix = f"{self.STORAGE_PREFIX}/{user_id}/{project_id}/"

            # 列出所有文件的所有版本
            objects = minio_client._client.list_objects(
                bucket_name=settings.MINIO_BUCKET_NAME,
                prefix=prefix,
                include_version=True,
                recursive=True
            )

            success = True
            count = 0
            for obj in objects:
                try:
                    minio_client._client.remove_object(
                        bucket_name=settings.MINIO_BUCKET_NAME,
                        object_name=obj.object_name,
                        version_id=obj.version_id
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"删除对象失败 (用户: {user_id}, 项目: {project_id}): {obj.object_name}, 错误: {e}")
                    success = False

            if success:
                logger.info(f"✓ 删除项目所有文件: {project_id} (用户: {user_id}), 删除对象数: {count}")

            return success

        except Exception as e:
            logger.error(f"删除项目所有文件失败 (用户: {user_id}, 项目: {project_id}): {e}")
            return False


# 全局实例
project_document_manager = ProjectDocumentManager()
