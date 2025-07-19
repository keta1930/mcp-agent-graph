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

    async def _get_session(self):
        """获取或创建aiohttp会话"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def get_server_status(self) -> Dict[str, Dict[str, Any]]:
        """
        获取所有服务器的状态
        
        Returns:
            服务器状态字典
        """
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
        """获取所有服务器的状态（同步版本）"""
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

    async def connect_server(self, server_name: str) -> Dict[str, Any]:
        """
        连接指定的服务器
        
        Args:
            server_name: 服务器名称
            
        Returns:
            连接结果
        """
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
                    logger.error(f"连接服务器请求失败: {response.status} {error_text}")
                    return {"status": "error", "error": error_text}

        except Exception as e:
            logger.error(f"连接服务器时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def disconnect_server(self, server_name: str) -> Dict[str, Any]:
        """
        断开指定服务器的连接
        
        Args:
            server_name: 服务器名称
            
        Returns:
            断开连接结果
        """
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
        """
        连接所有已配置的MCP服务器
        
        Args:
            server_configs: 服务器配置字典
            
        Returns:
            批量连接结果
        """
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
        """
        获取所有可用工具的信息
        
        Returns:
            按服务器分组的工具字典
        """
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

    async def call_tool_via_client(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        通过客户端调用指定服务器的工具
        
        Args:
            server_name: 服务器名称
            tool_name: 工具名称
            params: 工具参数
            
        Returns:
            工具调用结果
        """
        try:
            session = await self._get_session()
            async with session.post(
                f"{self.client_url}/tool_call",
                json={
                    "server_name": server_name,
                    "tool_name": tool_name,
                    "params": params
                }
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    error_msg = f"调用工具失败: {response.status} {error_text}"
                    logger.error(error_msg)
                    return {
                        "tool_name": tool_name,
                        "server_name": server_name,
                        "error": error_msg
                    }

        except Exception as e:
            error_msg = f"调用工具时出错: {str(e)}"
            logger.error(error_msg)
            return {
                "tool_name": tool_name,
                "server_name": server_name,
                "error": error_msg
            }

    async def ensure_servers_connected(self, server_names: List[str]) -> Dict[str, bool]:
        """
        确保指定的服务器已连接
        
        Args:
            server_names: 服务器名称列表
            
        Returns:
            每个服务器的连接状态
        """
        connection_status = {}
        
        # 获取当前服务器状态
        server_status = await self.get_server_status()
        
        for server_name in server_names:
            # 检查服务器是否已连接
            if server_name in server_status and server_status[server_name].get("connected", False):
                connection_status[server_name] = True
            else:
                # 尝试连接服务器
                logger.info(f"服务器 '{server_name}' 未连接，尝试连接...")
                connect_result = await self.connect_server(server_name)
                connection_status[server_name] = connect_result.get("status") == "connected"
                
                if not connection_status[server_name]:
                    logger.error(f"无法连接服务器 '{server_name}': {connect_result.get('error', '未知错误')}")
        
        return connection_status

    async def cleanup(self):
        """清理资源"""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None