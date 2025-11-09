"""
消息数据仓库

负责消息数据的CRUD操作
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId
import uuid

logger = logging.getLogger(__name__)


class MessageRepository:
    """消息Repository - 负责messages集合的操作"""

    def __init__(self, db, messages_collection):
        """初始化消息Repository"""
        self.db = db
        self.collection = messages_collection

    async def create_message(
        self,
        sender_id: str,
        receiver_id: str,
        content: str,
        message_type: str = "text"
    ) -> Optional[dict]:
        """
        创建消息

        Args:
            sender_id: 发送者用户ID
            receiver_id: 接收者用户ID
            content: 消息内容
            message_type: 消息类型（text|image|file）

        Returns:
            dict: 创建的消息文档
        """
        try:
            now = datetime.now()
            message_id = str(uuid.uuid4())

            message_doc = {
                "message_id": message_id,
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "content": content,
                "message_type": message_type,
                "is_read": False,
                "created_at": now,
                "read_at": None,
            }

            result = await self.collection.insert_one(message_doc)
            message_doc["_id"] = str(result.inserted_id)

            logger.info(f"消息创建成功: {message_id}, 发送者: {sender_id}, 接收者: {receiver_id}")
            return message_doc

        except Exception as e:
            logger.error(f"创建消息失败: {str(e)}")
            return None

    async def get_messages_between_users(
        self,
        user_id_1: str,
        user_id_2: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[dict]:
        """
        获取两个用户之间的消息历史

        Args:
            user_id_1: 用户1的ID
            user_id_2: 用户2的ID
            skip: 跳过的记录数
            limit: 返回的最大记录数

        Returns:
            List[dict]: 消息列表，按时间倒序排列
        """
        try:
            query = {
                "$or": [
                    {"sender_id": user_id_1, "receiver_id": user_id_2},
                    {"sender_id": user_id_2, "receiver_id": user_id_1}
                ]
            }

            cursor = self.collection.find(query).sort("created_at", -1).skip(skip).limit(limit)

            messages = []
            async for message in cursor:
                messages.append(self._convert_objectid_to_str(message))

            # 返回正序（从旧到新）
            return list(reversed(messages))

        except Exception as e:
            logger.error(f"获取消息历史失败: {str(e)}")
            return []

    async def get_message_count_between_users(
        self,
        user_id_1: str,
        user_id_2: str
    ) -> int:
        """
        获取两个用户之间的消息总数

        Args:
            user_id_1: 用户1的ID
            user_id_2: 用户2的ID

        Returns:
            int: 消息总数
        """
        try:
            query = {
                "$or": [
                    {"sender_id": user_id_1, "receiver_id": user_id_2},
                    {"sender_id": user_id_2, "receiver_id": user_id_1}
                ]
            }
            return await self.collection.count_documents(query)
        except Exception as e:
            logger.error(f"获取消息总数失败: {str(e)}")
            return 0

    async def mark_messages_as_read(
        self,
        message_ids: List[str],
        user_id: str
    ) -> int:
        """
        标记消息为已读

        Args:
            message_ids: 消息ID列表
            user_id: 当前用户ID（只能标记发给自己的消息）

        Returns:
            int: 更新的消息数量
        """
        try:
            now = datetime.now()

            result = await self.collection.update_many(
                {
                    "message_id": {"$in": message_ids},
                    "receiver_id": user_id,
                    "is_read": False
                },
                {
                    "$set": {
                        "is_read": True,
                        "read_at": now
                    }
                }
            )

            logger.info(f"标记 {result.modified_count} 条消息为已读")
            return result.modified_count

        except Exception as e:
            logger.error(f"标记消息为已读失败: {str(e)}")
            return 0

    async def get_unread_count(
        self,
        user_id: str,
        sender_id: Optional[str] = None
    ) -> int:
        """
        获取未读消息数量

        Args:
            user_id: 接收者用户ID
            sender_id: 发送者用户ID（可选，如果指定则只统计特定发送者的未读消息）

        Returns:
            int: 未读消息数量
        """
        try:
            query = {
                "receiver_id": user_id,
                "is_read": False
            }

            if sender_id:
                query["sender_id"] = sender_id

            return await self.collection.count_documents(query)

        except Exception as e:
            logger.error(f"获取未读消息数量失败: {str(e)}")
            return 0

    async def get_conversations_list(
        self,
        user_id: str
    ) -> List[dict]:
        """
        获取用户的所有会话列表（包含最后一条消息和未读数）

        Args:
            user_id: 用户ID

        Returns:
            List[dict]: 会话列表
        """
        try:
            # 使用聚合管道获取每个对话的最后一条消息
            pipeline = [
                # 筛选与当前用户相关的消息
                {
                    "$match": {
                        "$or": [
                            {"sender_id": user_id},
                            {"receiver_id": user_id}
                        ]
                    }
                },
                # 按时间倒序排序
                {"$sort": {"created_at": -1}},
                # 计算对话用户ID
                {
                    "$addFields": {
                        "conversation_user": {
                            "$cond": {
                                "if": {"$eq": ["$sender_id", user_id]},
                                "then": "$receiver_id",
                                "else": "$sender_id"
                            }
                        }
                    }
                },
                # 按对话用户分组，取每组的第一条消息（最新消息）
                {
                    "$group": {
                        "_id": "$conversation_user",
                        "last_message": {"$first": "$$ROOT"},
                        "last_message_time": {"$first": "$created_at"}
                    }
                },
                # 按最后消息时间倒序排序
                {"$sort": {"last_message_time": -1}}
            ]

            conversations = []
            async for doc in self.collection.aggregate(pipeline):
                conversation_user_id = doc["_id"]
                last_message = self._convert_objectid_to_str(doc["last_message"])

                # 获取未读消息数
                unread_count = await self.get_unread_count(user_id, conversation_user_id)

                conversations.append({
                    "user_id": conversation_user_id,
                    "last_message": last_message,
                    "unread_count": unread_count,
                    "last_message_time": doc["last_message_time"]
                })

            return conversations

        except Exception as e:
            logger.error(f"获取会话列表失败: {str(e)}")
            return []

    async def delete_conversation(
        self,
        user_id: str,
        other_user_id: str
    ) -> int:
        """
        删除与某个用户的所有消息

        Args:
            user_id: 当前用户ID
            other_user_id: 对方用户ID

        Returns:
            int: 删除的消息数量
        """
        try:
            result = await self.collection.delete_many({
                "$or": [
                    {"sender_id": user_id, "receiver_id": other_user_id},
                    {"sender_id": other_user_id, "receiver_id": user_id}
                ]
            })

            logger.info(f"删除了 {result.deleted_count} 条消息")
            return result.deleted_count

        except Exception as e:
            logger.error(f"删除会话失败: {str(e)}")
            return 0

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc
