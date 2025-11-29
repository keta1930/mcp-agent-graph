import logging
from fastapi import APIRouter, HTTPException, status, BackgroundTasks, Depends
from typing import Dict, Any

from app.services.mcp.mcp_service import mcp_service
from app.services.graph.graph_service import graph_service
from app.auth.dependencies import require_admin
from app.models.auth_schema import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(tags=["system"])

@router.post("/system/shutdown", response_model=Dict[str, Any])
async def shutdown_service(
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(require_admin)
):
    """优雅关闭MAG服务（需要管理员权限）"""
    logger.info(f"收到关闭服务请求，操作者: {current_user.user_id}")

    try:
        active_conversations = list(graph_service.active_conversations.keys())
        logger.info(f"当前有 {len(active_conversations)} 个活跃会话")

        # 保存所有活跃会话到文件中
        for conv_id in active_conversations:
            try:
                graph_service.conversation_manager.update_conversation_file(conv_id)
                logger.info(f"已保存会话: {conv_id}")
            except Exception as e:
                logger.error(f"保存会话 {conv_id} 时出错: {str(e)}")

        background_tasks.add_task(_perform_shutdown)

        return {
            "status": "success",
            "message": "服务关闭过程已启动",
            "active_sessions": len(active_conversations)
        }
    except Exception as e:
        logger.error(f"启动关闭过程时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"关闭服务失败: {str(e)}"
        )

async def _perform_shutdown():
    """执行实际的关闭操作"""
    logger.info("开始执行关闭流程")

    try:
        client_notified = await mcp_service.notify_client_shutdown()
        if not client_notified:
            await mcp_service.cleanup(force=True)
        else:
            await mcp_service.cleanup(force=False)

        logger.info("MCP服务已清理")
        logger.info("即将关闭Host服务...")
        import signal
        import os
        os.kill(os.getpid(), signal.SIGTERM)
    except Exception as e:
        logger.error(f"执行关闭流程时出错: {str(e)}")
