"""
MinIO 客户端管理器 - 优化版本
提供通用的 MinIO 对象存储操作功能
"""
import io
import os
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path
from minio import Minio
from minio.error import S3Error
from .config import settings

logger = logging.getLogger(__name__)


class MinIOClient:
    """MinIO 客户端封装类"""

    def __init__(self):
        """初始化 MinIO 客户端"""
        self._client = None
        self._initialize_client()

    def _initialize_client(self) -> None:
        """初始化 MinIO 客户端连接"""
        try:
            self._client = Minio(
                endpoint=settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE
            )
            self._ensure_bucket_exists()
            logger.info(f"MinIO 客户端初始化成功，连接到: {settings.MINIO_ENDPOINT}")
        except Exception as e:
            logger.error(f"MinIO 客户端初始化失败: {e}")
            raise

    def _ensure_bucket_exists(self) -> None:
        """确保存储桶存在"""
        try:
            if not self._client.bucket_exists(settings.MINIO_BUCKET_NAME):
                self._client.make_bucket(settings.MINIO_BUCKET_NAME)
                logger.info(f"创建存储桶: {settings.MINIO_BUCKET_NAME}")
            else:
                logger.info(f"存储桶已存在: {settings.MINIO_BUCKET_NAME}")
        except S3Error as e:
            logger.error(f"检查或创建存储桶失败: {e}")
            raise

    def upload_file(self, object_name: str, file_path: str, content_type: str = None) -> bool:
        """
        上传文件到 MinIO（不支持元数据）

        Args:
            object_name: 对象名称（存储路径）
            file_path: 本地文件路径
            content_type: 文件内容类型

        Returns:
            bool: 上传是否成功
        """
        try:
            self._client.fput_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name,
                file_path=file_path,
                content_type=content_type
            )
            logger.info(f"文件上传成功: {object_name}")
            return True
        except S3Error as e:
            logger.error(f"文件上传失败 {object_name}: {e}")
            return False

    def upload_content(self, object_name: str, content: str, content_type: str = "text/plain",
                       metadata: Dict[str, str] = None) -> bool:
        """
        上传字符串内容到 MinIO

        Args:
            object_name: 对象名称（存储路径）
            content: 字符串内容
            content_type: 内容类型
            metadata: 自定义元数据

        Returns:
            bool: 上传是否成功
        """
        try:
            content_bytes = content.encode('utf-8')
            content_stream = io.BytesIO(content_bytes)

            self._client.put_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name,
                data=content_stream,
                length=len(content_bytes),
                content_type=content_type,
                metadata=metadata or {}
            )
            logger.info(f"内容上传成功: {object_name}")
            return True
        except S3Error as e:
            logger.error(f"内容上传失败 {object_name}: {e}")
            return False

    def upload_fileobj(self, object_name: str, file_obj, content_type: str = "text/plain",
                       metadata: Dict[str, str] = None) -> bool:
        """
        上传文件流到 MinIO


        Args:
        object_name: 对象名称（存储路径）
        file_obj: 文件对象 (类文件流，如 UploadFile.file)
        content_type: 内容类型
        metadata: 自定义元数据


        Returns:
        bool: 上传是否成功
        """

        try:
            # 获取文件大小
            file_obj.seek(0, os.SEEK_END)
            size = file_obj.tell()
            file_obj.seek(0)

            # 规范化元数据 key
            normalized_metadata = {f"x-amz-meta-{k}": v for k, v in (metadata or {}).items()}

            self._client.put_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name,
                data=file_obj,
                length=size,
                content_type=content_type,
                metadata=normalized_metadata
            )
            logger.info(f"内容上传成功: {object_name}")
            return True
        except S3Error as e:
            logger.error(f"内容上传失败 {object_name}: {e}")
            return False

    def download_file(self, object_name: str, file_path: str) -> bool:
        """
        从 MinIO 下载文件

        Args:
            object_name: 对象名称（存储路径）
            file_path: 本地保存路径

        Returns:
            bool: 下载是否成功
        """
        try:
            self._client.fget_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name,
                file_path=file_path
            )
            logger.info(f"文件下载成功: {object_name} -> {file_path}")
            return True
        except S3Error as e:
            logger.error(f"文件下载失败 {object_name}: {e}")
            return False

    def download_content(self, object_name: str) -> Optional[str]:
        """
        从 MinIO 下载内容为字符串

        Args:
            object_name: 对象名称（存储路径）

        Returns:
            Optional[str]: 文件内容字符串，失败时返回 None
        """
        try:
            response = self._client.get_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name
            )
            content = response.read().decode('utf-8')
            response.close()
            response.release_conn()
            logger.info(f"内容获取成功: {object_name}")
            return content
        except S3Error as e:
            logger.error(f"内容下载失败 {object_name}: {e}")
            return None

    def delete_object(self, object_name: str) -> bool:
        """
        删除 MinIO 中的对象

        Args:
            object_name: 对象名称（存储路径）

        Returns:
            bool: 删除是否成功
        """
        try:
            self._client.remove_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name
            )
            logger.info(f"对象删除成功: {object_name}")
            return True
        except S3Error as e:
            logger.error(f"对象删除失败 {object_name}: {e}")
            return False

    def list_objects(self, prefix: str = "", include_metadata: bool = False) -> List[Dict[str, Any]]:
        """
        列出指定前缀的所有对象

        Args:
            prefix: 对象名称前缀
            include_metadata: 是否包含自定义元数据

        Returns:
            List[Dict[str, Any]]: 对象信息列表
        """
        try:
            objects = []
            for obj in self._client.list_objects(
                    bucket_name=settings.MINIO_BUCKET_NAME,
                    prefix=prefix,
                    recursive=True
            ):
                obj_info = {
                    "object_name": obj.object_name,
                    "size": obj.size,
                    "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                    "etag": obj.etag,
                    "content_type": obj.content_type
                }

                # 如果需要元数据，获取详细信息
                if include_metadata:
                    try:
                        stat = self._client.stat_object(
                            bucket_name=settings.MINIO_BUCKET_NAME,
                            object_name=obj.object_name
                        )
                        obj_info["metadata"] = stat.metadata
                    except S3Error:
                        obj_info["metadata"] = {}

                objects.append(obj_info)

            logger.info(f"列出对象成功，前缀: {prefix}，数量: {len(objects)}")
            return objects
        except S3Error as e:
            logger.error(f"列出对象失败，前缀 {prefix}: {e}")
            return []

    def object_exists(self, object_name: str) -> bool:
        """
        检查对象是否存在

        Args:
            object_name: 对象名称

        Returns:
            bool: 对象是否存在
        """
        try:
            self._client.stat_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name
            )
            return True
        except S3Error:
            return False

    def get_object_info(self, object_name: str) -> Optional[Dict[str, Any]]:
        """
        获取对象信息

        Args:
            object_name: 对象名称

        Returns:
            Optional[Dict[str, Any]]: 对象信息，不存在时返回 None
        """
        try:
            stat = self._client.stat_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=object_name
            )
            return {
                "object_name": object_name,
                "size": stat.size,
                "last_modified": stat.last_modified.isoformat() if stat.last_modified else None,
                "etag": stat.etag,
                "content_type": stat.content_type,
                "metadata": stat.metadata
            }
        except S3Error as e:
            logger.error(f"获取对象信息失败 {object_name}: {e}")
            return None


# 创建全局 MinIO 客户端实例
minio_client = MinIOClient()