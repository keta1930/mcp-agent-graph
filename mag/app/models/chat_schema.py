from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator


class ChatCompletionRequest(BaseModel):
    """Chat完成请求"""
    user_prompt: str = Field(..., description="用户输入的消息内容")
    system_prompt: str = Field(default=None, description="系统提示词")
    mcp_servers: List[str] = Field(default_factory=list, description="选择的MCP服务器列表")
    model_name: str = Field(..., description="选择的模型名称")
    conversation_id: Optional[str] = Field(default=None, description="对话ID，为None时表示临时对话")
    user_id: str = Field(default="default_user", description="用户ID")
    stream: bool = Field(default=True, description="是否使用流式响应")


class ChatMessage(BaseModel):
    """Chat消息模型 - OpenAI兼容"""
    role: str = Field(..., description="消息角色: system, user, assistant, tool")
    content: Optional[str] = Field(None, description="消息内容")
    tool_calls: Optional[List[Dict[str, Any]]] = Field(None, description="工具调用列表")
    tool_call_id: Optional[str] = Field(None, description="工具调用ID（tool消息专用）")


class TokenUsage(BaseModel):
    """Token使用量统计"""
    total_tokens: int = Field(..., description="总token数")
    prompt_tokens: int = Field(..., description="输入token数")
    completion_tokens: int = Field(..., description="输出token数")


class ConversationListItem(BaseModel):
    """对话列表项（包含conversations集合的所有字段）"""
    conversation_id: str = Field(..., description="对话ID", alias="_id")
    user_id: str = Field(..., description="用户ID")
    type: str = Field(..., description="对话类型：chat（聊天）/ agent（AI生成）")
    title: str = Field(..., description="对话标题")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")
    round_count: int = Field(..., description="轮次数")
    total_token_usage: TokenUsage = Field(..., description="总token使用量统计")
    status: str = Field(..., description="对话状态：active（活跃）/ deleted（已删除）")
    tags: List[str] = Field(default_factory=list, description="标签列表")

    class Config:
        allow_population_by_field_name = True


class ConversationListResponse(BaseModel):
    """对话列表响应"""
    conversations: List[ConversationListItem] = Field(..., description="对话列表")
    total_count: int = Field(..., description="总数量")


class ConversationRound(BaseModel):
    """对话轮次"""
    round: int = Field(..., description="轮次编号")
    messages: List[ChatMessage] = Field(..., description="轮次消息列表")


class ConversationDetailResponse(BaseModel):
    """对话详情响应（完整内容，支持所有类型）"""
    conversation_id: str = Field(..., description="对话ID", alias="_id")
    title: str = Field(..., description="对话标题")
    rounds: List[Dict[str, Any]] = Field(default_factory=list, description="完整消息轮次（原始OpenAI格式）")
    generation_type: Optional[str] = Field(None, description="生成类型：graph（图生成）/ mcp（工具生成）/ chat")

    # AI生成对话的解析结果
    parsed_results: Optional[Dict[str, Any]] = Field(None, description="AI生成的解析结果（graph/mcp生成时）")

    # 图执行对话的扩展字段
    execution_chain: Optional[List[List[str]]] = Field(None, description="图执行链（graph运行时）")
    final_result: Optional[str] = Field(None, description="最终执行结果（graph运行时）")

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
        # 验证标签格式
        if len(v) > 10:  # 限制最多10个标签
            raise ValueError('标签数量不能超过10个')
        for tag in v:
            if not tag.strip():
                raise ValueError('标签不能为空')
            if len(tag) > 20:  # 限制单个标签长度
                raise ValueError('单个标签长度不能超过20个字符')
        return [tag.strip() for tag in v]  # 去除空格


class ConversationCompactRequest(BaseModel):
    """对话压缩请求"""
    conversation_id: str = Field(..., description="要压缩的对话ID")
    model_name: str = Field(..., description="用于内容总结的模型名称")
    compact_type: str = Field(default="brutal", description="压缩类型：precise（精确压缩）/ brutal（暴力压缩）")
    compact_threshold: int = Field(default=2000, description="压缩阈值，超过此长度的tool content将被压缩")
    user_id: str = Field(default="default_user", description="用户ID")

    @validator('compact_type')
    def validate_compact_type(cls, v):
        if v not in ['precise', 'brutal']:
            raise ValueError('压缩类型只能是 precise 或 brutal')
        return v

    @validator('compact_threshold')
    def validate_compact_threshold(cls, v):
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


class GraphGenerationSession(BaseModel):
    """图生成会话模型"""
    conversation_id: str = Field(..., description="对话ID", alias="_id")
    user_id: str = Field(..., description="用户ID")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")
    total_token_usage: Dict[str, int] = Field(..., description="总token使用量")
    messages: List[ChatMessage] = Field(..., description="对话消息列表")
    parsed_results: Dict[str, Any] = Field(..., description="解析结果")
    final_graph_config: Optional[Dict[str, Any]] = Field(None, description="最终图配置")

    class Config:
        allow_population_by_field_name = True


class MCPGenerationSession(BaseModel):
    """MCP生成会话模型"""
    conversation_id: str = Field(..., description="对话ID", alias="_id")
    user_id: str = Field(..., description="用户ID")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")
    total_token_usage: Dict[str, int] = Field(..., description="总token使用量")
    messages: List[ChatMessage] = Field(..., description="对话消息列表")
    parsed_results: Dict[str, Any] = Field(..., description="解析结果")
    final_mcp_config: Optional[Dict[str, Any]] = Field(None, description="最终MCP配置")

    class Config:
        allow_population_by_field_name = True


class UpdateConversationStatusRequest(BaseModel):
    """更新对话状态请求"""
    status: str = Field(..., description="新状态：active（活跃）/ deleted（软删除）/ favorite（收藏）")
    user_id: str = Field(default="default_user", description="用户ID")

    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ["active", "deleted", "favorite"]
        if v not in valid_statuses:
            raise ValueError(f'状态必须是以下值之一: {", ".join(valid_statuses)}')
        return v