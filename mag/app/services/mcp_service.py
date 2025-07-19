import asyncio
import json
import logging
import os
from typing import Dict, List, Any, Optional

from app.core.config import settings
from app.core.file_manager import FileManager
from app.services.model_service import model_service
# 导入新的子模块
from app.services.mcp.client_manager import MCPClientManager
from app.services.mcp.server_manager import MCPServerManager
from app.services.mcp.ai_generator import MCPAIGenerator
from app.services.mcp.tool_executor import ToolExecutor

logger = logging.getLogger(__name__)


class MCPService:
    """MCP服务管理"""

    def __init__(self):
        # 初始化子模块
        self.client_manager = MCPClientManager()
        self.server_manager = MCPServerManager(self.client_manager.client_url)
        self.ai_generator = MCPAIGenerator()
        self.tool_executor = ToolExecutor(self) 
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

        # 获取当前MCP配置
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

    async def call_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """调用指定服务器的工具"""
        if not self.client_started:
            return {"error": "MCP Client未启动"}
        return await self.tool_executor.execute_single_tool(server_name, tool_name, params)

    async def execute_node(self,
                       model_name: str,
                       messages: List[Dict[str, Any]],
                       mcp_servers: List[str] = [],
                       output_enabled: bool = True) -> Dict[str, Any]:
        """执行Agent节点"""
        try:
            from app.services.model_service import model_service
            
            # 确保所有需要的服务器都已连接
            connection_status = await self.server_manager.ensure_servers_connected(mcp_servers)
            
            # 检查是否有连接失败的服务器
            failed_servers = [name for name, status in connection_status.items() if not status]
            if failed_servers:
                return {
                    "status": "error",
                    "error": f"无法连接服务器: {', '.join(failed_servers)}"
                }

            # 获取所有工具
            tools_by_server = await self.get_all_tools()
            
            # 收集指定服务器的工具
            all_tools = []
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

            # 验证消息格式
            processed_messages = self._validate_messages(messages)

            # 记录将要使用的工具
            logger.info(f"可用工具: {[tool['function']['name'] for tool in all_tools]}")

            # 直接调用模型
            if not mcp_servers or not output_enabled:
                logger.info("使用单阶段执行模式" if not output_enabled else "无MCP服务器，直接调用模型")

                result = await model_service.call_model(
                    model_name=model_name,
                    messages=processed_messages,
                    tools=all_tools if all_tools else None
                )

                if result["status"] != "success":
                    return result

                # 处理工具调用
                model_tool_calls = result.get("tool_calls", [])
                if model_tool_calls and not output_enabled:
                    tool_results = await self.tool_executor.execute_model_tools(model_tool_calls, mcp_servers)
                    
                    # 更新内容
                    tool_content_parts = []
                    for tool_result in tool_results:
                        if "content" in tool_result and tool_result["content"]:
                            tool_name = tool_result.get("tool_name", "unknown")
                            tool_content_parts.append(f"【{tool_name} result】: {tool_result['content']}")
                    
                    if tool_content_parts:
                        result["content"] = "\n\n".join(tool_content_parts)
                    
                    result["tool_calls"] = tool_results

                return result

            # 执行流程
            return await self._execute_two_stage_flow(
                model_name, processed_messages, all_tools, mcp_servers, model_service
            )

        except Exception as e:
            logger.error(f"执行节点时出错: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "status": "error",
                "error": str(e)
            }

    async def _execute_two_stage_flow(self, model_name: str, messages: List[Dict], all_tools: List[Dict], 
                                    mcp_servers: List[str], model_service) -> Dict[str, Any]:
        """执行流程"""
        logger.info("开始两阶段执行流程")
        
        current_messages = messages.copy()
        total_tool_calls_results = []
        max_iterations = 10

        for iteration in range(max_iterations):
            logger.info(f"开始第 {iteration + 1} 轮对话")

            # 调用模型服务
            result = await model_service.call_model(
                model_name=model_name,
                messages=current_messages,
                tools=all_tools
            )

            if result["status"] != "success":
                return result

            # 获取响应内容
            initial_message_content = result.get("content", "")
            model_tool_calls = result.get("tool_calls", [])
            if not model_tool_calls:
                logger.info("模型未使用任何工具，这是最终结果")
                return {
                    "status": "success",
                    "content": initial_message_content,
                    "tool_calls": total_tool_calls_results
                }

            # 处理工具调用
            tool_results = await self.tool_executor.execute_model_tools(model_tool_calls, mcp_servers)
            total_tool_calls_results.extend(tool_results)

            # 构建对话消息
            current_messages.append({
                "role": "assistant", 
                "content": initial_message_content
            })

            # 添加工具结果
            for tool_result in tool_results:
                if "content" in tool_result:
                    current_messages.append({
                        "role": "user",
                        "content": f"工具执行结果: {tool_result['content']}"
                    })

        # 达到最大迭代次数
        logger.warning("达到最大工具调用迭代次数")
        return {
            "status": "error",
            "error": "达到最大工具调用迭代次数",
            "tool_calls": total_tool_calls_results
        }

    def _validate_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """验证消息格式"""
        processed_messages = []
        for msg in messages:
            if "role" not in msg or "content" not in msg:
                logger.error(f"消息格式错误，缺少必要字段: {msg}")
                continue

            if msg["content"] is not None and not isinstance(msg["content"], str):
                msg["content"] = str(msg["content"])

            processed_messages.append(msg)
        return processed_messages

    async def get_mcp_generator_template(self, requirement: str) -> str:
        """获取MCP生成器的提示词模板"""
        all_tools_data = await self.get_all_tools()
        return await self.ai_generator.get_mcp_generator_template(requirement, all_tools_data)

    async def generate_mcp_tool(self, requirement: str, model_name: str) -> Dict[str, Any]:
        """AI生成MCP工具并自动注册"""
        try:
            # 获取所有工具数据
            all_tools_data = await self.get_all_tools()
            
            # 调用ai_generator生成工具
            result = await self.ai_generator.generate_mcp_tool(
                requirement, model_name, model_service, all_tools_data
            )
            
            # 如果生成成功，直接注册到配置
            if result.get("status") == "success":
                folder_name = result["folder_name"]
                port = result["port"]
                
                # 验证端口号
                if port is None:
                    logger.error("生成的工具缺少端口号")
                    FileManager.delete_mcp_tool(folder_name)
                    return {
                        "status": "error",
                        "error": "生成的工具缺少端口号"
                    }
                
                # 直接调用ai_generator的注册方法
                register_success = await self.ai_generator.register_ai_mcp_tool(
                    folder_name, port, self.update_config
                )
                
                if not register_success:
                    # 注册失败，清理文件
                    FileManager.delete_mcp_tool(folder_name)
                    return {
                        "status": "error",
                        "error": "注册MCP工具到配置失败"
                    }
            
            return result
            
        except Exception as e:
            logger.error(f"生成并注册MCP工具时出错: {str(e)}")
            return {
                "status": "error",
                "error": f"生成工具失败: {str(e)}"
            }

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