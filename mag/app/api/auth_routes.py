"""
认证API路由

处理用户注册、登录、登出和获取当前用户信息等认证相关操作
"""
import logging
from fastapi import APIRouter, HTTPException, status, Depends
from datetime import timedelta

from app.models.auth_schema import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfile,
    MessageResponse
)
from app.auth.dependencies import get_current_user
from app.auth.jwt import create_access_token
from app.services.user_service import UserService
from app.services.invite_code_service import InviteCodeService
from app.infrastructure.database.mongodb import mongodb_client
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


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


@router.post("/register", response_model=UserProfile)
async def register(request: UserRegisterRequest):
    """
    用户注册

    使用邀请码注册新用户账号

    注册流程：
    1. 验证邀请码有效性（是否激活、是否过期、是否超过使用次数）
    2. 验证密码强度
    3. 检查用户名是否已被占用
    4. 创建用户账号
    5. 递增邀请码使用次数
    """
    try:
        user_service = get_user_service()

        # 注册用户
        user = await user_service.register_user(
            user_id=request.user_id,
            password=request.password,
            invite_code=request.invite_code
        )

        logger.info(f"用户注册成功: {request.user_id}")

        # 返回用户资料
        return UserProfile(
            user_id=user["user_id"],
            role=user["role"],
            is_active=user["is_active"],
            created_at=user["created_at"],
            last_login_at=user.get("last_login_at"),
            invited_by_code=user.get("invited_by_code")
        )

    except ValueError as e:
        # 业务逻辑错误（邀请码无效、用户名重复等）
        logger.warning(f"注册失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"注册处理出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"注册失败: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse)
async def login(request: UserLoginRequest):
    """
    用户登录

    验证用户凭证并返回JWT访问令牌

    登录流程：
    1. 验证用户名和密码
    2. 检查账号是否激活
    3. 生成JWT令牌
    4. 更新最后登录时间
    """
    try:
        user_service = get_user_service()

        # 验证用户凭证
        user = await user_service.authenticate_user(
            user_id=request.user_id,
            password=request.password
        )

        if not user:
            # 认证失败（用户不存在、密码错误或账号已停用）
            logger.warning(f"登录失败: {request.user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码错误，或账号已被停用",
                headers={"WWW-Authenticate": "Bearer"}
            )

        # 生成JWT令牌
        access_token = create_access_token(
            user_id=user["user_id"],
            role=user["role"]
        )

        logger.info(f"用户登录成功: {request.user_id}")

        # 返回令牌和用户信息
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user["user_id"],
            role=user["role"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"登录处理出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"登录失败: {str(e)}"
        )


@router.get("/me", response_model=UserProfile)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """
    获取当前用户信息

    需要有效的JWT令牌才能访问

    返回当前登录用户的详细资料
    """
    try:
        user_service = get_user_service()

        # 从current_user获取user_id
        user_id = current_user.user_id

        # 获取完整用户信息
        user = await user_service.get_user_info(user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )

        # 返回用户资料
        return UserProfile(
            user_id=user["user_id"],
            role=user["role"],
            is_active=user["is_active"],
            created_at=user["created_at"],
            last_login_at=user.get("last_login_at"),
            invited_by_code=user.get("invited_by_code")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取用户信息出错: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取用户信息失败: {str(e)}"
        )


@router.post("/logout", response_model=MessageResponse)
async def logout():
    """
    用户登出

    JWT是无状态的，登出操作由客户端完成（删除本地存储的token）

    此端点主要用于记录登出日志和未来可能的token黑名单机制
    """
    logger.info("用户登出")

    return MessageResponse(
        message="登出成功，请删除客户端存储的token",
        status="success"
    )
