from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class SystemToolSchema(BaseModel):
    """系统工具 Schema"""
    name: str = Field(..., description="工具名称")
    schema: Dict[str, Any] = Field(..., description="工具的 OpenAI Function Schema")


class ToolCategory(BaseModel):
    """工具类别"""
    category: str = Field(..., description="类别名称")
    tools: List[SystemToolSchema] = Field(..., description="该类别下的工具列表")
    tool_count: int = Field(..., description="工具数量")


class SystemToolListResponse(BaseModel):
    """系统工具列表响应（分类格式）"""
    success: bool = Field(..., description="是否成功")
    categories: List[ToolCategory] = Field(..., description="工具类别列表")
    total_count: int = Field(..., description="工具总数")


class SystemToolDetailResponse(BaseModel):
    """系统工具详情响应"""
    success: bool = Field(..., description="是否成功")
    name: str = Field(..., description="工具名称")
    schema: Dict[str, Any] = Field(..., description="工具的 OpenAI Function Schema")
    error: Optional[str] = Field(None, description="错误信息")
