import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
from app.models.task_schema import TaskStatus
from app.services.task_service import task_service

logger = logging.getLogger(__name__)


class TaskScheduler:
    """任务调度器 - 基于APScheduler"""

    def __init__(self):
        """初始化任务调度器"""
        self.scheduler: Optional[AsyncIOScheduler] = None
        self._initialized = False

    def initialize(self):
        """初始化调度器"""
        if self._initialized:
            return

        try:
            # 配置调度器
            jobstores = {
                'default': MemoryJobStore()
            }
            executors = {
                'default': AsyncIOExecutor()
            }
            job_defaults = {
                'coalesce': False,
                'max_instances': 3
            }

            self.scheduler = AsyncIOScheduler(
                jobstores=jobstores,
                executors=executors,
                job_defaults=job_defaults
            )

            self.scheduler.start()
            self._initialized = True
            logger.info("任务调度器初始化成功")

        except Exception as e:
            logger.error(f"任务调度器初始化失败: {str(e)}")
            self._initialized = False

    async def shutdown(self):
        """关闭调度器"""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown(wait=True)
            logger.info("任务调度器已关闭")

    async def schedule_task(self, task: Dict[str, Any]) -> bool:
        """调度任务"""
        try:
            if not self._initialized:
                self.initialize()

            if not self.scheduler:
                raise Exception("调度器未初始化")

            task_id = task.get("id")
            schedule_type = task.get("schedule_type")
            schedule_config = task.get("schedule_config", {})

            # 删除已存在的同名任务
            await self.remove_task(task_id)

            if schedule_type == "single":
                # 单次执行任务
                execute_at = schedule_config.get("execute_at")
                if not execute_at:
                    raise Exception("单次执行任务必须指定执行时间")
                # 过时的单次任务不加入调度器
                if execute_at <= datetime.now():
                    logger.warning(f"单次任务 {task_id} 的执行时间已过期（{execute_at}），跳过调度")
                    return False

                # 调度单次执行
                trigger = DateTrigger(run_date=execute_at)
                self.scheduler.add_job(
                    func=self._execute_and_cleanup_single_task,
                    trigger=trigger,
                    args=[task],
                    id=task_id,
                    name=f"Single Task: {task.get('task_name', task_id)}"
                )

            elif schedule_type == "recurring":
                # 周期性执行任务
                cron_expression = schedule_config.get("cron_expression")
                if not cron_expression:
                    raise Exception("周期性任务缺少cron表达式")

                # 解析cron表达式
                cron_parts = cron_expression.split()
                if len(cron_parts) != 5:
                    raise Exception(f"无效的cron表达式: {cron_expression}")

                trigger = CronTrigger(
                    minute=cron_parts[0],
                    hour=cron_parts[1],
                    day=cron_parts[2],
                    month=cron_parts[3],
                    day_of_week=cron_parts[4]
                )

                self.scheduler.add_job(
                    func=self._execute_task_wrapper,
                    trigger=trigger,
                    args=[task],
                    id=task_id,
                    name=f"Recurring Task: {task.get('task_name', task_id)}"
                )

            else:
                raise Exception(f"不支持的调度类型: {schedule_type}")

            logger.info(f"任务 {task_id} 调度成功，类型: {schedule_type}")
            return True

        except Exception as e:
            logger.error(f"调度任务失败: {str(e)}")
            return False

    async def remove_task(self, task_id: str) -> bool:
        """移除调度中的任务"""
        try:
            if not self.scheduler:
                return True

            try:
                self.scheduler.remove_job(task_id)
                logger.info(f"已移除调度任务: {task_id}")
            except Exception:
                # 任务可能不存在，忽略错误
                pass

            return True

        except Exception as e:
            logger.error(f"移除调度任务失败: {str(e)}")
            return False

    async def pause_task(self, task_id: str) -> bool:
        """暂停调度中的任务"""
        try:
            if not self.scheduler:
                return False

            self.scheduler.pause_job(task_id)
            logger.info(f"已暂停调度任务: {task_id}")
            return True

        except Exception as e:
            logger.error(f"暂停调度任务失败: {str(e)}")
            return False

    async def resume_task(self, task_id: str) -> bool:
        """恢复调度中的任务"""
        try:
            if not self.scheduler:
                return False

            self.scheduler.resume_job(task_id)
            logger.info(f"已恢复调度任务: {task_id}")
            return True

        except Exception as e:
            logger.error(f"恢复调度任务失败: {str(e)}")
            return False

    async def _execute_task_wrapper(self, task: Dict[str, Any]):
        """任务执行包装器"""
        try:
            task_id = task.get("id")
            logger.info(f"开始执行调度任务: {task_id}")

            # 执行任务
            conversation_ids = await task_service.execute_task(task)

            if conversation_ids:
                logger.info(f"任务 {task_id} 执行成功，启动了 {len(conversation_ids)} 个图实例")
            else:
                logger.warning(f"任务 {task_id} 执行失败或未启动任何图实例")

        except Exception as e:
            logger.error(f"执行调度任务失败: {str(e)}")

    async def _execute_and_cleanup_single_task(self, task: Dict[str, Any]):
        """执行单次任务并设置为已完成状态"""
        try:
            # 执行任务
            await self._execute_task_wrapper(task)

            # 将单次任务状态设置为已完成
            task_id = task.get("id")
            await self._complete_single_task(task_id)

        except Exception as e:
            logger.error(f"执行单次任务失败: {str(e)}")

    async def _complete_single_task(self, task_id: str):
        """将单次任务设置为已完成状态"""
        try:
            # 将任务状态设置为已完成
            await task_service.update_task_status(task_id, TaskStatus.COMPLETED)
            logger.info(f"单次任务 {task_id} 已设置为完成状态")

        except Exception as e:
            logger.error(f"设置单次任务完成状态失败: {str(e)}")

    def get_scheduled_jobs(self) -> list:
        """获取所有调度中的任务"""
        try:
            if not self.scheduler:
                return []

            jobs = []
            for job in self.scheduler.get_jobs():
                jobs.append({
                    "id": job.id,
                    "name": job.name,
                    "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
                    "trigger": str(job.trigger)
                })
            return jobs

        except Exception as e:
            logger.error(f"获取调度任务列表失败: {str(e)}")
            return []

    async def load_active_tasks(self):
        """从数据库加载活跃任务到调度器"""
        try:
            if not self._initialized:
                self.initialize()

            logger.info("开始加载活跃任务到调度器...")

            # 获取所有活跃任务
            active_tasks = await task_service.get_active_tasks()

            loaded_count = 0
            for task in active_tasks:
                # 过期的单次任务在加载时标记为 error，并跳过调度
                try:
                    schedule_type = task.get("schedule_type")
                    schedule_config = task.get("schedule_config", {})
                    execute_at = schedule_config.get("execute_at") if schedule_config else None
                    if schedule_type == "single" and execute_at and execute_at <= datetime.now():
                        from app.models.task_schema import TaskStatus
                        await task_service.update_task_status(task.get("id"), TaskStatus.ERROR)
                        logger.warning(f"发现过期的单次任务 {task.get('id')}（执行时间 {execute_at}），状态已标记为 error，跳过调度")
                        continue
                except Exception as mark_err:
                    logger.error(f"标记过期单次任务为 error 时出错: {mark_err}")
                    # 即便标记失败，也不要调度这个任务
                    continue

                success = await self.schedule_task(task)
                if success:
                    loaded_count += 1

            logger.info(f"成功加载 {loaded_count}/{len(active_tasks)} 个活跃任务到调度器")

        except Exception as e:
            logger.error(f"加载活跃任务失败: {str(e)}")


# 创建全局任务调度器实例
task_scheduler = TaskScheduler()