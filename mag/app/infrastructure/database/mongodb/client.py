import logging
from typing import Dict, List, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.infrastructure.database.mongodb.repositories import (
    ConversationRepository, GraphRunRepository,
    TaskRepository, GraphConfigRepository, PromptRepository, ModelConfigRepository,
    MCPConfigRepository, PreviewRepository, UserRepository, InviteCodeRepository,
    TeamSettingsRepository, RefreshTokenRepository, AgentRepository,
    AgentRunRepository, MemoryRepository, ShareRepository
)

logger = logging.getLogger(__name__)


class MongoDBClient:
    """MongoDB服务管理"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None

        self.conversations_collection = None
        self.graph_run_messages_collection = None
        self.tasks_collection = None
        self.graphs_collection = None
        self.prompts_collection = None
        self.model_configs_collection = None
        self.mcp_configs_collection = None
        self.preview_shares_collection = None
        self.users_collection = None
        self.invite_codes_collection = None
        self.team_settings_collection = None
        self.refresh_tokens_collection = None
        self.agents_collection = None
        self.agent_run_collection = None
        self.memories_collection = None
        self.conversation_shares_collection = None

        self.is_connected = False

        self.conversation_repository = None
        self.graph_run_repository = None
        self.task_repository = None
        self.graph_config_repository = None
        self.prompt_repository = None
        self.model_config_repository = None
        self.mcp_config_repository = None
        self.preview_repository = None
        self.user_repository = None
        self.invite_code_repository = None
        self.team_settings_repository = None
        self.refresh_token_repository = None
        self.agent_repository = None
        self.agent_run_repository = None
        self.memory_repository = None
        self.share_repository = None

    async def initialize(self, connection_string: str, database_name: str = None):
        """初始化MongoDB连接"""
        try:
            self.client = AsyncIOMotorClient(
                connection_string,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=5000
            )

            self.db = self.client[database_name]

            self.conversations_collection = self.db.conversations
            self.graph_run_messages_collection = self.db.graph_run
            self.tasks_collection = self.db.tasks
            self.graphs_collection = self.db.graphs
            self.prompts_collection = self.db.prompts
            self.model_configs_collection = self.db.model_configs
            self.mcp_configs_collection = self.db.mcp_configs
            self.preview_shares_collection = self.db.preview_shares
            self.users_collection = self.db.users
            self.invite_codes_collection = self.db.invite_codes
            self.team_settings_collection = self.db.team_settings
            self.refresh_tokens_collection = self.db.refresh_tokens
            self.agents_collection = self.db.agents
            self.agent_run_collection = self.db.agent_run
            self.memories_collection = self.db.memories
            self.conversation_shares_collection = self.db.conversation_shares

            await self.client.admin.command('ping')

            await self._create_indexes()

            self._initialize_managers()

            self.is_connected = True
            logger.info("MongoDB连接成功建立")

        except Exception as e:
            logger.error(f"MongoDB连接失败: {str(e)}")
            self.is_connected = False
            raise

    def _initialize_managers(self):
        """初始化各个功能管理器"""
        self.conversation_repository = ConversationRepository(
            self.db,
            self.conversations_collection
        )

        self.graph_run_repository = GraphRunRepository(
            self.db,
            self.graph_run_messages_collection,
            self.conversation_repository
        )

        self.task_repository = TaskRepository(self.db)

        self.graph_config_repository = GraphConfigRepository(
            self.db,
            self.graphs_collection
        )

        self.prompt_repository = PromptRepository(
            self.db,
            self.prompts_collection
        )

        self.model_config_repository = ModelConfigRepository(
            self.db,
            self.model_configs_collection
        )

        self.mcp_config_repository = MCPConfigRepository(
            self.db,
            self.mcp_configs_collection
        )

        self.preview_repository = PreviewRepository(
            self.db,
            self.preview_shares_collection
        )

        self.user_repository = UserRepository(
            self.db,
            self.users_collection
        )

        self.invite_code_repository = InviteCodeRepository(
            self.db,
            self.invite_codes_collection
        )

        self.team_settings_repository = TeamSettingsRepository(
            self.db,
            self.team_settings_collection
        )

        self.refresh_token_repository = RefreshTokenRepository(
            self.db,
            self.refresh_tokens_collection
        )

        self.agent_repository = AgentRepository(
            self.db,
            self.agents_collection
        )

        self.agent_run_repository = AgentRunRepository(
            self.db,
            self.agent_run_collection
        )

        self.memory_repository = MemoryRepository(
            self.db,
            self.memories_collection
        )

        self.share_repository = ShareRepository(
            self.db,
            self.conversation_shares_collection
        )

    async def _create_indexes(self):
        """创建必要的索引"""
        try:
            await self.conversations_collection.create_index([("user_id", 1), ("type", 1), ("created_at", -1)])
            await self.conversations_collection.create_index([("status", 1)])
            await self.conversations_collection.create_index([("updated_at", -1)])



            await self.graph_run_messages_collection.create_index([("conversation_id", 1)])
            await self.graph_run_messages_collection.create_index([("graph_name", 1)])

            await self.tasks_collection.create_index([("user_id", 1), ("status", 1), ("created_at", -1)])
            await self.tasks_collection.create_index([("id", 1)], unique=True)
            await self.tasks_collection.create_index([("user_id", 1)])
            await self.tasks_collection.create_index([("graph_name", 1)])
            await self.tasks_collection.create_index([("schedule_type", 1)])
            await self.tasks_collection.create_index([("status", 1)])
            await self.tasks_collection.create_index([("user_id", 1), ("task_name", 1), ("schedule_type", 1)],
                                                     unique=True)
            await self.tasks_collection.create_index([("execution_stats.last_executed_at.executed_at", -1)])
            await self.tasks_collection.create_index([("execution_stats.total_triggers", -1)])

            await self.graphs_collection.create_index([("user_id", 1), ("updated_at", -1)])
            await self.graphs_collection.create_index([("user_id", 1), ("name", 1)], unique=True)
            await self.graphs_collection.create_index([("name", 1)])

            await self.prompts_collection.create_index([("user_id", 1), ("name", 1)], unique=True)
            await self.prompts_collection.create_index([("user_id", 1), ("updated_at", -1)])
            await self.prompts_collection.create_index([("category", 1)])

            await self.model_configs_collection.create_index([("user_id", 1)])
            await self.model_configs_collection.create_index([("user_id", 1), ("name", 1)], unique=True)
            await self.model_configs_collection.create_index([("updated_at", -1)])

            await self.mcp_configs_collection.create_index([("user_id", 1)], unique=True)
            await self.mcp_configs_collection.create_index([("updated_at", -1)])

            await self.preview_shares_collection.create_index([("key", 1)], unique=True)
            await self.preview_shares_collection.create_index([("user_id", 1)])
            await self.preview_shares_collection.create_index([("created_at", -1)])
            await self.preview_shares_collection.create_index([("content_hash", 1)], unique=True)
            await self.preview_shares_collection.create_index([("expires_at", 1)], expireAfterSeconds=0)

            await self.users_collection.create_index([("user_id", 1)], unique=True)
            await self.users_collection.create_index([("role", 1)])
            await self.users_collection.create_index([("is_active", 1)])

            await self.invite_codes_collection.create_index([("code", 1)], unique=True)
            await self.invite_codes_collection.create_index([("is_active", 1)])
            await self.invite_codes_collection.create_index([("created_by", 1)])

            await self.refresh_tokens_collection.create_index([("token_id", 1)], unique=True)
            await self.refresh_tokens_collection.create_index([("user_id", 1)])
            await self.refresh_tokens_collection.create_index([("is_revoked", 1)])
            await self.refresh_tokens_collection.create_index([("expires_at", 1)], expireAfterSeconds=86400)

            await self.agents_collection.create_index([("name", 1), ("user_id", 1)], unique=True)
            await self.agents_collection.create_index([("user_id", 1), ("updated_at", -1)])
            await self.agents_collection.create_index([("agent_config.category", 1)])
            await self.agents_collection.create_index([("created_at", -1)])

            await self.agent_run_collection.create_index([("conversation_id", 1)])
            await self.agent_run_collection.create_index([("rounds.agent_name", 1)])
            await self.agent_run_collection.create_index([("tasks.task_id", 1)])

            await self.memories_collection.create_index([("user_id", 1), ("owner_type", 1), ("owner_id", 1)],
                                                        unique=True)
            await self.memories_collection.create_index([("user_id", 1)])
            await self.memories_collection.create_index([("updated_at", -1)])

            await self.conversation_shares_collection.create_index([("share_id", 1)], unique=True)
            await self.conversation_shares_collection.create_index([("conversation_id", 1)], unique=True)
            await self.conversation_shares_collection.create_index([("user_id", 1)])
            await self.conversation_shares_collection.create_index([("created_at", -1)])

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

    async def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取对话基本信息"""
        return await self.conversation_repository.get_conversation(conversation_id)

    async def get_conversation_with_messages(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取包含消息的完整对话数据（支持 agent 和 graph 类型）"""
        try:
            conversation = await self.conversation_repository.get_conversation(conversation_id)
            if not conversation:
                return None

            conversation_type = conversation.get("type")

            if conversation_type == "graph":
                # 图运行类型
                run_doc = await self.graph_run_repository.get_graph_run_messages_only(conversation_id)
                if run_doc and run_doc.get("rounds"):
                    conversation["rounds"] = run_doc.get("rounds", [])
                    conversation["type"] = "graph"
                    conversation["graph_name"] = run_doc.get("graph_name")
                    conversation["graph_config"] = run_doc.get("graph_config")
                    conversation["global_outputs"] = run_doc.get("global_outputs", {})
                    conversation["final_result"] = run_doc.get("final_result", "")
                    conversation["execution_chain"] = run_doc.get("execution_chain", [])
                    conversation["handoffs_status"] = run_doc.get("handoffs_status", {})
                    conversation["completed"] = run_doc.get("completed", False)
                    conversation["tasks"] = run_doc.get("tasks", [])
                else:
                    conversation["rounds"] = []
                    conversation["type"] = "graph"

            elif conversation_type == "agent":
                # Agent 对话类型
                agent_run_doc = await self.agent_run_repository.get_agent_run(conversation_id)

                if agent_run_doc and agent_run_doc.get("rounds"):
                    conversation["rounds"] = agent_run_doc.get("rounds", [])
                    conversation["tasks"] = agent_run_doc.get("tasks", [])
                    conversation["type"] = "agent"
                else:
                    conversation["rounds"] = []
                    conversation["type"] = "agent"

            else:
                logger.warning(f"未知的对话类型: {conversation_type}")
                conversation["rounds"] = []
                conversation["type"] = "agent"

            return conversation

        except Exception as e:
            logger.error(f"获取完整对话数据失败: {str(e)}")
            return None

    async def list_conversations(self, user_id: str = "default_user", conversation_type: str = None,
                                 limit: int = 200, skip: int = 0) -> List[Dict[str, Any]]:
        """获取用户的对话列表（支持 agent 和 graph 类型）"""
        return await self.conversation_repository.list_conversations(user_id, conversation_type, limit, skip)

    async def update_conversation_status(self, conversation_id: str, status: str,
                                         user_id: str = "default_user") -> bool:
        """更新对话状态"""
        return await self.conversation_repository.update_conversation_status(
            conversation_id, status, user_id
        )

    async def update_conversation_title(self, conversation_id: str, title: str, user_id: str = "default_user") -> bool:
        """更新对话标题"""
        return await self.conversation_repository.update_conversation_title(conversation_id, title, user_id)

    async def update_conversation_tags(self, conversation_id: str, tags: List[str],
                                       user_id: str = "default_user") -> bool:
        """更新对话标签"""
        return await self.conversation_repository.update_conversation_tags(conversation_id, tags, user_id)

    async def update_input_config(self, conversation_id: str, input_config: Dict[str, Any],
                                  user_id: str = "default_user") -> bool:
        """更新对话的输入配置"""
        return await self.conversation_repository.update_input_config(conversation_id, input_config, user_id)

    async def update_conversation_title_and_tags(self, conversation_id: str,
                                                 title: str = None, tags: List[str] = None) -> bool:
        """更新对话标题和标签（首次生成时调用）"""
        return await self.conversation_repository.update_conversation_title_and_tags(conversation_id, title, tags)

    async def permanently_delete_conversation(self, conversation_id: str) -> bool:
        """永久删除对话和相关消息"""
        try:
            conversation = await self.conversation_repository.get_conversation(conversation_id)
            if not conversation:
                return False

            conversation_type = conversation.get("type")
            user_id = conversation.get("user_id", "default_user")

            # 1. 删除分享记录（级联删除）
            await self.share_repository.delete_shares_by_conversation(conversation_id)

            # 2. 删除 MinIO 中的所有文件（文档和图片）
            from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
            from app.infrastructure.storage.object_storage.conversation_image_manager import conversation_image_manager
            await conversation_document_manager.delete_all_conversation_files(user_id, conversation_id)
            await conversation_image_manager.delete_all_conversation_images(user_id, conversation_id)

            # 3. 删除消息数据
            if conversation_type == "graph":
                # 图运行类型，删除graph_run消息
                await self.graph_run_repository.delete_graph_run_messages(conversation_id)
            elif conversation_type == "agent":
                # Agent对话类型，删除agent_run消息
                await self.agent_run_repository.delete_agent_run(conversation_id)

            # 4. 删除conversation元数据
            return await self.conversation_repository.permanently_delete_conversation(conversation_id)

        except Exception as e:
            logger.error(f"永久删除对话失败: {str(e)}")
            return False

    # === Graph 配置管理方法 ===

    async def create_graph_config(self, graph_name: str, graph_config: Dict[str, Any],
                                  user_id: str = "default_user") -> bool:
        """创建图配置"""
        return await self.graph_config_repository.create_graph(graph_name, graph_config, user_id)

    async def get_graph_config(self, graph_name: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """获取图配置"""
        return await self.graph_config_repository.get_graph(graph_name, user_id)

    async def update_graph_config(self, graph_name: str, graph_config: Dict[str, Any],
                                  user_id: Optional[str] = None) -> bool:
        """更新图配置"""
        return await self.graph_config_repository.update_graph(graph_name, graph_config, user_id)

    async def delete_graph_config(self, graph_name: str, user_id: Optional[str] = None) -> bool:
        """删除图配置"""
        return await self.graph_config_repository.delete_graph(graph_name, user_id)

    async def list_graph_configs(self, user_id: str = "default_user") -> List[str]:
        """列出所有图"""
        return await self.graph_config_repository.list_graphs(user_id)

    async def rename_graph_config(self, old_name: str, new_name: str,
                                  user_id: Optional[str] = None) -> bool:
        """重命名图"""
        return await self.graph_config_repository.rename_graph(old_name, new_name, user_id)

    async def graph_config_exists(self, graph_name: str, user_id: str = "default_user") -> bool:
        """检查图是否存在"""
        return await self.graph_config_repository.graph_exists(graph_name, user_id)

    async def add_graph_version_record(self, graph_name: str, version_record: Dict[str, Any],
                                       user_id: str = "default_user") -> bool:
        """添加图配置版本记录"""
        return await self.graph_config_repository.add_version_record(graph_name, version_record, user_id)

    async def get_graph_version_info(self, graph_name: str, user_id: str = "default_user") -> Optional[Dict[str, Any]]:
        """获取图配置版本信息"""
        return await self.graph_config_repository.get_version_info(graph_name, user_id)

    async def remove_graph_version_record(self, graph_name: str, version_id: str,
                                          user_id: str = "default_user") -> bool:
        """移除图配置版本记录"""
        return await self.graph_config_repository.remove_version_record(graph_name, version_id, user_id)

    # === 预览短链管理 ===

    async def create_preview_share(self, lang: str, title: Optional[str], content: str,
                                   expire_hours: Optional[int] = 144, user_id: str = "default_user") -> Dict[str, Any]:
        """创建预览短链"""
        return await self.preview_repository.create_preview_share(lang, title, content, expire_hours, user_id)

    async def get_preview_share(self, key: str) -> Optional[Dict[str, Any]]:
        """获取预览短链内容"""
        return await self.preview_repository.get_preview_share(key)

    # === 图运行管理方法 ===

    async def create_graph_run_conversation(self, conversation_id: str, graph_name: str,
                                            graph_config: Dict[str, Any], user_id: str = "default_user") -> bool:
        """创建新的图运行对话"""
        return await self.graph_run_repository.create_graph_run_conversation(
            conversation_id, graph_name, graph_config, user_id
        )

    async def get_graph_run_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取图运行对话"""
        return await self.graph_run_repository.get_graph_run_conversation(conversation_id)

    async def update_graph_run_data(self, conversation_id: str, update_data: Dict[str, Any]) -> bool:
        """更新图运行数据"""
        return await self.graph_run_repository.update_graph_run_data(conversation_id, update_data)

    async def add_round_to_graph_run(self, conversation_id: str, round_data: Dict[str, Any],
                                     tools_schema: Optional[List[Dict[str, Any]]] = None) -> bool:
        """向图运行对话添加新的轮次"""
        return await self.graph_run_repository.add_round_to_graph_run(
            conversation_id, round_data, tools_schema
        )

    async def update_graph_run_global_outputs(self, conversation_id: str, node_name: str, output: str) -> bool:
        """更新图运行全局输出"""
        return await self.graph_run_repository.update_global_outputs(conversation_id, node_name, output)

    async def update_graph_run_handoffs_status(self, conversation_id: str, node_name: str,
                                               handoffs_data: Dict[str, Any]) -> bool:
        """更新图运行handoffs状态"""
        return await self.graph_run_repository.update_handoffs_status(conversation_id, node_name, handoffs_data)

    async def update_graph_run_execution_chain(self, conversation_id: str, execution_chain: List[Any]) -> bool:
        """更新图运行执行链"""
        return await self.graph_run_repository.update_execution_chain(conversation_id, execution_chain)

    async def update_graph_run_final_result(self, conversation_id: str, final_result: str) -> bool:
        """更新图运行最终结果"""
        return await self.graph_run_repository.update_final_result(conversation_id, final_result)

    # === MCP配置管理方法（团队级） ===

    async def get_mcp_config(self) -> Optional[Dict[str, Any]]:
        """获取团队MCP配置"""
        return await self.mcp_config_repository.get_mcp_config()

    async def update_mcp_config(self, config: Dict[str, Any], expected_version: int) -> Dict[str, Any]:
        """更新团队MCP配置"""
        return await self.mcp_config_repository.update_mcp_config(config, expected_version)

    async def initialize_mcp_config(self, initial_config: Dict[str, Any] = None) -> bool:
        """初始化团队MCP配置"""
        return await self.mcp_config_repository.initialize_mcp_config(initial_config)

    async def check_server_provider(self, server_name: str, user_id: str) -> bool:
        """检查用户是否是MCP服务器的提供者"""
        return await self.mcp_config_repository.check_server_provider(server_name, user_id)

    # === 用户管理方法 ===

    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """根据用户ID获取用户信息"""
        return await self.user_repository.get_user_by_id(user_id)

    async def create_user(self, user_id: str, username: str, password_hash: str, role: str = "user") -> bool:
        """创建新用户"""
        return await self.user_repository.create_user(user_id, username, password_hash, role)

    async def list_users(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """列出所有用户"""
        return await self.user_repository.list_users(skip, limit)

    async def update_user_role(self, user_id: str, new_role: str) -> bool:
        """更新用户角色"""
        return await self.user_repository.update_user_role(user_id, new_role)

    async def deactivate_user(self, user_id: str) -> bool:
        """停用用户"""
        return await self.user_repository.deactivate_user(user_id)

    async def user_exists(self, user_id: str) -> bool:
        """检查用户是否存在"""
        return await self.user_repository.user_exists(user_id)

    # === Memory管理方法 ===

    async def list_memory_categories(self, user_id: str, owners: List[str], agent_id: str = None) -> Dict[str, Any]:
        """列出记忆分类"""
        return await self.memory_repository.list_categories(user_id, owners, agent_id)

    async def get_memory(self, user_id: str, queries: List[Dict[str, Any]], agent_id: str = None) -> Dict[str, Any]:
        """获取记忆内容"""
        return await self.memory_repository.get_memory(user_id, queries, agent_id)

    async def add_memory(self, user_id: str, additions: List[Dict[str, Any]], agent_id: str = None) -> Dict[str, Any]:
        """添加记忆条目"""
        return await self.memory_repository.add_memory(user_id, additions, agent_id)

    async def update_memory(self, user_id: str, updates: List[Dict[str, Any]], agent_id: str = None) -> Dict[str, Any]:
        """更新记忆条目"""
        return await self.memory_repository.update_memory(user_id, updates, agent_id)

    async def delete_memory(self, user_id: str, deletions: List[Dict[str, Any]], agent_id: str = None) -> Dict[str, Any]:
        """删除记忆条目"""
        return await self.memory_repository.delete_memory(user_id, deletions, agent_id)

    # === 分享管理方法 ===

    async def create_conversation_share(self, conversation_id: str, user_id: str) -> Dict[str, Any]:
        """创建对话分享"""
        return await self.share_repository.create_share(conversation_id, user_id)

    async def get_conversation_share(self, share_id: str) -> Optional[Dict[str, Any]]:
        """获取分享记录"""
        return await self.share_repository.get_share_by_id(share_id)

    async def get_conversation_share_by_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """根据对话ID获取分享记录"""
        return await self.share_repository.get_share_by_conversation(conversation_id)

    async def delete_conversation_share(self, share_id: str, user_id: str) -> bool:
        """删除对话分享"""
        return await self.share_repository.delete_share(share_id, user_id)

    async def delete_conversation_shares_by_conversation(self, conversation_id: str) -> bool:
        """删除对话的所有分享记录（级联删除）"""
        return await self.share_repository.delete_shares_by_conversation(conversation_id)


mongodb_client = MongoDBClient()