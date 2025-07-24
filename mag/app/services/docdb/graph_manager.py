import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class GraphManager:
    """图生成管理器 - 负责AI图生成对话的数据管理"""

    def __init__(self, db, graph_generations_collection):
        """
        初始化图生成管理器

        Args:
            db: MongoDB数据库实例
            graph_generations_collection: 图生成集合
        """
        self.db = db
        self.graph_generations_collection = graph_generations_collection

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

        except Exception as e:
            if "duplicate key" in str(e).lower():
                logger.warning(f"图生成对话已存在: {conversation_id}")
                return False
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

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc