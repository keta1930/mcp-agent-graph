import logging
from fastapi import APIRouter, HTTPException, status

from app.services.mongodb_service import mongodb_service
from app.models.preview_schema import (
    PreviewShareRequest,
    PreviewShareResponse,
    PreviewShareGetResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/preview", tags=["preview"])


@router.post("/share", response_model=PreviewShareResponse)
async def create_preview_share(request: PreviewShareRequest):
    """创建预览短链并返回短链ID"""
    try:
        if not request.content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="内容不能为空"
            )

        result = await mongodb_service.create_preview_share(
            lang=request.lang,
            title=request.title,
            content=request.content,
            expire_hours=request.expire_hours
        )

        return PreviewShareResponse(success=True, id=result["key"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建预览短链失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建预览短链失败: {str(e)}"
        )


@router.get("/share/{share_id}", response_model=PreviewShareGetResponse)
async def get_preview_share(share_id: str):
    """通过短链ID获取预览内容"""
    try:
        doc = await mongodb_service.get_preview_share(share_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="短链不存在或已过期"
            )

        return PreviewShareGetResponse(success=True, **doc)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取预览短链失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取预览短链失败: {str(e)}"
        )