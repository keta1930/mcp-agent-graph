import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone

from app.services.docdb.task_manager import TaskManager
from app.services.mongodb_service import mongodb_service
from app.models.task_schema import Task, TaskCreate, TaskExecutionRecord
from app.services.graph_service import graph_service

logger = logging.getLogger(__name__)


class TaskService:
    """任务管理服务"""

    def __init__(self):
        """初始化任务服务"""
        self.task_manager: Optional[TaskManager] = None

    async def initialize(self):
        """初始化任务管理器"""
        if mongodb_service.is_connected:
            # 使用mongodb_service中初始化的task_manager
            self.task_manager = mongodb_service.task_manager
            logger.info("任务管理器初始化成功")
        else:
            logger.error("MongoDB未连接，任务管理器初始化失败")

    async def create_task(self, task_create: TaskCreate) -> Dict[str, Any]:
        """创建新任务"""
        try:
            if not self.task_manager:
                await self.initialize()

            if not self.task_manager:
                raise Exception("任务管理器未初始化")

            # 转换为字典格式
            task_data = task_create.dict()

            # 验证图是否存在
            graph_config = await graph_service.get_graph(task_create.graph_name)
            if not graph_config:
                raise Exception(f"图 '{task_create.graph_name}' 不存在")

            # 创建任务
            success = await self.task_manager.create_task(task_data)
            if not success:
                raise Exception("创建任务失败")

            return {
                "status": "success",
                "message": "任务创建成功",
                "task_id": task_data.get("id")
            }

        except Exception as e:
            logger.error(f"创建任务失败: {str(e)}")
            return {
                "status": "error",
                "message": f"创建任务失败: {str(e)}"
            }

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取单个任务（包含完整执行历史）"""
        try:
            if not self.task_manager:
                await self.initialize()

            if not self.task_manager:
                return None

            return await self.task_manager.get_task(task_id)

        except Exception as e:
            logger.error(f"获取任务失败: {str(e)}")
            return None

    async def get_all_tasks(self, user_id: str = None) -> List[Dict[str, Any]]:
        """获取所有任务"""
        try:
            if not self.task_manager:
                await self.initialize()

            if not self.task_manager:
                return []

            return await self.task_manager.get_all_tasks(user_id)

        except Exception as e:
            logger.error(f"获取任务列表失败: {str(e)}")
            return []

    async def update_task_status(self, task_id: str, status: str) -> Dict[str, Any]:
        """更新任务状态"""
        try:
            if not self.task_manager:
                await self.initialize()

            if not self.task_manager:
                raise Exception("任务管理器未初始化")

            success = await self.task_manager.update_task_status(task_id, status)
            if not success:
                raise Exception("更新任务状态失败")

            return {
                "status": "success",
                "message": f"任务状态已更新为 {status}"
            }

        except Exception as e:
            logger.error(f"更新任务状态失败: {str(e)}")
            return {
                "status": "error",
                "message": f"更新任务状态失败: {str(e)}"
            }

    async def delete_task(self, task_id: str) -> Dict[str, Any]:
        """删除任务"""
        try:
            if not self.task_manager:
                await self.initialize()

            if not self.task_manager:
                raise Exception("任务管理器未初始化")

            success = await self.task_manager.delete_task(task_id)
            if not success:
                raise Exception("删除任务失败")

            return {
                "status": "success",
                "message": "任务删除成功"
            }

        except Exception as e:
            logger.error(f"删除任务失败: {str(e)}")
            return {
                "status": "error",
                "message": f"删除任务失败: {str(e)}"
            }

    async def get_task_execution_history(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务执行历史（从单文档获取）"""
        try:
            if not self.task_manager:
                await self.initialize()

            if not self.task_manager:
                return None

            return await self.task_manager.get_task_execution_history(task_id)

        except Exception as e:
            logger.error(f"获取任务执行历史失败: {str(e)}")
            return None

    async def execute_task(self, task: Dict[str, Any]) -> List[str]:
        """执行任务（并发执行多个图实例）"""
        try:
            execution_count = task.get("execution_count", 1)
            graph_name = task.get("graph_name")
            input_text = task.get("input_text")

            # 获取图配置
            graph_config = await graph_service.get_graph(graph_name)
            if not graph_config:
                raise Exception(f"图 '{graph_name}' 不存在")

            # 并发执行多个图实例
            tasks = []
            for i in range(execution_count):
                task_coroutine = graph_service.execute_graph_background(
                    graph_name=graph_name,
                    input_text=input_text,
                    graph_config=graph_config,
                    conversation_id=None
                )
                tasks.append(task_coroutine)

            # 等待所有执行完成
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # 收集成功的conversation_id
            conversation_ids = []
            for result in results:
                if isinstance(result, dict) and "conversation_id" in result:
                    conversation_ids.append(result["conversation_id"])
                elif isinstance(result, Exception):
                    logger.error(f"执行图实例失败: {str(result)}")

            # 记录执行历史
            if conversation_ids:
                executed_at = datetime.now()
                await self.task_manager.add_execution_record(
                    task.get("id"), task.get("task_name", ""), executed_at, conversation_ids
                )

            logger.info(f"任务 {task.get('id')} 执行完成，成功启动 {len(conversation_ids)} 个图实例")
            return conversation_ids

        except Exception as e:
            logger.error(f"执行任务失败: {str(e)}")
            return []

    async def get_active_tasks(self) -> List[Dict[str, Any]]:
        """获取所有活跃的任务"""
        try:
            if not self.task_manager:
                await self.initialize()

            if not self.task_manager:
                return []

            return await self.task_manager.get_active_tasks()

        except Exception as e:
            logger.error(f"获取活跃任务列表失败: {str(e)}")
            return []

    async def get_task_summaries(self, user_id: Optional[str] = None, status: Optional[Any] = None,
                                 graph_name: Optional[str] = None, limit: int = 20, offset: int = 0,
                                 sort_by: str = "created_at", sort_order: str = "desc") -> List[Dict[str, Any]]:
        """获取任务摘要列表"""
        try:
            if not self.task_manager:
                await self.initialize()

            if not self.task_manager:
                return []

            status_value = None
            if status is not None:
                status_value = getattr(status, "value", status)

            return await self.task_manager.get_task_summaries(
                user_id=user_id,
                status=status_value,
                graph_name=graph_name,
                limit=limit,
                offset=offset,
                sort_by=sort_by,
                sort_order=sort_order
            )

        except Exception as e:
            logger.error(f"获取任务摘要失败: {str(e)}")
            return []


# 创建全局任务服务实例
task_service = TaskService()