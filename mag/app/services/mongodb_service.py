import logging
import asyncio
from typing import Dict, List, Any, Optional, Callable
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError, PyMongoError
import time
from datetime import datetime
from bson import ObjectId

# 导入新的管理器
from app.services.docdb import ConversationManager, GraphManager, MCPManager

logger = logging.getLogger(__name__)


class MongoDBService:
    """MongoDB服务管理"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.conversations_collection = None
        self.messages_collection = None
        self.graph_generations_collection = None
        self.mcp_generations_collection = None
        self.is_connected = False

        # 管理器实例
        self.conversation_manager = None
        self.graph_manager = None
        self.mcp_manager = None

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
            self.graph_generations_collection = self.db.graph_generations
            self.mcp_generations_collection = self.db.mcp_generations

            # 测试连接
            await self.client.admin.command('ping')

            # 创建索引
            await self._create_indexes()

            # 初始化管理器
            self._initialize_managers()

            self.is_connected = True
            logger.info("MongoDB连接成功建立")

        except Exception as e:
            logger.error(f"MongoDB连接失败: {str(e)}")
            self.is_connected = False
            raise

    def _initialize_managers(self):
        """初始化各个功能管理器"""
        self.conversation_manager = ConversationManager(
            self.db,
            self.conversations_collection,
            self.messages_collection
        )

        self.graph_manager = GraphManager(
            self.db,
            self.graph_generations_collection
        )

        self.mcp_manager = MCPManager(
            self.db,
            self.mcp_generations_collection
        )

    async def _create_indexes(self):
        """创建必要的索引"""
        try:
            # 为conversations集合创建索引
            await self.conversations_collection.create_index([("user_id", 1), ("created_at", -1)])
            await self.conversations_collection.create_index([("status", 1)])
            await self.conversations_collection.create_index([("updated_at", -1)])

            # 为messages集合创建索引
            await self.messages_collection.create_index([("conversation_id", 1)])

            # 为graph_generations集合创建索引
            await self.graph_generations_collection.create_index([("user_id", 1), ("created_at", -1)])
            await self.graph_generations_collection.create_index([("updated_at", -1)])

            # 为mcp_generations集合创建索引
            await self.mcp_generations_collection.create_index([("user_id", 1), ("created_at", -1)])
            await self.mcp_generations_collection.create_index([("updated_at", -1)])

            logger.info("MongoDB索引创建成功")

        except Exception as e:
            logger.error(f"创建MongoDB索引失败: {str(e)}")

    async def disconnect(self):
        """断开MongoDB连接"""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("MongoDB连接已断开")

    # === 图生成管理方法 ===

    async def create_graph_generation_conversation(self, conversation_id: str, user_id: str = "default_user") -> bool:
        """创建新的图生成对话"""
        return await self.graph_manager.create_graph_generation_conversation(conversation_id, user_id)

    async def get_graph_generation_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取图生成对话"""
        return await self.graph_manager.get_graph_generation_conversation(conversation_id)

    async def add_message_to_graph_generation(self, conversation_id: str,
                                              message: Dict[str, Any]) -> bool:
        """向图生成对话添加消息"""
        return await self.graph_manager.add_message_to_graph_generation(conversation_id, message)

    async def update_graph_generation_parsed_results(self, conversation_id: str,
                                                     parsed_results: Dict[str, Any]) -> bool:
        """更新图生成对话的解析结果 - 支持替换和删除逻辑"""
        return await self.graph_manager.update_graph_generation_parsed_results(conversation_id, parsed_results)

    async def update_graph_generation_token_usage(self, conversation_id: str,
                                                  prompt_tokens: int, completion_tokens: int) -> bool:
        """更新图生成对话的token使用量"""
        return await self.graph_manager.update_graph_generation_token_usage(conversation_id, prompt_tokens,
                                                                            completion_tokens)

    async def update_graph_generation_final_config(self, conversation_id: str,
                                                   final_graph_config: Dict[str, Any]) -> bool:
        """更新图生成对话的最终图配置"""
        return await self.graph_manager.update_graph_generation_final_config(conversation_id, final_graph_config)

    # === MCP生成管理方法 ===

    async def create_mcp_generation_conversation(self, conversation_id: str, user_id: str = "default_user") -> bool:
        """创建新的MCP生成对话"""
        return await self.mcp_manager.create_mcp_generation_conversation(conversation_id, user_id)

    async def get_mcp_generation_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取MCP生成对话"""
        return await self.mcp_manager.get_mcp_generation_conversation(conversation_id)

    async def add_message_to_mcp_generation(self, conversation_id: str,
                                            message: Dict[str, Any]) -> bool:
        """向MCP生成对话添加消息"""
        return await self.mcp_manager.add_message_to_mcp_generation(conversation_id, message)

    async def update_mcp_generation_parsed_results(self, conversation_id: str,
                                                   parsed_results: Dict[str, Any]) -> bool:
        """更新MCP生成对话的解析结果 - 支持脚本文件的增删改"""
        return await self.mcp_manager.update_mcp_generation_parsed_results(conversation_id, parsed_results)

    async def update_mcp_generation_token_usage(self, conversation_id: str,
                                                prompt_tokens: int, completion_tokens: int) -> bool:
        """更新MCP生成对话的token使用量"""
        return await self.mcp_manager.update_mcp_generation_token_usage(conversation_id, prompt_tokens,
                                                                        completion_tokens)

    # === 对话管理方法 ===

    async def create_conversation(self, conversation_id: str, user_id: str = "default_user",
                                  title: str = "", tags: List[str] = None) -> bool:
        """创建新对话"""
        return await self.conversation_manager.create_conversation(conversation_id, user_id, title, tags)

    async def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取对话基本信息"""
        return await self.conversation_manager.get_conversation(conversation_id)

    async def get_conversation_messages(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取对话的完整消息历史"""
        return await self.conversation_manager.get_conversation_messages(conversation_id)

    async def get_conversation_with_messages(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取包含消息的完整对话数据"""
        return await self.conversation_manager.get_conversation_with_messages(conversation_id)

    async def ensure_conversation_exists(self, conversation_id: str, user_id: str = "default_user") -> bool:
        """确保对话存在，不存在则创建"""
        return await self.conversation_manager.ensure_conversation_exists(conversation_id, user_id)

    async def add_round_to_conversation(self, conversation_id: str, round_number: int,
                                        messages: List[Dict[str, Any]]) -> bool:
        """向对话添加新的轮次"""
        return await self.conversation_manager.add_round_to_conversation(conversation_id, round_number, messages)

    async def update_conversation_title_and_tags(self, conversation_id: str,
                                                 title: str = None, tags: List[str] = None) -> bool:
        """更新对话标题和标签（仅在第一轮时调用）"""
        return await self.conversation_manager.update_conversation_title_and_tags(conversation_id, title, tags)

    async def update_conversation_title(self, conversation_id: str, title: str, user_id: str = "default_user") -> bool:
        """更新对话标题"""
        return await self.conversation_manager.update_conversation_title(conversation_id, title, user_id)

    async def update_conversation_tags(self, conversation_id: str, tags: List[str],
                                       user_id: str = "default_user") -> bool:
        """更新对话标签"""
        return await self.conversation_manager.update_conversation_tags(conversation_id, tags, user_id)

    async def update_conversation_token_usage(self, conversation_id: str,
                                              prompt_tokens: int, completion_tokens: int) -> bool:
        """更新对话的token使用量"""
        return await self.conversation_manager.update_conversation_token_usage(conversation_id, prompt_tokens,
                                                                               completion_tokens)

    async def list_conversations(self, user_id: str = "default_user",
                                 limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """获取用户的对话列表"""
        return await self.conversation_manager.list_conversations(user_id, limit, skip)

    async def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话（软删除，标记为deleted状态）"""
        return await self.conversation_manager.delete_conversation(conversation_id)

    async def permanently_delete_conversation(self, conversation_id: str) -> bool:
        """永久删除对话和相关消息"""
        return await self.conversation_manager.permanently_delete_conversation(conversation_id)

    async def compact_conversation(self,
                                   conversation_id: str,
                                   compact_type: str = "brutal",
                                   compact_threshold: int = 2000,
                                   summarize_callback: Optional[Callable] = None,
                                   user_id: str = "default_user") -> Dict[str, Any]:
        """压缩对话内容"""
        return await self.conversation_manager.compact_conversation(conversation_id, compact_type, compact_threshold, summarize_callback, user_id)

    async def get_conversation_stats(self, user_id: str = "default_user") -> Dict[str, Any]:
        """获取用户的对话统计信息"""
        return await self.conversation_manager.get_conversation_stats(user_id)

# 创建全局MongoDB服务实例
mongodb_service = MongoDBService()