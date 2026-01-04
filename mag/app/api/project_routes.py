"""
Project API路由
提供Project管理相关的API端点
"""
import logging
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.project_schema import (
    CreateProjectRequest,
    UpdateProjectRequest,
    ProjectListResponse,
    ProjectDetailResponse,
    ProjectOperationResponse,
    MoveConversationToProjectRequest
)
from app.services.project import project_service
from app.auth.dependencies import get_current_user
from app.models.auth_schema import CurrentUser

logger = logging.getLogger(__name__)

router = APIRouter(tags=["projects"])


@router.post("/projects", response_model=ProjectOperationResponse)
async def create_project(
    request: CreateProjectRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """创建新的Project"""
    try:
        user_id = current_user.user_id

        result = await project_service.create_project(
            name=request.name,
            instruction=request.instruction,
            user_id=user_id
        )

        if result["success"]:
            return ProjectOperationResponse(
                success=True,
                message=result["message"],
                project_id=result["project_id"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建Project失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建Project失败: {str(e)}"
        )


@router.get("/projects", response_model=ProjectListResponse)
async def list_projects(
    limit: int = 100,
    skip: int = 0,
    current_user: CurrentUser = Depends(get_current_user)
):
    """获取用户的Project列表"""
    try:
        user_id = current_user.user_id

        result = await project_service.list_projects(
            user_id=user_id,
            limit=limit,
            skip=skip
        )

        if result["success"]:
            return ProjectListResponse(
                projects=result["projects"],
                total_count=result["total_count"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message", "获取Project列表失败")
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取Project列表失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取Project列表失败: {str(e)}"
        )


@router.get("/projects/{project_id}", response_model=ProjectDetailResponse)
async def get_project_detail(
    project_id: str,
    include_conversations: bool = True,
    current_user: CurrentUser = Depends(get_current_user)
):
    """获取Project详情"""
    try:
        user_id = current_user.user_id

        result = await project_service.get_project_detail(
            project_id=project_id,
            user_id=user_id,
            include_conversations=include_conversations
        )

        if result["success"]:
            project_data = result["project"]
            return ProjectDetailResponse(**project_data)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取Project详情失败 ({project_id}): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取Project详情失败: {str(e)}"
        )


@router.put("/projects/{project_id}", response_model=ProjectOperationResponse)
async def update_project(
    project_id: str,
    request: UpdateProjectRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """更新Project信息"""
    try:
        user_id = current_user.user_id

        # 构建更新数据
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.instruction is not None:
            update_data["instruction"] = request.instruction

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="至少需要提供一个更新字段"
            )

        result = await project_service.update_project(
            project_id=project_id,
            update_data=update_data,
            user_id=user_id
        )

        if result["success"]:
            return ProjectOperationResponse(
                success=True,
                message=result["message"],
                project_id=result["project_id"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新Project失败 ({project_id}): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新Project失败: {str(e)}"
        )


@router.delete("/projects/{project_id}", response_model=ProjectOperationResponse)
async def delete_project(
    project_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """删除Project（硬删除，级联处理）"""
    try:
        user_id = current_user.user_id

        result = await project_service.delete_project(
            project_id=project_id,
            user_id=user_id
        )

        if result["success"]:
            return ProjectOperationResponse(
                success=True,
                message=result["message"],
                project_id=project_id
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除Project失败 ({project_id}): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除Project失败: {str(e)}"
        )


@router.put("/conversations/{conversation_id}/project", response_model=ProjectOperationResponse)
async def move_conversation_to_project(
    conversation_id: str,
    request: MoveConversationToProjectRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """移动Conversation到Project（或从Project移除）"""
    try:
        user_id = current_user.user_id

        result = await project_service.move_conversation_to_project(
            conversation_id=conversation_id,
            project_id=request.project_id,
            user_id=user_id
        )

        if result["success"]:
            return ProjectOperationResponse(
                success=True,
                message=result["message"],
                project_id=result.get("project_id")
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"移动Conversation失败 ({conversation_id}): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"移动Conversation失败: {str(e)}"
        )


@router.get("/projects/{project_id}/conversations")
async def get_project_conversations(
    project_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """获取Project下的所有Conversations"""
    try:
        user_id = current_user.user_id

        result = await project_service.get_project_conversations(
            project_id=project_id,
            user_id=user_id
        )

        if result["success"]:
            return {
                "success": True,
                "project_id": result["project_id"],
                "conversations": result["conversations"],
                "total_count": result["total_count"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["message"]
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取Project的Conversations失败 ({project_id}): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取Conversations失败: {str(e)}"
        )
