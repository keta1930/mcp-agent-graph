"""
会话文件管理API路由
提供文件的CRUD操作、版本查看、下载等功能
"""
import logging
import os
import tempfile
import zipfile
import shutil
from fastapi import APIRouter, HTTPException, Depends, Path, Query, BackgroundTasks
from fastapi.responses import Response, FileResponse
from urllib.parse import unquote

from app.models.auth_schema import CurrentUser
from app.auth.dependencies import get_current_user
from app.models.conversation_file_schema import (
    FileListResponse,
    FileDetailResponse,
    FileVersionResponse,
    CreateFileRequest,
    SaveFileRequest,
    FileOperationResponse,
    DeleteFileResponse,
    DownloadAllRequest
)
from app.services.conversation.conversation_document_service import conversation_document_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/conversations/{conversation_id}/files",
    tags=["conversation_files"]
)


@router.get("", response_model=FileListResponse)
async def list_files(
    conversation_id: str = Path(..., description="会话ID"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取会话所有文件列表

    返回文件名列表（含路径），前端可自行构建树形结构
    """
    try:
        result = await conversation_document_service.get_all_files(
            conversation_id=conversation_id,
            user_id=current_user.user_id
        )

        if not result["success"]:
            raise HTTPException(status_code=404, detail=result.get("error", "获取文件列表失败"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文件列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取文件列表失败: {str(e)}")


@router.post("", response_model=FileOperationResponse)
async def create_file(
    conversation_id: str = Path(..., description="会话ID"),
    request: CreateFileRequest = ...,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    创建新文件

    用户手动创建新文件
    """
    try:
        result = await conversation_document_service.create_file(
            conversation_id=conversation_id,
            filename=request.filename,
            summary=request.summary,
            content=request.content,
            log=request.log,
            user_id=current_user.user_id
        )

        if not result["success"]:
            status_code = 409 if "已存在" in result.get("message", "") else 400
            raise HTTPException(status_code=status_code, detail=result.get("message", "创建文件失败"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建文件失败: {str(e)}")


@router.get("/download-all")
async def download_all_files(
    conversation_id: str = Path(..., description="会话ID"),
    background_tasks: BackgroundTasks = ...,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    打包下载所有文件

    将会话内所有文件打包为zip下载，保持目录结构
    """
    try:
        # 获取所有文件列表
        files_result = await conversation_document_service.get_all_files(
            conversation_id=conversation_id,
            user_id=current_user.user_id
        )

        if not files_result["success"]:
            raise HTTPException(status_code=404, detail=files_result.get("error", "获取文件列表失败"))

        files = files_result["files"]
        
        if not files:
            raise HTTPException(status_code=404, detail="该会话没有文件")

        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, f"conversation_{conversation_id}_files.zip")

        # 创建zip文件
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for filename in files:
                # 获取文件内容
                file_result = await conversation_document_service.get_file(
                    conversation_id=conversation_id,
                    filename=filename,
                    user_id=current_user.user_id
                )
                
                if file_result["success"]:
                    content = file_result["file"]["content"]
                    # 将文件添加到zip，保持目录结构
                    zipf.writestr(filename, content.encode('utf-8'))

        # 在响应完成后清理临时目录
        background_tasks.add_task(shutil.rmtree, temp_dir, ignore_errors=True)

        return FileResponse(
            path=zip_path,
            filename=f"conversation_{conversation_id}_files.zip",
            media_type="application/zip",
            background=background_tasks
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量下载失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"批量下载失败: {str(e)}")

@router.get("/{filename:path}/download")
async def download_file(
    conversation_id: str = Path(..., description="会话ID"),
    filename: str = Path(..., description="文件名（含路径）"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    下载单个文件
    """
    try:
        # URL解码文件名
        filename = unquote(filename)

        # 获取文件内容
        result = await conversation_document_service.get_file(
            conversation_id=conversation_id,
            filename=filename,
            user_id=current_user.user_id
        )

        if not result["success"]:
            raise HTTPException(status_code=404, detail=result.get("error", "文件不存在"))

        content = result["file"]["content"]
        file_content = content.encode('utf-8')

        # 返回文件下载响应
        return Response(
            content=file_content,
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"下载文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"下载文件失败: {str(e)}")


@router.get("/{filename:path}/versions/{version_id}", response_model=FileVersionResponse)
async def get_file_version(
    conversation_id: str = Path(..., description="会话ID"),
    filename: str = Path(..., description="文件名（含路径）"),
    version_id: str = Path(..., description="版本ID"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取文件特定版本

    用于查看历史版本的内容
    """
    try:
        # URL解码文件名
        filename = unquote(filename)

        result = await conversation_document_service.get_file_version(
            conversation_id=conversation_id,
            filename=filename,
            version_id=version_id,
            user_id=current_user.user_id
        )

        if not result["success"]:
            raise HTTPException(status_code=404, detail=result.get("error", "获取文件版本失败"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文件版本失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取文件版本失败: {str(e)}")


@router.get("/{filename:path}", response_model=FileDetailResponse)
async def get_file(
    conversation_id: str = Path(..., description="会话ID"),
    filename: str = Path(..., description="文件名（含路径）"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取文件详情

    返回文件内容、摘要、版本列表等信息
    """
    try:
        # URL解码文件名
        filename = unquote(filename)

        result = await conversation_document_service.get_file(
            conversation_id=conversation_id,
            filename=filename,
            user_id=current_user.user_id
        )

        if not result["success"]:
            raise HTTPException(status_code=404, detail=result.get("error", "文件不存在"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文件详情失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取文件详情失败: {str(e)}")


@router.put("/{filename:path}", response_model=FileOperationResponse)
async def save_file(
    conversation_id: str = Path(..., description="会话ID"),
    filename: str = Path(..., description="文件名（含路径）"),
    request: SaveFileRequest = ...,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    保存文件

    用户在前端编辑器中修改后保存
    """
    try:
        # URL解码文件名
        filename = unquote(filename)

        result = await conversation_document_service.save_file(
            conversation_id=conversation_id,
            filename=filename,
            content=request.content,
            summary=request.summary,
            log=request.log,
            user_id=current_user.user_id
        )

        if not result["success"]:
            status_code = 404 if "不存在" in result.get("message", "") else 400
            raise HTTPException(status_code=status_code, detail=result.get("message", "保存文件失败"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"保存文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"保存文件失败: {str(e)}")


@router.delete("/{filename:path}", response_model=DeleteFileResponse)
async def delete_file(
    conversation_id: str = Path(..., description="会话ID"),
    filename: str = Path(..., description="文件名（含路径）"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    删除文件

    删除文件及其所有历史版本
    """
    try:
        # URL解码文件名
        filename = unquote(filename)

        result = await conversation_document_service.delete_file(
            conversation_id=conversation_id,
            filename=filename,
            user_id=current_user.user_id
        )

        if not result["success"]:
            raise HTTPException(status_code=404, detail=result.get("message", "删除文件失败"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除文件失败: {str(e)}")
