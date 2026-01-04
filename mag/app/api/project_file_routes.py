"""
项目文件管理API路由
提供Project文件的CRUD操作、版本查看等功能
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Path
from app.models.auth_schema import CurrentUser
from app.auth.dependencies import get_current_user
from app.models.conversation_file_schema import (
    FileListResponse,
    FileDetailResponse,
    FileVersionResponse,
    CreateFileRequest,
    SaveFileRequest,
    FileOperationResponse,
    DeleteFileResponse
)
from app.models.project_schema import PushFileToProjectRequest
from app.services.project import project_document_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/projects/{project_id}/files",
    tags=["project_files"]
)


@router.get("", response_model=FileListResponse)
async def list_project_files(
    project_id: str = Path(..., description="项目ID"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取项目所有文件列表

    返回文件名列表（含路径）
    """
    try:
        result = await project_document_service.get_all_files(
            project_id=project_id,
            user_id=current_user.user_id
        )

        if not result["success"]:
            raise HTTPException(status_code=404, detail=result.get("error", "获取文件列表失败"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取项目文件列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取文件列表失败: {str(e)}")


@router.post("", response_model=FileOperationResponse)
async def create_project_file(
    project_id: str = Path(..., description="项目ID"),
    request: CreateFileRequest = ...,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    创建新文件

    用户手动创建新文件
    """
    try:
        result = await project_document_service.create_file(
            project_id=project_id,
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
        logger.error(f"创建项目文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"创建文件失败: {str(e)}")


@router.get("/{filename:path}", response_model=FileDetailResponse)
async def get_project_file(
    project_id: str = Path(..., description="项目ID"),
    filename: str = Path(..., description="文件名（含路径）"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取文件详情（最新版本）

    包括文件内容、摘要、版本列表
    """
    try:
        result = await project_document_service.get_file(
            project_id=project_id,
            filename=filename,
            user_id=current_user.user_id
        )

        if not result["success"]:
            raise HTTPException(status_code=404, detail=result.get("error", "文件不存在"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取项目文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取文件失败: {str(e)}")


@router.put("/{filename:path}", response_model=FileOperationResponse)
async def save_project_file(
    project_id: str = Path(..., description="项目ID"),
    filename: str = Path(..., description="文件名（含路径）"),
    request: SaveFileRequest = ...,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    保存文件

    用户编辑后保存文件（创建新版本）
    """
    try:
        result = await project_document_service.save_file(
            project_id=project_id,
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
        logger.error(f"保存项目文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"保存文件失败: {str(e)}")


@router.delete("/{filename:path}", response_model=DeleteFileResponse)
async def delete_project_file(
    project_id: str = Path(..., description="项目ID"),
    filename: str = Path(..., description="文件名（含路径）"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    删除文件

    删除文件及其所有历史版本
    """
    try:
        result = await project_document_service.delete_file(
            project_id=project_id,
            filename=filename,
            user_id=current_user.user_id
        )

        if not result["success"]:
            raise HTTPException(status_code=404, detail=result.get("message", "删除文件失败"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除项目文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"删除文件失败: {str(e)}")


@router.get("/{filename:path}/versions/{version_id}", response_model=FileVersionResponse)
async def get_project_file_version(
    project_id: str = Path(..., description="项目ID"),
    filename: str = Path(..., description="文件名（含路径）"),
    version_id: str = Path(..., description="版本ID"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取文件特定版本

    查看文件的历史版本
    """
    try:
        result = await project_document_service.get_file_version(
            project_id=project_id,
            filename=filename,
            version_id=version_id,
            user_id=current_user.user_id
        )

        if not result["success"]:
            raise HTTPException(status_code=404, detail=result.get("error", "版本不存在"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取项目文件版本失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取版本失败: {str(e)}")


@router.post("/push-from-conversation", response_model=FileOperationResponse)
async def push_file_from_conversation(
    project_id: str = Path(..., description="项目ID"),
    request: PushFileToProjectRequest = ...,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    从Conversation推送文件到Project

    将conversation中的文件复制到project
    """
    try:
        result = await project_document_service.push_file_from_conversation(
            conversation_id=request.conversation_id,
            project_id=project_id,
            filename=request.filename,
            user_id=current_user.user_id
        )

        if not result["success"]:
            status_code = 404 if "不存在" in result.get("message", "") else 400
            if "已存在" in result.get("message", ""):
                status_code = 409
            raise HTTPException(status_code=status_code, detail=result.get("message", "推送文件失败"))

        return {
            "success": True,
            "message": result["message"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"推送文件失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"推送文件失败: {str(e)}")
