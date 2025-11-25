import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class AgentRunRepository:
    """Agent Run Repository - 负责 agent_run 集合的操作"""

    def __init__(self, db, agent_run_collection):
        """初始化 Agent Run Repository"""
        self.db = db
        self.agent_run_collection = agent_run_collection

    async def create_agent_run(self, conversation_id: str) -> bool:
        """
        创建 agent_run 文档

        Args:
            conversation_id: 对话 ID

        Returns:
            创建成功返回 True，失败返回 False
        """
        try:
            agent_run_doc = {
                "_id": conversation_id,
                "conversation_id": conversation_id,
                "rounds": [],
                "tasks": []
            }

            await self.agent_run_collection.insert_one(agent_run_doc)
            logger.info(f"创建 agent_run 文档成功: {conversation_id}")
            return True

        except Exception as e:
            logger.error(f"创建 agent_run 文档失败: {str(e)}")
            if "duplicate key" in str(e).lower():
                logger.warning(f"agent_run 文档已存在: {conversation_id}")
            return False

    async def get_agent_run(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """
        获取 agent_run 文档

        Args:
            conversation_id: 对话 ID

        Returns:
            agent_run 文档，不存在返回 None
        """
        try:
            agent_run = await self.agent_run_collection.find_one({"_id": conversation_id})
            return agent_run

        except Exception as e:
            logger.error(f"获取 agent_run 文档失败: {str(e)}")
            return None

    async def add_round_to_main(
        self,
        conversation_id: str,
        round_number: int,
        agent_name: str,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        model: Optional[str] = None,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None
    ) -> bool:
        """
        添加主线程 round

        Args:
            conversation_id: 对话 ID
            round_number: 轮次编号
            agent_name: Agent 名称
            messages: 消息列表
            tools: 工具 schema 列表（可选）
            model: 模型名称（可选）
            prompt_tokens: 提示词 token 数量（可选）
            completion_tokens: 完成 token 数量（可选）

        Returns:
            添加成功返回 True，失败返回 False
        """
        try:
            round_doc = {
                "round": round_number,
                "agent_name": agent_name,
                "messages": messages
            }

            if tools is not None:
                round_doc["tools"] = tools
            if model is not None:
                round_doc["model"] = model
            if prompt_tokens is not None:
                round_doc["prompt_tokens"] = prompt_tokens
            if completion_tokens is not None:
                round_doc["completion_tokens"] = completion_tokens

            result = await self.agent_run_collection.update_one(
                {"_id": conversation_id},
                {"$push": {"rounds": round_doc}}
            )

            if result.modified_count > 0:
                logger.debug(f"添加主线程 round 成功: {conversation_id}, round {round_number}")
                return True
            else:
                logger.warning(f"添加主线程 round 失败: 文档未找到或未修改")
                return False

        except Exception as e:
            logger.error(f"添加主线程 round 失败: {str(e)}")
            return False

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

            result = await self.agent_run_collection.update_one(
                {"_id": conversation_id},
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
            agent_run = await self.get_agent_run(conversation_id)

            if not agent_run:
                return None

            # 在 tasks 数组中查找指定 task_id
            for task in agent_run.get("tasks", []):
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

            result = await self.agent_run_collection.update_one(
                {
                    "_id": conversation_id,
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

    async def get_main_rounds(self, conversation_id: str) -> List[Dict[str, Any]]:
        """
        获取主线程的所有 rounds

        Args:
            conversation_id: 对话 ID

        Returns:
            rounds 列表
        """
        try:
            agent_run = await self.get_agent_run(conversation_id)

            if not agent_run:
                return []

            return agent_run.get("rounds", [])

        except Exception as e:
            logger.error(f"获取主线程 rounds 失败: {str(e)}")
            return []

    async def get_conversation_with_tasks(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """
        获取完整对话（含 tasks）

        Args:
            conversation_id: 对话 ID

        Returns:
            完整的 agent_run 文档
        """
        return await self.get_agent_run(conversation_id)

    async def delete_agent_run(self, conversation_id: str) -> bool:
        """
        删除 agent_run 文档

        Args:
            conversation_id: 对话 ID

        Returns:
            删除成功返回 True，失败返回 False
        """
        try:
            result = await self.agent_run_collection.delete_one({"_id": conversation_id})

            if result.deleted_count > 0:
                logger.info(f"删除 agent_run 文档成功: {conversation_id}")
                return True
            else:
                logger.warning(f"agent_run 文档未找到: {conversation_id}")
                return False

        except Exception as e:
            logger.error(f"删除 agent_run 文档失败: {str(e)}")
            return False

    async def get_round_count(self, conversation_id: str) -> int:
        """
        获取主线程 round 数量

        Args:
            conversation_id: 对话 ID

        Returns:
            round 数量
        """
        try:
            agent_run = await self.get_agent_run(conversation_id)

            if not agent_run:
                return 0

            return len(agent_run.get("rounds", []))

        except Exception as e:
            logger.error(f"获取 round 数量失败: {str(e)}")
            return 0

    async def get_task_count(self, conversation_id: str) -> int:
        """
        获取任务数量

        Args:
            conversation_id: 对话 ID

        Returns:
            任务数量
        """
        try:
            agent_run = await self.get_agent_run(conversation_id)

            if not agent_run:
                return 0

            return len(agent_run.get("tasks", []))

        except Exception as e:
            logger.error(f"获取任务数量失败: {str(e)}")
            return 0
