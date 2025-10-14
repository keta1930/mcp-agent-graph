import os
import shutil
import logging
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Dict, Any
from app.services.export_service import export_service
from app.models.export_schema import (
    ExportRequest, ExportResponse, PreviewResponse,
    DeleteResponse, ListResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/export", tags=["export"])


@router.post("/conversations", response_model=ExportResponse)
async def export_conversations(request: ExportRequest):
    """导出对话数据"""
    try:
        result = await export_service.export_conversations(
            dataset_name=request.dataset_name,
            file_name=request.file_name,
            conversation_ids=request.conversation_ids,
            file_format=request.file_format,
            data_format=request.data_format
        )

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )

        return ExportResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导出对话数据失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出失败: {str(e)}"
        )


@router.get("/download/{dataset_name}")
async def download_dataset(dataset_name: str, data_format: str, background_tasks: BackgroundTasks):
    """下载数据集"""
    try:
        zip_path = await export_service.download_dataset(dataset_name, data_format)

        if not zip_path or not os.path.exists(zip_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="数据集不存在"
            )

        # 在响应完成后清理临时目录
        temp_dir = os.path.dirname(zip_path)
        background_tasks.add_task(shutil.rmtree, temp_dir, ignore_errors=True)

        return FileResponse(
            path=zip_path,
            filename=f"{dataset_name}.zip",
            media_type="application/zip",
            background=background_tasks
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"下载数据集失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"下载失败: {str(e)}"
        )


@router.get("/preview/{dataset_name}", response_model=PreviewResponse)
async def preview_dataset(dataset_name: str, data_format: str = "standard"):
    """预览数据集"""
    try:
        result = await export_service.preview_dataset(dataset_name, data_format)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

        return PreviewResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"预览数据集失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"预览失败: {str(e)}"
        )


@router.delete("/{dataset_name}", response_model=DeleteResponse)
async def delete_dataset(dataset_name: str, data_format: str = "standard"):
    """删除数据集"""
    try:
        result = await export_service.delete_dataset(dataset_name, data_format)

        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

        return DeleteResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除数据集失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除失败: {str(e)}"
        )


@router.get("/list", response_model=ListResponse)
async def list_datasets():
    """列出所有数据集"""
    try:
        result = await export_service.list_datasets()
        return ListResponse(**result)

    except Exception as e:
        logger.error(f"列出数据集失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取列表失败: {str(e)}"
        )