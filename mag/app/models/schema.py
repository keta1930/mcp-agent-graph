from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator, root_validator


class MCPServerConfig(BaseModel):
    """MCP服务器配置"""
    autoApprove: List[str] = Field(default_factory=list, description="自动批准的工具列表")
    disabled: bool = Field(default=False, description="是否禁用服务器")
    timeout: int = Field(default=60, description="超时时间（秒）")
    command: Optional[str] = None
    args: List[str] = Field(default_factory=list, description="服务器启动参数")
    transportType: str = Field(default="stdio", description="传输类型")
    url: Optional[str] = Field(None, description="SSE服务器URL")
    type: Optional[str] = Field(None, description="服务器类型，会自动转换为transportType")
    env: Optional[Dict[str, str]] = Field(None, description="环境变量")

    @root_validator(pre=False, skip_on_failure=True)
    def normalize_config(cls, values):
        """规范化配置，处理type字段转换和字段验证"""
        if 'type' in values and values['type']:
            type_value = values['type'].lower()
            if type_value == 'sse':
                values['transportType'] = 'sse'
            elif type_value == 'stdio':
                values['transportType'] = 'stdio'
            elif type_value in ['streamable_http', 'streamable-http']:
                values['transportType'] = 'streamable_http'
        
        # 规范化 transportType 字段
        transport_type = values.get('transportType', '').lower().replace('-', '_')
        if transport_type in ['streamable_http', 'streamablehttp']:
            values['transportType'] = 'streamable_http'
        
        if not values.get('transportType') or values.get('transportType') == 'stdio':
            if values.get('url'):
                # 如果有URL但没有明确指定类型，默认为streamable_http
                values['transportType'] = 'streamable_http'
            elif values.get('command'):
                values['transportType'] = 'stdio'
        
        transport_type = values.get('transportType', 'stdio')
        if transport_type in ['sse', 'streamable_http'] and not values.get('url'):
            raise ValueError(f'{transport_type}传输类型必须提供url字段')
        if transport_type == 'stdio' and not values.get('command'):
            raise ValueError('stdio传输类型必须提供command字段')
        
        return values

    def dict(self, **kwargs):
        """dict方法，根据传输类型过滤字段"""
        data = super().dict(exclude_none=True, **kwargs)
        
        transport_type = data.get('transportType', 'stdio')

        data.pop('type', None)
        
        # 根据传输类型过滤字段
        if transport_type in ['sse', 'streamable_http']:
            data.pop('command', None)
            data.pop('args', None)
            if 'args' in data and not data['args']:
                del data['args']
        elif transport_type == 'stdio':
            data.pop('url', None)       
        if 'args' in data and (not data['args'] or data['args'] == []):
            del data['args']
        if 'autoApprove' in data and (not data['autoApprove'] or data['autoApprove'] == []):
            data['autoApprove'] = []  
        if 'env' in data and (not data['env']):
            del data['env']
        return data

    class Config:
        extra = "allow"


class MCPConfig(BaseModel):
    """MCP配置"""
    mcpServers: Dict[str, MCPServerConfig] = Field(
        default_factory=dict,
        description="MCP服务器配置，键为服务器名称"
    )
    
    def dict(self, **kwargs):
        """dict方法确保服务器配置正确过滤"""
        data = super().dict(**kwargs)
        
        if 'mcpServers' in data:
            filtered_servers = {}
            for server_name, server_config in data['mcpServers'].items():
                if isinstance(server_config, MCPServerConfig):
                    filtered_servers[server_name] = server_config.dict()
                else:
                    server_obj = MCPServerConfig(**server_config)
                    filtered_servers[server_name] = server_obj.dict()
            data['mcpServers'] = filtered_servers
        
        return data


