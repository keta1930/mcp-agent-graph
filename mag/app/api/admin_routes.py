"""
管理员API路由

处理用户管理、邀请码管理和团队设置等管理员专用操作
"""
import logging
from fastapi import APIRouter, HTTPException, status, Depends

from app.models.auth_schema import (
    UserListResponse,
    User,
    InviteCodeListResponse,
    InviteCode,
    InviteCodeCreateRequest,
    InviteCodeToggleRequest,
    TeamSettings,
    TeamSettingsUpdateRequest,
    MessageResponse
)
from app.auth.dependencies import require_admin
from app.services.user.user_service import UserService
from app.services.user.invite_code_service import InviteCodeService
from app.services.user.team_service import TeamService
from app.infrastructure.database.mongodb import mongodb_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


# 初始化服务（延迟到MongoDB连接后）
def get_user_service() -> UserService:
    """获取用户服务实例"""
    if not mongodb_client.is_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="数据库服务未就绪"
        )

    return UserService(
        user_repository=mongodb_client.user_repository,
        invite_code_repository=mongodb_client.invite_code_repository
    )


def get_invite_code_service() -> InviteCodeService:
    """获取邀请码服务实例"""
    if not mongodb_client.is_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="数据库服务未就绪"
        )

    return InviteCodeService(
        invite_code_repository=mongodb_client.invite_code_repository
    )


def get_team_service() -> TeamService:
    """获取团队服务实例"""
    if not mongodb_client.is_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="数据库服务未就绪"
        )

    return TeamService(
        team_settings_repository=mongodb_client.team_settings_repository
    )


# ===== 用户管理接口 =====

@router.get("/users", response_model=UserListResponse)
async def list_users(current_user = Depends(require_admin)):
    """
    获取所有用户列表

    仅管理员可访问

    返回系统中所有用户的基本信息，包括用户ID、角色、状态等
    """
    try:
        user_service = get_user_service()

        # 获取所有用户
        users = await user_service.list_all_users()

        # 转换为User对象列表
        user_list = [
            User(
                user_id=user["user_id"],
                role=user["role"],
                is_active=user["is_active"],
                created_at=user["created_at"],
                updated_at=user["updated_at"],
                last_login_at=user.get("last_login_at"),
                invited_by_code=user.get("invited_by_code")
            )
            for user in users
        ]

        logger.info(f"管理员 {current_user.user_id} 查看用户列表，共 {len(user_list)} 个用户")

        return UserListResponse(
            users=user_list,
            total=len(user_list)
        )

    except Exception as e:
        logger.error(f"获取用户列表出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取用户列表失败: {str(e)}"
        )


@router.post("/users/{user_id}/promote", response_model=User)
async def promote_user(
    user_id: str,
    current_user = Depends(require_admin)
):
    """
    提升用户为管理员

    仅管理员可访问

    将指定的普通用户提升为管理员角色
    """
    try:
        user_service = get_user_service()

        # 提升用户为管理员
        updated_user = await user_service.promote_user_to_admin(
            user_id=user_id,
            operator_user_id=current_user.user_id
        )

        logger.info(f"管理员 {current_user.user_id} 将用户 {user_id} 提升为管理员")

        # 返回更新后的用户信息
        return User(
            user_id=updated_user["user_id"],
            role=updated_user["role"],
            is_active=updated_user["is_active"],
            created_at=updated_user["created_at"],
            updated_at=updated_user["updated_at"],
            last_login_at=updated_user.get("last_login_at"),
            invited_by_code=updated_user.get("invited_by_code")
        )

    except ValueError as e:
        # 业务逻辑错误（用户不存在等）
        logger.warning(f"提升用户失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"提升用户出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"提升用户失败: {str(e)}"
        )


@router.delete("/users/{user_id}", response_model=MessageResponse)
async def deactivate_user(
    user_id: str,
    current_user = Depends(require_admin)
):
    """
    停用用户（软删除）

    仅管理员可访问

    将指定用户标记为停用状态，停用后用户无法登录
    注意：不能停用超级管理员
    """
    try:
        user_service = get_user_service()

        # 停用用户
        success = await user_service.deactivate_user(
            user_id=user_id,
            operator_user_id=current_user.user_id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"用户不存在: {user_id}"
            )

        logger.info(f"管理员 {current_user.user_id} 停用了用户 {user_id}")

        return MessageResponse(
            message=f"用户 {user_id} 已停用",
            status="success"
        )

    except ValueError as e:
        # 业务逻辑错误（尝试停用超级管理员等）
        logger.warning(f"停用用户失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"停用用户出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"停用用户失败: {str(e)}"
        )


# ===== 邀请码管理接口 =====

@router.get("/invite-codes", response_model=InviteCodeListResponse)
async def list_invite_codes(current_user = Depends(require_admin)):
    """
    获取所有邀请码列表

    仅管理员可访问

    返回系统中所有邀请码的信息，包括使用次数、过期时间等
    """
    try:
        invite_code_service = get_invite_code_service()

        # 获取所有邀请码
        codes = await invite_code_service.list_invite_codes()

        # 转换为InviteCode对象列表
        code_list = [
            InviteCode(
                code=code["code"],
                is_active=code["is_active"],
                created_by=code["created_by"],
                created_at=code["created_at"],
                updated_at=code["updated_at"],
                max_uses=code.get("max_uses"),
                current_uses=code["current_uses"],
                expires_at=code.get("expires_at"),
                description=code.get("description")
            )
            for code in codes
        ]

        logger.info(f"管理员 {current_user.user_id} 查看邀请码列表，共 {len(code_list)} 个邀请码")

        return InviteCodeListResponse(
            codes=code_list,
            total=len(code_list)
        )

    except Exception as e:
        logger.error(f"获取邀请码列表出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取邀请码列表失败: {str(e)}"
        )


