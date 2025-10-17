"""
Preview 相关的数据模型定义
"""
from typing import Optional
from pydantic import BaseModel, Field


class PreviewShareRequest(BaseModel):
    """创建预览短链的请求模型"""
    lang: str = Field(..., description="语言类型")
    content: str = Field(..., description="预览内容", min_length=1)
    title: Optional[str] = Field(None, description="预览标题")
    expire_hours: Optional[int] = Field(144, description="过期时间（小时）", ge=1)


class PreviewShareResponse(BaseModel):
    """创建预览短链的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    id: str = Field(..., description="短链ID")


class PreviewShareGetResponse(BaseModel):
    """获取预览内容的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    lang: str = Field(..., description="语言类型")
    title: str = Field(..., description="预览标题")
    content: str = Field(..., description="预览内容")