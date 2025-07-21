import asyncio
import json
import logging
import os
from typing import Dict, List, Any, Optional

from app.core.config import settings
from app.core.file_manager import FileManager
from app.services.model_service import model_service
from app.services.mcp.client_manager import MCPClientManager
from app.services.mcp.server_manager import MCPServerManager
from app.services.mcp.ai_generator import MCPAIGenerator
from app.services.mcp.tool_executor import ToolExecutor
from app.services.chat.message_builder import MessageBuilder

logger = logging.getLogger(__name__)


class MCPService:
    """MCP服务管理 - 作为各个功能组件的协调者"""

    def __init__(self):
        # 初始化子模块
        self.client_manager = MCPClientManager()
        self.server_manager = MCPServerManager(self.client_manager.client_url)
        self.ai_generator = MCPAIGenerator()
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
        config_path = str(settings.MCP_PATH)
        result = await self.client_manager.initialize(config_path)
        # 同步状态以保持兼容性
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

    async def update_config(self, config: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """
        更新MCP配置并通知客户端
        """
        return await self.client_manager.update_config(config)

    async def get_server_status(self) -> Dict[str, Dict[str, Any]]:
        """获取所有服务器的状态"""
        if not self.client_started:
            return {}
        return await self.server_manager.get_server_status()

    def get_server_status_sync(self) -> Dict[str, Dict[str, Any]]:
        """获取所有服务器的状态（同步版本）"""
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
        current_config = FileManager.load_mcp_config()
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
        """
        为聊天准备MCP工具列表
        """
        return await self.server_manager.prepare_chat_tools(mcp_servers)

    async def call_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """调用指定服务器的工具"""
        if not self.client_started:
            return {"error": "MCP Client未启动"}
        return await self.tool_executor.execute_single_tool(server_name, tool_name, params)

    async def get_mcp_generator_template(self, requirement: str) -> str:
        """获取MCP生成器的提示词模板"""
        all_tools_data = await self.get_all_tools()
        return await self.ai_generator.get_mcp_generator_template(requirement, all_tools_data)

    async def generate_mcp_tool(self, requirement: str, model_name: str) -> Dict[str, Any]:
        """
        AI生成MCP工具并自动注册
        """
        # 获取所有工具数据
        all_tools_data = await self.get_all_tools()

        return await self.ai_generator.generate_and_register_mcp_tool(
            requirement=requirement,
            model_name=model_name,
            model_service=model_service,
            all_tools_data=all_tools_data,
            update_config_func=self.update_config
        )

    async def unregister_ai_mcp_tool(self, tool_name: str) -> bool:
        """从配置中注销AI生成的MCP工具"""
        return await self.ai_generator.unregister_ai_mcp_tool(tool_name, self.update_config)

    async def cleanup(self, force=True):
        """清理资源"""
        # 清理server_manager的资源
        await self.server_manager.cleanup()

        # 清理client_manager的资源
        await self.client_manager.cleanup(force)

        # 同步状态以保持兼容性
        self.client_process = self.client_manager.client_process
        self.client_started = self.client_manager.client_started


# 创建全局MCP服务实例
mcp_service = MCPService()