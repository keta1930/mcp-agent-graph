import logging
import asyncio
from typing import Dict, List, Any, Optional, Callable
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError, PyMongoError
import time
from datetime import datetime
from bson import ObjectId

# 导入重构后的管理器
from app.services.docdb import ConversationManager, ChatManager, GraphManager, MCPManager

logger = logging.getLogger(__name__)


class MongoDBService:
    """MongoDB服务管理"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None

        # 更新后的集合引用
        self.conversations_collection = None  # 统一对话基本信息
        self.chat_messages_collection = None  # 聊天详细消息（从messages重命名）
        self.graph_messages_collection = None  # 图生成详细消息（新格式）
        self.mcp_messages_collection = None  # MCP生成详细消息（新格式）

        self.is_connected = False

        # 管理器实例
        self.conversation_manager = None
        self.chat_manager = None
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

            # 获取集合引用（更新后的结构）
            self.conversations_collection = self.db.conversations  # 统一基本信息
            self.chat_messages_collection = self.db.chat_messages  # 聊天详细消息
            self.graph_messages_collection = self.db.graph_messages  # 图生成详细消息
            self.mcp_messages_collection = self.db.mcp_messages  # MCP生成详细消息

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
        # 基础对话管理器
        self.conversation_manager = ConversationManager(
            self.db,
            self.conversations_collection
        )

        # 聊天管理器
        self.chat_manager = ChatManager(
            self.db,
            self.chat_messages_collection
        )

        # 图生成管理器
        self.graph_manager = GraphManager(
            self.db,
            self.graph_messages_collection,
            self.conversation_manager
        )

        # MCP生成管理器
        self.mcp_manager = MCPManager(
            self.db,
            self.mcp_messages_collection,
            self.conversation_manager
        )

    async def _create_indexes(self):
        """创建必要的索引"""
        try:
            # 为conversations集合创建索引
            await self.conversations_collection.create_index([("user_id", 1), ("type", 1), ("created_at", -1)])
            await self.conversations_collection.create_index([("status", 1)])
            await self.conversations_collection.create_index([("updated_at", -1)])

            # 为chat_messages集合创建索引
            await self.chat_messages_collection.create_index([("conversation_id", 1)])

            # 为graph_messages集合创建索引
            await self.graph_messages_collection.create_index([("conversation_id", 1)])

            # 为mcp_messages集合创建索引
            await self.mcp_messages_collection.create_index([("conversation_id", 1)])

            logger.info("MongoDB索引创建成功")

        except Exception as e:
            logger.error(f"创建MongoDB索引失败: {str(e)}")

    async def disconnect(self):
        """断开MongoDB连接"""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("MongoDB连接已断开")

    # === 图生成管理方法===

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

    # === MCP生成管理方法===

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

    # === 对话管理方法===

    async def create_conversation(self, conversation_id: str, user_id: str = "default_user",
                                  title: str = "", tags: List[str] = None) -> bool:
        """创建新聊天对话"""
        # 1. 创建基本对话信息
        conversation_success = await self.conversation_manager.create_conversation(
            conversation_id=conversation_id,
            conversation_type="chat",
            user_id=user_id,
            title=title,
            tags=tags
        )

        if not conversation_success:
            return False

        # 2. 创建聊天消息文档
        return await self.chat_manager.create_chat_messages_document(conversation_id)

    async def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取对话基本信息"""
        return await self.conversation_manager.get_conversation(conversation_id)

    async def get_conversation_with_messages(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取包含消息的完整对话数据（支持所有类型）"""
        try:
            # 获取基本信息
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                return None

            # 根据类型获取详细消息
            conversation_type = conversation.get("type", "chat")

            if conversation_type == "chat":
                # chat类型：从chat_messages集合获取
                messages_doc = await self.chat_manager.get_chat_messages(conversation_id)
                if messages_doc:
                    conversation["rounds"] = messages_doc.get("rounds", [])
                    conversation["generation_type"] = "chat"
                else:
                    conversation["rounds"] = []

            elif conversation_type == "agent":
                # agent类型：需要判断是graph还是mcp对话
                # 先尝试从graph_messages获取
                graph_messages_doc = await self.graph_manager.get_graph_generation_messages_only(conversation_id)

                if graph_messages_doc and graph_messages_doc.get("rounds"):
                    # 是图生成对话
                    conversation["rounds"] = graph_messages_doc.get("rounds", [])
                    # 添加图生成的额外信息
                    conversation["parsed_results"] = graph_messages_doc.get("parsed_results", {})
                    conversation["final_graph_config"] = graph_messages_doc.get("final_graph_config")
                    conversation["generation_type"] = "graph"
                else:
                    # 尝试从mcp_messages获取
                    mcp_messages_doc = await self.mcp_manager.get_mcp_generation_messages_only(conversation_id)

                    if mcp_messages_doc and mcp_messages_doc.get("rounds"):
                        # 是MCP生成对话
                        conversation["rounds"] = mcp_messages_doc.get("rounds", [])
                        # 添加MCP生成的额外信息
                        conversation["parsed_results"] = mcp_messages_doc.get("parsed_results", {})
                        conversation["generation_type"] = "mcp"
                    else:
                        # 都没有找到，返回空rounds
                        conversation["rounds"] = []
                        conversation["generation_type"] = "unknown"
            else:
                # 未知类型，返回空rounds
                conversation["rounds"] = []

            return conversation

        except Exception as e:
            logger.error(f"获取完整对话数据失败: {str(e)}")
            return None
    async def ensure_conversation_exists(self, conversation_id: str, user_id: str = "default_user") -> bool:
        """确保聊天对话存在，不存在则创建"""
        # 先检查对话是否存在
        conversation = await self.conversation_manager.get_conversation(conversation_id)
        if conversation:
            # 确保消息文档也存在
            await self.chat_manager.create_chat_messages_document(conversation_id)
            return True

        # 创建新的聊天对话
        return await self.create_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            title="新对话",
            tags=[]
        )

    async def add_round_to_conversation(self, conversation_id: str, round_number: int,
                                        messages: List[Dict[str, Any]]) -> bool:
        """向聊天对话添加新的轮次"""
        # 1. 添加消息到chat_messages
        success = await self.chat_manager.add_round_to_chat(conversation_id, round_number, messages)

        # 2. 更新对话基本信息
        if success:
            await self.conversation_manager.update_conversation_round_count(conversation_id, 1)

        return success

    async def update_conversation_title_and_tags(self, conversation_id: str,
                                                 title: str = None, tags: List[str] = None) -> bool:
        """更新对话标题和标签（首次生成时调用）"""
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

    async def list_conversations(self, user_id: str = "default_user",conversation_type: str = "chat",
                                 limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """获取用户的聊天对话列表"""
        return await self.conversation_manager.list_conversations(user_id, conversation_type, limit, skip)

    async def update_conversation_status(self, conversation_id: str, status: str,
                                         user_id: str = "default_user") -> bool:
        """更新对话状态"""
        return await self.conversation_manager.update_conversation_status(
            conversation_id, status, user_id
        )

    async def delete_conversation(self, conversation_id: str) -> bool:
        """删除对话（软删除，标记为deleted状态）"""
        return await self.conversation_manager.delete_conversation(conversation_id)

    async def permanently_delete_conversation(self, conversation_id: str) -> bool:
        """永久删除对话和相关消息"""
        try:
            # 获取对话信息以确定类型
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                return False

            conversation_type = conversation.get("type", "chat")

            # 根据类型删除对应的消息
            if conversation_type == "chat":
                await self.chat_manager.delete_chat_messages(conversation_id)
            elif conversation_type == "agent":
                # 尝试删除图生成和MCP生成消息（可能只有其中一个存在）
                await self.graph_manager.delete_graph_generation_messages(conversation_id)
                await self.mcp_manager.delete_mcp_generation_messages(conversation_id)

            # 删除对话基本信息
            return await self.conversation_manager.permanently_delete_conversation(conversation_id)

        except Exception as e:
            logger.error(f"永久删除对话失败: {str(e)}")
            return False

    async def compact_conversation(self,
                                   conversation_id: str,
                                   compact_type: str = "brutal",
                                   compact_threshold: int = 2000,
                                   summarize_callback: Optional[Callable] = None,
                                   user_id: str = "default_user") -> Dict[str, Any]:
        """压缩对话内容（目前只支持聊天对话）"""
        try:
            # 检查对话类型
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                return {"status": "error", "error": "对话不存在"}

            if conversation.get("type") != "chat":
                return {"status": "error", "error": "暂时只支持聊天对话的压缩"}

            # 验证对话所有权
            if conversation.get("user_id") != user_id:
                return {"status": "error", "error": "无权限访问此对话"}

            # 委托给chat_manager处理
            return await self.chat_manager.compact_chat_messages(
                conversation_id, compact_type, compact_threshold, summarize_callback
            )

        except Exception as e:
            logger.error(f"压缩对话失败: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def get_conversation_stats(self, user_id: str = "default_user") -> Dict[str, Any]:
        """获取用户的对话统计信息"""
        return await self.conversation_manager.get_conversation_stats(user_id)


# 创建全局MongoDB服务实例
mongodb_service = MongoDBService()