import asyncio
import logging
import aiohttp
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class MCPServerManager:
    """MCP服务器管理器 - 专门负责服务器连接管理"""

    def __init__(self, client_url: str = "http://127.0.0.1:8765"):
        self.client_url = client_url
        self._session = None
        self._connection_locks: Dict[str, asyncio.Lock] = {}

    async def _get_session(self):
        """获取或创建aiohttp会话"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    def _get_connection_lock(self, server_name: str) -> asyncio.Lock:
        """获取服务器连接锁"""
        if server_name not in self._connection_locks:
            self._connection_locks[server_name] = asyncio.Lock()
        return self._connection_locks[server_name]

    async def get_server_status(self) -> Dict[str, Dict[str, Any]]:
        """获取所有服务器的状态"""
        try:
            session = await self._get_session()
            async with session.get(f"{self.client_url}/servers") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"获取服务器状态失败: {response.status} {await response.text()}")
                    return {}

        except Exception as e:
            logger.error(f"获取服务器状态时出错: {str(e)}")
            return {}

    def get_server_status_sync(self) -> Dict[str, Dict[str, Any]]:
        """获取所有服务器的状态"""
        try:
            import requests
            response = requests.get(f"{self.client_url}/servers")
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"获取服务器状态失败: {response.status_code} {response.text}")
                return {}

        except Exception as e:
            logger.error(f"获取服务器状态时出错: {str(e)}")
            return {}

    async def _connect_server_internal(self, server_name: str) -> Dict[str, Any]:
        """内部连接方法"""
        try:
            session = await self._get_session()
            async with session.post(
                    f"{self.client_url}/connect_server",
                    json={"server_name": server_name}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"服务器 '{server_name}' 连接成功")
                    return result
                else:
                    error_text = await response.text()
                    logger.error(f"连接服务器失败: {response.status} {error_text}")
                    return {"status": "error", "error": error_text}
        except Exception as e:
            logger.error(f"连接服务器时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def connect_server(self, server_name: str) -> Dict[str, Any]:
        """连接指定的服务器"""
        lock = self._get_connection_lock(server_name)

        async with lock:
            server_status = await self.get_server_status()
            if server_name in server_status and server_status[server_name].get("connected", False):
                logger.info(f"服务器 '{server_name}' 已连接（跳过重复连接）")
                return {
                    "status": "connected",
                    "tools": server_status[server_name].get("tools", [])
                }

            logger.info(f"正在连接服务器 '{server_name}'...")
            return await self._connect_server_internal(server_name)

    async def disconnect_server(self, server_name: str) -> Dict[str, Any]:
        """断开指定服务器的连接"""
        try:
            session = await self._get_session()
            async with session.post(
                f"{self.client_url}/disconnect_server",
                json={"server_name": server_name}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"服务器 '{server_name}' 断开连接: {result}")
                    return result
                else:
                    error_text = await response.text()
                    logger.error(f"断开服务器连接请求失败: {response.status} {error_text}")
                    return {"status": "error", "error": error_text}

        except Exception as e:
            error_msg = f"断开服务器连接时出错: {str(e)}"
            logger.error(error_msg)
            return {"status": "error", "error": error_msg}

    async def connect_all_servers(self, server_configs: Dict[str, Any]) -> Dict[str, Any]:
        """连接所有已配置的MCP服务器"""
        try:
            all_servers = server_configs.get("mcpServers", {})

            if not all_servers:
                return {
                    "status": "success",
                    "message": "没有配置的服务器需要连接",
                    "servers": {},
                    "tools": {}
                }

            # 获取当前服务器状态
            server_status = await self.get_server_status()

            # 分别处理每个服务器的连接
            connection_results = {}
            all_tools = {}
            successful_connections = 0
            failed_connections = 0
            already_connected = 0

            for server_name in all_servers.keys():
                try:
                    # 检查服务器是否已连接
                    if (server_name in server_status and
                        server_status[server_name].get("connected", False)):
                        connection_results[server_name] = {
                            "status": "already_connected",
                            "tools": server_status[server_name].get("tools", [])
                        }
                        all_tools[server_name] = server_status[server_name].get("tools", [])
                        already_connected += 1
                    else:
                        # 尝试连接服务器
                        result = await self.connect_server(server_name)
                        if result.get("status") == "connected":
                            connection_results[server_name] = {
                                "status": "connected",
                                "tools": result.get("tools", [])
                            }
                            all_tools[server_name] = result.get("tools", [])
                            successful_connections += 1
                        else:
                            connection_results[server_name] = {
                                "status": "failed",
                                "error": result.get("error", "连接失败"),
                                "tools": []
                            }
                            failed_connections += 1
                except Exception as e:
                    connection_results[server_name] = {
                        "status": "error",
                        "error": str(e),
                        "tools": []
                    }
                    failed_connections += 1

            return {
                "status": "completed",
                "summary": {
                    "total_servers": len(all_servers),
                    "successful_connections": successful_connections,
                    "failed_connections": failed_connections,
                    "already_connected": already_connected
                },
                "servers": connection_results,
                "tools": all_tools
            }

        except Exception as e:
            logger.error(f"批量连接服务器时出错: {str(e)}")
            return {
                "status": "error",
                "error": f"批量连接失败: {str(e)}",
                "servers": {},
                "tools": {}
            }

    async def get_all_tools(self) -> Dict[str, List[Dict[str, Any]]]:
        """获取所有可用工具的信息"""
        try:
            session = await self._get_session()
            async with session.get(f"{self.client_url}/tools") as response:
                if response.status == 200:
                    tools_data = await response.json()
                    tools_by_server = {}
                    for tool in tools_data:
                        server_name = tool["server_name"]
                        if server_name not in tools_by_server:
                            tools_by_server[server_name] = []

                        tools_by_server[server_name].append({
                            "name": tool["name"],
                            "description": tool["description"],
                            "input_schema": tool["input_schema"]
                        })

                    return tools_by_server
                else:
                    logger.error(f"获取工具列表失败: {response.status} {await response.text()}")
                    return {}

        except Exception as e:
            logger.error(f"获取工具列表时出错: {str(e)}")
            return {}

    async def ensure_servers_connected(self, server_names: List[str]) -> Dict[str, bool]:
        """异步锁确保指定的服务器已连接"""
        connection_status = {}

        for server_name in server_names:
            lock = self._get_connection_lock(server_name)

            async with lock:
                server_status = await self.get_server_status()

                if server_name in server_status and server_status[server_name].get("connected", False):
                    connection_status[server_name] = True
                    logger.info(f"服务器 '{server_name}' 已连接")
                else:
                    logger.info(f"服务器 '{server_name}' 未连接，开始连接...")
                    connect_result = await self._connect_server_internal(server_name)
                    connection_status[server_name] = connect_result.get("status") == "connected"

                    if not connection_status[server_name]:
                        logger.error(f"连接服务器 '{server_name}' 失败: {connect_result.get('error', '未知错误')}")

        return connection_status

    async def prepare_chat_tools(self, mcp_servers: List[str]) -> List[Dict[str, Any]]:
        """为聊天准备MCP工具列表"""
        tools = []

        if not mcp_servers:
            return tools

        try:
            # 确保服务器已连接
            connection_status = await self.ensure_servers_connected(mcp_servers)

            # 检查连接失败的服务器
            failed_servers = [name for name, status in connection_status.items() if not status]
            if failed_servers:
                logger.warning(f"以下服务器连接失败，将跳过: {', '.join(failed_servers)}")

            # 获取所有工具
            all_tools = await self.get_all_tools()

            # 格式化工具为OpenAI tools格式
            for server_name in mcp_servers:
                if server_name in all_tools and connection_status.get(server_name, False):
                    for tool in all_tools[server_name]:
                        tools.append({
                            "type": "function",
                            "function": {
                                "name": tool["name"],
                                "description": f"[Tool from:{server_name}] {tool['description']}",
                                "parameters": tool["input_schema"]
                            }
                        })

            logger.info(f"为聊天准备了 {len(tools)} 个MCP工具")

        except Exception as e:
            logger.error(f"准备聊天工具时出错: {str(e)}")

        return tools

    async def cleanup(self):
        """清理资源"""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None