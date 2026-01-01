from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, field_validator

class AgentConfig(BaseModel):
    """Agent配置数据模型（嵌套对象）"""
    name: str = Field(..., description="Agent唯一名称")
    card: str = Field(..., description="Agent能力描述卡片")
    model: str = Field(..., description="使用的模型名称")
    instruction: str = Field(default="", description="Agent的系统提示词")
    max_actions: int = Field(default=50, description="最大工具调用次数，范围1-200")
    mcp: List[str] = Field(default_factory=list, description="可用的MCP服务器名称列表")
    system_tools: List[str] = Field(default_factory=list, description="可用的系统内置工具列表")
    category: str = Field(..., description="Agent分类，如coding, analysis, writing等")
    tags: List[str] = Field(default_factory=list, description="Agent标签列表")

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or '/' in v or '\\' in v or '.' in v:
            raise ValueError('名称不能包含特殊字符 (/, \\, .)')
        return v

    @field_validator('max_actions')
    @classmethod
    def validate_max_actions(cls, v):
        if v < 1 or v > 200:
            raise ValueError('max_actions 必须在 1-200 范围内')
        return v

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v):
        if len(v) > 20:
            raise ValueError('标签数量不能超过20个')
        return [tag.strip() for tag in v if tag.strip()]


class CreateAgentRequest(BaseModel):
    """创建Agent请求"""
    agent_config: AgentConfig = Field(..., description="Agent配置")
    user_id: str = Field(default="default_user", description="用户ID")


class UpdateAgentRequest(BaseModel):
    """更新Agent请求"""
    agent_config: AgentConfig = Field(..., description="更新后的Agent配置")
    user_id: str = Field(default="default_user", description="用户ID")


class AgentListItem(BaseModel):
    """Agent列表项"""
    name: str = Field(..., description="Agent名称")
    category: str = Field(..., description="Agent分类")
    tags: List[str] = Field(..., description="Agent标签")
    model: str = Field(..., description="使用的模型")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")


class AgentListResponse(BaseModel):
    """Agent列表响应"""
    agents: List[AgentListItem] = Field(..., description="Agent列表")
    total_count: int = Field(..., description="总数量")


class AgentCategoryItem(BaseModel):
    """Agent分类项"""
    category: str = Field(..., description="分类名称")
    agent_count: int = Field(..., description="该分类下的Agent数量")


class AgentCategoryResponse(BaseModel):
    """Agent分类响应"""
    success: bool = Field(..., description="是否成功")
    categories: List[AgentCategoryItem] = Field(..., description="分类列表")
    total_categories: int = Field(..., description="总分类数")


class AgentInCategoryItem(BaseModel):
    """分类下的Agent项"""
    name: str = Field(..., description="Agent名称")
    tags: List[str] = Field(..., description="Agent标签")


class AgentInCategoryResponse(BaseModel):
    """分类下Agent列表响应"""
    success: bool = Field(..., description="是否成功")
    category: str = Field(..., description="分类名称")
    agents: List[AgentInCategoryItem] = Field(..., description="Agent列表")
    total_count: int = Field(..., description="总数量")
