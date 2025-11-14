"""
Memory API路由
提供记忆管理的RESTful API
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import StreamingResponse, JSONResponse
import io

from app.models.memory_schema import (
    AddMemoryRequest,
    UpdateMemoryRequest,
    ImportMemoryRequest,
    MemoryResponse,
    GetMemoriesResponse,
    BatchDeleteResponse
)
from app.services.memory.memory_service import memory_service
from app.auth.dependencies import get_current_user
from app.models.auth_schema import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/memory", tags=["memory"])


@router.get("", response_model=GetMemoriesResponse, summary="获取所有记忆")
async def get_memories(
    owner_type: Optional[str] = Query(None, description="筛选特定 owner 类型：user 或 agent"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取当前用户的所有记忆（完整文档结构）
    
    - **owner_type**: 可选，筛选特定 owner 类型（user 或 agent）
    """
    try:
        result = await memory_service.get_all_memories(
            user_id=current_user.user_id,
            owner_type=owner_type
        )

        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"status": "success", "data": result["data"]}
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"status": "error", "message": result["message"]}
            )

    except Exception as e:
        logger.error(f"获取记忆 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取记忆失败: {str(e)}"
        )


@router.post("/{owner_type}/{owner_id}/{category}", response_model=MemoryResponse, summary="添加记忆条目")
async def add_memory_item(
    owner_type: str,
    owner_id: str,
    category: str,
    request: AddMemoryRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    添加单条记忆条目
    
    - **owner_type**: owner 类型（user 或 agent）
    - **owner_id**: owner ID
    - **category**: 分类名称
    - **content**: 记忆内容
    """
    try:
        result = await memory_service.add_memory_item(
            user_id=current_user.user_id,
            owner_type=owner_type,
            owner_id=owner_id,
            category=category,
            request=request
        )

        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_201_CREATED,
                content={
                    "status": "success",
                    "message": result["message"]
                }
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "status": "error",
                    "message": result["message"],
                    "error_code": result.get("error_code")
                }
            )

    except Exception as e:
        logger.error(f"添加记忆 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加记忆失败: {str(e)}"
        )


@router.put("/{owner_type}/{owner_id}/{category}/items/{item_id}", response_model=MemoryResponse, summary="更新记忆条目")
async def update_memory_item(
    owner_type: str,
    owner_id: str,
    category: str,
    item_id: str,
    request: UpdateMemoryRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    更新单条记忆条目
    
    - **owner_type**: owner 类型（user 或 agent）
    - **owner_id**: owner ID
    - **category**: 分类名称
    - **item_id**: 条目ID（格式：YYYYMMDD_xxxx）
    - **content**: 新的记忆内容
    """
    try:
        result = await memory_service.update_memory_item(
            user_id=current_user.user_id,
            owner_type=owner_type,
            owner_id=owner_id,
            category=category,
            item_id=item_id,
            request=request
        )

        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "success",
                    "message": result["message"]
                }
            )
        else:
            status_code = status.HTTP_404_NOT_FOUND if result.get("error_code") == "ITEM_NOT_FOUND" else status.HTTP_400_BAD_REQUEST
            return JSONResponse(
                status_code=status_code,
                content={
                    "status": "error",
                    "message": result["message"],
                    "error_code": result.get("error_code")
                }
            )

    except Exception as e:
        logger.error(f"更新记忆 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新记忆失败: {str(e)}"
        )


@router.delete("/{owner_type}/{owner_id}/{category}/items", response_model=BatchDeleteResponse, summary="批量删除记忆条目")
async def batch_delete_items(
    owner_type: str,
    owner_id: str,
    category: str,
    item_ids: str = Query(..., description="要删除的条目 ID 列表，用逗号分隔"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    批量删除记忆条目
    
    - **owner_type**: owner 类型（user 或 agent）
    - **owner_id**: owner ID
    - **category**: 分类名称
    - **item_ids**: 要删除的条目ID列表（逗号分隔）
    """
    try:
        # 解析 item_ids
        item_id_list = [iid.strip() for iid in item_ids.split(",") if iid.strip()]

        result = await memory_service.batch_delete_items(
            user_id=current_user.user_id,
            owner_type=owner_type,
            owner_id=owner_id,
            category=category,
            item_ids=item_id_list
        )

        response_status = result.get("status", "success" if result["success"] else "error")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": response_status,
                "message": result["message"],
                "data": result.get("data", {})
            }
        )

    except Exception as e:
        logger.error(f"批量删除记忆 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量删除记忆失败: {str(e)}"
        )


@router.delete("/{owner_type}/{owner_id}/categories", response_model=BatchDeleteResponse, summary="批量删除记忆分类")
async def batch_delete_categories(
    owner_type: str,
    owner_id: str,
    categories: str = Query(..., description="要删除的分类列表，用逗号分隔"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    批量删除记忆分类及其所有条目
    
    - **owner_type**: owner 类型（user 或 agent）
    - **owner_id**: owner ID
    - **categories**: 要删除的分类列表（逗号分隔）
    """
    try:
        # 解析 categories
        category_list = [cat.strip() for cat in categories.split(",") if cat.strip()]

        result = await memory_service.batch_delete_categories(
            user_id=current_user.user_id,
            owner_type=owner_type,
            owner_id=owner_id,
            categories=category_list
        )

        response_status = result.get("status", "success" if result["success"] else "error")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": response_status,
                "message": result["message"],
                "data": result.get("data", {})
            }
        )

    except Exception as e:
        logger.error(f"批量删除分类 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量删除分类失败: {str(e)}"
        )


@router.get("/{owner_type}/{owner_id}/export", summary="导出记忆")
async def export_memories(
    owner_type: str,
    owner_id: str,
    format: str = Query(..., description="导出格式：json, txt, markdown, yaml"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    导出记忆为文件流
    
    - **owner_type**: owner 类型（user 或 agent）
    - **owner_id**: owner ID
    - **format**: 导出格式（json, txt, markdown, yaml）
    """
    try:
        success, message, content, filename = await memory_service.export_memories(
            user_id=current_user.user_id,
            owner_type=owner_type,
            owner_id=owner_id,
            format=format
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND if "未找到" in message else status.HTTP_400_BAD_REQUEST,
                detail=message
            )

        # 确定 media type
        media_type_map = {
            "json": "application/json",
            "yaml": "application/x-yaml",
            "txt": "text/plain; charset=utf-8",
            "markdown": "text/markdown; charset=utf-8"
        }
        media_type = media_type_map.get(format, "text/plain")

        # 返回文件流
        return StreamingResponse(
            io.BytesIO(content.encode('utf-8')),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"导出记忆 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出记忆失败: {str(e)}"
        )


@router.post("/{owner_type}/{owner_id}/import", response_model=MemoryResponse, summary="导入记忆")
async def import_memories(
    owner_type: str,
    owner_id: str,
    request: ImportMemoryRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    使用 LLM 导入记忆
    
    - **owner_type**: owner 类型（user 或 agent）
    - **owner_id**: owner ID
    - **content**: 要导入的原始文本内容
    - **model_name**: 用于解析的模型名称
    """
    try:
        result = await memory_service.import_memories(
            user_id=current_user.user_id,
            owner_type=owner_type,
            owner_id=owner_id,
            request=request
        )

        if result["success"]:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "success",
                    "message": result["message"],
                    "data": result
                }
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "status": "error",
                    "message": result["message"],
                    "error_code": result.get("error_code")
                }
            )

    except Exception as e:
        logger.error(f"导入记忆 API 错误: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导入记忆失败: {str(e)}"
        )
