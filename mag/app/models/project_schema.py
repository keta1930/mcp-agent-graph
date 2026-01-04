from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, field_validator


class ProjectBase(BaseModel):
    """Project基础信息模型"""
    name: str = Field(..., description="Project名称", min_length=1, max_length=100)
    instruction: str = Field(default="", description="Project级别的agent行为指南")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Project名称不能为空')
        return v.strip()


class CreateProjectRequest(BaseModel):
    """创建Project请求"""
    name: str = Field(..., description="Project名称", min_length=1, max_length=100)
    instruction: str = Field(default="", description="Project级别的agent行为指南")
    user_id: str = Field(default="default_user", description="用户ID")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Project名称不能为空')
        return v.strip()


class UpdateProjectRequest(BaseModel):
    """更新Project请求"""
    name: Optional[str] = Field(None, description="Project名称", min_length=1, max_length=100)
    instruction: Optional[str] = Field(None, description="Project级别的agent行为指南")
    user_id: str = Field(default="default_user", description="用户ID")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Project名称不能为空')
        return v.strip() if v else v


class ProjectListItem(BaseModel):
    """Project列表项"""
    project_id: str = Field(..., description="Project ID")
    name: str = Field(..., description="Project名称")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")
    conversation_count: int = Field(default=0, description="包含的对话数量")
    total_files: int = Field(default=0, description="项目文件数量")


class ProjectListResponse(BaseModel):
    """Project列表响应"""
    projects: List[ProjectListItem] = Field(..., description="Project列表")
    total_count: int = Field(..., description="总数量")


class ProjectDetailResponse(BaseModel):
    """Project详情响应"""
    project_id: str = Field(..., description="Project ID")
    name: str = Field(..., description="Project名称")
    instruction: str = Field(..., description="Project级别的agent行为指南")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")

    # 统计信息
    conversation_count: int = Field(default=0, description="包含的对话数量")
    total_files: int = Field(default=0, description="项目文件数量")

    # 文件信息（可选）
    files: Optional[List[str]] = Field(None, description="文件名列表")

    # Conversations列表（可选）
    conversations: Optional[List[Dict[str, Any]]] = Field(None, description="对话列表")


class MoveConversationToProjectRequest(BaseModel):
    """移动conversation到project请求"""
    project_id: Optional[str] = Field(None, description="目标Project ID，None表示移除project归属")
    user_id: str = Field(default="default_user", description="用户ID")


class PushFileToProjectRequest(BaseModel):
    """推送文件到project请求"""
    conversation_id: str = Field(..., description="源Conversation ID")
    filename: str = Field(..., description="要推送的文件名")
    user_id: str = Field(default="default_user", description="用户ID")

    @field_validator('filename')
    @classmethod
    def validate_filename(cls, v):
        if not v or not v.strip():
            raise ValueError('文件名不能为空')
        return v.strip()


class ProjectOperationResponse(BaseModel):
    """Project操作响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    project_id: Optional[str] = Field(None, description="Project ID")
