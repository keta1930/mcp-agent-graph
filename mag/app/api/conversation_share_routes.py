"""
对话分享API路由

提供对话分享功能的REST API端点
"""
import logging
import os
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import Response, FileResponse

from app.auth.dependencies import get_current_user
from app.models.auth_schema import CurrentUser
from app.models.conversation_share_schema import (
    CreateShareResponse,
    SharedConversationResponse,
    SharedFilesResponse,
    ShareStatusResponse,
    DeleteShareResponse
)
from app.services.conversation.conversation_share_service import conversation_share_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["conversation-sharing"])



@router.post("/conversations/{conversation_id}/share", response_model=CreateShareResponse)
async def create_conversation_share(
    conversation_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    创建对话分享链接
    
    需要认证，仅对话所有者可以创建分享链接。
    如果对话已有分享链接，则返回现有链接（幂等性）。
    
    Args:
        conversation_id: 对话ID
        current_user: 当前登录用户
        
    Returns:
        CreateShareResponse: 包含分享链接信息
        
    Raises:
        HTTPException: 404 - 对话不存在
        HTTPException: 403 - 无权限分享此对话
        HTTPException: 500 - 创建失败
    """
    try:
        result = await conversation_share_service.create_share(
            conversation_id=conversation_id,
            user_id=current_user.user_id
        )
        
        return CreateShareResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建分享链接API错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"创建分享链接失败: {str(e)}"
        )



@router.get("/share/{share_id}", response_model=SharedConversationResponse)
async def get_shared_conversation(share_id: str):
    """
    获取分享的对话内容
    
    无需认证，支持匿名访问。
    返回对话的完整内容，包括标题、轮次消息和类型，但排除敏感信息。
    
    Args:
        share_id: 分享ID
        
    Returns:
        SharedConversationResponse: 对话内容
        
    Raises:
        HTTPException: 404 - 分享链接不存在或对话已删除
        HTTPException: 500 - 获取失败
    """
    try:
        conversation = await conversation_share_service.get_shared_conversation(share_id)
        
        return SharedConversationResponse(**conversation)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取分享对话API错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取分享对话失败: {str(e)}"
        )



@router.get("/share/{share_id}/files", response_model=SharedFilesResponse)
async def get_shared_files(share_id: str):
    """
    获取分享对话的文件列表
    
    无需认证，支持匿名访问。
    返回对话中所有文件的列表。
    
    Args:
        share_id: 分享ID
        
    Returns:
        SharedFilesResponse: 文件列表信息
        
    Raises:
        HTTPException: 404 - 分享链接不存在
        HTTPException: 500 - 获取失败
    """
    try:
        files_info = await conversation_share_service.get_shared_files(share_id)
        
        return SharedFilesResponse(**files_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取分享文件列表API错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"获取分享文件列表失败: {str(e)}"
        )



@router.get("/share/{share_id}/batch")
async def download_all_shared_files(share_id: str, background_tasks: BackgroundTasks):
    """
    批量下载分享对话的所有文件
    
    无需认证，支持匿名访问。
    将所有文件打包为ZIP格式返回，并在响应完成后清理临时文件。
    
    Args:
        share_id: 分享ID
        background_tasks: FastAPI后台任务，用于清理临时文件
        
    Returns:
        FileResponse: ZIP文件
        
    Raises:
        HTTPException: 404 - 分享链接不存在或没有可下载的文件
        HTTPException: 500 - 创建ZIP失败
    """
    try:
        zip_path = await conversation_share_service.download_shared_files_zip(share_id)
        
        # 提取ZIP文件名
        zip_filename = os.path.basename(zip_path)
        
        # 添加后台任务清理临时文件
        def cleanup_temp_file():
            try:
                if os.path.exists(zip_path):
                    os.remove(zip_path)
                    logger.info(f"已清理临时ZIP文件: {zip_path}")
            except Exception as e:
                logger.error(f"清理临时ZIP文件失败: {str(e)}")
        
        background_tasks.add_task(cleanup_temp_file)
        
        # 返回ZIP文件
        return FileResponse(
            path=zip_path,
            media_type="application/zip",
            filename=zip_filename,
            headers={
                "Content-Disposition": f'attachment; filename="{zip_filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量下载分享文件API错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"批量下载分享文件失败: {str(e)}"
        )



@router.get("/share/{share_id}/file/{filename:path}")
async def download_shared_file(share_id: str, filename: str):
    """
    下载分享对话的单个文件

    无需认证，支持匿名访问。
    返回文件内容，并设置Content-Disposition响应头以触发下载。

    Args:
        share_id: 分享ID
        filename: 文件名（支持路径）

    Returns:
        Response: 文件内容

    Raises:
        HTTPException: 404 - 分享链接不存在或文件不存在
        HTTPException: 500 - 下载失败
    """
    try:
        file_content = await conversation_share_service.download_shared_file(
            share_id=share_id,
            filename=filename
        )

        # 提取文件名（去除路径）
        file_basename = os.path.basename(filename)

        # 返回文件内容，设置Content-Disposition响应头
        return Response(
            content=file_content,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{file_basename}"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"下载分享文件API错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"下载分享文件失败: {str(e)}"
        )



@router.delete("/share/{share_id}", response_model=DeleteShareResponse)
async def delete_conversation_share(
    share_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    删除分享链接
    
    需要认证，仅对话所有者可以删除分享链接。
    
    Args:
        share_id: 分享ID
        current_user: 当前登录用户
        
    Returns:
        DeleteShareResponse: 删除结果
        
    Raises:
        HTTPException: 404 - 分享链接不存在或对话不存在
        HTTPException: 403 - 无权限删除此分享链接
        HTTPException: 500 - 删除失败
    """
    try:
        result = await conversation_share_service.delete_share(
            share_id=share_id,
            user_id=current_user.user_id
        )
        
        return DeleteShareResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除分享链接API错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"删除分享链接失败: {str(e)}"
        )



@router.get("/conversations/{conversation_id}/share/status", response_model=ShareStatusResponse)
async def get_conversation_share_status(
    conversation_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    查询对话的分享状态
    
    需要认证，仅对话所有者可以查询分享状态。
    
    Args:
        conversation_id: 对话ID
        current_user: 当前登录用户
        
    Returns:
        ShareStatusResponse: 分享状态信息
        
    Raises:
        HTTPException: 404 - 对话不存在
        HTTPException: 403 - 无权限查询此对话的分享状态
        HTTPException: 500 - 查询失败
    """
    try:
        status_info = await conversation_share_service.get_share_status(
            conversation_id=conversation_id,
            user_id=current_user.user_id
        )
        
        return ShareStatusResponse(**status_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"查询分享状态API错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"查询分享状态失败: {str(e)}"
        )