class ModelConfig(BaseModel):
    """模型配置 - 支持所有OpenAI API参数"""
    # 必填参数（保持不变）
    name: str = Field(..., description="模型名称")
    base_url: str = Field(..., description="API基础URL")
    api_key: str = Field(..., description="API密钥")
    model: str = Field(..., description="模型标识符")
    
    # 可选的OpenAI API参数
    stream: Optional[bool] = Field(default=False, description="是否启用流式返回")
    temperature: Optional[float] = Field(default=None, description="温度参数，控制随机性(0.0-2.0)")
    max_tokens: Optional[int] = Field(default=None, description="最大令牌数")
    max_completion_tokens: Optional[int] = Field(default=None, description="最大完成令牌数")
    top_p: Optional[float] = Field(default=None, description="核采样参数(0.0-1.0)")
    frequency_penalty: Optional[float] = Field(default=None, description="频率惩罚(-2.0-2.0)")
    presence_penalty: Optional[float] = Field(default=None, description="存在惩罚(-2.0-2.0)")
    n: Optional[int] = Field(default=None, description="生成的完成数量")
    stop: Optional[Union[str, List[str]]] = Field(default=None, description="停止序列")
    seed: Optional[int] = Field(default=None, description="随机种子")
    logprobs: Optional[bool] = Field(default=None, description="是否返回对数概率")
    top_logprobs: Optional[int] = Field(default=None, description="返回的顶部对数概率数量")
    extra_body: Optional[Dict[str, Any]] = Field(default=None, description="额外的请求体参数")
    extra_headers: Optional[Dict[str, str]] = Field(default=None, description="额外的请求头")
    timeout: Optional[float] = Field(default=None, description="请求超时时间（秒）")

    @validator('temperature')
    def validate_temperature(cls, v):
        if v is not None and (v < 0.0 or v > 2.0):
            raise ValueError('温度参数必须在0.0到2.0之间')
        return v

    @validator('top_p')
    def validate_top_p(cls, v):
        if v is not None and (v < 0.0 or v > 1.0):
            raise ValueError('top_p参数必须在0.0到1.0之间')
        return v

    @validator('frequency_penalty')
    def validate_frequency_penalty(cls, v):
        if v is not None and (v < -2.0 or v > 2.0):
            raise ValueError('frequency_penalty参数必须在-2.0到2.0之间')
        return v

    @validator('presence_penalty')
    def validate_presence_penalty(cls, v):
        if v is not None and (v < -2.0 or v > 2.0):
            raise ValueError('presence_penalty参数必须在-2.0到2.0之间')
        return v

    @validator('n')
    def validate_n(cls, v):
        if v is not None and v < 1:
            raise ValueError('n参数必须大于0')
        return v

    @validator('max_tokens')
    def validate_max_tokens(cls, v):
        if v is not None and v < 1:
            raise ValueError('max_tokens参数必须大于0')
        return v

    @validator('max_completion_tokens')
    def validate_max_completion_tokens(cls, v):
        if v is not None and v < 1:
            raise ValueError('max_completion_tokens参数必须大于0')
        return v

    @validator('top_logprobs')
    def validate_top_logprobs(cls, v):
        if v is not None and (v < 0 or v > 20):
            raise ValueError('top_logprobs参数必须在0到20之间')
        return v

    @validator('timeout')
    def validate_timeout(cls, v):
        if v is not None and v <= 0:
            raise ValueError('timeout参数必须大于0')
        return v

    class Config:
        extra = "allow"


class ModelConfigList(BaseModel):
    """模型配置列表"""
    models: List[ModelConfig] = Field(default_factory=list)

class AgentNode(BaseModel):
    """Agent节点配置"""
    name: str = Field(..., description="节点名称")
    description: Optional[str] = Field(default="", description="节点描述，用于工具选择提示")
    model_name: Optional[str] = Field(default=None, description="使用的模型名称")
    mcp_servers: List[str] = Field(default_factory=list, description="使用的MCP服务器名称列表")
    system_prompt: str = Field(default="", description="系统提示词")
    user_prompt: str = Field(default="", description="用户提示词")
    input_nodes: List[str] = Field(default_factory=list, description="输入节点列表")
    output_nodes: List[str] = Field(default_factory=list, description="输出节点列表")
    handoffs: Optional[int] = Field(default=None, description="节点可以执行的选择次数，用于支持循环流程")
    global_output: bool = Field(default=False, description="是否全局管理此节点的输出")
    context: List[str] = Field(default_factory=list, description="需要引用的全局管理节点列表")
    context_mode: str = Field(default="all", description="全局内容获取模式，可选值：all, latest, latest_n")
    context_n: int = Field(default=1, description="获取最新的n次输出，当context_mode为latest_n时有效")
    output_enabled: bool = Field(default=True, description="是否输出回复")
    is_subgraph: bool = Field(default=False, description="是否为子图节点")
    subgraph_name: Optional[str] = Field(default=None, description="子图名称")
    position: Optional[Dict[str, float]] = Field(default=None, description="节点在画布中的位置")
    level: Optional[int] = Field(default=None, description="节点在图中的层级，用于确定执行顺序")
    save: Optional[str] = Field(default=None, description="输出保存的文件扩展名，如md、html、py、txt等")

    @validator('name')
    def name_must_be_valid(cls, v):
        if not v or '/' in v or '\\' in v or '.' in v:
            raise ValueError('名称不能包含特殊字符 (/, \\, .)')
        return v

    @validator('model_name')
    def validate_model_name(cls, v, values):
        is_subgraph = values.get('is_subgraph', False)
        if not is_subgraph and not v and values.get('name'):
            raise ValueError(f"普通节点 '{values['name']}' 必须指定模型名称")
        return v

    @validator('subgraph_name')
    def validate_subgraph_name(cls, v, values):
        if values.get('is_subgraph', False) and not v and values.get('name'):
            raise ValueError(f"子图节点 '{values['name']}' 必须指定子图名称")
        return v

    @validator('level')
    def validate_level(cls, v):
        if v is None:
            return None  
        try:
            return int(v) 
        except (ValueError, TypeError):
            return None  

    @validator('save')
    def validate_save(cls, v):
        if v is None:
            return None
        v = v.strip().lower()
        if v and not v.isalnum():
            v = ''.join(c for c in v if c.isalnum())
        return v


