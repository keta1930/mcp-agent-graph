import logging
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any, List
from urllib.parse import unquote

from app.services.model.model_service import model_service
from app.models.model_schema import ModelConfig
from app.auth.dependencies import get_current_user
from app.models.auth_schema import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(tags=["model"])

# ======= 模型管理 =======
@router.get("/models", response_model=List[Dict[str, Any]])
async def get_models(current_user: CurrentUser = Depends(get_current_user)):
    """获取所有模型配置（不包含API密钥）"""
    try:
        return await model_service.get_all_models(user_id=current_user.user_id)
    except Exception as e:
        logger.error(f"获取模型列表时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型列表时出错: {str(e)}"
        )

@router.get("/models/{model_name:path}", response_model=Dict[str, Any])
async def get_model_for_edit(model_name: str, current_user: CurrentUser = Depends(get_current_user)):
    """获取特定模型的配置（用于编辑）"""
    try:
        model_name = unquote(model_name)
        logger.info(f"获取模型配置用于编辑: '{model_name}'")

        model_config = await model_service.get_model_for_edit(model_name, user_id=current_user.user_id)
        if not model_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{model_name}'"
            )
        
        return {"status": "success", "data": model_config}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取模型配置时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型配置时出错: {str(e)}"
        )

@router.post("/models", response_model=Dict[str, Any])
async def add_model(model: ModelConfig, current_user: CurrentUser = Depends(get_current_user)):
    """添加新模型配置"""
    try:
        # 检查是否已存在同名模型
        existing_model = await model_service.get_model(model.name, user_id=current_user.user_id)
        if existing_model:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"已存在名为 '{model.name}' 的模型"
            )

        # 添加模型
        model_dict = model.dict()
        success = await model_service.add_model(current_user.user_id, model_dict)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="添加模型失败"
            )

        return {"status": "success", "message": f"模型 '{model.name}' 添加成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"添加模型时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加模型时出错: {str(e)}"
        )


@router.put("/models/{model_name:path}", response_model=Dict[str, Any])
async def update_model(model_name: str, model: ModelConfig, current_user: CurrentUser = Depends(get_current_user)):
    """更新模型配置"""
    try:
        model_name = unquote(model_name)
        # 检查模型是否存在
        existing_model = await model_service.get_model(model_name, user_id=current_user.user_id)
        if not existing_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{model_name}'"
            )

        # 验证所有权
        if not current_user.is_admin() and existing_model.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有模型的所有者可以更新模型"
            )

        # 如果模型名称已更改，检查新名称是否已存在
        if model_name != model.name:
            existing_model_with_new_name = await model_service.get_model(model.name, user_id=current_user.user_id)
            if existing_model_with_new_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"已存在名为 '{model.name}' 的模型"
                )

        # 更新模型
        model_dict = model.dict()
        success = await model_service.update_model(model_name, current_user.user_id, model_dict)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="更新模型失败"
            )

        return {"status": "success", "message": f"模型 '{model_name}' 更新成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新模型时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新模型时出错: {str(e)}"
        )


@router.delete("/models/{model_name:path}", response_model=Dict[str, Any])
async def delete_model(model_name: str, current_user: CurrentUser = Depends(get_current_user)):
    """删除模型配置"""
    try:
        model_name = unquote(model_name)
        logger.info(f"尝试删除模型: '{model_name}'")

        # 检查模型是否存在
        existing_model = await model_service.get_model(model_name, user_id=current_user.user_id)
        if not existing_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"找不到模型 '{model_name}'"
            )

        # 验证所有权
        if not current_user.is_admin() and existing_model.get("user_id") != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="只有模型的所有者可以删除模型"
            )

        # 删除模型
        success = await model_service.delete_model(model_name, user_id=current_user.user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="删除模型失败"
            )

        return {"status": "success", "message": f"模型 '{model_name}' 删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除模型时出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除模型时出错: {str(e)}"
        )