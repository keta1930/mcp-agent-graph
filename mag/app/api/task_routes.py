import logging
from fastapi import APIRouter, HTTPException, status
from typing import Dict, List, Any, Optional
from datetime import datetime

from app.services.task_service import task_service
from app.services.task_scheduler import task_scheduler
from app.models.task_schema import TaskCreate, TaskStatusUpdate, TaskResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["tasks"])

# ======= 任务管理 =======

@router.post("/tasks", response_model=Dict[str, Any])
async def create_task(task: TaskCreate):
    """创建任务"""
    try:
        # 验证单次执行任务的时间
        if task.schedule_type.value == "single":
            execute_at = task.schedule_config.execute_at
            if not execute_at:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="单次执行任务必须指定执行时间"
                )

            # 检查执行时间是否在当前时间之后
            if execute_at <= datetime.now():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"单次执行任务的时间不能在当前时间之前。指定时间: {execute_at}, 当前时间: {datetime.now()}"
                )

        # 创建任务
        result = await task_service.create_task(task)

        if result.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "创建任务失败")
            )

        # 获取创建的任务
        task_id = result.get("task_id")
        if not task_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="创建任务成功但无法获取任务ID"
            )

        created_task = await task_service.get_task(task_id)
        if not created_task:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="创建任务成功但无法获取任务详情"
            )

        # 调度任务
        schedule_success = await task_scheduler.schedule_task(created_task)
        if not schedule_success:
            logger.warning(f"任务 {task_id} 创建成功但调度失败")

        return {
            "status": "success",
            "message": f"任务 '{task.task_name}' 创建成功",
            "data": {
                "task_id": task_id,
                "task": created_task,
                "scheduled": schedule_success
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建任务时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建任务时出错: {str(e)}"
        )

@router.get("/tasks/scheduler/jobs", response_model=List[Dict[str, Any]])
async def get_scheduled_jobs():
    """获取调度器中的任务"""
    try:
        jobs = task_scheduler.get_scheduled_jobs()
        return jobs
    except Exception as e:
        logger.error(f"获取调度任务列表时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取调度任务列表时出错: {str(e)}"
        )


@router.get("/tasks", response_model=List[Dict[str, Any]])
async def get_tasks(user_id: Optional[str] = None):
    """获取任务列表"""
    try:
        tasks = await task_service.get_all_tasks(user_id)
        return tasks
    except Exception as e:
        logger.error(f"获取任务列表时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取任务列表时出错: {str(e)}"
        )


@router.get("/tasks/{task_id}", response_model=Dict[str, Any])
async def get_task(task_id: str):
    """获取任务详情和执行历史"""
    try:
        # 获取任务基本信息（包含执行历史）
        task = await task_service.get_task(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到任务 '{task_id}'"
            )
        return task

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取任务详情时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取任务详情时出错: {str(e)}"
        )


@router.put("/tasks/{task_id}/status", response_model=Dict[str, Any])
async def update_task_status(task_id: str, status_update: TaskStatusUpdate):
    """更新任务状态"""
    try:
        # 检查任务是否存在
        task = await task_service.get_task(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到任务 '{task_id}'"
            )

        # 更新任务状态
        result = await task_service.update_task_status(task_id, status_update.status.value)
        if result.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "更新任务状态失败")
            )

        # 根据状态调整调度器
        if status_update.status.value == "active":
            # 重新调度任务
            updated_task = await task_service.get_task(task_id)
            if updated_task:
                await task_scheduler.schedule_task(updated_task)
        elif status_update.status.value == "paused":
            # 暂停调度
            await task_scheduler.pause_task(task_id)
        elif status_update.status.value == "completed":
            # 移除已完成任务的调度
            await task_scheduler.remove_task(task_id)

        return {
            "status": "success",
            "message": f"任务状态已更新为 {status_update.status.value}",
            "data": {
                "task_id": task_id,
                "new_status": status_update.status.value
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新任务状态时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新任务状态时出错: {str(e)}"
        )


@router.delete("/tasks/{task_id}", response_model=Dict[str, Any])
async def delete_task(task_id: str):
    """删除任务（优化后只需删除单个文档）"""
    try:
        # 检查任务是否存在
        task = await task_service.get_task(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到任务 '{task_id}'"
            )

        # 从调度器移除任务
        await task_scheduler.remove_task(task_id)

        # 删除任务
        result = await task_service.delete_task(task_id)
        if result.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "删除任务失败")
            )

        return {
            "status": "success",
            "message": f"任务 '{task_id}' 删除成功",
            "data": {
                "task_id": task_id
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除任务时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除任务时出错: {str(e)}"
        )


# ======= 调度器管理 =======
@router.post("/tasks/scheduler/reload", response_model=Dict[str, Any])
async def reload_scheduler():
    """重新加载调度器"""
    try:
        await task_scheduler.load_active_tasks()
        return {
            "status": "success",
            "message": "调度器重新加载成功"
        }
    except Exception as e:
        logger.error(f"重新加载调度器时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"重新加载调度器时出错: {str(e)}"
        )