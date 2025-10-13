import logging
import asyncio
from typing import Dict, List, Any, Optional, Callable
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError, PyMongoError
from bson import ObjectId
from app.core.file_manager import FileManager
from app.services.docdb import (ConversationManager, ChatManager,
                                GraphManager, MCPManager, GraphRunManager, TaskManager,
                                GraphConfigManager, PromptManager, ModelConfigManager,MCPConfigManager)

logger = logging.getLogger(__name__)


class MongoDBService:
    """MongoDB服务管理"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None

        self.conversations_collection = None
        self.chat_messages_collection = None
        self.graph_messages_collection = None
        self.mcp_messages_collection = None
        self.graph_run_messages_collection = None
        self.tasks_collection = None
        self.agent_graphs_collection = None
        self.prompts_collection = None
        self.model_configs_collection = None
        self.mcp_configs_collection = None

        self.is_connected = False

        self.conversation_manager = None
        self.chat_manager = None
        self.graph_manager = None
        self.mcp_manager = None
        self.graph_run_manager = None
        self.task_manager = None
        self.graph_config_manager = None
        self.prompt_manager = None
        self.model_config_manager = None
        self.mcp_config_manager = None

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
            self.chat_messages_collection = self.db.chat
            self.graph_messages_collection = self.db.graph_gen
            self.mcp_messages_collection = self.db.mcp_gen
            self.graph_run_messages_collection = self.db.graph_run
            self.tasks_collection = self.db.tasks
            self.agent_graphs_collection = self.db.agent_graphs
            self.prompts_collection = self.db.prompts
            self.model_configs_collection = self.db.model_configs
            self.mcp_configs_collection = self.db.mcp_configs

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
        self.conversation_manager = ConversationManager(
            self.db,
            self.conversations_collection
        )

        self.chat_manager = ChatManager(
            self.db,
            self.chat_messages_collection
        )

        self.graph_manager = GraphManager(
            self.db,
            self.graph_messages_collection,
            self.conversation_manager
        )

        self.mcp_manager = MCPManager(
            self.db,
            self.mcp_messages_collection,
            self.conversation_manager
        )

        self.graph_run_manager = GraphRunManager(
            self.db,
            self.graph_run_messages_collection,
            self.conversation_manager
        )

        self.task_manager = TaskManager(self.db)

        self.graph_config_manager = GraphConfigManager(
            self.db,
            self.agent_graphs_collection
        )

        self.prompt_manager = PromptManager(
            self.db,
            self.prompts_collection
        )

        self.model_config_manager = ModelConfigManager(
            self.db,
            self.model_configs_collection
        )

        self.mcp_config_manager = MCPConfigManager(
            self.db,
            self.mcp_configs_collection
        )

    async def _create_indexes(self):
        """创建必要的索引"""
        try:
            await self.conversations_collection.create_index([("user_id", 1), ("type", 1), ("created_at", -1)])
            await self.conversations_collection.create_index([("status", 1)])
            await self.conversations_collection.create_index([("updated_at", -1)])

            await self.chat_messages_collection.create_index([("conversation_id", 1)])

            await self.graph_messages_collection.create_index([("conversation_id", 1)])

            await self.mcp_messages_collection.create_index([("conversation_id", 1)])

            await self.graph_run_messages_collection.create_index([("conversation_id", 1)])
            await self.graph_run_messages_collection.create_index([("graph_name", 1)])

            await self.tasks_collection.create_index([("user_id", 1), ("status", 1), ("created_at", -1)])
            await self.tasks_collection.create_index([("graph_name", 1)])
            await self.tasks_collection.create_index([("schedule_type", 1)])
            await self.tasks_collection.create_index([("status", 1)])
            await self.tasks_collection.create_index([("user_id", 1), ("task_name", 1), ("schedule_type", 1)], unique=True)
            await self.tasks_collection.create_index([("execution_stats.last_executed_at.executed_at", -1)])
            await self.tasks_collection.create_index([("execution_stats.total_triggers", -1)])

            await self.agent_graphs_collection.create_index([("user_id", 1), ("updated_at", -1)])
            await self.agent_graphs_collection.create_index([("name", 1)])

            await self.prompts_collection.create_index([("user_id", 1), ("name", 1)], unique=True)
            await self.prompts_collection.create_index([("user_id", 1), ("updated_at", -1)])
            await self.prompts_collection.create_index([("category", 1)])

            await self.model_configs_collection.create_index([("name", 1)], unique=True)
            await self.model_configs_collection.create_index([("updated_at", -1)])

            await self.mcp_configs_collection.create_index([("updated_at", -1)])

            logger.info("MongoDB索引创建成功")

        except Exception as e:
            logger.error(f"创建MongoDB索引失败: {str(e)}")

    async def disconnect(self):
        """断开MongoDB连接"""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("MongoDB连接已断开")

    # === graph config管理方法 ===

    async def create_graph_config(self, graph_name: str, graph_config: Dict[str, Any],
                                  user_id: str = "default_user") -> bool:
        """创建图配置"""
        return await self.graph_config_manager.create_graph(graph_name, graph_config, user_id)

    async def get_graph_config(self, graph_name: str) -> Optional[Dict[str, Any]]:
        """获取图配置"""
        return await self.graph_config_manager.get_graph(graph_name)

    async def update_graph_config(self, graph_name: str, graph_config: Dict[str, Any]) -> bool:
        """更新图配置"""
        return await self.graph_config_manager.update_graph(graph_name, graph_config)

    async def delete_graph_config(self, graph_name: str) -> bool:
        """删除图配置"""
        return await self.graph_config_manager.delete_graph(graph_name)

    async def list_graph_configs(self, user_id: str = "default_user") -> List[str]:
        """列出所有图"""
        return await self.graph_config_manager.list_graphs(user_id)

    async def rename_graph_config(self, old_name: str, new_name: str) -> bool:
        """重命名图"""
        return await self.graph_config_manager.rename_graph(old_name, new_name)

    async def graph_config_exists(self, graph_name: str) -> bool:
        """检查图是否存在"""
        return await self.graph_config_manager.graph_exists(graph_name)

    # === 图运行管理方法 ===

    async def create_graph_run_conversation(self, conversation_id: str, graph_name: str,
                                          graph_config: Dict[str, Any], user_id: str = "default_user") -> bool:
        """创建新的图运行对话"""
        return await self.graph_run_manager.create_graph_run_conversation(
            conversation_id, graph_name, graph_config, user_id
        )

    async def get_graph_run_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取图运行对话"""
        return await self.graph_run_manager.get_graph_run_conversation(conversation_id)

    async def update_graph_run_data(self, conversation_id: str, update_data: Dict[str, Any]) -> bool:
        """更新图运行数据"""
        return await self.graph_run_manager.update_graph_run_data(conversation_id, update_data)

    async def add_round_to_graph_run(self, conversation_id: str, round_data: Dict[str, Any],
                                  tools_schema: Optional[List[Dict[str, Any]]] = None) -> bool:
        """向图运行对话添加新的轮次"""
        return await self.graph_run_manager.add_round_to_graph_run(
            conversation_id, round_data, tools_schema
        )

    async def update_graph_run_global_outputs(self, conversation_id: str, node_name: str, output: str) -> bool:
        """更新图运行全局输出"""
        return await self.graph_run_manager.update_global_outputs(conversation_id, node_name, output)

    async def update_graph_run_handoffs_status(self, conversation_id: str, node_name: str,
                                             handoffs_data: Dict[str, Any]) -> bool:
        """更新图运行handoffs状态"""
        return await self.graph_run_manager.update_handoffs_status(conversation_id, node_name, handoffs_data)

    async def update_graph_run_execution_chain(self, conversation_id: str, execution_chain: List[Any]) -> bool:
        """更新图运行执行链"""
        return await self.graph_run_manager.update_execution_chain(conversation_id, execution_chain)

    async def update_graph_run_final_result(self, conversation_id: str, final_result: str) -> bool:
        """更新图运行最终结果"""
        return await self.graph_run_manager.update_final_result(conversation_id, final_result)

    # === 图生成管理方法===

    async def create_graph_generation_conversation(self, conversation_id: str, user_id: str = "default_user") -> bool:
        """创建新的图生成对话"""
        return await self.graph_manager.create_graph_generation_conversation(conversation_id, user_id)

    async def get_graph_generation_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取图生成对话"""
        return await self.graph_manager.get_graph_generation_conversation(conversation_id)

    async def add_message_to_graph_generation(self, conversation_id: str,
                                              message: Dict[str, Any],
                                              model_name: str = None) -> bool:
        """向图生成对话添加消息"""
        return await self.graph_manager.add_message_to_graph_generation(
            conversation_id, message, model_name
        )

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
                                            message: Dict[str, Any],
                                            model_name: str = None) -> bool:
        """向MCP生成对话添加消息"""
        return await self.mcp_manager.add_message_to_mcp_generation(
            conversation_id, message, model_name
        )

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
        conversation_success = await self.conversation_manager.create_conversation(
            conversation_id=conversation_id,
            conversation_type="chat",
            user_id=user_id,
            title=title,
            tags=tags
        )

        if not conversation_success:
            return False

        return await self.chat_manager.create_chat_messages_document(conversation_id)

    async def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取对话基本信息"""
        return await self.conversation_manager.get_conversation(conversation_id)

    async def get_conversation_with_messages(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取包含消息的完整对话数据（支持所有类型）"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                return None

            conversation_type = conversation.get("type", "chat")

            if conversation_type == "chat":
                messages_doc = await self.chat_manager.get_chat_messages(conversation_id)
                if messages_doc:
                    conversation["rounds"] = messages_doc.get("rounds", [])
                    conversation["generation_type"] = "chat"
                else:
                    conversation["rounds"] = []

            elif conversation_type == "graph":
                # 图运行类型
                run_doc = await self.graph_run_manager.get_graph_run_messages_only(conversation_id)
                if run_doc and run_doc.get("rounds"):
                    conversation["rounds"] = run_doc.get("rounds", [])
                    conversation["generation_type"] = "graph_run"
                    conversation["graph_name"] = run_doc.get("graph_name")
                    conversation["graph_config"] = run_doc.get("graph_config")
                    conversation["global_outputs"] = run_doc.get("global_outputs", {})
                    conversation["final_result"] = run_doc.get("final_result", "")
                    conversation["execution_chain"] = run_doc.get("execution_chain", [])
                    conversation["handoffs_status"] = run_doc.get("handoffs_status", {})
                    conversation["completed"] = run_doc.get("completed", False)
                else:
                    conversation["rounds"] = []
                    conversation["generation_type"] = "graph_run"

            elif conversation_type == "agent":
                graph_messages_doc = await self.graph_manager.get_graph_generation_messages_only(conversation_id)

                if graph_messages_doc and graph_messages_doc.get("rounds"):
                    conversation["rounds"] = graph_messages_doc.get("rounds", [])
                    conversation["parsed_results"] = graph_messages_doc.get("parsed_results", {})
                    conversation["final_graph_config"] = graph_messages_doc.get("final_graph_config")
                    conversation["generation_type"] = "graph"
                else:
                    mcp_messages_doc = await self.mcp_manager.get_mcp_generation_messages_only(conversation_id)

                    if mcp_messages_doc and mcp_messages_doc.get("rounds"):
                        conversation["rounds"] = mcp_messages_doc.get("rounds", [])
                        conversation["parsed_results"] = mcp_messages_doc.get("parsed_results", {})
                        conversation["generation_type"] = "mcp"
                    else:
                        conversation["rounds"] = []
                        conversation["generation_type"] = "unknown"
            else:
                conversation["rounds"] = []

            return conversation

        except Exception as e:
            logger.error(f"获取完整对话数据失败: {str(e)}")
            return None

    async def ensure_conversation_exists(self, conversation_id: str, user_id: str = "default_user") -> bool:
        """确保聊天对话存在，不存在则创建"""
        conversation = await self.conversation_manager.get_conversation(conversation_id)
        if conversation:
            await self.chat_manager.create_chat_messages_document(conversation_id)
            return True

        return await self.create_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            title="新对话",
            tags=[]
        )

    async def add_round_to_conversation(self, conversation_id: str, round_number: int,
                                        messages: List[Dict[str, Any]],
                                        tools_schema: Optional[List[Dict[str, Any]]] = None,
                                        model: Optional[str] = None) -> bool:
        """向聊天对话添加新的轮次"""
        success = await self.chat_manager.add_round_to_chat(
            conversation_id, round_number, messages, tools_schema, model
        )

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

    async def permanently_delete_conversation(self, conversation_id: str) -> bool:
        """永久删除对话和相关消息"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                return False

            conversation_type = conversation.get("type", "chat")

            if conversation_type == "chat":
                await self.chat_manager.delete_chat_messages(conversation_id)
            elif conversation_type == "graph":
                # 图运行类型
                await self.graph_run_manager.delete_graph_run_messages(conversation_id)
                # 删除本地attachment目录
                FileManager.delete_conversation(conversation_id)
            elif conversation_type == "agent":
                await self.graph_manager.delete_graph_generation_messages(conversation_id)
                await self.mcp_manager.delete_mcp_generation_messages(conversation_id)

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
        """压缩对话内容（只支持聊天对话）"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                return {"status": "error", "error": "对话不存在"}

            if conversation.get("type") != "chat":
                return {"status": "error", "error": "暂时只支持聊天对话的压缩"}

            if conversation.get("user_id") != user_id:
                return {"status": "error", "error": "无权限访问此对话"}

            return await self.chat_manager.compact_chat_messages(
                conversation_id, compact_type, compact_threshold, summarize_callback
            )

        except Exception as e:
            logger.error(f"压缩对话失败: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def get_conversation_stats(self, user_id: str = "default_user") -> Dict[str, Any]:
        """获取用户的对话统计信息"""
        return await self.conversation_manager.get_conversation_stats(user_id)

    # === Prompt管理方法 ===

    async def create_prompt(self, prompt_data):
        """创建提示词"""
        return await self.prompt_manager.create_prompt(prompt_data)

    async def get_prompt(self, name: str):
        """获取提示词"""
        return await self.prompt_manager.get_prompt(name)

    async def update_prompt(self, name: str, update_data):
        """更新提示词"""
        return await self.prompt_manager.update_prompt(name, update_data)

    async def delete_prompt(self, name: str):
        """删除提示词"""
        return await self.prompt_manager.delete_prompt(name)

    async def list_prompts(self):
        """列出所有提示词"""
        return await self.prompt_manager.list_prompts()

    async def batch_delete_prompts(self, names: List[str]):
        """批量删除提示词"""
        return await self.prompt_manager.batch_delete_prompts(names)

    async def import_prompt_by_file(self, file, import_request):
        """通过文件导入提示词"""
        return await self.prompt_manager.import_prompt_by_file(file, import_request)

    async def export_prompts(self, export_request):
        """批量导出提示词"""
        return await self.prompt_manager.export_prompts(export_request)

    # === 模型配置管理方法 ===

    async def create_model_config(self, model_config: Dict[str, Any]):
        """创建模型配置"""
        return await self.model_config_manager.create_model(model_config)

    async def get_model_config(self, model_name: str, include_api_key: bool = True):
        """获取模型配置"""
        return await self.model_config_manager.get_model(model_name, include_api_key)

    async def update_model_config(self, model_name: str, model_config: Dict[str, Any]):
        """更新模型配置"""
        return await self.model_config_manager.update_model(model_name, model_config)

    async def delete_model_config(self, model_name: str):
        """删除模型配置"""
        return await self.model_config_manager.delete_model(model_name)

    async def list_model_configs(self, include_api_key: bool = False):
        """列出所有模型配置"""
        return await self.model_config_manager.list_models(include_api_key)

    async def model_config_exists(self, model_name: str):
        """检查模型配置是否存在"""
        return await self.model_config_manager.model_exists(model_name)

    async def get_mcp_config(self) -> Optional[Dict[str, Any]]:
        """获取MCP配置"""
        return await self.mcp_config_manager.get_mcp_config()

    async def update_mcp_config(self, config: Dict[str, Any], expected_version: int) -> Dict[str, Any]:
        """更新MCP配置"""
        return await self.mcp_config_manager.update_mcp_config(config, expected_version)

    async def create_mcp_config(self, initial_config: Dict[str, Any] = None) -> bool:
        """创建初始MCP配置"""
        return await self.mcp_config_manager.create_mcp_config(initial_config)


mongodb_service = MongoDBService()