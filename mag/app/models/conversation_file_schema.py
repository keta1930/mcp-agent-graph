"""
会话文件管理相关的Schema定义
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator


class FileVersion(BaseModel):
    """文件版本信息"""
    version_id: str = Field(..., description="版本ID")
    timestamp: str = Field(..., description="版本时间戳")


class FileLog(BaseModel):
    """文件操作日志"""
    log_id: str = Field(..., description="日志ID")
    agent: str = Field(..., description="执行操作的agent名称")
    comment: str = Field(..., description="操作说明")
    timestamp: str = Field(..., description="操作时间")


class FileDetail(BaseModel):
    """文件详细信息（API返回）"""
    filename: str = Field(..., description="文件名（含路径）")
    summary: str = Field(..., description="文件摘要")
    content: str = Field(..., description="文件内容")
    current_version_id: str = Field(..., description="当前版本ID")
    versions: List[FileVersion] = Field(..., description="历史版本列表")


class FileListResponse(BaseModel):
    """文件列表响应"""
    success: bool = Field(..., description="是否成功")
    conversation_id: str = Field(..., description="会话ID")
    total_count: int = Field(..., description="文件总数")
    files: List[str] = Field(..., description="文件名列表")


class FileDetailResponse(BaseModel):
    """文件详情响应"""
    success: bool = Field(..., description="是否成功")
    file: FileDetail = Field(..., description="文件详细信息")


class FileVersionDetail(BaseModel):
    """文件特定版本详情"""
    filename: str = Field(..., description="文件名")
    version_id: str = Field(..., description="版本ID")
    summary: str = Field(..., description="摘要")
    content: str = Field(..., description="内容")
    is_current: bool = Field(..., description="是否为当前版本")


class FileVersionResponse(BaseModel):
    """文件版本响应"""
    success: bool = Field(..., description="是否成功")
    file: FileVersionDetail = Field(..., description="文件版本详情")


class CreateFileRequest(BaseModel):
    """创建文件请求"""
    filename: str = Field(..., description="文件名（含路径）", max_length=255)
    summary: str = Field(..., description="文件摘要", max_length=500)
    content: str = Field(..., description="文件内容")
    log: str = Field(..., description="操作日志", max_length=200)

    @validator('filename')
    def validate_filename(cls, v):
        """验证文件名"""
        # 禁止路径穿越
        if '..' in v or v.startswith('/'):
            raise ValueError("文件名不能包含'..'或以'/'开头")

        # 禁止特殊字符（但允许/用于目录结构）
        invalid_chars = ['\\', ':', '*', '?', '"', '<', '>', '|']
        for char in invalid_chars:
            if char in v:
                raise ValueError(f"文件名不能包含特殊字符: {char}")

        return v

    @validator('content')
    def validate_content_size(cls, v):
        """验证内容大小"""
        # 限制单文件最大5MB
        max_size = 5 * 1024 * 1024  # 5MB
        content_size = len(v.encode('utf-8'))
        if content_size > max_size:
            raise ValueError(f"文件内容过大，最大支持5MB，当前：{content_size / 1024 / 1024:.2f}MB")
        return v


class SaveFileRequest(BaseModel):
    """保存文件请求（用户编辑）"""
    content: str = Field(..., description="文件内容")
    summary: str = Field(..., description="文件摘要", max_length=500)
    log: str = Field(..., description="操作日志", max_length=200)

    @validator('content')
    def validate_content_size(cls, v):
        """验证内容大小"""
        max_size = 5 * 1024 * 1024  # 5MB
        content_size = len(v.encode('utf-8'))
        if content_size > max_size:
            raise ValueError(f"文件内容过大，最大支持5MB，当前：{content_size / 1024 / 1024:.2f}MB")
        return v


class FileOperationResponse(BaseModel):
    """文件操作响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="操作消息")
    file: Optional[Dict[str, Any]] = Field(None, description="文件信息")


class DeleteFileResponse(BaseModel):
    """删除文件响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="操作消息")
    filename: str = Field(..., description="文件名")
    deleted_versions: int = Field(..., description="删除的版本数")


class DownloadAllRequest(BaseModel):
    """打包下载所有文件请求"""
    include_versions: bool = Field(default=False, description="是否包含历史版本")
