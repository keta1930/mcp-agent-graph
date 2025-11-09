from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, root_validator

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

    # 团队共享字段
    provider_user_id: Optional[str] = Field(None, description="提供者用户ID")
    created_at: Optional[str] = Field(None, description="创建时间")

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

        transport_type = values.get('transportType', '').lower().replace('-', '_')
        if transport_type in ['streamable_http', 'streamablehttp']:
            values['transportType'] = 'streamable_http'

        if not values.get('transportType') or values.get('transportType') == 'stdio':
            if values.get('url'):
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


class MCPConfigWithVersion(BaseModel):
    """MCP配置"""
    config: MCPConfig = Field(..., description="MCP配置内容")
    version: int = Field(..., description="配置版本号")


class MCPServerAddRequest(BaseModel):
    """添加MCP服务器请求"""
    mcpServers: Dict[str, MCPServerConfig] = Field(
        ...,
        description="要添加的服务器配置"
    )
    version: int = Field(..., description="客户端读取时的版本号")


class MCPServerRemoveRequest(BaseModel):
    """删除MCP服务器请求"""
    server_names: List[str] = Field(..., description="要删除的服务器名称列表")
    version: int = Field(..., description="客户端读取时的版本号")


class MCPConfigResponse(BaseModel):
    """MCP配置响应（包含用户信息）"""
    config: MCPConfig = Field(..., description="MCP配置内容")
    version: int = Field(..., description="配置版本号")
    user_id: str = Field(..., description="配置所有者用户ID")
    shared_with: List[str] = Field(default_factory=list, description="共享给的用户列表")
    updated_at: Optional[str] = Field(None, description="最后更新时间")


class MCPGenerationRequest(BaseModel):
    """MCP生成请求"""
    requirement: str
    model_name: str
    conversation_id: Optional[str] = None
    user_id: str = Field(default="default_user", description="用户ID")
    stream: bool = Field(default=True, description="是否使用流式响应")


class MCPToolRegistration(BaseModel):
    """MCP工具注册请求"""
    folder_name: str
    script_files: Dict[str, str]
    readme: str
    dependencies: str


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