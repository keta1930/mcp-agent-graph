"""
对话分享服务
提供对话分享功能的业务逻辑，供API路由使用
"""
import logging
import os
import tempfile
import zipfile
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import HTTPException

from app.infrastructure.database.mongodb.client import mongodb_client
from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager

logger = logging.getLogger(__name__)


class ConversationShareService:
    """对话分享服务"""

    def __init__(self):
        """初始化服务"""
        pass

    async def create_share(
        self, 
        conversation_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """
        创建分享链接
        
        Args:
            conversation_id: 对话ID
            user_id: 用户ID
            
        Returns:
            包含分享链接信息的字典
            
        Raises:
            HTTPException: 当验证失败或创建失败时
        """
        try:
            # 验证用户是对话所有者
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            
            if not conversation:
                logger.warning(f"对话不存在: {conversation_id}")
                raise HTTPException(status_code=404, detail="对话不存在")
            
            if conversation.get("user_id") != user_id:
                logger.warning(f"用户 {user_id} 无权限分享对话 {conversation_id}")
                raise HTTPException(status_code=403, detail="无权限分享此对话")
            
            # 调用ShareRepository创建分享
            share_result = await mongodb_client.share_repository.create_share(
                conversation_id=conversation_id,
                user_id=user_id
            )
            
            share_id = share_result["share_id"]
            created_at = share_result["created_at"]
            
            # 返回格式化的分享链接
            share_url = f"share/{share_id}"
            
            logger.info(f"创建分享链接成功: {share_url} for conversation {conversation_id}")
            
            return {
                "status": "success",
                "message": "分享链接创建成功",
                "share_id": share_id,
                "share_url": share_url,
                "created_at": created_at.isoformat() if isinstance(created_at, datetime) else created_at
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"创建分享链接失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"创建分享链接失败: {str(e)}")

    async def get_shared_conversation(
        self, 
        share_id: str
    ) -> Dict[str, Any]:
        """
        获取分享的对话内容
        
        Args:
            share_id: 分享ID
            
        Returns:
            清洗后的对话数据
            
        Raises:
            HTTPException: 当分享不存在或对话已删除时
        """
        try:
            # 验证share_id有效性
            share = await mongodb_client.share_repository.get_share_by_id(share_id)
            
            if not share:
                logger.warning(f"分享不存在: {share_id}")
                raise HTTPException(status_code=404, detail="分享链接不存在")
            
            conversation_id = share["conversation_id"]
            
            # 获取对话完整内容（包括rounds），并检查对话状态
            conversation = await mongodb_client.conversation_repository.get_conversation_for_share(conversation_id)
            
            if not conversation:
                logger.warning(f"对话不存在或已被删除: {conversation_id}")
                raise HTTPException(status_code=404, detail="对话不存在或已被删除")
            
            # 返回清洗后的数据（get_conversation_for_share已经排除了敏感信息）
            logger.info(f"成功获取分享对话: {conversation_id} via share {share_id}")
            
            return conversation
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"获取分享对话失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"获取分享对话失败: {str(e)}")

    async def get_shared_files(
        self, 
        share_id: str
    ) -> Dict[str, Any]:
        """
        获取分享对话的文件列表
        
        Args:
            share_id: 分享ID
            
        Returns:
            文件列表信息
            
        Raises:
            HTTPException: 当分享不存在时
        """
        try:
            # 验证share_id有效性
            share = await mongodb_client.share_repository.get_share_by_id(share_id)
            
            if not share:
                logger.warning(f"分享不存在: {share_id}")
                raise HTTPException(status_code=404, detail="分享链接不存在")
            
            conversation_id = share["conversation_id"]
            
            # 获取对话的文件列表
            documents = await mongodb_client.conversation_repository.get_all_files_metadata(conversation_id)
            
            files = documents.get("files", [])
            total_count = documents.get("total_count", 0)
            
            # 返回文件元数据（包含文件名、摘要、大小、创建时间和更新时间）
            logger.info(f"成功获取分享对话文件列表: {conversation_id}, 文件数: {total_count}")
            
            return {
                "success": True,
                "files": [file["filename"] for file in files],
                "total_count": total_count
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"获取分享文件列表失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"获取分享文件列表失败: {str(e)}")

    async def download_shared_file(
        self, 
        share_id: str, 
        filename: str
    ) -> bytes:
        """
        下载分享对话的单个文件
        
        Args:
            share_id: 分享ID
            filename: 文件名
            
        Returns:
            文件内容（字节）
            
        Raises:
            HTTPException: 当分享不存在或文件不存在时
        """
        try:
            # 验证share_id和filename
            share = await mongodb_client.share_repository.get_share_by_id(share_id)
            
            if not share:
                logger.warning(f"分享不存在: {share_id}")
                raise HTTPException(status_code=404, detail="分享链接不存在")
            
            conversation_id = share["conversation_id"]
            user_id = share["user_id"]
            
            # 检查文件是否存在
            file_exists = await mongodb_client.conversation_repository.file_exists(
                conversation_id=conversation_id,
                filename=filename
            )
            
            if not file_exists:
                logger.warning(f"文件不存在: {filename} in conversation {conversation_id}")
                raise HTTPException(status_code=404, detail="文件不存在")
            
            # 从MinIO获取文件内容
            content = await conversation_document_manager.read_file(
                user_id=user_id,
                conversation_id=conversation_id,
                filename=filename
            )
            
            if content is None:
                logger.error(f"读取文件内容失败: {filename}")
                raise HTTPException(status_code=500, detail="读取文件内容失败")
            
            logger.info(f"成功下载分享文件: {filename} from conversation {conversation_id}")
            
            # 返回文件内容（字节）
            return content.encode('utf-8') if isinstance(content, str) else content
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"下载分享文件失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"下载分享文件失败: {str(e)}")

    async def download_shared_files_zip(
        self, 
        share_id: str
    ) -> str:
        """
        打包下载分享对话的所有文件
        
        Args:
            share_id: 分享ID
            
        Returns:
            ZIP文件路径
            
        Raises:
            HTTPException: 当分享不存在或没有文件时
        """
        try:
            # 验证share_id有效性
            share = await mongodb_client.share_repository.get_share_by_id(share_id)
            
            if not share:
                logger.warning(f"分享不存在: {share_id}")
                raise HTTPException(status_code=404, detail="分享链接不存在")
            
            conversation_id = share["conversation_id"]
            user_id = share["user_id"]
            
            # 获取所有文件内容
            documents = await mongodb_client.conversation_repository.get_all_files_metadata(conversation_id)
            files = documents.get("files", [])
            
            if not files:
                logger.warning(f"对话没有文件可下载: {conversation_id}")
                raise HTTPException(status_code=404, detail="没有可下载的文件")
            
            # 创建临时ZIP文件
            temp_dir = tempfile.gettempdir()
            zip_filename = f"conversation_{conversation_id}_{int(datetime.now().timestamp())}.zip"
            zip_path = os.path.join(temp_dir, zip_filename)
            
            # 创建ZIP文件并保持目录结构
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_info in files:
                    filename = file_info["filename"]
                    
                    try:
                        # 从MinIO获取文件内容
                        content = await conversation_document_manager.read_file(
                            user_id=user_id,
                            conversation_id=conversation_id,
                            filename=filename
                        )
                        
                        if content is not None:
                            # 将文件添加到ZIP，保持原始目录结构
                            if isinstance(content, str):
                                zipf.writestr(filename, content)
                            else:
                                zipf.writestr(filename, content)
                            logger.debug(f"添加文件到ZIP: {filename}")
                        else:
                            logger.warning(f"跳过无法读取的文件: {filename}")
                            
                    except Exception as e:
                        logger.warning(f"添加文件到ZIP失败: {filename}, 错误: {str(e)}")
                        continue
            
            logger.info(f"成功创建ZIP文件: {zip_path}, 包含 {len(files)} 个文件")
            
            return zip_path
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"创建ZIP文件失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"创建ZIP文件失败: {str(e)}")

    async def delete_share(
        self, 
        share_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """
        删除分享链接
        
        Args:
            share_id: 分享ID
            user_id: 用户ID
            
        Returns:
            删除结果
            
        Raises:
            HTTPException: 当验证失败或删除失败时
        """
        try:
            # 验证分享是否存在
            share = await mongodb_client.share_repository.get_share_by_id(share_id)
            
            if not share:
                logger.warning(f"分享不存在: {share_id}")
                raise HTTPException(status_code=404, detail="分享链接不存在")
            
            conversation_id = share["conversation_id"]
            
            # 验证用户是对话所有者
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            
            if not conversation:
                logger.warning(f"对话不存在: {conversation_id}")
                raise HTTPException(status_code=404, detail="对话不存在")
            
            if conversation.get("user_id") != user_id:
                logger.warning(f"用户 {user_id} 无权限删除分享 {share_id}")
                raise HTTPException(status_code=403, detail="无权限删除此分享链接")
            
            # 调用ShareRepository删除分享
            success = await mongodb_client.share_repository.delete_share(
                share_id=share_id,
                user_id=user_id
            )
            
            if not success:
                logger.error(f"删除分享失败: {share_id}")
                raise HTTPException(status_code=500, detail="删除分享链接失败")
            
            logger.info(f"成功删除分享: {share_id}")
            
            return {
                "status": "success",
                "message": "分享链接已删除",
                "share_id": share_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"删除分享失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"删除分享失败: {str(e)}")

    async def get_share_status(
        self, 
        conversation_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """
        查询对话的分享状态
        
        Args:
            conversation_id: 对话ID
            user_id: 用户ID
            
        Returns:
            分享状态信息
            
        Raises:
            HTTPException: 当验证失败时
        """
        try:
            # 验证用户是对话所有者
            conversation = await mongodb_client.conversation_repository.get_conversation(conversation_id)
            
            if not conversation:
                logger.warning(f"对话不存在: {conversation_id}")
                raise HTTPException(status_code=404, detail="对话不存在")
            
            if conversation.get("user_id") != user_id:
                logger.warning(f"用户 {user_id} 无权限查询对话 {conversation_id} 的分享状态")
                raise HTTPException(status_code=403, detail="无权限查询此对话的分享状态")
            
            # 查询对话的分享状态
            share = await mongodb_client.share_repository.get_share_by_conversation(conversation_id)
            
            if share:
                # 对话已被分享
                share_id = share["share_id"]
                share_url = f"share/{share_id}"
                created_at = share["created_at"]
                
                logger.info(f"对话 {conversation_id} 已分享: {share_url}")
                
                return {
                    "is_shared": True,
                    "share_id": share_id,
                    "share_url": share_url,
                    "created_at": created_at.isoformat() if isinstance(created_at, datetime) else created_at
                }
            else:
                # 对话未被分享
                logger.info(f"对话 {conversation_id} 未分享")
                
                return {
                    "is_shared": False,
                    "share_id": None,
                    "share_url": None,
                    "created_at": None
                }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"查询分享状态失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"查询分享状态失败: {str(e)}")


# 全局实例
conversation_share_service = ConversationShareService()
