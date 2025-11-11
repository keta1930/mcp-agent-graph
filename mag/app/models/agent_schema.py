from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime


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

    @validator('name')
    def validate_name(cls, v):
        if not v or '/' in v or '\\' in v or '.' in v:
            raise ValueError('名称不能包含特殊字符 (/, \\, .)')
        return v

    @validator('max_actions')
    def validate_max_actions(cls, v):
        if v < 1 or v > 200:
            raise ValueError('max_actions 必须在 1-200 范围内')
        return v

    @validator('tags')
    def validate_tags(cls, v):
        if len(v) > 20:
            raise ValueError('标签数量不能超过20个')
        return [tag.strip() for tag in v if tag.strip()]


class AgentDocument(BaseModel):
    """MongoDB Agent文档模型"""
    id: Optional[str] = Field(None, description="MongoDB _id", alias="_id")
    name: str = Field(..., description="Agent唯一名称")
    agent_config: AgentConfig = Field(..., description="Agent完整配置")
    user_id: str = Field(..., description="所有者用户ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        allow_population_by_field_name = True


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




class TaskItem(BaseModel):
    """单个任务项"""
    agent_name: str = Field(..., description="要调用的Agent名称")
    task_id: str = Field(..., description="任务ID")
    task_description: str = Field(..., description="任务描述")
    context: Optional[str] = Field(None, description="传递给Agent的上下文信息")


class TaskExecutorRequest(BaseModel):
    """Task Executor工具请求"""
    tasks: List[TaskItem] = Field(..., description="要执行的任务列表", min_items=1)

    @validator('tasks')
    def validate_tasks(cls, v):
        if len(v) > 10:
            raise ValueError('单次最多执行10个任务')
        return v


class TaskResult(BaseModel):
    """单个任务执行结果"""
    task_id: str = Field(..., description="任务ID")
    agent_name: str = Field(..., description="执行的Agent名称")
    success: bool = Field(..., description="是否成功")
    result: Optional[str] = Field(None, description="任务结果")
    error: Optional[str] = Field(None, description="错误信息")
    error_type: Optional[str] = Field(None, description="错误类型")


class TaskExecutorResponse(BaseModel):
    """Task Executor工具响应"""
    success: bool = Field(..., description="整体是否成功")
    results: List[TaskResult] = Field(..., description="任务结果列表")
    error: Optional[str] = Field(None, description="整体错误信息")


class AgentInvokeMessage(BaseModel):
    """Agent调用消息"""
    role: str = Field(..., description="消息角色: system, user, assistant, tool")
    content: Optional[str] = Field(None, description="消息内容")
    tool_calls: Optional[List[Dict[str, Any]]] = Field(None, description="工具调用列表")
    tool_call_id: Optional[str] = Field(None, description="工具调用ID")


class AgentInvokeRequest(BaseModel):
    """Agent调用请求"""
    agent_name: Optional[str] = Field(None, description="Agent名称，不提供则使用系统默认")
    user_prompt: str = Field(..., description="用户输入消息")
    conversation_id: Optional[str] = Field(None, description="对话ID，None表示新对话")
    user_id: str = Field(default="default_user", description="用户ID")
    stream: bool = Field(default=True, description="是否流式响应")


class AgentRound(BaseModel):
    """Agent执行轮次"""
    round: int = Field(..., description="轮次编号")
    agent_name: str = Field(..., description="执行的Agent名称")
    messages: List[AgentInvokeMessage] = Field(..., description="轮次消息")
    tools: Optional[List[Dict[str, Any]]] = Field(None, description="使用的工具schema")
    model: Optional[str] = Field(None, description="使用的模型")


class TaskRound(BaseModel):
    """任务执行轮次"""
    round: int = Field(..., description="轮次编号")
    messages: List[AgentInvokeMessage] = Field(..., description="轮次消息")
    tools: Optional[List[Dict[str, Any]]] = Field(None, description="使用的工具schema")
    model: Optional[str] = Field(None, description="使用的模型")


class TaskExecution(BaseModel):
    """任务执行记录"""
    task_id: str = Field(..., description="任务ID")
    agent_name: str = Field(..., description="执行的Agent名称")
    rounds: List[TaskRound] = Field(..., description="任务执行历史")


class AgentInvokeDocument(BaseModel):
    """agent_invoke集合文档"""
    id: Optional[str] = Field(None, description="对话ID", alias="_id")
    conversation_id: str = Field(..., description="对话ID")
    rounds: List[AgentRound] = Field(default_factory=list, description="主线程轮次")
    tasks: List[TaskExecution] = Field(default_factory=list, description="任务执行记录")

    class Config:
        allow_population_by_field_name = True


class AgentInvokeResponse(BaseModel):
    """Agent调用响应（非流式）"""
    success: bool = Field(..., description="是否成功")
    conversation_id: str = Field(..., description="对话ID")
    final_response: str = Field(..., description="最终响应内容")
    rounds: List[AgentRound] = Field(..., description="执行轮次")
    error: Optional[str] = Field(None, description="错误信息")
