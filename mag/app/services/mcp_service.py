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
import re  
from pathlib import Path 

from app.core.config import settings
from app.core.file_manager import FileManager
from app.services.model_service import model_service

logger = logging.getLogger(__name__)


class MCPService:
    """MCP服务管理 - 作为MCP Host，与独立的MCP Client进程通信，并提供节点执行功能"""

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

    async def disconnect_server(self, server_name: str) -> Dict[str, Any]:
        """断开指定服务器的连接"""
        try:
            if not self.client_started:
                return {"status": "error", "error": "MCP Client未启动"}

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
                       messages: List[Dict[str, Any]],
                       mcp_servers: List[str] = [],
                       output_enabled: bool = True) -> Dict[str, Any]:
        """执行Agent节点 - 协调模型调用和工具调用"""
        try:
            # 导入 model_service（避免循环导入）
            from app.services.model_service import model_service
            
            # 收集所有指定服务器的工具
            all_tools = []
            tool_to_server = {}  # 工具名到服务器的映射

            # 首先确保所有需要的服务器都已连接
            for server_name in mcp_servers:
                # 检查服务器状态
                server_status = await self.get_server_status()
                if server_name not in server_status or not server_status[server_name].get("connected", False):
                    logger.info(f"服务器 '{server_name}' 未连接，尝试连接...")
                    connect_result = await self.connect_server(server_name)
                    if connect_result.get("status") != "connected":
                        logger.error(f"无法连接服务器 '{server_name}': {connect_result.get('error', '未知错误')}")
                        return {
                            "status": "error",
                            "error": f"无法连接服务器 '{server_name}': {connect_result.get('error', '未知错误')}"
                        }

            # 获取所有工具
            tools_by_server = await self.get_all_tools()
            
            # 收集指定服务器的工具
            for server_name in mcp_servers:
                if server_name in tools_by_server:
                    for tool in tools_by_server[server_name]:
                        all_tools.append({
                            "type": "function",
                            "function": {
                                "name": tool["name"],
                                "description": f"[Tool from:{server_name}] {tool['description']}",
                                "parameters": tool["input_schema"]
                            }
                        })
                        tool_to_server[tool["name"]] = server_name

            # 确保消息格式正确
            processed_messages = []
            for msg in messages:
                if "role" not in msg or "content" not in msg:
                    logger.error(f"消息格式错误，缺少必要字段: {msg}")
                    return {
                        "status": "error",
                        "error": f"消息格式错误，缺少必要字段: {msg}"
                    }

                if msg["content"] is not None and not isinstance(msg["content"], str):
                    msg["content"] = str(msg["content"])

                processed_messages.append(msg)

            # 记录将要使用的工具
            logger.info(f"可用工具: {[tool['function']['name'] for tool in all_tools]}")

            # 如果没有MCP服务器或只做单阶段执行，直接调用模型
            if not mcp_servers or not output_enabled:
                logger.info("使用单阶段执行模式" if not output_enabled else "无MCP服务器，直接调用模型")

                # 调用模型服务
                result = await model_service.call_model(
                    model_name=model_name,
                    messages=processed_messages,
                    tools=all_tools if all_tools else None
                )

                if result["status"] != "success":
                    return result

                # 如果有工具调用且不需要二阶段输出，处理工具调用
                model_tool_calls = result.get("tool_calls", [])
                if model_tool_calls and not output_enabled:
                    # 并行处理工具调用
                    tool_call_tasks = []
                    final_tool_calls = []

                    for tool_call in model_tool_calls:
                        # 处理handoff工具调用
                        if "selected_node" in tool_call:
                            final_tool_calls.append(tool_call)
                            continue
                        
                        # 处理普通工具调用
                        tool_name = tool_call.get("tool_name")
                        if tool_name and tool_name in tool_to_server:
                            server_name = tool_to_server[tool_name]
                            params = tool_call.get("params", {})
                            task = asyncio.create_task(self.call_tool(server_name, tool_name, params))
                            tool_call_tasks.append(task)

                    if tool_call_tasks:
                        tool_results = await asyncio.gather(*tool_call_tasks)
                        final_tool_calls.extend(tool_results)
                        
                        # 更新内容
                        tool_content_parts = []
                        for tool_result in tool_results:
                            if "content" in tool_result and tool_result["content"]:
                                tool_name = tool_result.get("tool_name", "unknown")
                                tool_content_parts.append(f"【{tool_name} result】: {tool_result['content']}")
                        
                        if tool_content_parts:
                            result["content"] = "\n\n".join(tool_content_parts)
                    
                    result["tool_calls"] = final_tool_calls

                return result

            # 两阶段执行流程
            logger.info("开始两阶段执行流程")
            
            current_messages = processed_messages.copy()
            total_tool_calls_results = []
            max_iterations = 10

            for iteration in range(max_iterations):
                logger.info(f"开始第 {iteration + 1} 轮对话")

                # 1. 调用模型服务
                result = await model_service.call_model(
                    model_name=model_name,
                    messages=current_messages,
                    tools=all_tools
                )

                if result["status"] != "success":
                    return result

                # 获取响应内容和工具调用
                initial_message_content = result.get("content", "")
                model_tool_calls = result.get("tool_calls", [])

                # 如果没有工具调用，这是最终结果
                if not model_tool_calls:
                    logger.info("模型未使用任何工具，这是最终结果")
                    return {
                        "status": "success",
                        "content": initial_message_content,
                        "tool_calls": total_tool_calls_results
                    }

                # 2. 处理工具调用
                tool_calls_results = []
                tool_messages = []

                # 确保assistant消息内容是字符串
                if not isinstance(initial_message_content, str):
                    initial_message_content = str(initial_message_content)

                # 构造工具调用对象（兼容OpenAI格式）
                tool_call_objects = []
                tool_call_tasks = []
                tool_calls_mapping = {}

                for i, tool_call in enumerate(model_tool_calls):
                    tool_call_id = f"call_{i}_{iteration}"
                    tool_name = tool_call.get("tool_name", "")
                    
                    # 如果是handoff工具调用，跳过实际执行
                    if "selected_node" in tool_call:
                        continue
                    
                    # 构造工具调用对象
                    tool_call_obj = {
                        "id": tool_call_id,
                        "type": "function",
                        "function": {
                            "name": tool_name,
                            "arguments": json.dumps(tool_call.get("params", {}))
                        }
                    }
                    tool_call_objects.append(tool_call_obj)

                # 记录当前的assistant消息，包括工具调用
                if tool_call_objects:
                    current_messages.append({
                        "role": "assistant",
                        "content": initial_message_content,
                        "tool_calls": tool_call_objects
                    })

                    # 并行执行每个工具调用
                    for tool_call_obj in tool_call_objects:
                        tool_name = tool_call_obj["function"]["name"]
                        tool_call_id = tool_call_obj["id"]
                        
                        logger.info(f"处理工具调用: {tool_name}")

                        try:
                            tool_args = json.loads(tool_call_obj["function"]["arguments"])
                        except json.JSONDecodeError:
                            logger.error(f"工具参数JSON无效: {tool_call_obj['function']['arguments']}")
                            tool_args = {}

                        # 确定工具所属服务器
                        if tool_name not in tool_to_server:
                            logger.error(f"未找到工具 '{tool_name}' 所属的服务器")
                            error_content = f"错误: 未找到工具 '{tool_name}' 所属的服务器"
                            tool_result = {
                                "tool_name": tool_name,
                                "error": "未找到工具所属的服务器"
                            }
                            tool_calls_results.append(tool_result)
                            total_tool_calls_results.append(tool_result)

                            tool_messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call_id,
                                "content": error_content
                            })
                            continue

                        server_name = tool_to_server[tool_name]

                        # 调用工具 - 创建异步任务
                        logger.info(f"通过服务器 {server_name} 调用工具 {tool_name}")
                        task = asyncio.create_task(self.call_tool(server_name, tool_name, tool_args))
                        tool_call_tasks.append(task)
                        tool_calls_mapping[tool_call_id] = (task, tool_name, server_name)

                    # 并行等待所有工具调用完成
                    if tool_call_tasks:
                        await asyncio.gather(*tool_call_tasks)

                        # 处理结果
                        for tool_call_obj in tool_call_objects:
                            tool_call_id = tool_call_obj["id"]

                            if tool_call_id in tool_calls_mapping:
                                task, tool_name, server_name = tool_calls_mapping[tool_call_id]

                                try:
                                    tool_result = task.result()
                                    tool_content = tool_result.get("content", "")

                                    # 确保tool_content是字符串
                                    if tool_content is None:
                                        tool_content = ""
                                    elif not isinstance(tool_content, str):
                                        tool_content = str(tool_content)

                                    tool_calls_results.append(tool_result)
                                    total_tool_calls_results.append(tool_result)

                                    # 添加工具响应消息
                                    tool_messages.append({
                                        "role": "tool",
                                        "tool_call_id": tool_call_id,
                                        "content": tool_content
                                    })

                                    logger.info(f"工具 {tool_name} 调用成功")
                                except Exception as e:
                                    logger.error(f"获取工具 '{tool_name}' 调用结果时出错: {str(e)}")
                                    error_content = f"错误: {str(e)}"
                                    tool_result = {
                                        "tool_name": tool_name,
                                        "server_name": server_name,
                                        "error": str(e)
                                    }
                                    tool_calls_results.append(tool_result)
                                    total_tool_calls_results.append(tool_result)

                                    tool_messages.append({
                                        "role": "tool",
                                        "tool_call_id": tool_call_id,
                                        "content": error_content
                                    })

                    # 添加所有工具响应消息
                    current_messages.extend(tool_messages)

                # 如果没有工具调用需要处理，退出循环
                if not tool_call_objects:
                    logger.info("没有工具调用需要处理，结束执行")
                    return {
                        "status": "success",
                        "content": initial_message_content,
                        "tool_calls": total_tool_calls_results
                    }

            # 达到最大迭代次数
            logger.warning("达到最大工具调用迭代次数")
            return {
                "status": "error",
                "error": "达到最大工具调用迭代次数",
                "tool_calls": total_tool_calls_results
            }

        except Exception as e:
            logger.error(f"执行节点时出错: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "status": "error",
                "error": str(e)
            }

    def get_used_ports(self) -> List[int]:
        """获取已使用的端口列表"""
        ports = []
        try:
            mcp_config = FileManager.load_mcp_config()
            for server_name, server_config in mcp_config.get("mcpServers", {}).items():
                url = server_config.get("url")
                if url:
                    # 解析URL中的端口
                    import re
                    port_match = re.search(r':(\d+)', url)
                    if port_match:
                        ports.append(int(port_match.group(1)))
        except Exception as e:
            logger.error(f"获取已使用端口时出错: {str(e)}")
        
        return sorted(list(set(ports)))

    async def get_mcp_generator_template(self, requirement: str) -> str:
        """获取MCP生成器的提示词模板"""
        try:
            # 1. 读取模板文件
            current_file_dir = Path(__file__).parent.parent
            template_path = current_file_dir / "templates" / "mcp_generator_template.md"
            
            if not template_path.exists():
                raise FileNotFoundError("找不到MCP生成器模板文件")
            
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            # 2. 获取工具描述（只需要名称和描述，不需要参数）
            all_tools_data = await self.get_all_tools()
            tools_description = ""
            
            if not all_tools_data:
                tools_description = "当前没有可用的MCP工具。\n\n"
            else:
                tools_description += "# 现有工具列表\n\n"
                
                for server_name, tools in all_tools_data.items():
                    if tools:
                        tools_description += f"## 服务：{server_name}\n\n"
                        for tool in tools:
                            tool_name = tool.get("name", "未知工具")
                            tool_desc = tool.get("description", "无描述")
                            tools_description += f"- **{tool_name}**：{tool_desc}\n"
                        tools_description += "\n"
            
            # 3. 获取已使用的端口
            used_ports = self.get_used_ports()
            ports_description = ", ".join(map(str, used_ports)) if used_ports else "无"
            
            # 4. 替换模板中的占位符
            final_prompt = template_content.replace("{REQUIREMENT}", requirement)
            final_prompt = final_prompt.replace("{TOOLS_DESCRIPTION}", tools_description)
            final_prompt = final_prompt.replace("{PORTS}", ports_description)
            
            return final_prompt
            
        except Exception as e:
            logger.error(f"生成MCP生成器模板时出错: {str(e)}")
            raise

    def parse_mcp_xml_response(self, xml_content: str) -> Dict[str, Any]:
        """解析MCP生成响应中的XML内容"""
        result = {
            "success": False,
            "error": None,
            "folder_name": None,
            "script_files": {},
            "readme": None,
            "dependencies": None,
            "port": None  # 新增：端口号
        }
        
        try:
            # 解析folder_name
            folder_match = re.search(r'<folder_name>(.*?)</folder_name>', xml_content, re.DOTALL)
            if folder_match:
                result["folder_name"] = folder_match.group(1).strip()
            
            # 解析dependencies
            deps_match = re.search(r'<dependencies>(.*?)</dependencies>', xml_content, re.DOTALL)
            if deps_match:
                result["dependencies"] = deps_match.group(1).strip()
            
            # 解析readme
            readme_match = re.search(r'<readme>(.*?)</readme>', xml_content, re.DOTALL)
            if readme_match:
                result["readme"] = readme_match.group(1).strip()
            
            # 解析端口号
            port_match = re.search(r'<port>(.*?)</port>', xml_content, re.DOTALL)
            if port_match:
                try:
                    port_str = port_match.group(1).strip()
                    result["port"] = int(port_str)
                except ValueError:
                    logger.warning(f"无法解析端口号: {port_str}")
            
            # 解析脚本文件（支持单个和多个脚本）
            # 先尝试单个脚本格式
            script_name_match = re.search(r'<script_name>(.*?)</script_name>', xml_content, re.DOTALL)
            code_match = re.search(r'<code>(.*?)</code>', xml_content, re.DOTALL)
            
            if script_name_match and code_match:
                script_name = script_name_match.group(1).strip()
                code_content = code_match.group(1).strip()
                result["script_files"][script_name] = code_content
            
            # 再尝试多个脚本格式
            script_pattern = r'<script_name(\d+)>(.*?)</script_name\1>.*?<code\1>(.*?)</code\1>'
            script_matches = re.findall(script_pattern, xml_content, re.DOTALL)
            
            for num, script_name, code_content in script_matches:
                script_name = script_name.strip()
                code_content = code_content.strip()
                result["script_files"][script_name] = code_content
            
            # 验证必要字段
            if not result["folder_name"]:
                result["error"] = "缺少folder_name"
                return result
            
            if not result["script_files"]:
                result["error"] = "未找到有效的脚本文件"
                return result
            
            # 端口号验证
            if result["port"] is None:
                result["error"] = "缺少端口号"
                return result
            
            if not (8001 <= result["port"] <= 9099):
                result["error"] = f"端口号 {result['port']} 不在有效范围内 (8001-9099)"
                return result
            
            # 检查端口是否已被占用
            used_ports = self.get_used_ports()
            if result["port"] in used_ports:
                result["error"] = f"端口 {result['port']} 已被占用"
                return result
            
            result["success"] = True
            return result
            
        except Exception as e:
            result["error"] = f"解析XML时出错: {str(e)}"
            return result

    async def generate_mcp_tool(self, requirement: str, model_name: str) -> Dict[str, Any]:
        """AI生成MCP工具"""
        try:
            
            # 1. 验证模型是否存在
            model_config = model_service.get_model(model_name)
            if not model_config:
                return {
                    "status": "error",
                    "error": f"找不到模型 '{model_name}'"
                }
            
            # 2. 获取提示词模板
            prompt = await self.get_mcp_generator_template(requirement)
            
            # 3. 调用模型生成
            messages = [{"role": "user", "content": prompt}]
            
            model_response = await model_service.call_model(
                model_name=model_name,
                messages=messages
            )
            
            if model_response.get("status") != "success":
                return {
                    "status": "error",
                    "error": f"模型调用失败: {model_response.get('error', '未知错误')}"
                }
            
            # 4. 解析模型输出
            model_output = model_response.get("content", "")
            parsed_result = self.parse_mcp_xml_response(model_output)
            
            if not parsed_result["success"]:
                return {
                    "status": "error",
                    "error": f"解析模型输出失败: {parsed_result.get('error', '未知错误')}",
                    "model_output": model_output
                }
            
            # 5. 检查工具名称冲突
            folder_name = parsed_result["folder_name"]
            if FileManager.mcp_tool_exists(folder_name):
                # 生成新的名称
                base_name = folder_name
                counter = 1
                while FileManager.mcp_tool_exists(folder_name):
                    folder_name = f"{base_name}_{counter}"
                    counter += 1
                parsed_result["folder_name"] = folder_name
            
            # 6. 创建MCP工具
            success = FileManager.create_mcp_tool(
                folder_name,
                parsed_result["script_files"],
                parsed_result["readme"] or "# MCP Tool\n\nAI生成的MCP工具",
                parsed_result["dependencies"] or ""
            )
            
            if not success:
                return {
                    "status": "error",
                    "error": "创建MCP工具文件失败"
                }
            
            # 7. 注册到MCP配置（使用解析出的端口）
            success = await self.register_ai_mcp_tool(folder_name, parsed_result["port"])
            if not success:
                # 创建失败，清理文件
                FileManager.delete_mcp_tool(folder_name)
                return {
                    "status": "error",
                    "error": "注册MCP工具到配置失败"
                }
            
            return {
                "status": "success",
                "message": f"MCP工具 '{folder_name}' 生成成功",
                "tool_name": folder_name,
                "folder_name": folder_name,
                "port": parsed_result["port"],  # 新增：返回使用的端口
                "model_output": model_output
            }
            
        except Exception as e:
            logger.error(f"生成MCP工具时出错: {str(e)}")
            return {
                "status": "error",
                "error": f"生成MCP工具时出错: {str(e)}"
            }

    async def register_ai_mcp_tool(self, tool_name: str, port: Optional[int] = None) -> bool:
        """注册AI生成的MCP工具到配置"""
        try:
            # 端口参数现在是必需的（从XML解析而来）
            if port is None:
                logger.error("注册AI工具时未提供端口号")
                return False
            
            # 再次验证端口未被占用（双重检查）
            used_ports = self.get_used_ports()
            if port in used_ports:
                logger.error(f"端口 {port} 已被占用，无法注册工具 {tool_name}")
                return False
            
            # 获取当前MCP配置
            current_config = FileManager.load_mcp_config()
            
            # 添加新的MCP服务器配置
            current_config.setdefault("mcpServers", {})[tool_name] = {
                "transportType": "streamable_http",
                "url": f"http://localhost:{port}/mcp",
                "ai_generated": True  # 标记为AI生成的工具
            }
            
            # 保存配置
            success = await self.update_config(current_config)
            if success.get("status", {}).get("message"):
                logger.info(f"成功注册AI生成的MCP工具: {tool_name} (端口: {port})")
                return True
            else:
                logger.error(f"注册MCP工具失败: {success}")
                return False
                
        except Exception as e:
            logger.error(f"注册AI生成的MCP工具时出错: {str(e)}")
            return False

    async def unregister_ai_mcp_tool(self, tool_name: str) -> bool:
        """从配置中注销AI生成的MCP工具"""
        try:
            # 获取当前MCP配置
            current_config = FileManager.load_mcp_config()
            
            # 删除MCP服务器配置
            if tool_name in current_config.get("mcpServers", {}):
                del current_config["mcpServers"][tool_name]
                
                # 保存配置
                success = await self.update_config(current_config)
                if success.get("status", {}).get("message"):
                    logger.info(f"成功注销AI生成的MCP工具: {tool_name}")
                    return True
                else:
                    logger.error(f"注销MCP工具失败: {success}")
                    return False
            else:
                logger.warning(f"MCP工具 {tool_name} 在配置中不存在")
                return True
                
        except Exception as e:
            logger.error(f"注销AI生成的MCP工具时出错: {str(e)}")
            return False
            
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