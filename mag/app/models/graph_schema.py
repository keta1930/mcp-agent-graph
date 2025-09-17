from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator, root_validator

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
    context_mode: str = Field(default="all", description="全局内容获取模式，可选值：all（获取全部）, 数字（获取最新n次输出，如'1','2','3'等）")
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

    @validator('context_mode')
    def validate_context_mode(cls, v):
        """验证context_mode格式"""
        if v == "all":
            return v
        try:
            n = int(v)
            if n <= 0:
                raise ValueError('context_mode数字值必须大于0')
            return v
        except ValueError:
            if 'context_mode数字值必须大于0' in str(ValueError):
                raise
            raise ValueError('context_mode必须是"all"或正整数字符串（如"1","2","3"等）')


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
    continue_from_checkpoint: bool = Field(default=False, description="是否从断点继续执行")

class GraphFilePath(BaseModel):
    file_path: str

class GraphGenerationRequest(BaseModel):
    """图生成请求"""
    requirement: str  # 用户的图生成需求
    model_name: str   # 指定的模型名称
    conversation_id: Optional[str] = None  # 对话ID，为空时创建新对话
    graph_name: Optional[str] = None  # 图名称，用于更新已有的图
    user_id: str = Field(default="default_user", description="用户ID")
    mcp_servers: List[str] = Field(default=[], description="需要使用的MCP服务器名称列表")
    stream: bool = Field(default=True, description="是否使用流式响应")  # 新增

class GraphGenerationResponse(BaseModel):
    """图生成响应"""
    status: str = Field(..., description="响应状态：success 或 error")
    message: Optional[str] = Field(None, description="响应消息")
    conversation_id: Optional[str] = Field(None, description="对话ID")
    graph_name: Optional[str] = Field(None, description="生成的图名称")
    final_graph_config: Optional[Dict[str, Any]] = Field(None, description="最终生成的图配置")
    error: Optional[str] = Field(None, description="错误信息")

class PromptTemplateRequest(BaseModel):
    """提示词模板生成请求"""
    mcp_servers: List[str] = Field(default=[], description="需要使用的MCP服务器名称列表")
    graph_name: Optional[str] = Field(None, description="图名称，用于包含具体图配置")

