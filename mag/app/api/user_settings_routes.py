import logging
from fastapi import APIRouter, HTTPException, status, Depends

from app.auth.dependencies import get_current_user
from app.models.auth_schema import MessageResponse
from app.infrastructure.database.mongodb import mongodb_client
from app.services.model.model_service import model_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user/settings", tags=["User Settings"])


@router.get("/title-generation-model")
async def get_title_generation_model(current_user = Depends(get_current_user)):
    """
    获取用户配置的标题生成模型
    """
    try:
        user_id = current_user.user_id
        model_name = await mongodb_client.user_repository.get_title_generation_model(user_id)

        return {
            "model_name": model_name,
            "is_configured": model_name is not None
        }

    except Exception as e:
        logger.error(f"获取标题生成模型配置失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取配置失败: {str(e)}"
        )


@router.post("/title-generation-model", response_model=MessageResponse)
async def set_title_generation_model(model_name: str, current_user = Depends(get_current_user)):
    """
    设置用户的标题生成模型

    Args:
        model_name: 模型名称
    """
    try:
        user_id = current_user.user_id

        # 验证模型是否存在
        model_config = await model_service.get_model(model_name, user_id=user_id)

        if not model_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"模型 {model_name} 不存在"
            )

        # 设置标题生成模型
        success = await mongodb_client.user_repository.set_title_generation_model(user_id, model_name)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="设置标题生成模型失败"
            )

        logger.info(f"用户 {user_id} 设置标题生成模型为: {model_name}")
        return MessageResponse(message=f"标题生成模型已设置为: {model_name}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"设置标题生成模型失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"设置失败: {str(e)}"
        )