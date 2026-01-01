"""
文件处理服务
职责：分类处理上传的文件（图片和文本文件）
"""
import asyncio
import logging
import os
import base64
from typing import List, Dict, Any
from fastapi import UploadFile

logger = logging.getLogger(__name__)


class FileHandler:
    """文件处理器 - 分类处理图片和文本文件"""

    # 支持的图片格式
    IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}

    # 支持的文本文件格式
    TEXT_EXTENSIONS = {
        '.txt', '.md', '.json', '.csv', '.py', '.js', '.ts', '.tsx', '.jsx',
        '.java', '.cpp', '.c', '.h', '.hpp', '.go', '.rs', '.rb', '.php',
        '.html', '.css', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg',
        '.sh', '.bat', '.sql', '.log', '.env'
    }

    def __init__(self):
        """初始化文件处理器"""
        pass

    def is_image_file(self, filename: str) -> bool:
        """
        检查是否为图片文件

        Args:
            filename: 文件名

        Returns:
            bool: 是否为图片文件
        """
        ext = os.path.splitext(filename)[1].lower()
        return ext in self.IMAGE_EXTENSIONS

    def is_text_file(self, filename: str) -> bool:
        """
        检查是否为文本文件

        Args:
            filename: 文件名

        Returns:
            bool: 是否为文本文件
        """
        ext = os.path.splitext(filename)[1].lower()
        return ext in self.TEXT_EXTENSIONS

    async def process_uploaded_files(
        self,
        files: List[UploadFile],
        user_id: str,
        conversation_id: str
    ) -> Dict[str, Any]:
        """
        处理上传的文件，分类为图片和文本文件

        Args:
            files: 上传的文件列表
            user_id: 用户ID
            conversation_id: 会话ID

        Returns:
            Dict: {
                "images_info": [{"mime_type": "image/png", "minio_path": "...", "base64": "..."}],
                "files_uploaded": ["data.csv", "note.txt"]
            }
        """
        from app.infrastructure.storage.object_storage.conversation_image_manager import conversation_image_manager
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
        from app.infrastructure.database.mongodb.client import mongodb_client

        images_info = []
        text_file_tasks = []

        for file in files:
            if not file.filename:
                logger.warning("跳过无文件名的上传文件")
                continue

            try:
                file_data = await file.read()
                file_size = len(file_data)

                if self.is_image_file(file.filename):
                    logger.info(f"处理图片文件: {file.filename} ({file_size} bytes)")

                    mime_type = file.content_type or "image/png"
                    base64_string = base64.b64encode(file_data).decode('utf-8')

                    minio_path = conversation_image_manager.generate_minio_path(
                        user_id=user_id,
                        conversation_id=conversation_id,
                        original_filename=file.filename
                    )

                    asyncio.create_task(
                        conversation_image_manager.upload_image(
                            minio_path=minio_path,
                            image_data=file_data,
                            mime_type=mime_type
                        )
                    )

                    images_info.append({
                        "mime_type": mime_type,
                        "minio_path": minio_path,
                        "base64": base64_string
                    })
                    logger.info(f"✓ 图片处理完成: {file.filename}")

                elif self.is_text_file(file.filename):
                    logger.info(f"处理文本文件: {file.filename} ({file_size} bytes)")

                    try:
                        content = file_data.decode('utf-8')
                    except UnicodeDecodeError:
                        try:
                            content = file_data.decode('gbk')
                        except UnicodeDecodeError:
                            logger.error(f"无法解码文件: {file.filename}")
                            continue

                    text_file_tasks.append(
                        self._upload_text_file(
                            user_id=user_id,
                            conversation_id=conversation_id,
                            filename=file.filename,
                            content=content,
                            conversation_document_manager=conversation_document_manager,
                            mongodb_client=mongodb_client
                        )
                    )

                else:
                    logger.warning(f"不支持的文件类型: {file.filename}")

            except Exception as e:
                logger.error(f"处理文件失败 ({file.filename}): {str(e)}")
                continue

        files_uploaded = []
        if text_file_tasks:
            results = await asyncio.gather(*text_file_tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, str):
                    files_uploaded.append(result)
                elif isinstance(result, Exception):
                    logger.error(f"文本文件上传失败: {str(result)}")

        return {
            "images_info": images_info,
            "files_uploaded": files_uploaded
        }

    async def _upload_text_file(
        self,
        user_id: str,
        conversation_id: str,
        filename: str,
        content: str,
        conversation_document_manager,
        mongodb_client
    ) -> str:
        """
        上传文本文件到 MinIO 和 MongoDB

        Args:
            user_id: 用户ID
            conversation_id: 会话ID
            filename: 文件名
            content: 文件内容
            conversation_document_manager: 文档管理器
            mongodb_client: MongoDB客户端

        Returns:
            str: 文件名

        Raises:
            Exception: 上传失败时抛出异常
        """
        result = await conversation_document_manager.create_file(
            user_id=user_id,
            conversation_id=conversation_id,
            filename=filename,
            content=content
        )

        if not result:
            raise Exception(f"MinIO上传失败: {filename}")

        success = await mongodb_client.conversation_repository.add_file_metadata(
            conversation_id=conversation_id,
            filename=filename,
            summary=f"用户上传的 {filename}",
            size=result["size"],
            version_id=result["version_id"],
            agent="user",
            comment="多模态对话文件上传"
        )

        if not success:
            raise Exception(f"MongoDB元数据保存失败: {filename}")

        logger.info(f"✓ 文本文件上传成功: {filename}")
        return filename


# 全局实例
file_handler = FileHandler()
