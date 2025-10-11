"""
Prompt 相关的 API 路由
提供提示词的 CRUD 操作接口
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse

from ..models.prompt_schema import (
    PromptCreate, PromptUpdate, PromptImportByPathRequest, PromptImportByFileRequest,
    PromptExportRequest, PromptBatchDeleteRequest, PromptResponse, PromptErrorResponse
)
from ..services.prompt_service import prompt_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prompt", tags=["prompt-registry"])


@router.post("/create", response_model=PromptResponse, summary="创建提示词")
async def create_prompt(prompt_data: PromptCreate):
    """
    创建新的提示词

    - **name**: 提示词名称（必填，唯一）
    - **content**: 提示词内容（必填）
    - **category**: 提示词分类（必填）
    """
    try:
        result = await prompt_service.create_prompt(prompt_data)

        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content=result
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=result
            )
    except Exception as e:
        logger.error(f"创建提示词 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建提示词时发生服务器错误: {str(e)}"
        )


@router.get("/content/{name}", response_model=PromptResponse, summary="获取提示词内容")
async def get_prompt_content(name: str):
    """
    获取提示词的内容

    - **name**: 提示词名称
    """
    try:
        result = await prompt_service.get_prompt_content_only(name)

        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=result
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content=result
            )
    except Exception as e:
        logger.error(f"获取提示词内容 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取提示词内容时发生服务器错误: {str(e)}"
        )


@router.put("/update/{name}", response_model=PromptResponse, summary="更新提示词")
async def update_prompt(name: str, update_data: PromptUpdate):
    """
    更新指定提示词

    - **name**: 提示词名称
    - **content**: 新的提示词内容（可选）
    - **category**: 新的提示词分类（可选）
    """
    try:
        result = await prompt_service.update_prompt(name, update_data)

        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=result
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=result
            )
    except Exception as e:
        logger.error(f"更新提示词 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新提示词时发生服务器错误: {str(e)}"
        )


@router.delete("/delete/{name}", response_model=PromptResponse, summary="删除提示词")
async def delete_prompt(name: str):
    """
    删除指定提示词

    - **name**: 提示词名称
    """
    try:
        result = await prompt_service.delete_prompt(name)

        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=result
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content=result
            )
    except Exception as e:
        logger.error(f"删除提示词 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除提示词时发生服务器错误: {str(e)}"
        )


@router.get("/list", response_model=PromptResponse, summary="获取提示词列表")
async def list_prompts():
    """
    获取提示词列表
    """
    try:
        result = await prompt_service.list_prompts()
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
        )
    except Exception as e:
        logger.error(f"获取提示词列表 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取提示词列表时发生服务器错误: {str(e)}"
        )


@router.post("/batch-delete", response_model=PromptResponse, summary="批量删除提示词")
async def batch_delete_prompts(delete_request: PromptBatchDeleteRequest):
    """
    批量删除提示词

    - **names**: 要删除的提示词名称列表
    """
    try:
        result = await prompt_service.batch_delete_prompts(delete_request)

        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=result
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=result
            )
    except Exception as e:
        logger.error(f"批量删除提示词 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量删除提示词时发生服务器错误: {str(e)}"
        )


@router.post("/import/by-file", response_model=PromptResponse, summary="通过文件上传导入提示词")
async def import_prompt_by_file(
    file: UploadFile = File(..., description="要上传的 Markdown 文件"),
    name: Optional[str] = Form(None, description="提示词名称（必须）"),
    category: Optional[str] = Form(None, description="提示词分类（必须）")
):
    """
    通过文件上传导入提示词

    - **file**: 要上传的 Markdown 文件
    - **name**: 提示词名称（必须）
    - **category**: 提示词分类（必须）
    """
    try:
        import_request = PromptImportByFileRequest(name=name, category=category)
        result = await prompt_service.import_prompt_by_file(file, import_request)

        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content=result
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=result
            )
    except Exception as e:
        logger.error(f"通过文件上传导入提示词 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"通过文件上传导入提示词时发生服务器错误: {str(e)}"
        )


@router.post("/export", summary="批量导出提示词")
async def export_prompts(export_request: PromptExportRequest):
    """
    批量导出提示词为 ZIP 压缩包

    - **names**: 要导出的提示词名称列表
    """
    try:
        result = await prompt_service.export_prompts(export_request)

        if result["success"] and result["data"] and result["data"]["zip_path"]:
            zip_path = result["data"]["zip_path"]
            return FileResponse(
                path=zip_path,
                filename="prompts_export.zip",
                media_type="application/zip"
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=result
            )
    except Exception as e:
        logger.error(f"批量导出提示词 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量导出提示词时发生服务器错误: {str(e)}"
        )