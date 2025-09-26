import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from bson import ObjectId

logger = logging.getLogger(__name__)


class TaskManager:
    """任务管理器 - 优化后的单集合设计"""

    def __init__(self, db):
        """初始化任务管理器"""
        self.db = db
        self.tasks_collection = db.tasks

    async def create_task(self, task_data: Dict[str, Any]) -> bool:
        """创建新任务"""
        try:
            # 添加时间戳（使用本地时间）
            now = datetime.now()
            task_data["created_at"] = now
            task_data["updated_at"] = now

            # 设置默认状态
            if "status" not in task_data:
                task_data["status"] = "active"

            # 生成任务ID
            task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{ObjectId()}"
            task_data["_id"] = task_id
            task_data["id"] = task_id
            
            # 初始化执行历史和统计字段
            task_data["execution_history"] = []
            task_data["execution_stats"] = {
                "total_triggers": 0,
                "last_executed_at": None
            }

            await self.tasks_collection.insert_one(task_data)

            logger.info(f"创建任务成功: {task_id}")
            return True

        except Exception as e:
            if "duplicate key" in str(e).lower():
                logger.warning(f"任务已存在: {task_data.get('id', 'unknown')}")
                return False
            logger.error(f"创建任务失败: {str(e)}")
            return False

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取单个任务"""
        try:
            task = await self.tasks_collection.find_one({"_id": task_id})
            if task:
                return self._convert_objectid_to_str(task)
            return None
        except Exception as e:
            logger.error(f"获取任务失败: {str(e)}")
            return None

    async def get_all_tasks(self, user_id: str = None) -> List[Dict[str, Any]]:
        """获取所有任务"""
        try:
            filter_query = {}
            if user_id:
                filter_query["user_id"] = user_id

            tasks = []
            async for task in self.tasks_collection.find(filter_query):
                tasks.append(self._convert_objectid_to_str(task))

            return tasks
        except Exception as e:
            logger.error(f"获取任务列表失败: {str(e)}")
            return []

    async def update_task_status(self, task_id: str, status: str) -> bool:
        """更新任务状态"""
        try:
            result = await self.tasks_collection.update_one(
                {"_id": task_id},
                {
                    "$set": {
                        "status": status,
                        "updated_at": datetime.now()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"更新任务状态失败: {str(e)}")
            return False

    async def delete_task(self, task_id: str) -> bool:
        """删除任务"""
        try:
            result = await self.tasks_collection.delete_one({"_id": task_id})
            if result.deleted_count == 0:
                logger.warning(f"任务 {task_id} 不存在")
                return False
        
            logger.info(f"任务 {task_id} 已删除")
            return True
        except Exception as e:
            logger.error(f"删除任务失败: {str(e)}")
            return False

    async def add_execution_record(self, task_id: str, task_name: str, executed_at: datetime,
                                 conversation_ids: List[str]) -> bool:
        """添加执行记录"""
        try:
            # 构建执行实例列表
            executions = []
            for conversation_id in conversation_ids:
                executions.append({
                    "conversation_id": conversation_id
                })

            # 构建执行历史记录
            execution_record = {
                "executed_at": executed_at,
                "executions": executions
            }

            # 使用原子操作同时更新历史和统计
            result = await self.tasks_collection.update_one(
                {"_id": task_id},
                {
                    "$push": {"execution_history": execution_record},
                    "$inc": {"execution_stats.total_triggers": 1},
                    "$set": {
                        "execution_stats.last_executed_at": execution_record,
                        "updated_at": datetime.now()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"为任务 {task_id} 添加执行记录成功，conversation_ids: {conversation_ids}")
                return True
            else:
                logger.error(f"为任务 {task_id} 添加执行记录失败")
                return False

        except Exception as e:
            logger.error(f"添加执行记录失败: {str(e)}")
            return False

    async def get_task_execution_history(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务执行历史"""
        try:
            task = await self.tasks_collection.find_one(
                {"_id": task_id},
                {
                    "_id": 1,
                    "task_id": 1,
                    "task_name": 1,
                    "execution_history": 1,
                    "execution_stats": 1
                }
            )
            
            if task:
                # 构造兼容原格式的返回结构
                return {
                    "_id": task["_id"],
                    "task_id": task["_id"],
                    "task_name": task.get("task_name", ""),
                    "execution_history": task.get("execution_history", []),
                    "execution_stats": task.get("execution_stats", {})
                }
            return None
        except Exception as e:
            logger.error(f"获取任务执行历史失败: {str(e)}")
            return None

    async def get_active_tasks(self) -> List[Dict[str, Any]]:
        """获取所有活跃的任务"""
        try:
            tasks = []
            async for task in self.tasks_collection.find({"status": "active"}):
                tasks.append(self._convert_objectid_to_str(task))
            return tasks
        except Exception as e:
            logger.error(f"获取活跃任务列表失败: {str(e)}")
            return []

    async def cleanup_single_tasks(self) -> int:
        """清理已执行的单次任务"""
        try:
            result = await self.tasks_collection.delete_many({
                "schedule_type": "single",
                "status": "active"
            })
            count = result.deleted_count
            if count > 0:
                logger.info(f"清理了 {count} 个已执行的单次任务")
            return count
        except Exception as e:
            logger.error(f"清理单次任务失败: {str(e)}")
            return 0

    async def get_all_task_executions(self) -> List[Dict[str, Any]]:
        """获取所有任务执行历史"""
        try:
            executions = []
            async for task in self.tasks_collection.find(
                {"execution_history": {"$exists": True, "$ne": []}},
                {
                    "_id": 1,
                    "task_name": 1,
                    "execution_history": 1,
                    "execution_stats": 1
                }
            ):
                # 构造兼容原格式的返回结构
                execution_record = {
                    "_id": task["_id"],
                    "task_id": task["_id"],
                    "task_name": task.get("task_name", ""),
                    "execution_history": task.get("execution_history", []),
                    "execution_stats": task.get("execution_stats", {})
                }
                executions.append(self._convert_objectid_to_str(execution_record))
            
            return executions
        except Exception as e:
            logger.error(f"获取所有任务执行历史失败: {str(e)}")
            return []

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc