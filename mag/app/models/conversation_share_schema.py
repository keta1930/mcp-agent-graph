from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class CreateShareResponse(BaseModel):
    """创建分享响应"""
    status: str = Field(..., description="状态：success")
    message: str = Field(..., description="响应消息")
    share_id: str = Field(..., description="分享ID")
    share_url: str = Field(..., description="分享链接，格式：share/{share_id}")
    created_at: str = Field(..., description="创建时间")


class SharedConversationResponse(BaseModel):
    """分享对话响应"""
    conversation_id: str = Field(..., description="对话ID")
    title: str = Field(..., description="对话标题")
    type: str = Field(..., description="对话类型：agent/graph")
    rounds: List[Dict[str, Any]] = Field(..., description="对话轮次")
    created_at: str = Field(..., description="创建时间")
    round_count: int = Field(..., description="轮次数")

    # 可选字段
    execution_chain: Optional[List[List[str]]] = Field(None, description="图执行链")
    final_result: Optional[str] = Field(None, description="最终结果")
    tasks: Optional[List[Dict[str, Any]]] = Field(None, description="任务列表")


class SharedFilesResponse(BaseModel):
    """分享文件列表响应"""
    success: bool = Field(..., description="是否成功")
    files: List[str] = Field(..., description="文件名列表")
    total_count: int = Field(..., description="文件总数")


class ShareStatusResponse(BaseModel):
    """分享状态响应"""
    is_shared: bool = Field(..., description="是否已分享")
    share_id: Optional[str] = Field(None, description="分享ID")
    share_url: Optional[str] = Field(None, description="分享链接")
    created_at: Optional[str] = Field(None, description="创建时间")


class DeleteShareResponse(BaseModel):
    """删除分享响应"""
    status: str = Field(..., description="状态：success")
    message: str = Field(..., description="响应消息")
    share_id: str = Field(..., description="已删除的分享ID")
