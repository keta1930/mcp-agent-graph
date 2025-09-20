"""
Prompt 相关的数据模型定义
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from fastapi import UploadFile


class PromptCreate(BaseModel):
    """创建提示词的请求模型"""
    name: str = Field(..., description="提示词名称", min_length=1, max_length=100)
    content: str = Field(..., description="提示词内容", min_length=1)
    category: Optional[str] = Field(None, description="提示词分类", max_length=50)

    @validator('name')
    def validate_name(cls, v):
        # 检查名称是否包含非法字符（不能包含路径分隔符等）
        illegal_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        for char in illegal_chars:
            if char in v:
                raise ValueError(f'提示词名称不能包含字符: {char}')
        return v.strip()

    @validator('content')
    def validate_content(cls, v):
        return v.strip()


class PromptUpdate(BaseModel):
    """更新提示词的请求模型"""
    content: Optional[str] = Field(None, description="提示词内容", min_length=1)
    category: Optional[str] = Field(None, description="提示词分类", max_length=50)

    @validator('content')
    def validate_content(cls, v):
        if v is not None:
            return v.strip()
        return v

class PromptInfo(BaseModel):
    """提示词信息响应模型（只包含元数据）"""
    name: str = Field(..., description="提示词名称")
    category: Optional[str] = Field(None, description="提示词分类")
    size: int = Field(..., description="文件大小（字节）")
    created_time: str = Field(..., description="创建时间（YYYY-MM-DD格式）")
    modified_time: str = Field(..., description="最后修改时间（YYYY-MM-DD格式）")


class PromptDetail(PromptInfo):
    """提示词详细信息响应模型（包含内容）"""
    content: str = Field(..., description="提示词内容")


class PromptList(BaseModel):
    """提示词列表响应模型"""
    prompts: List[PromptInfo] = Field(default_factory=list, description="提示词列表")
    total: int = Field(..., description="总数量")


class PromptImportByPathRequest(BaseModel):
    """通过路径导入提示词的请求模型"""
    file_path: str = Field(..., description="本地文件路径")
    name: Optional[str] = Field(None, description="提示词名称（如果不提供则使用文件名）")
    category: Optional[str] = Field(None, description="提示词分类")


class PromptImportByFileRequest(BaseModel):
    """通过文件上传导入提示词的请求模型"""
    name: Optional[str] = Field(None, description="提示词名称（如果不提供则使用文件名）")
    category: Optional[str] = Field(None, description="提示词分类")


class PromptExportRequest(BaseModel):
    """批量导出提示词的请求模型"""
    names: List[str] = Field(..., description="要导出的提示词名称列表", min_items=1)


class PromptBatchDeleteRequest(BaseModel):
    """批量删除提示词请求模型"""
    names: List[str] = Field(..., description="要删除的提示词名称列表", min_items=1)


class PromptResponse(BaseModel):
    """通用响应模型"""
    success: bool = Field(..., description="操作是否成功")
    message: str = Field(..., description="响应消息")
    data: Optional[Any] = Field(None, description="响应数据")


class PromptErrorResponse(BaseModel):
    """错误响应模型"""
    success: bool = Field(False, description="操作是否成功")
    message: str = Field(..., description="错误消息")
    error_code: Optional[str] = Field(None, description="错误代码")
    details: Optional[Dict[str, Any]] = Field(None, description="错误详情")