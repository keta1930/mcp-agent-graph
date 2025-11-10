"""
认证相关的Pydantic Schema模型
"""
from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime


class UserRegisterRequest(BaseModel):
    """
    用户注册请求模型

    用户通过邀请码注册账号
    """
    invite_code: str = Field(..., description="邀请码", min_length=1)
    user_id: str = Field(..., description="用户名（唯一，用于登录）", min_length=3, max_length=50)
    password: str = Field(..., description="密码", min_length=8)

    @validator('user_id')
    def validate_user_id(cls, v):
        """验证用户名格式"""
        if not v.strip():
            raise ValueError('用户名不能为空')
        # 只允许字母、数字、下划线和连字符
        if not all(c.isalnum() or c in ['_', '-'] for c in v):
            raise ValueError('用户名只能包含字母、数字、下划线和连字符')
        return v.strip()

    @validator('password')
    def validate_password(cls, v):
        """验证密码强度"""
        if len(v) < 8:
            raise ValueError('密码长度至少为8个字符')
        return v


class UserLoginRequest(BaseModel):
    """
    用户登录请求模型
    """
    user_id: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class RefreshTokenRequest(BaseModel):
    """
    刷新令牌请求模型
    """
    refresh_token: str = Field(..., description="刷新令牌")


class TokenResponse(BaseModel):
    """
    Token响应模型

    返回JWT令牌和用户基本信息
    """
    access_token: str = Field(..., description="JWT访问令牌（15分钟有效）")
    refresh_token: str = Field(..., description="JWT刷新令牌（7天有效）")
    token_type: str = Field(default="bearer", description="令牌类型")
    user_id: str = Field(..., description="用户ID")
    role: str = Field(..., description="用户角色: user|admin|super_admin")


class CurrentUser(BaseModel):
    """
    当前用户信息模型

    从JWT Token中解析出的用户信息
    """
    user_id: str = Field(..., description="用户ID")
    role: str = Field(..., description="用户角色: user|admin|super_admin")

    def is_admin(self) -> bool:
        """判断是否为管理员"""
        return self.role in ["admin", "super_admin"]

    def is_super_admin(self) -> bool:
        """判断是否为超级管理员"""
        return self.role == "super_admin"


class UserProfile(BaseModel):
    """
    用户资料模型

    用于返回用户详细信息（GET /api/auth/me）
    """
    user_id: str = Field(..., description="用户ID")
    role: str = Field(..., description="用户角色")
    is_active: bool = Field(..., description="账号是否激活")
    created_at: datetime = Field(..., description="创建时间")
    last_login_at: Optional[datetime] = Field(None, description="最后登录时间")
    invited_by_code: Optional[str] = Field(None, description="使用的邀请码")


class UpdatePasswordRequest(BaseModel):
    """
    修改密码请求模型
    """
    old_password: str = Field(..., description="旧密码")
    new_password: str = Field(..., description="新密码", min_length=8)

    @validator('new_password')
    def validate_new_password(cls, v, values):
        """验证新密码"""
        if len(v) < 8:
            raise ValueError('密码长度至少为8个字符')
        if 'old_password' in values and v == values['old_password']:
            raise ValueError('新密码不能与旧密码相同')
        return v


class MessageResponse(BaseModel):
    """
    通用消息响应模型
    """
    message: str = Field(..., description="响应消息")
    status: str = Field(default="success", description="状态: success|error")


# ===== 用户管理相关Schema =====

class User(BaseModel):
    """
    用户模型（从数据库返回）
    """
    user_id: str = Field(..., description="用户ID")
    role: str = Field(..., description="用户角色: user|admin|super_admin")
    is_active: bool = Field(..., description="账号是否激活")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    last_login_at: Optional[datetime] = Field(None, description="最后登录时间")
    invited_by_code: Optional[str] = Field(None, description="使用的邀请码")


class UserListResponse(BaseModel):
    """
    用户列表响应
    """
    users: list[User] = Field(..., description="用户列表")
    total: int = Field(..., description="总数量")


# ===== 邀请码相关Schema =====

class InviteCode(BaseModel):
    """
    邀请码模型
    """
    code: str = Field(..., description="邀请码")
    is_active: bool = Field(..., description="是否激活")
    created_by: str = Field(..., description="创建者user_id")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    max_uses: Optional[int] = Field(None, description="最大使用次数（null表示无限制）")
    current_uses: int = Field(..., description="当前使用次数")
    expires_at: Optional[datetime] = Field(None, description="过期时间（null表示永不过期）")
    description: Optional[str] = Field(None, description="描述")


class InviteCodeCreateRequest(BaseModel):
    """
    创建邀请码请求
    """
    max_uses: Optional[int] = Field(None, description="最大使用次数（不填表示无限制）", gt=0)
    expires_at: Optional[datetime] = Field(None, description="过期时间（不填表示永不过期）")
    description: Optional[str] = Field(None, description="描述信息", max_length=200)

    @validator('expires_at')
    def validate_expires_at(cls, v):
        """验证过期时间必须在未来"""
        if v is not None:
            # 使用本地时间进行比较
            if v <= datetime.now():
                raise ValueError('过期时间必须在未来')
        return v


class InviteCodeListResponse(BaseModel):
    """
    邀请码列表响应
    """
    codes: list[InviteCode] = Field(..., description="邀请码列表")
    total: int = Field(..., description="总数量")


class InviteCodeToggleRequest(BaseModel):
    """
    切换邀请码状态请求
    """
    is_active: bool = Field(..., description="是否激活")


# ===== 团队设置相关Schema =====

class TeamSettings(BaseModel):
    """
    团队设置模型
    """
    team_name: str = Field(..., description="团队名称")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    updated_by: str = Field(..., description="最后更新者user_id")


class TeamSettingsUpdateRequest(BaseModel):
    """
    更新团队设置请求
    """
    team_name: str = Field(..., description="团队名称", min_length=1, max_length=100)

    @validator('team_name')
    def validate_team_name(cls, v):
        """验证团队名称"""
        if not v.strip():
            raise ValueError('团队名称不能为空')
        return v.strip()
