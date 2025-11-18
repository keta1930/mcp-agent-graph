from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator

class TokenUsage(BaseModel):
    """Token使用量统计"""
    total_tokens: int = Field(..., description="总token数")
    prompt_tokens: int = Field(..., description="输入token数")
    completion_tokens: int = Field(..., description="输出token数")

class ConversationListItem(BaseModel):
    """对话列表项（包含conversations集合的所有字段）"""
    conversation_id: str = Field(..., description="对话ID", alias="_id")
    user_id: str = Field(..., description="用户ID")
    type: str = Field(..., description="对话类型：agent（Agent对话）/ graph（图执行）")
    title: str = Field(..., description="对话标题")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")
    round_count: int = Field(..., description="轮次数")
    total_token_usage: TokenUsage = Field(..., description="总token使用量统计")
    status: str = Field(..., description="对话状态：active（活跃）/ deleted（已删除）/ favorite（收藏）")
    tags: List[str] = Field(default_factory=list, description="标签列表")

    class Config:
        allow_population_by_field_name = True

    @validator('type')
    def validate_type(cls, v):
        """验证对话类型只能是 agent 或 graph"""
        valid_types = ["agent", "graph"]
        if v not in valid_types:
            raise ValueError(f'对话类型必须是以下值之一: {", ".join(valid_types)}')
        return v


class ConversationListResponse(BaseModel):
    """对话列表响应"""
    conversations: List[ConversationListItem] = Field(..., description="对话列表")
    total_count: int = Field(..., description="总数量")


class InputConfig(BaseModel):
    """输入配置（用户在对话中使用的配置）"""
    selected_model: Optional[str] = Field(None, description="选择的模型")
    selected_graph: Optional[str] = Field(None, description="选择的 Graph")
    system_prompt: Optional[str] = Field(None, description="系统提示词")
    selected_mcp_servers: Optional[List[str]] = Field(None, description="选择的 MCP 服务器列表")
    selected_agent: Optional[str] = Field(None, description="选择的 Agent")
    selected_system_tools: Optional[List[str]] = Field(None, description="选择的系统工具")
    max_iterations: Optional[int] = Field(None, description="最大迭代次数")


class ConversationDetailResponse(BaseModel):
    """对话详情响应（完整内容，支持所有类型）"""
    conversation_id: str = Field(..., description="对话ID", alias="_id")
    title: str = Field(..., description="对话标题")
    rounds: List[Dict[str, Any]] = Field(default_factory=list, description="完整消息轮次（原始格式）")
    type: Optional[str] = Field(None, description="对话类型：agent（Agent对话）/ graph（图执行）")

    # 文档/文件信息
    documents: Optional[Dict[str, Any]] = Field(None, description="对话关联的文档/文件信息")

    # AI生成对话的解析结果（图生成/MCP生成时）
    parsed_results: Optional[Dict[str, Any]] = Field(None, description="AI生成的解析结果")

    # 图执行对话的扩展字段
    execution_chain: Optional[List[List[str]]] = Field(None, description="图执行链")
    final_result: Optional[str] = Field(None, description="最终执行结果")
    
    # Agent 对话的扩展字段
    tasks: Optional[List[Dict[str, Any]]] = Field(None, description="Sub Agent 任务列表")
    
    # 输入配置（用户在对话中使用的配置）
    input_config: Optional[InputConfig] = Field(None, description="用户输入配置")

    class Config:
        allow_population_by_field_name = True


class UpdateConversationTitleRequest(BaseModel):
    """更新对话标题请求"""
    title: str = Field(..., description="新的对话标题", max_length=100)
    user_id: str = Field(default="default_user", description="用户ID")


class UpdateConversationTagsRequest(BaseModel):
    """更新对话标签请求"""
    tags: List[str] = Field(..., description="新的标签列表")
    user_id: str = Field(default="default_user", description="用户ID")

    @validator('tags')
    def validate_tags(cls, v):
        """验证标签格式"""
        if len(v) > 10:
            raise ValueError('标签数量不能超过10个')
        for tag in v:
            if not tag.strip():
                raise ValueError('标签不能为空')
            if len(tag) > 20:
                raise ValueError('单个标签长度不能超过20个字符')
        return [tag.strip() for tag in v]


class ConversationCompactRequest(BaseModel):
    """对话压缩请求"""
    conversation_id: str = Field(..., description="要压缩的对话ID")
    model_name: str = Field(..., description="用于内容总结的模型名称")
    compact_type: str = Field(default="brutal", description="压缩类型：precise（精确压缩）/ brutal（暴力压缩）")
    compact_threshold: int = Field(default=2000, description="压缩阈值，超过此长度的tool content将被压缩")
    user_id: str = Field(default="default_user", description="用户ID")

    @validator('compact_type')
    def validate_compact_type(cls, v):
        """验证压缩类型"""
        if v not in ['precise', 'brutal']:
            raise ValueError('压缩类型只能是 precise 或 brutal')
        return v

    @validator('compact_threshold')
    def validate_compact_threshold(cls, v):
        """验证压缩阈值"""
        if v < 100:
            raise ValueError('压缩阈值不能小于100')
        if v > 10000:
            raise ValueError('压缩阈值不能大于10000')
        return v


class ConversationCompactResponse(BaseModel):
    """对话压缩响应"""
    status: str = Field(..., description="压缩状态：success 或 error")
    message: str = Field(..., description="响应消息")
    conversation_id: str = Field(..., description="对话ID")
    compact_type: str = Field(..., description="压缩类型")
    statistics: Optional[Dict[str, Any]] = Field(None, description="压缩统计信息")
    error: Optional[str] = Field(None, description="错误信息")


class UpdateConversationStatusRequest(BaseModel):
    """更新对话状态请求"""
    status: str = Field(..., description="新状态：active（活跃）/ deleted（软删除）/ favorite（收藏）")
    user_id: str = Field(default="default_user", description="用户ID")

    @validator('status')
    def validate_status(cls, v):
        """验证状态值"""
        valid_statuses = ["active", "deleted", "favorite"]
        if v not in valid_statuses:
            raise ValueError(f'状态必须是以下值之一: {", ".join(valid_statuses)}')
        return v


class UpdateInputConfigRequest(BaseModel):
    """更新输入配置请求"""
    input_config: InputConfig = Field(..., description="输入配置")
    user_id: str = Field(default="default_user", description="用户ID")