import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class GraphRunManager:
    """图运行管理器 - 负责mcp-agent-graph-messages集合的运行数据管理"""

    def __init__(self, db, graph_run_messages_collection, conversation_manager):
        """初始化图运行管理器"""
        self.db = db
        self.graph_run_messages_collection = graph_run_messages_collection
        self.conversation_manager = conversation_manager

    async def create_graph_run_conversation(self, conversation_id: str, graph_name: str,
                                            graph_config: Dict[str, Any], user_id: str = "default_user") -> bool:
        """创建新的图运行对话"""
        try:
            # 1. 在conversations集合中创建基本信息
            conversation_success = await self.conversation_manager.create_conversation(
                conversation_id=conversation_id,
                conversation_type="graph",
                user_id=user_id,
                title=conversation_id,  # 固定使用conversation_id作为title
                tags=["Agent graph"]  # 固定标签
            )

            if not conversation_success:
                return False

            # 2. 在mcp-agent-graph-messages集合中创建运行数据文档
            now = datetime.utcnow()
            run_doc = {
                "_id": conversation_id,
                "conversation_id": conversation_id,
                "graph_name": graph_name,
                "graph_config": graph_config,
                "rounds": [],
                "input": "",
                "global_outputs": {},
                "final_result": "",
                "execution_chain": [],
                "handoffs_status": {},
                "start_time": now.isoformat(),
                "completed": False
            }

            await self.graph_run_messages_collection.insert_one(run_doc)
            logger.info(f"创建图运行对话成功: {conversation_id}")
            return True

        except Exception as e:
            if "duplicate key" in str(e).lower():
                logger.warning(f"图运行对话已存在: {conversation_id}")
                return False
            logger.error(f"创建图运行对话失败: {str(e)}")
            return False

    async def get_graph_run_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取图运行对话数据"""
        try:
            run_doc = await self.graph_run_messages_collection.find_one({"conversation_id": conversation_id})
            if run_doc:
                return self._convert_objectid_to_str(run_doc)
            return None
        except Exception as e:
            logger.error(f"获取图运行对话失败: {str(e)}")
            return None

    async def update_graph_run_data(self, conversation_id: str, update_data: Dict[str, Any]) -> bool:
        """更新图运行数据"""
        try:
            # 添加更新时间
            update_data["updated_at"] = datetime.now().isoformat()

            result = await self.graph_run_messages_collection.update_one(
                {"conversation_id": conversation_id},
                {"$set": update_data}
            )

            if result.modified_count > 0:
                logger.debug(f"更新图运行数据成功: {conversation_id}")
                return True
            else:
                logger.warning(f"更新图运行数据未修改任何文档: {conversation_id}")
                return False
        except Exception as e:
            logger.error(f"更新图运行数据失败: {str(e)}")
            return False

    async def add_round_to_graph_run(self, conversation_id: str, round_data: Dict[str, Any]) -> bool:
        """向图运行对话添加新的轮次"""
        try:
            result = await self.graph_run_messages_collection.update_one(
                {"conversation_id": conversation_id},
                {
                    "$push": {"rounds": round_data},
                    "$set": {"updated_at": datetime.now().isoformat()}
                }
            )

            if result.modified_count > 0:
                # 更新conversations集合的轮次计数
                await self.conversation_manager.update_conversation_round_count(conversation_id, 1)
                logger.debug(f"向图运行对话添加轮次成功: {conversation_id}")
                return True
            else:
                logger.error(f"向图运行对话添加轮次失败: {conversation_id}")
                return False

        except Exception as e:
            logger.error(f"添加图运行轮次失败: {str(e)}")
            return False

    async def update_global_outputs(self, conversation_id: str, node_name: str, output: str) -> bool:
        """更新全局输出"""
        try:
            result = await self.graph_run_messages_collection.update_one(
                {"conversation_id": conversation_id},
                {
                    "$push": {f"global_outputs.{node_name}": output},
                    "$set": {"updated_at": datetime.now().isoformat()}
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新全局输出失败: {str(e)}")
            return False

    async def update_handoffs_status(self, conversation_id: str, node_name: str,
                                     handoffs_data: Dict[str, Any]) -> bool:
        """更新handoffs状态"""
        try:
            result = await self.graph_run_messages_collection.update_one(
                {"conversation_id": conversation_id},
                {
                    "$set": {
                        f"handoffs_status.{node_name}": handoffs_data,
                        "updated_at": datetime.now().isoformat()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新handoffs状态失败: {str(e)}")
            return False

    async def update_execution_chain(self, conversation_id: str, execution_chain: List[Any]) -> bool:
        """更新执行链"""
        try:
            result = await self.graph_run_messages_collection.update_one(
                {"conversation_id": conversation_id},
                {
                    "$set": {
                        "execution_chain": execution_chain,
                        "updated_at": datetime.now().isoformat()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新执行链失败: {str(e)}")
            return False

    async def update_final_result(self, conversation_id: str, final_result: str) -> bool:
        """更新最终结果"""
        try:
            result = await self.graph_run_messages_collection.update_one(
                {"conversation_id": conversation_id},
                {
                    "$set": {
                        "final_result": final_result,
                        "completed": True,
                        "updated_at": datetime.now().isoformat()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新最终结果失败: {str(e)}")
            return False

    async def delete_graph_run_messages(self, conversation_id: str) -> bool:
        """删除图运行消息"""
        try:
            result = await self.graph_run_messages_collection.delete_one({"conversation_id": conversation_id})
            if result.deleted_count > 0:
                logger.info(f"图运行消息 {conversation_id} 已删除")
                return True
            else:
                logger.warning(f"图运行消息 {conversation_id} 不存在")
                return False
        except Exception as e:
            logger.error(f"删除图运行消息失败: {str(e)}")
            return False

    async def get_graph_run_messages_only(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """仅获取图运行的消息部分（不包含基本信息）"""
        try:
            run_doc = await self.graph_run_messages_collection.find_one({"conversation_id": conversation_id})
            if run_doc:
                return self._convert_objectid_to_str(run_doc)
            return None
        except Exception as e:
            logger.error(f"获取图运行消息失败: {str(e)}")
            return None

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc