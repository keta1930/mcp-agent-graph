"""
Graph Config 版本管理器 - 基于 MinIO 原生版本控制
职责：管理 graph config 在 MinIO 中的版本历史
"""
import json
import logging
from typing import Optional, Dict, Any
from io import BytesIO
from app.core.config import settings
from minio.versioningconfig import VersioningConfig, ENABLED
from app.infrastructure.storage.object_storage.minio_client import minio_client

logger = logging.getLogger(__name__)


class GraphConfigVersionManager:
    """Graph Config 版本管理器"""

    STORAGE_PREFIX = "graph-configs"

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

    def _get_object_name(self, graph_name: str) -> str:
        """获取对象名称"""
        return f"{self.STORAGE_PREFIX}/{graph_name}.json"

    def create_version(self, graph_name: str, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        创建新版本（将当前配置上传到 MinIO）

        Args:
            graph_name: 图名称
            config: 图配置

        Returns:
            Optional[Dict]: 版本信息 {"version_id": "...", "size": 2048}，失败返回 None
        """
        try:
            object_name = self._get_object_name(graph_name)
            content = json.dumps(config, ensure_ascii=False, indent=2)
            content_bytes = content.encode('utf-8')
            content_stream = BytesIO(content_bytes)

            # 不使用 MinIO metadata，所有元数据都存储在 MongoDB 中
            result = minio_client._client.put_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name,
                data=content_stream,
                length=len(content_bytes),
                content_type="application/json"
            )

            version_id = result.version_id
            logger.info(f"✓ 创建图配置版本: {graph_name}, 版本ID: {version_id}")

            return {
                "version_id": version_id,
                "size": len(content_bytes)
            }

        except Exception as e:
            logger.error(f"创建图配置版本失败: {e}")
            return None

    def get_version(self, graph_name: str, version_id: str) -> Optional[Dict[str, Any]]:
        """获取特定版本的配置"""
        try:
            object_name = self._get_object_name(graph_name)

            response = minio_client._client.get_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name,
                version_id=version_id
            )

            content = response.read().decode('utf-8')
            response.close()
            response.release_conn()

            config = json.loads(content)
            return config

        except Exception as e:
            logger.error(f"获取版本配置失败: {e}")
            return None

    def delete_version(self, graph_name: str, version_id: str) -> bool:
        """
        删除特定版本

        注意：这会从 MinIO 中物理删除该版本
        """
        try:
            object_name = self._get_object_name(graph_name)

            minio_client._client.remove_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name,
                version_id=version_id
            )

            logger.info(f"✓ 删除版本: {graph_name}, 版本ID: {version_id}")
            return True

        except Exception as e:
            logger.error(f"删除版本失败: {e}")
            return False

    def delete_all_versions(self, graph_name: str) -> bool:
        """删除图的所有版本（删除图时调用）"""
        try:
            object_name = self._get_object_name(graph_name)

            # 列出所有版本
            objects = minio_client._client.list_objects(
                bucket_name=settings.MINIO_BUCKET_NAME,
                prefix=object_name,
                include_version=True
            )

            success = True
            for obj in objects:
                try:
                    minio_client._client.remove_object(
                        bucket_name=settings.MINIO_BUCKET_NAME,
                        object_name=obj.object_name,
                        version_id=obj.version_id
                    )
                except Exception as e:
                    logger.error(f"删除版本失败: {obj.version_id}, 错误: {e}")
                    success = False

            return success

        except Exception as e:
            logger.error(f"删除所有版本失败: {e}")
            return False


# 全局实例
graph_config_version_manager = GraphConfigVersionManager()
