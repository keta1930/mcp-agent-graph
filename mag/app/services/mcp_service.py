import logging
from typing import Dict, List, Any, Optional, AsyncGenerator
from app.services.mcp.client_manager import MCPClientManager
from app.services.mcp.server_manager import MCPServerManager
from app.services.mcp.ai_mcp_generator import AIMCPGenerator
from app.services.mcp.tool_executor import ToolExecutor
from app.services.chat.message_builder import MessageBuilder
from app.infrastructure.database.mongodb import mongodb_client
logger = logging.getLogger(__name__)


class MCPService:
    """MCP服务管理 - 作为各个功能组件的协调者"""

    def __init__(self):
        # 初始化子模块
        self.client_manager = MCPClientManager()
        self.server_manager = MCPServerManager(self.client_manager.client_url)
        self.ai_mcp_generator = AIMCPGenerator()
        self.tool_executor = ToolExecutor(self)
        self.message_builder = MessageBuilder()
        self.client_process = None
        self.client_url = self.client_manager.client_url
        self.client_started = False
        self.startup_retries = 5
        self.retry_delay = 1
        self._session = None

    async def initialize(self) -> Dict[str, Dict[str, Any]]:
        """初始化MCP服务，启动客户端进程"""

        config = await mongodb_client.get_mcp_config()
        if not config:
            config = {"mcpServers": {}}
            await mongodb_client.create_mcp_config(config)

        result = await self.client_manager.initialize(config)
        self.client_process = self.client_manager.client_process
        self.client_started = self.client_manager.client_started
        return result

    async def _get_session(self):
        """获取或创建aiohttp会话"""
        return await self.server_manager._get_session()

    async def notify_client_shutdown(self) -> bool:
        """通知Client关闭"""
        return await self.client_manager.notify_client_shutdown()

    def _notify_config_change(self, config_path: str) -> bool:
        """通知客户端配置已更改"""
        return self.client_manager._notify_config_change(config_path)

    async def update_config(self, config: Dict[str, Any], expected_version: int = None) -> Dict[str, Dict[str, Any]]:
        """更新MCP配置并通知客户端"""
        if expected_version is None:
            current_config_data = await mongodb_client.get_mcp_config()
            if current_config_data:
                expected_version = current_config_data.get("version", 1)
            else:
                expected_version = 0

        return await self.client_manager.update_config(config, expected_version)

    async def get_server_status(self) -> Dict[str, Dict[str, Any]]:
        """获取所有服务器的状态"""
        if not self.client_started:
            return {}
        return await self.server_manager.get_server_status()

    def get_server_status_sync(self) -> Dict[str, Dict[str, Any]]:
        """获取所有服务器的状态"""
        if not self.client_started:
            return {}
        return self.server_manager.get_server_status_sync()

    async def connect_server(self, server_name: str) -> Dict[str, Any]:
        """连接指定的服务器"""
        if not self.client_started:
            return {"status": "error", "error": "MCP Client未启动"}
        return await self.server_manager.connect_server(server_name)

    async def connect_all_servers(self) -> Dict[str, Any]:
        """连接所有已配置的MCP服务器"""
        if not self.client_started:
            return {
                "status": "error",
                "error": "MCP Client未启动",
                "servers": {},
                "tools": {}
            }

        current_config = await mongodb_client.get_mcp_config()
        return await self.server_manager.connect_all_servers(current_config)

    async def disconnect_server(self, server_name: str) -> Dict[str, Any]:
        """断开指定服务器的连接"""
        if not self.client_started:
            return {"status": "error", "error": "MCP Client未启动"}
        return await self.server_manager.disconnect_server(server_name)

    async def get_all_tools(self) -> Dict[str, List[Dict[str, Any]]]:
        """获取所有可用工具的信息"""
        if not self.client_started:
            return {}
        return await self.server_manager.get_all_tools()

    async def prepare_chat_tools(self, mcp_servers: List[str]) -> List[Dict[str, Any]]:
        """为聊天准备MCP工具列表"""
        return await self.server_manager.prepare_chat_tools(mcp_servers)

    async def call_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """调用指定服务器的工具"""
        if not self.client_started:
            return {"error": "MCP Client未启动"}
        return await self.tool_executor.execute_single_tool(server_name, tool_name, params)

    async def get_mcp_generator_template(self) -> str:
        """获取MCP生成器的提示词模板"""
        return await self.ai_mcp_generator.get_mcp_generator_template()

    async def ai_generate_mcp_stream(self,
                                     requirement: str,
                                     model_name: str,
                                     conversation_id: Optional[str] = None,
                                     user_id: str = "default_user") -> AsyncGenerator[str, None]:
        """AI生成MCP工具的流式接口"""
        async for chunk in self.ai_mcp_generator.ai_generate_stream(
                requirement=requirement,
                model_name=model_name,
                conversation_id=conversation_id,
                user_id=user_id
        ):
            yield chunk

    async def get_mcp_generation_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取MCP生成对话"""
        return await mongodb_client.get_mcp_generation_conversation(conversation_id)

    async def register_ai_mcp_tool(self, tool_name: str) -> bool:
        """注册AI生成的MCP工具到配置"""
        return await self.ai_mcp_generator.register_ai_mcp_tool_stdio(tool_name)

    async def cleanup(self, force=True):
        """清理资源"""
        # 清理server_manager的资源
        await self.server_manager.cleanup()

        # 清理client_manager的资源
        await self.client_manager.cleanup(force)
        self.client_process = self.client_manager.client_process
        self.client_started = self.client_manager.client_started


# 创建全局MCP服务实例
mcp_service = MCPService()