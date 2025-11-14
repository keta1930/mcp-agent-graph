"""
Memory相关的Pydantic模型
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ============ 基础模型 ============

class MemoryItem(BaseModel):
    """记忆条目"""
    item_id: str = Field(..., description="条目ID，格式：YYYYMMDD_xxxx")
    content: str = Field(..., description="记忆内容")
    updated_at: str = Field(..., description="更新日期，格式：YYYY-MM-DD")


class CategoryMemories(BaseModel):
    """分类记忆"""
    items: List[MemoryItem] = Field(default_factory=list, description="记忆条目列表")
    total: int = Field(..., description="条目总数")


# ============ API 请求模型 ============

class AddMemoryRequest(BaseModel):
    """添加记忆请求"""
    content: str = Field(..., description="记忆内容")


class UpdateMemoryRequest(BaseModel):
    """更新记忆请求"""
    content: str = Field(..., description="新的记忆内容")


class ImportMemoryRequest(BaseModel):
    """导入记忆请求"""
    content: str = Field(..., description="要导入的原始文本内容")
    model_name: str = Field(..., description="用于解析的模型名称")


# ============ API 响应模型 ============

class MemoryResponse(BaseModel):
    """通用记忆响应"""
    status: str = Field(..., description="状态：success 或 error")
    message: Optional[str] = Field(None, description="消息")
    data: Optional[Dict[str, Any]] = Field(None, description="数据")
    error_code: Optional[str] = Field(None, description="错误码")


class GetMemoriesResponse(BaseModel):
    """获取完整记忆响应"""
    status: str = Field(..., description="状态：success 或 error")
    data: List[Dict[str, Any]] = Field(default_factory=list, description="记忆文档列表")


class BatchDeleteResponse(BaseModel):
    """批量删除响应"""
    status: str = Field(..., description="状态：success 或 partial_success")
    message: str = Field(..., description="消息")
    data: Dict[str, Any] = Field(..., description="删除结果数据")
