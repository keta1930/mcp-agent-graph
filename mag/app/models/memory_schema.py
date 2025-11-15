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


# ============ 统一的API请求模型 ============

class GetMemoryDetailRequest(BaseModel):
    """获取记忆详情请求"""
    owner_type: str = Field(..., description="owner类型：user 或 agent")
    owner_id: str = Field(..., description="owner ID")


class AddMemoryRequest(BaseModel):
    """添加记忆请求"""
    owner_type: str = Field(..., description="owner类型：user 或 agent")
    owner_id: str = Field(..., description="owner ID")
    category: str = Field(..., description="分类名称")
    content: str = Field(..., description="记忆内容")


class UpdateMemoryRequest(BaseModel):
    """更新记忆请求"""
    owner_type: str = Field(..., description="owner类型：user 或 agent")
    owner_id: str = Field(..., description="owner ID")
    category: str = Field(..., description="分类名称")
    item_id: str = Field(..., description="条目ID")
    content: str = Field(..., description="新的记忆内容")


class DeleteItemsRequest(BaseModel):
    """删除记忆条目请求"""
    owner_type: str = Field(..., description="owner类型：user 或 agent")
    owner_id: str = Field(..., description="owner ID")
    category: str = Field(..., description="分类名称")
    item_ids: List[str] = Field(..., description="要删除的条目ID列表")


class DeleteCategoriesRequest(BaseModel):
    """删除分类请求"""
    owner_type: str = Field(..., description="owner类型：user 或 agent")
    owner_id: str = Field(..., description="owner ID")
    categories: List[str] = Field(..., description="要删除的分类列表")


class ExportMemoryRequest(BaseModel):
    """导出记忆请求"""
    owner_type: str = Field(..., description="owner类型：user 或 agent")
    owner_id: str = Field(..., description="owner ID")
    format: str = Field(..., description="导出格式：json, txt, markdown, yaml")


class ImportMemoryRequest(BaseModel):
    """导入记忆请求"""
    owner_type: str = Field(..., description="owner类型：user 或 agent")
    owner_id: str = Field(..., description="owner ID")
    content: str = Field(..., description="要导入的原始文本内容")
    model_name: str = Field(..., description="用于解析的模型名称")


# ============ API 响应模型 ============

class MemoryResponse(BaseModel):
    """通用记忆响应"""
    status: str = Field(..., description="状态：success 或 error")
    message: Optional[str] = Field(None, description="消息")
    data: Optional[Dict[str, Any]] = Field(None, description="数据")
    error_code: Optional[str] = Field(None, description="错误码")


class MemoryMetadata(BaseModel):
    """记忆元数据（用于列表展示）"""
    owner_type: str = Field(..., description="所有者类型：user 或 agent")
    owner_id: str = Field(..., description="所有者ID")
    categories_count: int = Field(..., description="分类数量")
    total_items: int = Field(..., description="总条目数")
    created_at: Optional[str] = Field(None, description="创建时间")
    updated_at: Optional[str] = Field(None, description="最后更新时间")


class GetMemoriesMetadataResponse(BaseModel):
    """获取记忆元数据响应（列表）"""
    status: str = Field(..., description="状态：success 或 error")
    data: List[MemoryMetadata] = Field(default_factory=list, description="记忆元数据列表")


class GetMemoriesResponse(BaseModel):
    """获取完整记忆响应（详情）"""
    status: str = Field(..., description="状态：success 或 error")
    data: Dict[str, Any] = Field(..., description="完整记忆数据")


class BatchDeleteResponse(BaseModel):
    """批量删除响应"""
    status: str = Field(..., description="状态：success 或 partial_success")
    message: str = Field(..., description="消息")
    data: Dict[str, Any] = Field(..., description="删除结果数据")
