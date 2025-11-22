from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator

class AgentNode(BaseModel):
    """Graph节点配置，支持Agent调用与参数覆盖"""
    # 节点标识
    name: str = Field(..., description="节点名称")
    description: Optional[str] = Field(default="", description="节点描述")

    # Agent配置
    agent_name: Optional[str] = Field(default=None, description="Agent名称，不提供则为手动配置模式")

    # 执行参数
    model_name: Optional[str] = Field(default=None, description="模型名称")
    system_prompt: Optional[str] = Field(default="", description="系统提示词")
    user_prompt: Optional[str] = Field(default="", description="用户提示词")
    mcp_servers: Optional[List[str]] = Field(default=None, description="MCP服务器列表")
    system_tools: Optional[List[str]] = Field(default=None, description="系统工具列表")
    max_iterations: Optional[int] = Field(default=50, description="最大迭代次数")

    # Graph流程控制
    input_nodes: List[str] = Field(default_factory=list, description="输入节点列表")
    output_nodes: List[str] = Field(default_factory=list, description="输出节点列表")
    handoffs: Optional[int] = Field(default=None, description="节点可以执行的选择次数，用于支持循环流程")
    output_enabled: bool = Field(default=True, description="是否输出回复")

    # 子图支持
    is_subgraph: bool = Field(default=False, description="是否为子图节点")
    subgraph_name: Optional[str] = Field(default=None, description="子图名称")

    # UI相关
    position: Optional[Dict[str, float]] = Field(default=None, description="节点在画布中的位置")
    level: Optional[int] = Field(default=None, description="节点在图中的层级，用于确定执行顺序")

    @validator('name')
    def name_must_be_valid(cls, v):
        if not v or '/' in v or '\\' in v or '.' in v:
            raise ValueError('名称不能包含特殊字符 (/, \\, .)')
        return v

    @validator('model_name')
    def validate_model_name(cls, v, values):
        is_subgraph = values.get('is_subgraph', False)
        agent_name = values.get('agent_name')
        node_name = values.get('name', '')

        # 子图节点不需要验证
        if is_subgraph:
            return v

        # 清理 model_name
        model_name = v.strip() if v else None

        # 普通节点：必须提供 agent_name 或 model_name
        if not agent_name and not model_name:
            raise ValueError(f"节点 '{node_name}' 必须提供 agent_name 或 model_name")

        return model_name

    @validator('subgraph_name')
    def validate_subgraph_name(cls, v, values):
        if values.get('is_subgraph', False) and not v and values.get('name'):
            raise ValueError(f"子图节点 '{values['name']}' 必须指定子图名称")
        return v

    @validator('max_iterations')
    def validate_max_iterations(cls, v):
        if v is not None and (v < 1 or v > 200):
            raise ValueError('max_iterations 必须在 1-200 范围内')
        return v

    @validator('level')
    def validate_level(cls, v):
        if v is None:
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None


class GraphConfig(BaseModel):
    """图配置"""
    name: str = Field(..., description="图名称")
    description: str = Field(default="", description="图描述")
    nodes: List[AgentNode] = Field(default_factory=list, description="节点列表")
    end_template: Optional[str] = Field(default=None, description="终止节点输出模板")
    readme: Optional[str] = Field(default=None, description="图的README文档")

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
    background: bool = Field(default=False, description="是否后台执行，默认为False使用SSE模式")

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

# ======= 版本管理相关模型 =======

class CreateVersionRequest(BaseModel):
    """创建版本请求"""
    commit_message: str = Field(..., description="提交信息（类似 Git commit message）", min_length=1)

class CreateVersionResponse(BaseModel):
    """创建版本响应"""
    status: str = Field(..., description="状态")
    message: str = Field(..., description="消息")
    version_id: Optional[str] = Field(None, description="MinIO版本ID")
    version_count: Optional[int] = Field(None, description="当前版本总数")

class GraphVersionRecord(BaseModel):
    """图版本记录"""
    version_id: str = Field(..., description="MinIO版本ID")
    commit_message: str = Field(..., description="提交信息")
    created_at: str = Field(..., description="创建时间（ISO格式）")
    size: int = Field(..., description="配置文件大小（字节）")

class GraphVersionListResponse(BaseModel):
    """版本列表响应"""
    graph_name: str
    version_count: int
    versions: List[GraphVersionRecord]

class GetVersionConfigResponse(BaseModel):
    """获取版本配置响应"""
    version_id: str
    graph_name: str
    commit_message: Optional[str] = None
    config: Dict[str, Any]
