from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class SystemToolSchema(BaseModel):
    """系统工具 Schema"""
    name: str = Field(..., description="工具名称")
    schema: Dict[str, Any] = Field(..., description="工具的 OpenAI Function Schema")


class SystemToolListResponse(BaseModel):
    """系统工具列表响应"""
    success: bool = Field(..., description="是否成功")
    tools: List[SystemToolSchema] = Field(..., description="系统工具列表")
    total_count: int = Field(..., description="工具总数")


class SystemToolDetailResponse(BaseModel):
    """系统工具详情响应"""
    success: bool = Field(..., description="是否成功")
    name: str = Field(..., description="工具名称")
    schema: Dict[str, Any] = Field(..., description="工具的 OpenAI Function Schema")
    error: Optional[str] = Field(None, description="错误信息")
