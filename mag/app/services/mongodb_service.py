import logging
import asyncio
from typing import Dict, List, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError, PyMongoError
import time
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class MongoDBService:
    """MongoDB服务管理"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.conversations_collection = None
        self.messages_collection = None
        self.is_connected = False

    async def initialize(self, connection_string: str = "mongodb://admin:securepassword123@localhost:27017/"):
        """初始化MongoDB连接"""
        try:
            # 创建异步MongoDB客户端
            self.client = AsyncIOMotorClient(
                connection_string,
                serverSelectionTimeoutMS=5000,  # 5秒超时
                connectTimeoutMS=5000,
                socketTimeoutMS=5000
            )

            # 选择数据库
            self.db = self.client.conversationdb

            # 获取集合引用
            self.conversations_collection = self.db.conversations
            self.messages_collection = self.db.messages

            # 测试连接
            await self.client.admin.command('ping')
            
            # 创建索引
            await self._create_indexes()
            
            self.is_connected = True
            logger.info("MongoDB连接成功建立")
            
        except Exception as e:
            logger.error(f"MongoDB连接失败: {str(e)}")
            self.is_connected = False
            raise

    async def _create_indexes(self):
        """创建必要的索引"""
        try:
            # 为conversations集合创建索引
            await self.conversations_collection.create_index([("user_id", 1), ("created_at", -1)])
            await self.conversations_collection.create_index([("status", 1)])
            await self.conversations_collection.create_index([("updated_at", -1)])
            
            # 为messages集合创建索引
            await self.messages_collection.create_index([("conversation_id", 1)])
            
            logger.info("MongoDB索引创建成功")
            
        except Exception as e:
            logger.error(f"创建MongoDB索引失败: {str(e)}")

    async def disconnect(self):
        """断开MongoDB连接"""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("MongoDB连接已断开")

    # === 对话管理方法 ===

    async def create_conversation(self, conversation_id: str, user_id: str = "default_user", 
                                title: str = "", tags: List[str] = None) -> bool:
        """创建新对话"""
        try:
            now = datetime.utcnow()
            conversation_doc = {
                "_id": conversation_id,
                "user_id": user_id,
                "title": title,
                "created_at": now,
                "updated_at": now,
                "round_count": 0,
                "total_token_usage": {
                    "total_tokens": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0
                },
                "status": "active",
                "tags": tags or []
            }
            
            # 创建对话文档
            await self.conversations_collection.insert_one(conversation_doc)
            
            # 创建对应的消息文档
            messages_doc = {
                "_id": conversation_id,
                "conversation_id": conversation_id,
                "rounds": []
            }
            await self.messages_collection.insert_one(messages_doc)
            
            logger.info(f"创建对话成功: {conversation_id}")
            return True
            
        except DuplicateKeyError:
            logger.warning(f"对话已存在: {conversation_id}")
            return False
        except Exception as e:
            logger.error(f"创建对话失败: {str(e)}")
            return False

    async def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取对话基本信息"""
        try:
            conversation = await self.conversations_collection.find_one({"_id": conversation_id})
            if conversation:
                # 转换ObjectId为字符串（如果有的话）
                return self._convert_objectid_to_str(conversation)
            return None
        except Exception as e:
            logger.error(f"获取对话失败: {str(e)}")
            return None

    async def get_conversation_messages(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取对话的完整消息历史"""
        try:
            messages_doc = await self.messages_collection.find_one({"conversation_id": conversation_id})
            if messages_doc:
                return self._convert_objectid_to_str(messages_doc)
            return None
        except Exception as e:
            logger.error(f"获取对话消息失败: {str(e)}")
            return None

    async def get_conversation_with_messages(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取包含消息的完整对话数据"""
        try:
            # 获取对话基本信息
            conversation = await self.get_conversation(conversation_id)
            if not conversation:
                return None
            
            # 获取消息历史
            messages_doc = await self.get_conversation_messages(conversation_id)
            if messages_doc:
                conversation["rounds"] = messages_doc.get("rounds", [])
            else:
                conversation["rounds"] = []
            
            return conversation
        except Exception as e:
            logger.error(f"获取完整对话数据失败: {str(e)}")
            return None

    async def add_round_to_conversation(self, conversation_id: str, round_number: int, 
                                      messages: List[Dict[str, Any]]) -> bool:
        """向对话添加新的轮次"""
        try:
            # 添加轮次到消息集合
            round_data = {
                "round": round_number,
                "messages": messages
            }
            
            result = await self.messages_collection.update_one(
                {"conversation_id": conversation_id},
                {"$push": {"rounds": round_data}}
            )
            
            if result.modified_count > 0:
                # 更新对话的基本信息
                await self.conversations_collection.update_one(
                    {"_id": conversation_id},
                    {
                        "$set": {"updated_at": datetime.utcnow()},
                        "$inc": {"round_count": 1}
                    }
                )
                logger.info(f"向对话 {conversation_id} 添加轮次 {round_number} 成功")
                return True
            else:
                logger.error(f"向对话 {conversation_id} 添加轮次失败")
                return False
                
        except Exception as e:
            logger.error(f"添加对话轮次失败: {str(e)}")
            return False

    async def update_conversation_title_and_tags(self, conversation_id: str, 
                                                title: str = None, tags: List[str] = None) -> bool:
        """更新对话标题和标签（仅在第一轮时调用）"""
        try:
            update_data = {"updated_at": datetime.utcnow()}
            if title:
                update_data["title"] = title
            if tags is not None:
                update_data["tags"] = tags
            
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id},
                {"$set": update_data}
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新对话标题和标签失败: {str(e)}")
            return False

    async def update_conversation_token_usage(self, conversation_id: str, 
                                            prompt_tokens: int, completion_tokens: int) -> bool:
        """更新对话的token使用量"""
        try:
            total_tokens = prompt_tokens + completion_tokens
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id},
                {
                    "$inc": {
                        "total_token_usage.total_tokens": total_tokens,
                        "total_token_usage.prompt_tokens": prompt_tokens,
                        "total_token_usage.completion_tokens": completion_tokens
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新token使用量失败: {str(e)}")
            return False

    async def list_conversations(self, user_id: str = "default_user", 
                                limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """获取用户的对话列表"""
        try:
            cursor = self.conversations_collection.find(
                {"user_id": user_id, "status": "active"}
            ).sort("updated_at", -1).skip(skip).limit(limit)
            
            conversations = []
            async for conversation in cursor:
                conversations.append(self._convert_objectid_to_str(conversation))
            
            return conversations
        except Exception as e:
            logger.error(f"获取对话列表失败: {str(e)}")
            return []

    async def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话（软删除，标记为deleted状态）"""
        try:
            # 软删除对话
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id},
                {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}}
            )
            
            if result.modified_count > 0:
                logger.info(f"对话 {conversation_id} 已标记为删除")
                return True
            else:
                logger.warning(f"对话 {conversation_id} 不存在或已删除")
                return False
                
        except Exception as e:
            logger.error(f"删除对话失败: {str(e)}")
            return False

    async def permanently_delete_conversation(self, conversation_id: str) -> bool:
        """永久删除对话和相关消息"""
        try:
            # 删除消息文档
            await self.messages_collection.delete_one({"conversation_id": conversation_id})
            
            # 删除对话文档
            result = await self.conversations_collection.delete_one({"_id": conversation_id})
            
            if result.deleted_count > 0:
                logger.info(f"对话 {conversation_id} 已永久删除")
                return True
            else:
                logger.warning(f"对话 {conversation_id} 不存在")
                return False
                
        except Exception as e:
            logger.error(f"永久删除对话失败: {str(e)}")
            return False

    # === 辅助方法 ===

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc

    async def health_check(self) -> bool:
        """健康检查"""
        try:
            if not self.is_connected:
                return False
            await self.client.admin.command('ping')
            return True
        except Exception:
            return False

    # === 统计方法 ===

    async def get_conversation_stats(self, user_id: str = "default_user") -> Dict[str, Any]:
        """获取用户的对话统计信息"""
        try:
            # 总对话数
            total_conversations = await self.conversations_collection.count_documents({
                "user_id": user_id,
                "status": "active"
            })
            
            # 今天的对话数
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_conversations = await self.conversations_collection.count_documents({
                "user_id": user_id,
                "status": "active",
                "created_at": {"$gte": today_start}
            })
            
            # 总token使用量
            pipeline = [
                {"$match": {"user_id": user_id, "status": "active"}},
                {"$group": {
                    "_id": None,
                    "total_tokens": {"$sum": "$total_token_usage.total_tokens"},
                    "total_rounds": {"$sum": "$round_count"}
                }}
            ]
            
            agg_result = await self.conversations_collection.aggregate(pipeline).to_list(1)
            total_tokens = agg_result[0]["total_tokens"] if agg_result else 0
            total_rounds = agg_result[0]["total_rounds"] if agg_result else 0
            
            return {
                "total_conversations": total_conversations,
                "today_conversations": today_conversations,
                "total_tokens": total_tokens,
                "total_rounds": total_rounds
            }
        except Exception as e:
            logger.error(f"获取统计信息失败: {str(e)}")
            return {
                "total_conversations": 0,
                "today_conversations": 0,
                "total_tokens": 0,
                "total_rounds": 0
            }


# 创建全局MongoDB服务实例
mongodb_service = MongoDBService()