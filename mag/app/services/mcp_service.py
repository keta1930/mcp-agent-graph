import asyncio
import json
import logging
import os
import aiohttp
import requests
import subprocess
import sys
import time
from typing import Dict, List, Any, Optional
import platform
import signal

from app.core.config import settings
from app.core.file_manager import FileManager

logger = logging.getLogger(__name__)


class MCPService:
    """MCP服务管理 - 作为MCP Host，与独立的MCP Client进程通信"""

    def __init__(self):
        self.client_process = None
        self.client_url = "http://127.0.0.1:8765"
        self.client_started = False
        self.startup_retries = 5
        self.retry_delay = 1
        self._session = None

    async def initialize(self) -> Dict[str, Dict[str, Any]]:
        """初始化MCP服务，启动客户端进程"""
        try:
            # 检查是否已有进程在运行
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"{self.client_url}/") as response:
                        if response.status == 200:
                            self.client_started = True
                            logger.info("发现现有MCP Client已在运行")
                            config_path = str(settings.MCP_PATH)
                            self._notify_config_change(config_path)
                            return {"status": {"message": "MCP Client已连接"}}
            except (aiohttp.ClientError, ConnectionError):
                pass

            # 启动Client进程
            script_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(script_dir))
            client_script = os.path.join(project_root, "mcp_client.py")

            if not os.path.exists(client_script):
                logger.error(f"找不到MCP Client脚本: {client_script}")
                return {"status": {"error": f"找不到MCP Client脚本: {client_script}"}}

            # 记录完整的启动命令
            python_executable = sys.executable
            config_path = str(settings.MCP_PATH)

            full_command = [python_executable, client_script, "--config", config_path]
            logger.info(f"启动MCP Client，完整命令: {' '.join(full_command)}")

            # 创建临时文件以捕获输出
            stdout_file = os.path.join(os.path.dirname(config_path), "mcp_client_stdout.log")
            stderr_file = os.path.join(os.path.dirname(config_path), "mcp_client_stderr.log")

            # 使用文件而不是管道捕获输出
            with open(stdout_file, 'w') as stdout, open(stderr_file, 'w') as stderr:
                system = platform.system()
                if system == "Windows":
                    self.client_process = subprocess.Popen(
                        full_command,
                        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                        stdout=stdout,
                        stderr=stderr,
                    )
                else:
                    self.client_process = subprocess.Popen(
                        full_command,
                        stdout=stdout,
                        stderr=stderr,
                        start_new_session=True
                    )

            logger.info(f"MCP Client进程已启动，PID: {self.client_process.pid}")
            logger.info(f"标准输出记录到: {stdout_file}")
            logger.info(f"错误输出记录到: {stderr_file}")

            # 增加等待时间
            for i in range(10):
                try:
                    await asyncio.sleep(2)
                    async with aiohttp.ClientSession() as session:
                        async with session.get(f"{self.client_url}/") as response:
                            if response.status == 200:
                                self.client_started = True
                                logger.info("MCP Client进程已启动并响应")
                                break
                except (aiohttp.ClientError, ConnectionError) as e:
                    logger.warning(f"尝试连接MCP Client (尝试 {i + 1}/10): {str(e)}")

                    # 检查进程是否仍在运行
                    if self.client_process.poll() is not None:
                        exit_code = self.client_process.poll()
                        logger.error(f"MCP Client进程已退出，退出代码: {exit_code}")

                        # 读取错误日志
                        try:
                            with open(stderr_file, 'r') as f:
                                stderr_content = f.read()
                                if stderr_content:
                                    logger.error(f"MCP Client错误输出:\n{stderr_content}")
                        except:
                            pass

                        return {"status": {"error": f"MCP Client进程启动失败，退出代码: {exit_code}"}}

                    if i == 9:
                        logger.error("无法连接到MCP Client，超过最大重试次数")
                        return {"status": {"error": "无法连接到MCP Client，请检查日志文件"}}

            return {"status": {"message": "MCP Client已启动"}}

        except Exception as e:
            logger.error(f"启动MCP Client进程时出错: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"status": {"error": f"启动失败: {str(e)}"}}

    async def _get_session(self):
        """获取或创建aiohttp会话"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def notify_client_shutdown(self) -> bool:
        """通知Client关闭"""
        if not self.client_started:
            return False

        try:
            logger.info("尝试通过HTTP API通知Client优雅关闭...")
            session = await self._get_session()
            async with session.post(f"{self.client_url}/shutdown", timeout=5) as response:
                if response.status == 200:
                    logger.info("已成功通知Client开始关闭流程")
                    await asyncio.sleep(3)

                    # 检查进程是否已经自行退出
                    if self.client_process and self.client_process.poll() is not None:
                        logger.info("验证Client进程已自行退出")
                        self.client_process = None
                        self.client_started = False
                        return True

                    logger.info("Client进程仍在运行，将使用强制方式关闭")
                    return False
                else:
                    logger.warning(f"通知Client关闭返回异常状态码: {response.status}")
                    return False
        except Exception as e:
            logger.error(f"通知Client关闭时出错: {str(e)}")
            return False

    def _notify_config_change(self, config_path: str) -> bool:
        """通知客户端配置已更改"""
        try:
            if not self.client_started:
                logger.warning("MCP Client未启动，无法通知配置变更")
                return False

            response = requests.post(
                f"{self.client_url}/load_config",
                json={"config_path": config_path}
            )

            if response.status_code == 200:
                logger.info("已通知MCP Client加载新配置")
                return True
            else:
                logger.error(f"通知MCP Client失败: {response.status_code} {response.text}")
                return False

        except Exception as e:
            logger.error(f"通知MCP Client时出错: {str(e)}")
            return False

    async def update_config(self, config: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """更新MCP配置并通知客户端"""
        try:
            # 保存配置到文件
            save_success = FileManager.save_mcp_config(config)
            if not save_success:
                logger.error("保存MCP配置到文件失败")
                return {"status": {"error": "保存配置文件失败"}}

            logger.info("MCP配置已保存到文件")

            # 通知客户端
            config_path = str(settings.MCP_PATH)
            success = self._notify_config_change(config_path)

            if success:
                return {"status": {"message": "配置已更新并通知MCP Client"}}
            else:
                return {"status": {"warning": "配置已保存但无法通知MCP Client"}}

        except Exception as e:
            logger.error(f"更新MCP配置时出错: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"status": {"error": f"更新配置失败: {str(e)}"}}

    async def get_server_status(self) -> Dict[str, Dict[str, Any]]:
        """获取所有服务器的状态"""
        try:
            if not self.client_started:
                return {}

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
            if not self.client_started:
                return {}

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
        """连接指定的服务器"""
        try:
            if not self.client_started:
                return {"status": "error", "error": "MCP Client未启动"}

            session = await self._get_session()
            async with session.post(
                f"{self.client_url}/connect_server",
                json={"server_name": server_name}
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    logger.error(f"连接服务器请求失败: {response.status} {error_text}")
                    return {"status": "error", "error": error_text}

        except Exception as e:
            logger.error(f"连接服务器时出错: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def connect_all_servers(self) -> Dict[str, Any]:
        """连接所有已配置的MCP服务器"""
        try:
            if not self.client_started:
                return {
                    "status": "error", 
                    "error": "MCP Client未启动",
                    "servers": {},
                    "tools": {}
                }

            # 获取当前MCP配置
            current_config = FileManager.load_mcp_config()
            all_servers = current_config.get("mcpServers", {})
            
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
            if not self.client_started:
                return {}

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

    async def call_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """调用指定服务器的工具"""
        try:
            if not self.client_started:
                return {"error": "MCP Client未启动"}

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

    async def execute_node(self,
                           model_name: str,
                           api_key: str,
                           base_url: str,
                           messages: List[Dict[str, Any]],
                           mcp_servers: List[str] = [],
                           output_enabled: bool = True) -> Dict[str, Any]:
        """执行Agent节点"""
        try:
            if not self.client_started:
                return {"status": "error", "error": "MCP Client未启动"}

            session = await self._get_session()
            print("\n\nsession\n\n",{
                    "model": model_name,
                    "api_key": api_key,
                    "base_url": base_url,
                    "messages": messages,
                    "mcp_servers": mcp_servers,
                    "output_enabled": output_enabled
                })
            async with session.post(
                f"{self.client_url}/execute_node",
                json={
                    "model": model_name,
                    "api_key": api_key,
                    "base_url": base_url,
                    "messages": messages,
                    "mcp_servers": mcp_servers,
                    "output_enabled": output_enabled
                }
            ) as response:
                if response.status == 200:
                    print("\nsessino.response:\n", response)
                    return await response.json()
                else:
                    error_text = await response.text()
                    error_msg = f"执行节点失败: {response.status} {error_text}"
                    logger.error(error_msg)
                    return {"status": "error", "error": error_msg}

        except Exception as e:
            error_msg = f"执行节点时出错: {str(e)}"
            logger.error(error_msg)
            return {"status": "error", "error": error_msg}

    async def cleanup(self, force=True):
        """清理资源

        Args:
            force: 如果为True，无论之前是否已通知过Client，都会尝试终止进程
        """
        # 关闭aiohttp会话
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

        if not self.client_process:
            logger.info("无需清理：Client进程不存在或已关闭")
            self.client_started = False
            return

        if force:
            try:
                logger.info(f"正在强制关闭MCP Client进程 (PID: {self.client_process.pid})...")
                system = platform.system()
                if system == "Windows":
                    os.kill(self.client_process.pid, signal.CTRL_BREAK_EVENT)
                else:
                    os.killpg(os.getpgid(self.client_process.pid), signal.SIGTERM)

                # 等待进程终止
                try:
                    self.client_process.wait(timeout=5)
                    logger.info("MCP Client进程已正常关闭")
                except subprocess.TimeoutExpired:
                    logger.warning("MCP Client进程未响应，强制终止")
                    if system == "Windows":
                        # Windows下强制终止
                        self.client_process.kill()
                    else:
                        # Unix下使用SIGKILL
                        os.killpg(os.getpgid(self.client_process.pid), signal.SIGKILL)

                    self.client_process.wait()

            except Exception as e:
                logger.error(f"关闭MCP Client进程时出错: {str(e)}")
                # 尝试强制终止
                try:
                    self.client_process.kill()
                except:
                    pass
        else:
            logger.info("跳过强制终止进程，仅重置客户端状态")

        # 无论如何都重置状态
        self.client_process = None
        self.client_started = False


# 创建全局MCP服务实例
mcp_service = MCPService()