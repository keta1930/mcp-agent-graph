import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class GraphManager:
    """图生成管理器 - 负责graph_messages集合的rounds格式消息管理"""

    def __init__(self, db, graph_messages_collection, conversation_manager):
        """初始化图生成管理器"""
        self.db = db
        self.graph_messages_collection = graph_messages_collection
        self.conversation_manager = conversation_manager

    async def create_graph_generation_conversation(self, conversation_id: str, user_id: str = "default_user") -> bool:
        """创建新的图生成对话"""
        try:
            # 1. 在conversations集合中创建基本信息
            conversation_success = await self.conversation_manager.create_conversation(
                conversation_id=conversation_id,
                conversation_type="agent",  # 图生成属于agent类型
                user_id=user_id,
                title="AI图生成",
                tags=[]
            )

            if not conversation_success:
                return False

            # 2. 在graph_messages集合中创建消息文档
            now = datetime.now()
            messages_doc = {
                "_id": conversation_id,
                "conversation_id": conversation_id,
                "rounds": [],
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

            await self.graph_messages_collection.insert_one(messages_doc)
            logger.info(f"创建图生成对话成功: {conversation_id}")
            return True

        except Exception as e:
            if "duplicate key" in str(e).lower():
                logger.warning(f"图生成对话已存在: {conversation_id}")
                return False
            logger.error(f"创建图生成对话失败: {str(e)}")
            return False

    async def get_graph_generation_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取图生成对话（包含基本信息和详细消息）"""
        try:
            # 获取基本信息
            conversation_info = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation_info or conversation_info.get("type") != "agent":
                return None

            # 获取详细消息
            messages_doc = await self.graph_messages_collection.find_one({"conversation_id": conversation_id})
            if not messages_doc:
                return None

            # 合并返回
            result = conversation_info.copy()
            result.update({
                "rounds": messages_doc.get("rounds", []),
                "parsed_results": messages_doc.get("parsed_results", {}),
                "final_graph_config": messages_doc.get("final_graph_config")
            })

            messages = []
            for round_data in messages_doc.get("rounds", []):
                messages.extend(round_data.get("messages", []))
            result["messages"] = messages

            return self._convert_objectid_to_str(result)
        except Exception as e:
            logger.error(f"获取图生成对话失败: {str(e)}")
            return None

    async def add_message_to_graph_generation(self, conversation_id: str,
                                              message: Dict[str, Any],
                                              model_name: str = None) -> bool:
        """向图生成对话添加消息（自动管理rounds）"""
        try:
            # 获取当前rounds数量来确定是否需要创建新round
            messages_doc = await self.graph_messages_collection.find_one(
                {"conversation_id": conversation_id},
                {"rounds": 1}
            )

            if not messages_doc:
                logger.error(f"图生成对话不存在: {conversation_id}")
                return False

            current_rounds = messages_doc.get("rounds", [])
            message_role = message.get("role")

            if message_role == "system":
                # System消息
                if not current_rounds:
                    # 创建第一个round，包含system消息
                    round_data = {
                        "round": 1,
                        "messages": [message]
                    }
                    result = await self.graph_messages_collection.update_one(
                        {"conversation_id": conversation_id},
                        {"$push": {"rounds": round_data}}
                    )
                else:
                    # 添加到第一个round的开头
                    result = await self.graph_messages_collection.update_one(
                        {"conversation_id": conversation_id},
                        {"$push": {"rounds.0.messages": {"$each": [message], "$position": 0}}}
                    )

            elif message_role == "user":
                # User消息处理逻辑
                if not current_rounds:
                    round_data = {
                        "round": 1,
                        "messages": [message]
                    }
                    result = await self.graph_messages_collection.update_one(
                        {"conversation_id": conversation_id},
                        {"$push": {"rounds": round_data}}
                    )
                    await self.conversation_manager.update_conversation_round_count(conversation_id, 1)

                elif len(current_rounds) == 1:
                    # 将user消息添加到第一个round
                    first_round = current_rounds[0]
                    first_round_messages = first_round.get("messages", [])

                    has_user_message = any(msg.get("role") == "user" for msg in first_round_messages)

                    if not has_user_message:
                        result = await self.graph_messages_collection.update_one(
                            {"conversation_id": conversation_id},
                            {"$push": {"rounds.0.messages": message}}
                        )
                    else:
                        new_round_number = len(current_rounds) + 1
                        round_data = {
                            "round": new_round_number,
                            "messages": [message]
                        }
                        result = await self.graph_messages_collection.update_one(
                            {"conversation_id": conversation_id},
                            {"$push": {"rounds": round_data}}
                        )
                        await self.conversation_manager.update_conversation_round_count(conversation_id, 1)
                else:
                    new_round_number = len(current_rounds) + 1
                    round_data = {
                        "round": new_round_number,
                        "messages": [message]
                    }
                    result = await self.graph_messages_collection.update_one(
                        {"conversation_id": conversation_id},
                        {"$push": {"rounds": round_data}}
                    )
                    await self.conversation_manager.update_conversation_round_count(conversation_id, 1)

            elif message_role == "assistant":
                # Assistant消息
                if not current_rounds:
                    round_data = {
                        "round": 1,
                        "messages": [message]
                    }
                    if model_name:
                        round_data["model"] = model_name
                    result = await self.graph_messages_collection.update_one(
                        {"conversation_id": conversation_id},
                        {"$push": {"rounds": round_data}}
                    )
                    await self.conversation_manager.update_conversation_round_count(conversation_id, 1)
                else:
                    # 添加到最后一个round
                    last_round_index = len(current_rounds) - 1
                    update_operations = {"$push": {f"rounds.{last_round_index}.messages": message}}
                    # 如果提供了model_name，同时更新model字段
                    if model_name:
                        update_operations["$set"] = {f"rounds.{last_round_index}.model": model_name}
                    result = await self.graph_messages_collection.update_one(
                        {"conversation_id": conversation_id},
                        update_operations
                    )

            else:
                # 其他类型消息，添加到最后一个round
                if not current_rounds:
                    round_data = {
                        "round": 1,
                        "messages": [message]
                    }
                    result = await self.graph_messages_collection.update_one(
                        {"conversation_id": conversation_id},
                        {"$push": {"rounds": round_data}}
                    )
                    await self.conversation_manager.update_conversation_round_count(conversation_id, 1)
                else:
                    last_round_index = len(current_rounds) - 1
                    result = await self.graph_messages_collection.update_one(
                        {"conversation_id": conversation_id},
                        {"$push": {f"rounds.{last_round_index}.messages": message}}
                    )

            if result.modified_count > 0:
                logger.info(f"向图生成对话 {conversation_id} 添加 {message_role} 消息成功")

                # 只在添加assistant消息时检查是否需要生成title和tags
                if message_role == "assistant":
                    await self._check_and_generate_title_tags(conversation_id, model_name)

                return True
            else:
                logger.error(f"向图生成对话 {conversation_id} 添加 {message_role} 消息失败")
                return False

        except Exception as e:
            logger.error(f"添加图生成对话消息失败: {str(e)}")
            return False

    async def _check_and_generate_title_tags(self, conversation_id: str, model_name: str = None):
        """检查并生成标题和标签（当标题为默认标题时）"""
        try:
            # 获取当前对话基本信息
            conversation_info = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation_info:
                return

            current_title = conversation_info.get("title", "")

            # 只在标题为默认标题时生成新标题和标签
            if current_title == "AI图生成":
                # 获取消息进行标题生成
                messages_doc = await self.graph_messages_collection.find_one(
                    {"conversation_id": conversation_id},
                    {"rounds": 1}
                )

                if messages_doc and messages_doc.get("rounds"):
                    # 收集所有消息用于标题生成
                    all_messages = []
                    for round_data in messages_doc["rounds"]:
                        all_messages.extend(round_data.get("messages", []))

                    # 使用指定的模型或回退到第一个可用模型
                    model_config = None
                    if model_name:
                        from app.services.model_service import model_service
                        model_config = model_service.get_model(model_name)

                    if not model_config:
                        # 回退到第一个可用模型
                        from app.services.model_service import model_service
                        available_models = list(model_service.clients.keys())
                        if not available_models:
                            logger.warning("没有可用的模型进行标题生成")
                            return
                        model_config = model_service.get_model(available_models[0])

                    if not model_config:
                        return

                    # 调用统一的标题和标签生成方法
                    await self.conversation_manager.generate_conversation_title_and_tags(
                        conversation_id=conversation_id,
                        messages=all_messages,
                        model_config=model_config
                    )

                    logger.info(
                        f"为图生成对话 {conversation_id} 生成标题和标签，使用模型: {model_config.get('name', 'unknown')}")

        except Exception as e:
            logger.error(f"生成图生成对话标题和标签时出错: {str(e)}")

    async def update_graph_generation_parsed_results(self, conversation_id: str,
                                                     parsed_results: Dict[str, Any]) -> bool:
        """更新图生成对话的解析结果 - 支持替换和删除逻辑"""
        try:
            update_operations = []

            # 处理简单替换字段
            simple_fields = ["analysis", "todo", "graph_name", "graph_description", "end_template"]
            set_updates = {}

            for field in simple_fields:
                if field in parsed_results and parsed_results[field] is not None:
                    set_updates[f"parsed_results.{field}"] = parsed_results[field]

            # 处理节点替换/追加逻辑
            if "nodes" in parsed_results and parsed_results["nodes"]:
                # 获取当前对话数据
                messages_doc = await self.graph_messages_collection.find_one({"conversation_id": conversation_id})
                if messages_doc:
                    current_nodes = messages_doc.get("parsed_results", {}).get("nodes", [])

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
                                        "filter": {"conversation_id": conversation_id},
                                        "update": {"$set": {f"parsed_results.nodes.{index}": new_node}}
                                    }
                                })
                                logger.info(f"替换节点: {node_name}")
                            else:
                                # 追加新节点
                                update_operations.append({
                                    "updateOne": {
                                        "filter": {"conversation_id": conversation_id},
                                        "update": {"$push": {"parsed_results.nodes": new_node}}
                                    }
                                })
                                logger.info(f"新增节点: {node_name}")

            # 处理节点删除逻辑
            if "delete_nodes" in parsed_results and parsed_results["delete_nodes"]:
                for node_name in parsed_results["delete_nodes"]:
                    update_operations.append({
                        "updateOne": {
                            "filter": {"conversation_id": conversation_id},
                            "update": {"$pull": {"parsed_results.nodes": {"name": node_name}}}
                        }
                    })
                    logger.info(f"删除节点: {node_name}")

            # 执行所有更新操作
            success = True

            # 先执行简单字段的更新
            if set_updates:
                result = await self.graph_messages_collection.update_one(
                    {"conversation_id": conversation_id},
                    {"$set": set_updates}
                )
                if result.modified_count == 0:
                    success = False

            # 执行节点相关的更新操作
            if update_operations:
                for operation in update_operations:
                    try:
                        result = await self.graph_messages_collection.update_one(
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
            return await self.conversation_manager.update_conversation_token_usage(
                conversation_id, prompt_tokens, completion_tokens
            )
        except Exception as e:
            logger.error(f"更新图生成token使用量失败: {str(e)}")
            return False

    async def update_graph_generation_final_config(self, conversation_id: str,
                                                   final_graph_config: Dict[str, Any]) -> bool:
        """更新图生成对话的最终图配置"""
        try:
            result = await self.graph_messages_collection.update_one(
                {"conversation_id": conversation_id},
                {"$set": {"final_graph_config": final_graph_config}}
            )

            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新最终图配置失败: {str(e)}")
            return False

    async def get_graph_generation_messages_only(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """仅获取图生成的消息部分（不包含基本信息）"""
        try:
            messages_doc = await self.graph_messages_collection.find_one({"conversation_id": conversation_id})
            if messages_doc:
                return self._convert_objectid_to_str(messages_doc)
            return None
        except Exception as e:
            logger.error(f"获取图生成消息失败: {str(e)}")
            return None

    async def delete_graph_generation_messages(self, conversation_id: str) -> bool:
        """删除图生成消息"""
        try:
            result = await self.graph_messages_collection.delete_one({"conversation_id": conversation_id})
            if result.deleted_count > 0:
                logger.info(f"图生成消息 {conversation_id} 已删除")
                return True
            else:
                logger.warning(f"图生成消息 {conversation_id} 不存在")
                return False
        except Exception as e:
            logger.error(f"删除图生成消息失败: {str(e)}")
            return False

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc