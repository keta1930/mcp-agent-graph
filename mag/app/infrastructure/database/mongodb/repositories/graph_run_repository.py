import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class GraphRunRepository:
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
            now = datetime.now()
            run_doc = {
                "_id": conversation_id,
                "conversation_id": conversation_id,
                "graph_name": graph_name,
                "graph_config": graph_config,
                "rounds": [],
                "tasks": [],
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

    async def add_round_to_graph_run(self, conversation_id: str, round_data: Dict[str, Any],
                                     tools_schema: Optional[List[Dict[str, Any]]] = None) -> bool:
        """
        向图运行对话添加新的轮次

        Args:
            conversation_id: 对话ID
            round_data: 轮次数据，应包含round编号和messages列表
            tools_schema: 本轮使用的工具schema列表（可选，默认为空数组）

        Returns:
            bool: 是否添加成功
        """
        try:
            round_data["tools"] = tools_schema if tools_schema is not None else []

            if round_data["tools"]:
                logger.debug(f"向图运行轮次添加了 {len(round_data['tools'])} 个工具schema")
            else:
                logger.debug(f"向图运行轮次添加了空工具列表")

            result = await self.graph_run_messages_collection.update_one(
                {"conversation_id": conversation_id},
                {
                    "$push": {"rounds": round_data},
                    "$set": {"updated_at": datetime.now().isoformat()}
                }
            )

            if result.modified_count > 0:
                await self.conversation_manager.update_conversation_round_count(conversation_id, 1)
                logger.info(f"向图运行对话添加轮次成功: {conversation_id}, round: {round_data.get('round', 'unknown')}")
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

    async def add_task(
        self,
        conversation_id: str,
        task_id: str,
        agent_name: str
    ) -> bool:
        """
        添加新任务（创建空的 task 记录）

        Args:
            conversation_id: 对话 ID
            task_id: 任务 ID
            agent_name: Agent 名称

        Returns:
            添加成功返回 True，失败返回 False
        """
        try:
            task_doc = {
                "task_id": task_id,
                "agent_name": agent_name,
                "rounds": []
            }

            result = await self.graph_run_messages_collection.update_one(
                {"conversation_id": conversation_id},
                {"$push": {"tasks": task_doc}}
            )

            if result.modified_count > 0:
                logger.info(f"添加新任务成功: {conversation_id}, task_id: {task_id}")
                return True
            else:
                logger.warning(f"添加新任务失败: 文档未找到")
                return False

        except Exception as e:
            logger.error(f"添加新任务失败: {str(e)}")
            return False

    async def get_task(
        self,
        conversation_id: str,
        task_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        获取任务（通过 task_id）

        Args:
            conversation_id: 对话 ID
            task_id: 任务 ID

        Returns:
            任务文档，不存在返回 None
        """
        try:
            graph_run = await self.get_graph_run_conversation(conversation_id)

            if not graph_run:
                return None

            # 在 tasks 数组中查找指定 task_id
            for task in graph_run.get("tasks", []):
                if task.get("task_id") == task_id:
                    return task

            return None

        except Exception as e:
            logger.error(f"获取任务失败 ({task_id}): {str(e)}")
            return None

    async def add_round_to_task(
        self,
        conversation_id: str,
        task_id: str,
        round_number: int,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        model: Optional[str] = None,
        tool_call_id: Optional[str] = None
    ) -> bool:
        """
        添加任务 round

        Args:
            conversation_id: 对话 ID
            task_id: 任务 ID
            round_number: 轮次编号
            messages: 消息列表
            tools: 工具 schema 列表（可选）
            model: 模型名称（可选）
            tool_call_id: 工具调用 ID（用于关联主对话，可选）

        Returns:
            添加成功返回 True，失败返回 False
        """
        try:
            round_doc = {
                "round": round_number,
                "messages": messages
            }

            if tools is not None:
                round_doc["tools"] = tools
            if model is not None:
                round_doc["model"] = model
            if tool_call_id is not None:
                round_doc["tool_call_id"] = tool_call_id

            result = await self.graph_run_messages_collection.update_one(
                {
                    "conversation_id": conversation_id,
                    "tasks.task_id": task_id
                },
                {"$push": {"tasks.$.rounds": round_doc}}
            )

            if result.modified_count > 0:
                logger.debug(f"添加任务 round 成功: task_id {task_id}, round {round_number}, tool_call_id {tool_call_id}")
                return True
            else:
                logger.warning(f"添加任务 round 失败: task 未找到或未修改")
                return False

        except Exception as e:
            logger.error(f"添加任务 round 失败: {str(e)}")
            return False

    async def get_task_history(
        self,
        conversation_id: str,
        task_id: str
    ) -> List[Dict[str, Any]]:
        """
        获取任务的完整历史消息（所有 rounds 的 messages 合并）

        Args:
            conversation_id: 对话 ID
            task_id: 任务 ID

        Returns:
            消息列表
        """
        try:
            task = await self.get_task(conversation_id, task_id)

            if not task:
                return []

            # 合并所有 rounds 的 messages
            messages = []
            for round_doc in task.get("rounds", []):
                messages.extend(round_doc.get("messages", []))

            return messages

        except Exception as e:
            logger.error(f"获取任务历史失败 ({task_id}): {str(e)}")
            return []

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc