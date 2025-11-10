"""
认证API路由

处理用户注册、登录、登出和获取当前用户信息等认证相关操作
"""
import logging
from fastapi import APIRouter, HTTPException, status, Depends

from app.models.auth_schema import (
    UserRegisterRequest,
    UserLoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserProfile,
    MessageResponse
)
from app.auth.dependencies import get_current_user
from app.auth.jwt import create_tokens, verify_refresh_token
from app.services.user.user_service import UserService
from app.infrastructure.database.mongodb import mongodb_client

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

        # 生成双Token
        access_token, refresh_token, refresh_token_id, refresh_expires_at = create_tokens(
            user_id=user["user_id"],
            role=user["role"]
        )

        # 将refresh token存储到数据库
        try:
            await mongodb_client.refresh_token_repository.create_refresh_token(
                token_id=refresh_token_id,
                user_id=user["user_id"],
                expires_at=refresh_expires_at
            )
        except Exception as e:
            logger.error(f"存储refresh token失败: {str(e)}")
            # 存储失败不影响登录，只记录日志

        logger.info(f"用户登录成功: {request.user_id}")

        # 返回令牌和用户信息
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
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
async def logout(current_user = Depends(get_current_user)):
    """
    用户登出

    撤销用户的所有refresh token，使其无法继续刷新access token
    """
    try:
        user_service = get_user_service()

        # 撤销该用户的所有refresh token
        revoked_count = await mongodb_client.refresh_token_repository.revoke_all_user_tokens(
            current_user.user_id
        )

        logger.info(f"用户登出: {current_user.user_id}, 撤销了 {revoked_count} 个refresh token")

        return MessageResponse(
            message="登出成功，请删除客户端存储的token",
            status="success"
        )

    except Exception as e:
        logger.error(f"登出处理出错: {str(e)}")
        # 即使出错也返回成功，让客户端清除token
        return MessageResponse(
            message="登出成功，请删除客户端存储的token",
            status="success"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """
    刷新访问令牌

    使用Refresh Token获取新的Access Token

    流程：
    1. 验证Refresh Token的JWT签名和过期时间
    2. 检查数据库中该Token是否已被撤销
    3. 验证用户账号是否仍然激活
    4. 生成新的Access Token（Refresh Token保持不变）
    """
    try:
        user_service = get_user_service()

        # 1. 验证Refresh Token的JWT签名
        payload = verify_refresh_token(request.refresh_token)
        user_id = payload["sub"]
        token_id = payload["jti"]

        # 2. 检查数据库中该Token是否有效（未撤销且未过期）
        is_valid = await mongodb_client.refresh_token_repository.is_token_valid(token_id)
        if not is_valid:
            logger.warning(f"Refresh token已失效: {token_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token已失效，请重新登录"
            )

        # 3. 从数据库获取用户最新信息（确保用户未被停用、角色未变更）
        user = await user_service.get_user_info(user_id)

        if not user:
            logger.warning(f"用户不存在: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在"
            )

        if not user.get("is_active", False):
            logger.warning(f"用户已被停用: {user_id}")
            # 撤销该用户的所有token
            await mongodb_client.refresh_token_repository.revoke_all_user_tokens(user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="账号已被停用，请联系管理员"
            )

        # 4. 生成新的双Token
        new_access_token, new_refresh_token, new_token_id, new_expires_at = create_tokens(
            user_id=user["user_id"],
            role=user["role"]
        )

        # 5. 撤销旧的Refresh Token
        await mongodb_client.refresh_token_repository.revoke_token(token_id)

        # 6. 存储新的Refresh Token
        try:
            await mongodb_client.refresh_token_repository.create_refresh_token(
                token_id=new_token_id,
                user_id=user["user_id"],
                expires_at=new_expires_at
            )
        except Exception as e:
            logger.error(f"存储新refresh token失败: {str(e)}")

        logger.info(f"Token刷新成功: {user_id}")

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            user_id=user["user_id"],
            role=user["role"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token刷新失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token刷新失败: {str(e)}"
        )