class GraphConfig(BaseModel):
    """图配置"""
    name: str = Field(..., description="图名称")
    description: str = Field(default="", description="图描述")
    nodes: List[AgentNode] = Field(default_factory=list, description="节点列表")
    end_template: Optional[str] = Field(default=None, description="终止节点输出模板，支持{node_name}格式的占位符引用其他节点的输出")

    @validator('name')
    def name_must_be_valid(cls, v):
        if not v or '/' in v or '\\' in v or '.' in v:
            raise ValueError('名称不能包含特殊字符 (/, \\, .)')
        return v


class GraphInput(BaseModel):
    """图执行输入"""
    graph_name: Optional[str] = Field(None, description="图名称")
    input_text: Optional[str] = Field(None, description="输入文本")
    conversation_id: Optional[str] = Field(None, description="会话ID，用于继续现有会话")
    parallel: bool = Field(default=False, description="是否启用并行执行")
    continue_from_checkpoint: bool = Field(default=False, description="是否从断点继续执行")

class NodeResult(BaseModel):
    """节点执行结果"""
    node_name: str = Field(..., description="节点名称")
    input: str = Field(..., description="输入内容")
    output: str = Field(..., description="输出内容")
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list, description="工具调用")
    tool_results: List[Dict[str, Any]] = Field(default_factory=list, description="工具调用结果")
    is_subgraph: Optional[bool] = Field(default=False, description="是否为子图节点")
    subgraph_name: Optional[str] = Field(default=None, description="子图名称")
    subgraph_conversation_id: Optional[str] = Field(default=None, description="子图会话ID")
    subgraph_results: Optional[List[Dict[str, Any]]] = Field(default=None, description="子图执行结果")
    error: Optional[str] = Field(default=None, description="错误信息（如果有）")
    is_start_input: Optional[bool] = Field(default=None, description="是否为起始输入")


class GraphResult(BaseModel):
    """图执行结果"""
    graph_name: str = Field(..., description="图名称")
    conversation_id: str = Field(..., description="会话ID")
    input: str = Field(..., description="输入内容")
    output: str = Field(..., description="最终输出内容")
    node_results: List[NodeResult] = Field(default_factory=list, description="节点执行结果")
    execution_chain: Optional[Any] = Field(default=None, description="执行链条")
    completed: bool = Field(default=False, description="是否完成执行")
    error: Optional[str] = Field(default=None, description="错误信息（如果有）")

class GraphGenerationRequest(BaseModel):
    """图生成请求"""
    requirement: str  # 用户的图生成需求
    model_name: str   # 指定的模型名称

class GraphOptimizationRequest(BaseModel):
    """图优化请求"""
    graph_name: str   # 要优化的图名称
    optimization_requirement: str  # 优化需求描述
    model_name: str   # 指定的模型名称

class GraphFilePath(BaseModel):
    file_path: str


class MCPGenerationRequest(BaseModel):
    """MCP生成请求"""
    requirement: str  # 用户的MCP生成需求
    model_name: str   # 指定的模型名称

class MCPToolRegistration(BaseModel):
    """MCP工具注册请求"""
    folder_name: str
    script_files: Dict[str, str]  # 文件名: 文件内容
    readme: str
    dependencies: str
    port: Optional[int] = None

class MCPGenerationResponse(BaseModel):
    """MCP生成响应"""
    status: str
    message: Optional[str] = None
    tool_name: Optional[str] = None
    folder_name: Optional[str] = None
    port: Optional[int] = None
    model_output: Optional[str] = None
    error: Optional[str] = None

class MCPToolTestRequest(BaseModel):
    """MCP工具测试请求"""
    server_name: str = Field(..., description="服务器名称")
    tool_name: str = Field(..., description="工具名称") 
    params: Dict[str, Any] = Field(default_factory=dict, description="工具参数")

class MCPToolTestResponse(BaseModel):
    """MCP工具测试响应"""
    status: str = Field(..., description="调用状态：success 或 error")
    server_name: str = Field(..., description="服务器名称")
    tool_name: str = Field(..., description="工具名称")
    params: Dict[str, Any] = Field(..., description="调用参数")
    result: Optional[Any] = Field(None, description="工具返回结果")
    error: Optional[str] = Field(None, description="错误信息")
    execution_time: Optional[float] = Field(None, description="执行时间（秒）")