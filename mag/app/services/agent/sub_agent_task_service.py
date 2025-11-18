"""
Sub Agent Task Service - 统一的任务管理服务
支持 agent_run 和 graph_run 文档的任务操作
"""
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class SubAgentTaskService:
    """统一的 Sub Agent Task 管理服务"""

    def __init__(self):
        """初始化 Sub Agent Task Service"""
        from app.infrastructure.database.mongodb.client import mongodb_client
        self.mongodb_client = mongodb_client

    async def add_task(
        self,
        conversation_id: str,
        task_id: str,
        agent_name: str
    ) -> bool:
        """
        添加新任务（自动判断文档类型）

        Args:
            conversation_id: 对话 ID
            task_id: 任务 ID
            agent_name: Agent 名称

        Returns:
            添加成功返回 True，失败返回 False
        """
        try:
            # 获取 conversation 类型
            conversation_type = await self._get_conversation_type(conversation_id)

            if conversation_type == "agent":
                return await self.mongodb_client.agent_run_repository.add_task(
                    conversation_id, task_id, agent_name
                )
            elif conversation_type == "graph":
                return await self.mongodb_client.graph_run_repository.add_task(
                    conversation_id, task_id, agent_name
                )
            else:
                logger.error(f"不支持的 conversation 类型: {conversation_type}")
                return False

        except Exception as e:
            logger.error(f"添加任务失败: {str(e)}")
            return False

    async def get_task(
        self,
        conversation_id: str,
        task_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        获取任务（自动判断文档类型）

        Args:
            conversation_id: 对话 ID
            task_id: 任务 ID

        Returns:
            任务文档，不存在返回 None
        """
        try:
            # 获取 conversation 类型
            conversation_type = await self._get_conversation_type(conversation_id)

            if conversation_type == "agent":
                return await self.mongodb_client.agent_run_repository.get_task(
                    conversation_id, task_id
                )
            elif conversation_type == "graph":
                return await self.mongodb_client.graph_run_repository.get_task(
                    conversation_id, task_id
                )
            else:
                logger.error(f"不支持的 conversation 类型: {conversation_type}")
                return None

        except Exception as e:
            logger.error(f"获取任务失败: {str(e)}")
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
        添加任务 round（自动判断文档类型）

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
            # 获取 conversation 类型
            conversation_type = await self._get_conversation_type(conversation_id)

            if conversation_type == "agent":
                return await self.mongodb_client.agent_run_repository.add_round_to_task(
                    conversation_id, task_id, round_number, messages, tools, model, tool_call_id
                )
            elif conversation_type == "graph":
                return await self.mongodb_client.graph_run_repository.add_round_to_task(
                    conversation_id, task_id, round_number, messages, tools, model, tool_call_id
                )
            else:
                logger.error(f"不支持的 conversation 类型: {conversation_type}")
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
        获取任务的完整历史消息（自动判断文档类型）

        Args:
            conversation_id: 对话 ID
            task_id: 任务 ID

        Returns:
            消息列表
        """
        try:
            # 获取 conversation 类型
            conversation_type = await self._get_conversation_type(conversation_id)

            if conversation_type == "agent":
                return await self.mongodb_client.agent_run_repository.get_task_history(
                    conversation_id, task_id
                )
            elif conversation_type == "graph":
                return await self.mongodb_client.graph_run_repository.get_task_history(
                    conversation_id, task_id
                )
            else:
                logger.error(f"不支持的 conversation 类型: {conversation_type}")
                return []

        except Exception as e:
            logger.error(f"获取任务历史失败: {str(e)}")
            return []

    async def _get_conversation_type(self, conversation_id: str) -> str:
        """
        获取 conversation 的 type 字段

        Args:
            conversation_id: 对话 ID

        Returns:
            conversation 类型（"agent" 或 "graph"）

        Raises:
            ValueError: 如果 conversation 不存在
        """
        conversation = await self.mongodb_client.conversation_repository.get_conversation(
            conversation_id
        )

        if not conversation:
            raise ValueError(f"Conversation 不存在: {conversation_id}")

        return conversation.get("type", "agent")


# 创建全局单例
sub_agent_task_service = SubAgentTaskService()
