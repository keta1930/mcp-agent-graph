"""
会话图片管理器 - 基于 MinIO 存储
职责：管理会话中的图片文件存储和访问
支持多用户隔离
"""
import asyncio
import logging
import os
import base64
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from io import BytesIO
from app.core.config import settings
from app.infrastructure.storage.object_storage.minio_client import minio_client

logger = logging.getLogger(__name__)


class ConversationImageManager:
    """会话图片管理器 - 负责图片在 MinIO 中的存储"""

    STORAGE_PREFIX = "conversation_image"
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}

    def __init__(self):
        """初始化会话图片管理器"""
        pass

    def _get_object_name(self, user_id: str, conversation_id: str, filename: str) -> str:
        """
        构建图片对象名称

        Args:
            user_id: 用户ID
            conversation_id: 会话ID
            filename: 文件名（含扩展名）

        Returns:
            str: MinIO对象路径 (格式: conversation_image/{user_id}/{conversation_id}/{filename})
        """
        return f"{self.STORAGE_PREFIX}/{user_id}/{conversation_id}/{filename}"

    def _validate_image(self, filename: str, file_size: int) -> Tuple[bool, Optional[str]]:
        """
        验证图片文件

        Args:
            filename: 文件名
            file_size: 文件大小（字节）

        Returns:
            Tuple: (是否有效, 错误信息)
        """
        # 验证文件扩展名
        ext = os.path.splitext(filename)[1].lower()
        if ext not in self.SUPPORTED_EXTENSIONS:
            return False, f"不支持的图片格式: {ext}，支持的格式: {', '.join(self.SUPPORTED_EXTENSIONS)}"

        # 验证文件大小
        if file_size > self.MAX_IMAGE_SIZE:
            return False, f"图片大小超过限制 ({file_size / 1024 / 1024:.2f}MB > 10MB)"

        return True, None

    def _generate_unique_filename(self, original_filename: str) -> str:
        """
        生成唯一文件名（原始文件名 + 时间戳）

        Args:
            original_filename: 原始文件名

        Returns:
            str: 格式为 "filename_YYMMDDHHmm.ext" 的唯一文件名
            例如: "graph_2504112213.png" 表示 2025年4月11日22点13分上传
        """
        # 分离文件名和扩展名
        name_without_ext = os.path.splitext(original_filename)[0]
        ext = os.path.splitext(original_filename)[1].lower()

        # 生成时间戳：年月日时分（YYMMDDHHmm）
        timestamp = datetime.now().strftime("%y%m%d%H%M")

        # 组合：原始文件名_时间戳.扩展名
        unique_name = f"{name_without_ext}_{timestamp}{ext}"

        return unique_name

    def generate_minio_path(
        self,
        user_id: str,
        conversation_id: str,
        original_filename: str
    ) -> str:
        """
        生成MinIO对象路径（不执行上传）

        Args:
            user_id: 用户ID
            conversation_id: 会话ID
            original_filename: 原始文件名

        Returns:
            str: MinIO对象路径
        """
        unique_filename = self._generate_unique_filename(original_filename)
        return self._get_object_name(user_id, conversation_id, unique_filename)

    async def upload_image(
        self,
        minio_path: str,
        image_data: bytes,
        mime_type: str
    ) -> bool:
        """
        上传图片到 MinIO

        Args:
            minio_path: MinIO对象路径
            image_data: 图片二进制数据
            mime_type: MIME 类型 (如 "image/png")

        Returns:
            bool: 上传是否成功
        """
        try:
            image_stream = BytesIO(image_data)
            await asyncio.to_thread(
                minio_client._client.put_object,
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=minio_path,
                data=image_stream,
                length=len(image_data),
                content_type=mime_type
            )

            logger.info(f"✓ 上传图片成功: {minio_path}")
            return True

        except Exception as e:
            logger.error(f"上传图片失败 ({minio_path}): {e}")
            return False

    async def get_image(self, minio_path: str) -> Optional[bytes]:
        """
        从 MinIO 读取图片二进制数据

        Args:
            minio_path: MinIO 对象路径

        Returns:
            Optional[bytes]: 图片二进制数据，失败返回 None
        """
        try:
            response = minio_client._client.get_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=minio_path
            )

            image_data = response.read()
            response.close()
            response.release_conn()

            logger.debug(f"✓ 读取图片成功: {minio_path}")
            return image_data

        except Exception as e:
            logger.error(f"读取图片失败 ({minio_path}): {e}")
            return None

    async def get_image_as_base64(self, minio_path: str) -> Optional[str]:
        """
        从 MinIO 读取图片并转换为 base64 字符串

        Args:
            minio_path: MinIO 对象路径

        Returns:
            Optional[str]: base64 编码的图片字符串，失败返回 None
        """
        try:
            image_data = await self.get_image(minio_path)
            if not image_data:
                return None

            base64_string = base64.b64encode(image_data).decode('utf-8')
            logger.debug(f"✓ 转换图片为 base64: {minio_path}")
            return base64_string

        except Exception as e:
            logger.error(f"转换图片为 base64 失败 ({minio_path}): {e}")
            return None

    async def delete_image(self, minio_path: str) -> bool:
        """
        删除图片

        Args:
            minio_path: MinIO 对象路径

        Returns:
            bool: 是否删除成功
        """
        try:
            minio_client._client.remove_object(
                bucket_name=settings.MINIO_BUCKET_NAME,
                object_name=minio_path
            )

            logger.info(f"✓ 删除图片成功: {minio_path}")
            return True

        except Exception as e:
            logger.error(f"删除图片失败 ({minio_path}): {e}")
            return False

    async def delete_all_conversation_images(self, user_id: str, conversation_id: str) -> bool:
        """
        删除会话所有图片（删除会话时调用）

        Args:
            user_id: 用户ID
            conversation_id: 会话ID

        Returns:
            bool: 是否全部删除成功
        """
        try:
            prefix = f"{self.STORAGE_PREFIX}/{user_id}/{conversation_id}/"

            # 列出所有图片
            objects = minio_client._client.list_objects(
                bucket_name=settings.MINIO_BUCKET_NAME,
                prefix=prefix,
                recursive=True
            )

            success = True
            count = 0
            for obj in objects:
                try:
                    minio_client._client.remove_object(
                        bucket_name=settings.MINIO_BUCKET_NAME,
                        object_name=obj.object_name
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"删除图片失败 (用户: {user_id}, 会话: {conversation_id}): {obj.object_name}, 错误: {e}")
                    success = False

            if success:
                logger.info(f"✓ 删除会话所有图片: {conversation_id} (用户: {user_id}), 删除数量: {count}")

            return success

        except Exception as e:
            logger.error(f"删除会话所有图片失败 (用户: {user_id}, 会话: {conversation_id}): {e}")
            return False


# 全局实例
conversation_image_manager = ConversationImageManager()