@router.post("/invite-codes", response_model=InviteCode)
async def create_invite_code(
    request: InviteCodeCreateRequest,
    current_user = Depends(require_admin)
):
    """
    生成新邀请码

    仅管理员可访问

    生成一个新的邀请码，可选设置最大使用次数、过期时间和描述
    """
    try:
        invite_code_service = get_invite_code_service()

        # 生成邀请码
        invite_code = await invite_code_service.generate_invite_code(
            created_by=current_user.user_id,
            max_uses=request.max_uses,
            expires_at=request.expires_at,
            description=request.description
        )

        logger.info(f"管理员 {current_user.user_id} 生成了新邀请码: {invite_code['code']}")

        # 返回生成的邀请码
        return InviteCode(
            code=invite_code["code"],
            is_active=invite_code["is_active"],
            created_by=invite_code["created_by"],
            created_at=invite_code["created_at"],
            updated_at=invite_code["updated_at"],
            max_uses=invite_code.get("max_uses"),
            current_uses=invite_code["current_uses"],
            expires_at=invite_code.get("expires_at"),
            description=invite_code.get("description")
        )

    except Exception as e:
        logger.error(f"生成邀请码出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成邀请码失败: {str(e)}"
        )


@router.patch("/invite-codes/{code}", response_model=InviteCode)
async def toggle_invite_code(
    code: str,
    request: InviteCodeToggleRequest,
    current_user = Depends(require_admin)
):
    """
    切换邀请码激活状态

    仅管理员可访问

    启用或停用指定的邀请码
    """
    try:
        invite_code_service = get_invite_code_service()

        # 切换邀请码状态
        updated_code = await invite_code_service.toggle_invite_code(
            code=code,
            is_active=request.is_active
        )

        status_text = "激活" if request.is_active else "停用"
        logger.info(f"管理员 {current_user.user_id} {status_text}了邀请码: {code}")

        # 返回更新后的邀请码
        return InviteCode(
            code=updated_code["code"],
            is_active=updated_code["is_active"],
            created_by=updated_code["created_by"],
            created_at=updated_code["created_at"],
            updated_at=updated_code["updated_at"],
            max_uses=updated_code.get("max_uses"),
            current_uses=updated_code["current_uses"],
            expires_at=updated_code.get("expires_at"),
            description=updated_code.get("description")
        )

    except ValueError as e:
        # 业务逻辑错误（邀请码不存在等）
        logger.warning(f"切换邀请码状态失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"切换邀请码状态出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"切换邀请码状态失败: {str(e)}"
        )


@router.get("/invite-codes/{code}/stats")
async def get_invite_code_stats(
    code: str,
    current_user = Depends(require_admin)
):
    """
    获取邀请码使用统计

    仅管理员可访问

    返回指定邀请码的详细使用统计，包括使用率、是否过期等
    """
    try:
        invite_code_service = get_invite_code_service()

        # 获取邀请码使用统计
        stats = await invite_code_service.get_invite_code_usage_stats(code)

        logger.info(f"管理员 {current_user.user_id} 查看邀请码 {code} 的使用统计")

        return stats

    except ValueError as e:
        # 业务逻辑错误（邀请码不存在等）
        logger.warning(f"获取邀请码统计失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"获取邀请码统计出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取邀请码统计失败: {str(e)}"
        )


# ===== 团队设置接口 =====

@router.get("/team-settings", response_model=TeamSettings)
async def get_team_settings(current_user = Depends(require_admin)):
    """
    获取团队设置

    仅管理员可访问

    返回当前团队的设置信息
    """
    try:
        team_service = get_team_service()

        # 获取团队设置
        settings = await team_service.get_team_settings()

        logger.info(f"管理员 {current_user.user_id} 查看团队设置")

        # 返回团队设置
        return TeamSettings(
            team_name=settings["team_name"],
            created_at=settings["created_at"],
            updated_at=settings["updated_at"],
            updated_by=settings["updated_by"]
        )

    except ValueError as e:
        # 业务逻辑错误（团队设置不存在等）
        logger.warning(f"获取团队设置失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"获取团队设置出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取团队设置失败: {str(e)}"
        )


@router.put("/team-settings", response_model=TeamSettings)
async def update_team_settings(
    request: TeamSettingsUpdateRequest,
    current_user = Depends(require_admin)
):
    """
    更新团队设置

    仅管理员可访问

    更新团队名称等设置信息
    """
    try:
        team_service = get_team_service()

        # 更新团队名称
        updated_settings = await team_service.update_team_name(
            team_name=request.team_name,
            updated_by=current_user.user_id
        )

        logger.info(f"管理员 {current_user.user_id} 更新了团队设置，新名称: {request.team_name}")

        # 返回更新后的团队设置
        return TeamSettings(
            team_name=updated_settings["team_name"],
            created_at=updated_settings["created_at"],
            updated_at=updated_settings["updated_at"],
            updated_by=updated_settings["updated_by"]
        )

    except Exception as e:
        logger.error(f"更新团队设置出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新团队设置失败: {str(e)}"
        )
