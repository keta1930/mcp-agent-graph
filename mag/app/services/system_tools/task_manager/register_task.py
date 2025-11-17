"""
系统工具：register_task
从 JSON 文档中读取任务配置并注册到任务系统
"""
import logging
import json
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "register_task",
        "description": "将任务配置文档注册到任务系统中。任务配置必须是 JSON 格式，包含任务名称、图名称、输入文本、执行数量、调度类型和调度配置等信息。",
        "parameters": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "任务配置文档名称（含路径），必须是 JSON 文件，例如：'tasks/daily_report.json'"
                }
            },
            "required": ["filename"]
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    从 JSON 文档中读取任务配置并注册到任务系统

    Args:
        user_id: 用户ID
        **kwargs: 其他参数（conversation_id, filename）

    Returns:
        {
            "success": True,
            "task_id": "task_id",
            "task_name": "task_name",
            "message": "任务注册成功"
        }
    """
    try:
        from app.infrastructure.storage.object_storage.conversation_document_manager import conversation_document_manager
        from app.services.task.task_service import task_service
        from app.services.task.task_scheduler import task_scheduler
        from app.models.task_schema import TaskCreate
        import os

        conversation_id = kwargs.get("conversation_id")
        filename = kwargs.get("filename", "")

        # 1. 验证必需参数
        if not conversation_id:
            return {
                "success": False,
                "message": "缺少必需参数：conversation_id",
                "task_id": None,
                "task_name": None
            }

        if not filename:
            return {
                "success": False,
                "message": "缺少必需参数：filename",
                "task_id": None,
                "task_name": None
            }

        # 2. 验证文件扩展名
        if not filename.lower().endswith('.json'):
            return {
                "success": False,
                "message": f"任务配置文件必须是 JSON 格式：{filename}",
                "task_id": None,
                "task_name": None
            }

        logger.info(f"正在读取任务配置文档: {filename}")

        # 3. 读取 JSON 文档内容
        content = await conversation_document_manager.read_file(
            user_id=user_id,
            conversation_id=conversation_id,
            filename=filename
        )

        if content is None:
            return {
                "success": False,
                "message": f"读取文档失败或文档不存在：{filename}",
                "task_id": None,
                "task_name": None
            }

        # 4. 验证内容不为空
        if not content.strip():
            return {
                "success": False,
                "message": f"文档内容为空：{filename}",
                "task_id": None,
                "task_name": None
            }

        logger.info(f"成功读取文档内容，长度: {len(content)} 字符")

        # 5. 解析 JSON
        try:
            task_data = json.loads(content)
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "message": f"JSON 格式错误：{str(e)}",
                "task_id": None,
                "task_name": None
            }

        # 6. 验证必需字段
        required_fields = ["task_name", "graph_name", "input_text", "execution_count", "schedule_type", "schedule_config"]
        missing_fields = [field for field in required_fields if field not in task_data]
        
        if missing_fields:
            return {
                "success": False,
                "message": f"缺少必需字段：{', '.join(missing_fields)}",
                "task_id": None,
                "task_name": None
            }

        # 7. 验证调度配置
        schedule_type = task_data.get("schedule_type")
        schedule_config = task_data.get("schedule_config", {})

        if schedule_type == "single":
            if "execute_at" not in schedule_config:
                return {
                    "success": False,
                    "message": "单次任务必须指定 schedule_config.execute_at",
                    "task_id": None,
                    "task_name": None
                }
            
            # 验证时间格式并转换为 datetime
            try:
                execute_at_str = schedule_config["execute_at"]
                execute_at = datetime.fromisoformat(execute_at_str)
                
                # 检查时间是否已过期
                if execute_at <= datetime.now():
                    return {
                        "success": False,
                        "message": f"单次任务执行时间已过期：{execute_at_str}，请选择未来的时间",
                        "task_id": None,
                        "task_name": None
                    }
                
                # 将 datetime 对象存回配置
                schedule_config["execute_at"] = execute_at
                
            except (ValueError, TypeError) as e:
                return {
                    "success": False,
                    "message": f"execute_at 时间格式错误：{str(e)}，应使用 ISO 8601 格式（如：2025-01-31T14:30:00）",
                    "task_id": None,
                    "task_name": None
                }

        elif schedule_type == "recurring":
            if "cron_expression" not in schedule_config:
                return {
                    "success": False,
                    "message": "周期任务必须指定 schedule_config.cron_expression",
                    "task_id": None,
                    "task_name": None
                }
            
            # 验证 cron 表达式格式（5 段）
            cron_expr = schedule_config["cron_expression"]
            cron_parts = cron_expr.split()
            if len(cron_parts) != 5:
                return {
                    "success": False,
                    "message": f"Cron 表达式必须是 5 段格式（minute hour day month day_of_week），当前：{cron_expr}",
                    "task_id": None,
                    "task_name": None
                }
        else:
            return {
                "success": False,
                "message": f"不支持的调度类型：{schedule_type}，仅支持 'single' 或 'recurring'",
                "task_id": None,
                "task_name": None
            }

        # 8. 验证 execution_count
        execution_count = task_data.get("execution_count")
        if not isinstance(execution_count, int) or execution_count < 1:
            return {
                "success": False,
                "message": f"execution_count 必须是大于等于 1 的整数，当前：{execution_count}",
                "task_id": None,
                "task_name": None
            }

        # 9. 设置 user_id
        task_data["user_id"] = user_id

        task_name = task_data.get("task_name")
        logger.info(f"正在创建任务: {task_name}")

        # 10. 创建任务
        try:
            task_create = TaskCreate(**task_data)
            result = await task_service.create_task(
                task_create=task_create,
                user_id=task_data["user_id"]
            )

            if result.get("status") == "success":
                task_id = result.get("task_id")
                logger.info(f"任务创建成功: {task_name} (ID: {task_id})")
                
                # 11. 调度任务
                # 获取完整的任务信息用于调度
                task_doc = await task_service.get_task(task_id, task_data["user_id"])
                if task_doc:
                    schedule_success = await task_scheduler.schedule_task(task_doc)
                    if schedule_success:
                        logger.info(f"任务调度成功: {task_name}")
                        return {
                            "success": True,
                            "task_id": task_id,
                            "task_name": task_name,
                            "message": f"任务 '{task_name}' 创建并调度成功"
                        }
                    else:
                        logger.warning(f"任务创建成功但调度失败: {task_name}")
                        return {
                            "success": True,
                            "task_id": task_id,
                            "task_name": task_name,
                            "message": f"任务 '{task_name}' 创建成功，但调度失败，请检查调度配置"
                        }
                else:
                    return {
                        "success": False,
                        "message": f"任务创建成功但无法获取任务信息进行调度",
                        "task_id": task_id,
                        "task_name": task_name
                    }
            else:
                error_msg = result.get("message", "未知错误")
                return {
                    "success": False,
                    "message": f"创建任务失败: {error_msg}",
                    "task_id": None,
                    "task_name": task_name
                }

        except Exception as e:
            logger.error(f"创建任务失败: {str(e)}")
            return {
                "success": False,
                "message": f"创建任务失败: {str(e)}",
                "task_id": None,
                "task_name": task_name
            }

    except Exception as e:
        logger.error(f"register_task 执行失败: {str(e)}")
        return {
            "success": False,
            "message": f"注册任务失败：{str(e)}",
            "task_id": None,
            "task_name": None
        }
