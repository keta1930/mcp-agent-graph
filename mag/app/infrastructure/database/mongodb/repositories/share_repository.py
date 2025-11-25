import logging
import uuid
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class ShareRepository:
    """分享管理器 - 负责conversation_shares集合的操作"""

    def __init__(self, db, conversation_shares_collection):
        """初始化分享管理器"""
        self.db = db
        self.conversation_shares_collection = conversation_shares_collection

    def _generate_share_id(self) -> str:
        """生成唯一的UUID作为share_id"""
        return str(uuid.uuid4())

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def create_share(
        self, 
        conversation_id: str, 
        user_id: str
    ) -> Dict[str, Any]:
        """
        创建分享记录，返回share_id
        
        如果对话已存在分享记录，返回现有的share_id（幂等性）
        
        Args:
            conversation_id: 对话ID
            user_id: 用户ID
            
        Returns:
            Dict包含share_id和created_at
        """
        try:
            # 检查对话是否已存在分享记录
            existing_share = await self.conversation_shares_collection.find_one({
                "conversation_id": conversation_id
            })
            
            if existing_share:
                logger.info(f"对话 {conversation_id} 已存在分享记录，返回现有share_id")
                return {
                    "share_id": existing_share["share_id"],
                    "created_at": existing_share["created_at"]
                }
            
            # 创建新的分享记录
            now = datetime.now()
            share_id = self._generate_share_id()
            
            share_doc = {
                "share_id": share_id,
                "conversation_id": conversation_id,
                "user_id": user_id,
                "created_at": now,
                "updated_at": now
            }
            
            await self.conversation_shares_collection.insert_one(share_doc)
            logger.info(f"创建分享记录成功: share_id={share_id}, conversation_id={conversation_id}")
            
            return {
                "share_id": share_id,
                "created_at": now
            }
            
        except Exception as e:
            logger.error(f"创建分享记录失败: {str(e)}")
            raise

    async def get_share_by_id(
        self, 
        share_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        根据share_id获取分享记录
        
        Args:
            share_id: 分享ID
            
        Returns:
            分享记录，不存在返回None
        """
        try:
            share = await self.conversation_shares_collection.find_one({
                "share_id": share_id
            })
            
            if share:
                return self._convert_objectid_to_str(share)
            return None
            
        except Exception as e:
            logger.error(f"获取分享记录失败 (share_id={share_id}): {str(e)}")
            return None

    async def get_share_by_conversation(
        self, 
        conversation_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        根据conversation_id获取分享记录
        
        Args:
            conversation_id: 对话ID
            
        Returns:
            分享记录，不存在返回None
        """
        try:
            share = await self.conversation_shares_collection.find_one({
                "conversation_id": conversation_id
            })
            
            if share:
                return self._convert_objectid_to_str(share)
            return None
            
        except Exception as e:
            logger.error(f"获取分享记录失败 (conversation_id={conversation_id}): {str(e)}")
            return None

    async def delete_share(
        self, 
        share_id: str, 
        user_id: str
    ) -> bool:
        """
        删除分享记录（需验证所有权）
        
        Args:
            share_id: 分享ID
            user_id: 用户ID
            
        Returns:
            删除成功返回True，失败返回False
        """
        try:
            # 验证分享记录存在且属于该用户
            share = await self.conversation_shares_collection.find_one({
                "share_id": share_id,
                "user_id": user_id
            })
            
            if not share:
                logger.warning(f"分享记录不存在或不属于用户 {user_id}: {share_id}")
                return False
            
            # 删除分享记录
            result = await self.conversation_shares_collection.delete_one({
                "share_id": share_id,
                "user_id": user_id
            })
            
            if result.deleted_count > 0:
                logger.info(f"删除分享记录成功: share_id={share_id}")
                return True
            else:
                logger.warning(f"删除分享记录失败: share_id={share_id}")
                return False
                
        except Exception as e:
            logger.error(f"删除分享记录失败: {str(e)}")
            return False

    async def delete_shares_by_conversation(
        self, 
        conversation_id: str
    ) -> bool:
        """
        删除对话的所有分享记录（级联删除）
        
        Args:
            conversation_id: 对话ID
            
        Returns:
            删除成功返回True，失败返回False
        """
        try:
            result = await self.conversation_shares_collection.delete_many({
                "conversation_id": conversation_id
            })
            
            if result.deleted_count > 0:
                logger.info(f"删除对话的分享记录成功: conversation_id={conversation_id}, 删除数量={result.deleted_count}")
            else:
                logger.debug(f"对话没有分享记录: conversation_id={conversation_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"删除对话的分享记录失败: {str(e)}")
            return False
