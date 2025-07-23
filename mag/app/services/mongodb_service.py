import logging
import asyncio
from typing import Dict, List, Any, Optional,Callable
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
            self.graph_generations_collection = self.db.graph_generations
            self.mcp_generations_collection = self.db.mcp_generations  # 新增

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
        try:
            now = datetime.utcnow()
            generation_doc = {
                "_id": conversation_id,
                "user_id": user_id,
                "created_at": now,
                "updated_at": now,
                "total_token_usage": {
                    "total_tokens": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0
                },
                "messages": [],
                "parsed_results": {
                    "analysis": None,
                    "todo": None,
                    "graph_name": None,
                    "graph_description": None,
                    "nodes": [],
                    "end_template": None
                },
                "final_graph_config": None
            }

            await self.graph_generations_collection.insert_one(generation_doc)
            logger.info(f"创建图生成对话成功: {conversation_id}")
            return True

        except DuplicateKeyError:
            logger.warning(f"图生成对话已存在: {conversation_id}")
            return False
        except Exception as e:
            logger.error(f"创建图生成对话失败: {str(e)}")
            return False

    async def get_graph_generation_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取图生成对话"""
        try:
            conversation = await self.graph_generations_collection.find_one({"_id": conversation_id})
            if conversation:
                return self._convert_objectid_to_str(conversation)
            return None
        except Exception as e:
            logger.error(f"获取图生成对话失败: {str(e)}")
            return None

    async def add_message_to_graph_generation(self, conversation_id: str, 
                                            message: Dict[str, Any]) -> bool:
        """向图生成对话添加消息"""
        try:
            result = await self.graph_generations_collection.update_one(
                {"_id": conversation_id},
                {
                    "$push": {"messages": message},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"向图生成对话 {conversation_id} 添加消息成功")
                return True
            else:
                logger.error(f"向图生成对话 {conversation_id} 添加消息失败")
                return False
                
        except Exception as e:
            logger.error(f"添加图生成对话消息失败: {str(e)}")
            return False

    async def update_graph_generation_parsed_results(self, conversation_id: str,
                                                     parsed_results: Dict[str, Any]) -> bool:
        """更新图生成对话的解析结果 - 支持替换和删除逻辑"""
        try:
            update_operations = []

            # 处理简单替换字段
            simple_fields = ["analysis", "todo", "graph_name", "graph_description", "end_template"]
            set_updates = {"updated_at": datetime.utcnow()}

            for field in simple_fields:
                if field in parsed_results and parsed_results[field] is not None:
                    set_updates[f"parsed_results.{field}"] = parsed_results[field]

            # 处理节点替换/追加逻辑
            if "nodes" in parsed_results and parsed_results["nodes"]:
                # 获取当前对话数据
                conversation_data = await self.graph_generations_collection.find_one({"_id": conversation_id})
                if conversation_data:
                    current_nodes = conversation_data.get("parsed_results", {}).get("nodes", [])

                    # 创建节点名称到索引的映射
                    node_name_to_index = {}
                    for i, node in enumerate(current_nodes):
                        if isinstance(node, dict) and "name" in node:
                            node_name_to_index[node["name"]] = i

                    # 处理新节点
                    for new_node in parsed_results["nodes"]:
                        if isinstance(new_node, dict) and "name" in new_node:
                            node_name = new_node["name"]
                            if node_name in node_name_to_index:
                                # 替换现有节点
                                index = node_name_to_index[node_name]
                                update_operations.append({
                                    "updateOne": {
                                        "filter": {"_id": conversation_id},
                                        "update": {"$set": {f"parsed_results.nodes.{index}": new_node}}
                                    }
                                })
                                logger.info(f"替换节点: {node_name}")
                            else:
                                # 追加新节点
                                update_operations.append({
                                    "updateOne": {
                                        "filter": {"_id": conversation_id},
                                        "update": {"$push": {"parsed_results.nodes": new_node}}
                                    }
                                })
                                logger.info(f"新增节点: {node_name}")

            # 处理节点删除逻辑
            if "delete_nodes" in parsed_results and parsed_results["delete_nodes"]:
                for node_name in parsed_results["delete_nodes"]:
                    update_operations.append({
                        "updateOne": {
                            "filter": {"_id": conversation_id},
                            "update": {"$pull": {"parsed_results.nodes": {"name": node_name}}}
                        }
                    })
                    logger.info(f"删除节点: {node_name}")

            # 执行所有更新操作
            success = True

            # 先执行简单字段的更新
            if set_updates:
                result = await self.graph_generations_collection.update_one(
                    {"_id": conversation_id},
                    {"$set": set_updates}
                )
                if result.modified_count == 0:
                    success = False

            # 执行节点相关的更新操作
            if update_operations:
                for operation in update_operations:
                    try:
                        result = await self.graph_generations_collection.update_one(
                            operation["updateOne"]["filter"],
                            operation["updateOne"]["update"]
                        )
                        if result.modified_count == 0:
                            logger.warning(f"节点操作未影响任何文档: {operation}")
                    except Exception as e:
                        logger.error(f"执行节点操作时出错: {str(e)}")
                        success = False

            return success

        except Exception as e:
            logger.error(f"更新图生成解析结果失败: {str(e)}")
            return False

    async def update_graph_generation_token_usage(self, conversation_id: str, 
                                                prompt_tokens: int, completion_tokens: int) -> bool:
        """更新图生成对话的token使用量"""
        try:
            total_tokens = prompt_tokens + completion_tokens
            result = await self.graph_generations_collection.update_one(
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
            logger.error(f"更新图生成token使用量失败: {str(e)}")
            return False

    async def update_graph_generation_final_config(self, conversation_id: str, 
                                                final_graph_config: Dict[str, Any]) -> bool:
        """更新图生成对话的最终图配置"""
        try:
            result = await self.graph_generations_collection.update_one(
                {"_id": conversation_id},
                {
                    "$set": {
                        "final_graph_config": final_graph_config,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新最终图配置失败: {str(e)}")
            return False

    # async def ensure_graph_generation_conversation_exists(self, conversation_id: str,
    #                                                     user_id: str = "default_user",
    #                                                     model_name: str = "") -> bool:
    #     """确保图生成对话存在，不存在则创建"""
    #     try:
    #         # 检查对话是否已存在
    #         conversation = await self.get_graph_generation_conversation(conversation_id)
    #         if conversation:
    #             logger.debug(f"图生成对话已存在: {conversation_id}")
    #             return True
    #
    #         # 对话不存在，创建新对话
    #         success = await self.create_graph_generation_conversation(
    #             conversation_id=conversation_id,
    #             user_id=user_id,
    #             model_name=model_name
    #         )
    #
    #         if success:
    #             logger.info(f"自动创建图生成对话成功: {conversation_id}")
    #         else:
    #             logger.error(f"自动创建图生成对话失败: {conversation_id}")
    #
    #         return success
    #
    #     except Exception as e:
    #         logger.error(f"确保图生成对话存在时出错: {str(e)}")
    #         return False

    async def create_mcp_generation_conversation(self, conversation_id: str, user_id: str = "default_user") -> bool:
        """创建新的MCP生成对话"""
        try:
            now = datetime.utcnow()
            generation_doc = {
                "_id": conversation_id,
                "user_id": user_id,
                "created_at": now,
                "updated_at": now,
                "total_token_usage": {
                    "total_tokens": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0
                },
                "messages": [],
                "parsed_results": {
                    "analysis": None,
                    "todo": None,
                    "folder_name": None,
                    "script_files": {},  # {"文件名.py": "文件内容"}
                    "dependencies": None,
                    "readme": None
                }
            }

            await self.mcp_generations_collection.insert_one(generation_doc)
            logger.info(f"创建MCP生成对话成功: {conversation_id}")
            return True

        except DuplicateKeyError:
            logger.warning(f"MCP生成对话已存在: {conversation_id}")
            return False
        except Exception as e:
            logger.error(f"创建MCP生成对话失败: {str(e)}")
            return False

    async def get_mcp_generation_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取MCP生成对话"""
        try:
            conversation = await self.mcp_generations_collection.find_one({"_id": conversation_id})
            if conversation:
                return self._convert_objectid_to_str(conversation)
            return None
        except Exception as e:
            logger.error(f"获取MCP生成对话失败: {str(e)}")
            return None

    async def add_message_to_mcp_generation(self, conversation_id: str,
                                            message: Dict[str, Any]) -> bool:
        """向MCP生成对话添加消息"""
        try:
            result = await self.mcp_generations_collection.update_one(
                {"_id": conversation_id},
                {
                    "$push": {"messages": message},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )

            if result.modified_count > 0:
                logger.info(f"向MCP生成对话 {conversation_id} 添加消息成功")
                return True
            else:
                logger.error(f"向MCP生成对话 {conversation_id} 添加消息失败")
                return False

        except Exception as e:
            logger.error(f"添加MCP生成对话消息失败: {str(e)}")
            return False

    async def update_mcp_generation_parsed_results(self, conversation_id: str,
                                                   parsed_results: Dict[str, Any]) -> bool:
        """更新MCP生成对话的解析结果 - 支持脚本文件的增删改"""
        try:
            update_operations = []

            # 处理简单替换字段（新增folder_name）
            simple_fields = ["analysis", "todo", "folder_name", "dependencies", "readme"]
            set_updates = {"updated_at": datetime.utcnow()}

            for field in simple_fields:
                if field in parsed_results and parsed_results[field] is not None:
                    set_updates[f"parsed_results.{field}"] = parsed_results[field]

            # 处理脚本文件增删改逻辑
            if "script_files" in parsed_results and parsed_results["script_files"]:
                # 获取当前对话数据
                conversation_data = await self.mcp_generations_collection.find_one({"_id": conversation_id})
                if conversation_data:
                    current_script_files = conversation_data.get("parsed_results", {}).get("script_files", {})

                    # 合并新的脚本文件（新文件会替换同名文件）
                    updated_script_files = current_script_files.copy()
                    updated_script_files.update(parsed_results["script_files"])

                    set_updates["parsed_results.script_files"] = updated_script_files

            # 处理脚本文件删除逻辑
            if "delete_script_files" in parsed_results and parsed_results["delete_script_files"]:
                conversation_data = await self.mcp_generations_collection.find_one({"_id": conversation_id})
                if conversation_data:
                    current_script_files = conversation_data.get("parsed_results", {}).get("script_files", {})
                    updated_script_files = current_script_files.copy()

                    for file_name in parsed_results["delete_script_files"]:
                        if file_name in updated_script_files:
                            del updated_script_files[file_name]
                            logger.info(f"删除脚本文件: {file_name}")

                    set_updates["parsed_results.script_files"] = updated_script_files

            # 执行更新操作
            if set_updates:
                result = await self.mcp_generations_collection.update_one(
                    {"_id": conversation_id},
                    {"$set": set_updates}
                )
                return result.modified_count > 0

            return True

        except Exception as e:
            logger.error(f"更新MCP生成解析结果失败: {str(e)}")
            return False

    async def update_mcp_generation_token_usage(self, conversation_id: str,
                                                prompt_tokens: int, completion_tokens: int) -> bool:
        """更新MCP生成对话的token使用量"""
        try:
            total_tokens = prompt_tokens + completion_tokens
            result = await self.mcp_generations_collection.update_one(
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
            logger.error(f"更新MCP生成token使用量失败: {str(e)}")
            return False

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
    
    async def ensure_conversation_exists(self, conversation_id: str, user_id: str = "default_user") -> bool:
        """
        确保对话存在，不存在则创建
        
        Args:
            conversation_id: 对话ID
            user_id: 用户ID，默认为 "default_user"
            
        Returns:
            bool: 操作是否成功（包括对话已存在的情况）
        """
        try:
            # 检查对话是否已存在
            conversation = await self.get_conversation(conversation_id)
            if conversation:
                logger.debug(f"对话已存在: {conversation_id}")
                return True
            
            # 对话不存在，创建新对话
            success = await self.create_conversation(
                conversation_id=conversation_id,
                user_id=user_id,
                title="新对话",
                tags=[]
            )
            
            if success:
                logger.info(f"自动创建对话成功: {conversation_id}")
            else:
                logger.error(f"自动创建对话失败: {conversation_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"确保对话存在时出错: {str(e)}")
            return False

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

    async def update_conversation_title(self, conversation_id: str, title: str, user_id: str = "default_user") -> bool:
        """更新对话标题"""
        try:
            # 验证对话是否存在且属于该用户
            conversation = await self.conversations_collection.find_one({
                "_id": conversation_id,
                "user_id": user_id,
                "status": "active"
            })

            if not conversation:
                logger.warning(f"对话不存在或不属于用户 {user_id}: {conversation_id}")
                return False

            # 更新标题和修改时间
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id, "user_id": user_id},
                {
                    "$set": {
                        "title": title,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"成功更新对话 {conversation_id} 的标题为: {title}")
                return True
            else:
                logger.warning(f"更新对话标题失败: {conversation_id}")
                return False

        except Exception as e:
            logger.error(f"更新对话标题失败: {str(e)}")
            return False

    async def update_conversation_tags(self, conversation_id: str, tags: List[str],
                                       user_id: str = "default_user") -> bool:
        """更新对话标签"""
        try:
            # 验证对话是否存在且属于该用户
            conversation = await self.conversations_collection.find_one({
                "_id": conversation_id,
                "user_id": user_id,
                "status": "active"
            })

            if not conversation:
                logger.warning(f"对话不存在或不属于用户 {user_id}: {conversation_id}")
                return False

            # 更新标签和修改时间
            result = await self.conversations_collection.update_one(
                {"_id": conversation_id, "user_id": user_id},
                {
                    "$set": {
                        "tags": tags,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"成功更新对话 {conversation_id} 的标签为: {tags}")
                return True
            else:
                logger.warning(f"更新对话标签失败: {conversation_id}")
                return False

        except Exception as e:
            logger.error(f"更新对话标签失败: {str(e)}")
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
    
    async def compact_conversation(self, 
                             conversation_id: str, 
                             compact_type: str = "brutal",
                             compact_threshold: int = 2000,
                             summarize_callback: Optional[Callable] = None,
                             user_id: str = "default_user") -> Dict[str, Any]:
        """
        压缩对话内容
        
        Args:
            conversation_id: 对话ID
            compact_type: 压缩类型 'brutal'（暴力压缩）或 'precise'（精确压缩）
            compact_threshold: 压缩阈值，超过此长度的tool content将被压缩
            summarize_callback: 内容总结回调函数，用于精确压缩
            user_id: 用户ID
            
        Returns:
            Dict[str, Any]: 压缩结果
        """
        try:
            # 获取完整对话数据
            conversation_data = await self.get_conversation_with_messages(conversation_id)
            if not conversation_data:
                return {"status": "error", "error": "对话不存在"}

            # 验证对话所有权
            if conversation_data.get("user_id") != user_id:
                return {"status": "error", "error": "无权限访问此对话"}

            rounds = conversation_data.get("rounds", [])
            if not rounds:
                return {"status": "error", "error": "对话无内容可压缩"}

            # 计算原始统计
            original_stats = self._calculate_stats(rounds)
            
            # 执行压缩
            if compact_type == "brutal":
                compacted_rounds = self._brutal_compact(rounds)
                tool_contents_summarized = 0
            else:  # precise
                if not summarize_callback:
                    return {"status": "error", "error": "精确压缩需要提供总结回调函数"}
                compacted_rounds, tool_contents_summarized = await self._precise_compact(
                    rounds, compact_threshold, summarize_callback
                )

            # 更新数据库
            update_result = await self.messages_collection.update_one(
                {"conversation_id": conversation_id},
                {"$set": {"rounds": compacted_rounds}}
            )

            if update_result.modified_count == 0:
                return {"status": "error", "error": "更新对话失败"}

            # 更新对话修改时间
            await self.conversations_collection.update_one(
                {"_id": conversation_id},
                {"$set": {"updated_at": datetime.utcnow()}}
            )

            # 计算压缩后统计
            compacted_stats = self._calculate_stats(compacted_rounds)
            
            # 计算压缩比例
            compression_ratio = (
                1 - (compacted_stats["total_messages"] / original_stats["total_messages"])
                if original_stats["total_messages"] > 0 else 0
            )

            statistics = {
                "original_rounds": original_stats["total_rounds"],
                "original_messages": original_stats["total_messages"],
                "compacted_rounds": compacted_stats["total_rounds"],
                "compacted_messages": compacted_stats["total_messages"],
                "compression_ratio": round(compression_ratio, 3),
                "tool_contents_summarized": tool_contents_summarized
            }

            logger.info(f"对话 {conversation_id} 压缩成功，类型: {compact_type}, 压缩比: {compression_ratio:.1%}")

            return {
                "status": "success",
                "message": f"对话压缩成功，压缩比: {compression_ratio:.1%}",
                "statistics": statistics
            }

        except Exception as e:
            logger.error(f"压缩对话失败: {str(e)}")
            return {"status": "error", "error": str(e)}

    def _brutal_compact(self, rounds: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        暴力压缩：每轮只保留system + user + 最后一个assistant消息
        """
        compacted_rounds = []
        
        for round_data in rounds:
            messages = round_data.get("messages", [])
            if not messages:
                continue
                
            # 查找并保留消息
            system_message = None
            user_message = None
            last_assistant_message = None
            
            for message in messages:
                role = message.get("role")
                if role == "system" and not system_message:
                    system_message = message
                elif role == "user" and not user_message:
                    user_message = message
                elif role == "assistant":
                    last_assistant_message = message  # 保留最后一个assistant消息
            
            # 构建压缩后的消息列表
            compacted_messages = []
            if system_message:
                compacted_messages.append(system_message)
            if user_message:
                compacted_messages.append(user_message)
            if last_assistant_message:
                compacted_messages.append(last_assistant_message)
                
            if compacted_messages:
                compacted_rounds.append({
                    "round": round_data["round"],
                    "messages": compacted_messages
                })
        
        return compacted_rounds

    async def _precise_compact(self, 
                            rounds: List[Dict[str, Any]], 
                            threshold: int,
                            summarize_callback: Callable) -> tuple:
        """
        精确压缩：对超过阈值的tool消息内容进行总结
        
        Returns:
            tuple: (compacted_rounds, tool_contents_summarized)
        """
        compacted_rounds = []
        tool_contents_summarized = 0
        
        for round_data in rounds:
            messages = round_data.get("messages", [])
            if not messages:
                continue
                
            compacted_messages = []
            
            for message in messages:
                if message.get("role") == "tool":
                    content = message.get("content", "")
                    
                    # 检查是否需要压缩
                    if len(content) >= threshold:
                        try:
                            # 调用总结回调函数
                            summary_result = await summarize_callback(content)
                            if summary_result.get("status") == "success":
                                # 使用总结内容替换原内容
                                compacted_message = message.copy()
                                compacted_message["content"] = f"[已总结] {summary_result.get('content', '')}"
                                compacted_messages.append(compacted_message)
                                tool_contents_summarized += 1
                            else:
                                # 总结失败，截断内容
                                compacted_message = message.copy()
                                compacted_message["content"] = f"[总结失败，已截断] {content[:200]}..."
                                compacted_messages.append(compacted_message)
                        except Exception as e:
                            logger.warning(f"总结工具内容失败: {str(e)}")
                            # 总结失败，截断内容
                            compacted_message = message.copy()
                            compacted_message["content"] = f"[总结失败，已截断] {content[:200]}..."
                            compacted_messages.append(compacted_message)
                    else:
                        # 内容长度未超过阈值，保持原样
                        compacted_messages.append(message)
                else:
                    # 非tool消息，保持原样
                    compacted_messages.append(message)
                    
            if compacted_messages:
                compacted_rounds.append({
                    "round": round_data["round"],
                    "messages": compacted_messages
                })
        
        return compacted_rounds, tool_contents_summarized

    def _calculate_stats(self, rounds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """计算对话统计信息"""
        total_rounds = len(rounds)
        total_messages = 0
        
        for round_data in rounds:
            messages = round_data.get("messages", [])
            total_messages += len(messages)
        
        return {
            "total_rounds": total_rounds,
            "total_messages": total_messages
        }

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