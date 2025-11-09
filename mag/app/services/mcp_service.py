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
    """MCP服务管理 - 团队级架构，所有用户共享MCP Client"""

    def __init__(self):
        # 团队级单一MCP客户端
        self.client_manager: Optional[MCPClientManager] = None
        self.server_manager: Optional[MCPServerManager] = None

        # 共享模块（不依赖用户状态）
        self.ai_mcp_generator = AIMCPGenerator()
        self.message_builder = MessageBuilder()

    def _ensure_managers(self):
        """确保管理器已初始化"""
        if self.client_manager is None:
            self.client_manager = MCPClientManager()
        if self.server_manager is None:
            self.server_manager = MCPServerManager(self.client_manager.client_url)

    async def initialize(self) -> Dict[str, Dict[str, Any]]:
        """初始化团队MCP服务，启动客户端进程

        Returns:
            Dict[str, Dict[str, Any]]: 初始化结果
        """
        config_data = await mongodb_client.get_mcp_config()
        if not config_data:
            # 初始化空配置
            config = {"mcpServers": {}}
            await mongodb_client.initialize_mcp_config(config)
        else:
            config = config_data.get("config", {"mcpServers": {}})

        self._ensure_managers()
        result = await self.client_manager.initialize(config)

        logger.info("团队MCP服务初始化成功")
        return result

    async def _get_session(self):
        """获取或创建aiohttp会话"""
        self._ensure_managers()
        return await self.server_manager._get_session()

    async def notify_client_shutdown(self) -> bool:
        """通知Client关闭

        Returns:
            bool: 是否成功
        """
        self._ensure_managers()
        return await self.client_manager.notify_client_shutdown()

    def _notify_config_change(self, config_path: str) -> bool:
        """通知客户端配置已更改

        Args:
            config_path: 配置文件路径

        Returns:
            bool: 是否成功
        """
        self._ensure_managers()
        return self.client_manager._notify_config_change(config_path)

    async def update_config(self, config: Dict[str, Any], expected_version: int = None) -> Dict[str, Dict[str, Any]]:
        """更新团队MCP配置并通知客户端

        Args:
            config: 新配置
            expected_version: 期望版本号

        Returns:
            Dict[str, Dict[str, Any]]: 更新结果
        """
        if expected_version is None:
            current_config_data = await mongodb_client.get_mcp_config()
            if current_config_data:
                expected_version = current_config_data.get("version", 1)
            else:
                expected_version = 0

        self._ensure_managers()
        return await self.client_manager.update_config(config, expected_version)

    async def get_server_status(self) -> Dict[str, Dict[str, Any]]:
        """获取所有服务器的状态

        Returns:
            Dict[str, Dict[str, Any]]: 服务器状态
        """
        self._ensure_managers()
        if not self.client_manager.client_started:
            return {}
        return await self.server_manager.get_server_status()

    def get_server_status_sync(self) -> Dict[str, Dict[str, Any]]:
        """同步获取所有服务器的状态

        Returns:
            Dict[str, Dict[str, Any]]: 服务器状态
        """
        self._ensure_managers()
        if not self.client_manager.client_started:
            return {}
        return self.server_manager.get_server_status_sync()

    async def connect_server(self, server_name: str) -> Dict[str, Any]:
        """连接指定的服务器

        Args:
            server_name: 服务器名称

        Returns:
            Dict[str, Any]: 连接结果
        """
        self._ensure_managers()
        if not self.client_manager.client_started:
            return {"status": "error", "error": "MCP Client未启动"}
        return await self.server_manager.connect_server(server_name)

    async def connect_all_servers(self) -> Dict[str, Any]:
        """连接所有已配置的MCP服务器

        Returns:
            Dict[str, Any]: 连接结果
        """
        self._ensure_managers()
        if not self.client_manager.client_started:
            return {
                "status": "error",
                "error": "MCP Client未启动",
                "servers": {},
                "tools": {}
            }

        current_config_data = await mongodb_client.get_mcp_config()
        current_config = current_config_data.get("config", {"mcpServers": {}}) if current_config_data else {"mcpServers": {}}
        return await self.server_manager.connect_all_servers(current_config)

    async def disconnect_server(self, server_name: str) -> Dict[str, Any]:
        """断开指定服务器的连接

        Args:
            server_name: 服务器名称

        Returns:
            Dict[str, Any]: 断开结果
        """
        self._ensure_managers()
        if not self.client_manager.client_started:
            return {"status": "error", "error": "MCP Client未启动"}
        return await self.server_manager.disconnect_server(server_name)

    async def get_all_tools(self) -> Dict[str, List[Dict[str, Any]]]:
        """获取所有可用工具的信息

        Returns:
            Dict[str, List[Dict[str, Any]]]: 工具信息
        """
        self._ensure_managers()
        if not self.client_manager.client_started:
            return {}
        return await self.server_manager.get_all_tools()

    async def prepare_chat_tools(self, mcp_servers: List[str]) -> List[Dict[str, Any]]:
        """为聊天准备MCP工具列表

        Args:
            mcp_servers: MCP服务器列表

        Returns:
            List[Dict[str, Any]]: 工具列表
        """
        self._ensure_managers()
        return await self.server_manager.prepare_chat_tools(mcp_servers)

    async def call_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """调用指定服务器的工具

        Args:
            server_name: 服务器名称
            tool_name: 工具名称
            params: 工具参数

        Returns:
            Dict[str, Any]: 工具执行结果
        """
        self._ensure_managers()
        if not self.client_manager.client_started:
            return {"error": "MCP Client未启动"}
        tool_executor = ToolExecutor(self)
        return await tool_executor.execute_single_tool(server_name, tool_name, params)

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

    async def register_ai_mcp_tool(self, tool_name: str, user_id: str = "default_user") -> bool:
        """注册AI生成的MCP工具到团队配置

        Args:
            tool_name: 工具名称
            user_id: 用户ID（作为provider记录）

        Returns:
            bool: 是否成功
        """
        return await self.ai_mcp_generator.register_ai_mcp_tool_stdio(tool_name, user_id)

    async def cleanup(self, force: bool = True):
        """清理资源

        Args:
            force: 是否强制清理
        """
        if self.server_manager:
            await self.server_manager.cleanup()

        if self.client_manager:
            await self.client_manager.cleanup(force)

        logger.info("已清理团队MCP资源")


# 创建全局MCP服务实例
mcp_service = MCPService()
