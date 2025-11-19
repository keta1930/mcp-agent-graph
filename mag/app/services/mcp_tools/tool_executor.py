import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
import aiohttp
from app.services.system_tools import is_system_tool, get_tool_handler

logger = logging.getLogger(__name__)


class ToolExecutor:
    """统一的工具调用执行器"""

    def __init__(self, mcp_service=None):
        """初始化工具执行器
        
        Args:
            mcp_service: MCP服务实例（可选）。如果不传入，会在需要时自动获取全局实例
        """
        self._mcp_service = mcp_service
    
    @property
    def mcp_service(self):
        """延迟获取 MCP 服务实例"""
        if self._mcp_service is None:
            from app.services.mcp.mcp_service import mcp_service
            self._mcp_service = mcp_service
        return self._mcp_service

    async def execute_tools_batch(self, tool_calls: List[Dict[str, Any]], mcp_servers: List[str],
                                 user_id: str = None, conversation_id: str = None, agent_id: str = None) -> List[Dict[str, Any]]:
        """批量执行工具调用（非流式）"""
        tool_results = []

        # 创建异步任务
        tasks = []
        for tool_call in tool_calls:
            tool_name = tool_call["function"]["name"]
            tool_id = tool_call["id"]

            try:
                arguments_str = tool_call["function"]["arguments"]
                arguments = json.loads(arguments_str) if arguments_str else {}
            except json.JSONDecodeError as e:
                logger.error(f"工具参数JSON解析失败: {arguments_str}, 错误: {e}")
                tool_results.append({
                    "tool_call_id": tool_id,
                    "content": f"工具调用解析失败：{str(e)}"
                })
                continue

            # 检查是否为 handoffs 工具（Graph 特有）
            if tool_name.startswith("transfer_to_"):
                selected_node = tool_name[len("transfer_to_"):]
                logger.info(f"执行 handoffs 工具: {tool_name} -> {selected_node}")
                tool_results.append({
                    "tool_call_id": tool_id,
                    "content": f"已选择节点: {selected_node}",
                    "_handoffs_selected": selected_node  # 标记这是 handoffs 工具调用
                })
                continue

            # 检查是否为系统工具
            if is_system_tool(tool_name):
                logger.info(f"执行系统工具: {tool_name}")
                # 创建系统工具执行任务
                task = asyncio.create_task(
                    self._call_system_tool(tool_name, arguments, tool_id, user_id, conversation_id, agent_id)
                )
                tasks.append(task)
                continue

            # 查找MCP工具所属服务器
            server_name = await self._find_tool_server(tool_name, mcp_servers)
            if not server_name:
                tool_results.append({
                    "tool_call_id": tool_id,
                    "content": f"找不到工具 '{tool_name}' 所属的服务器"
                })
                continue

            # 创建MCP工具异步任务
            task = asyncio.create_task(
                self._call_single_tool_internal(server_name, tool_name, arguments, tool_id)
            )
            tasks.append(task)

        # 等待所有工具执行完成
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"工具执行异常: {result}")
                    tool_results.append({
                        "tool_call_id": "unknown",
                        "content": f"工具执行异常: {str(result)}"
                    })
                else:
                    tool_results.append(result)

        return tool_results

    async def execute_tools_batch_stream(self, tool_calls: List[Dict[str, Any]], mcp_servers: List[str],
                                        user_id: str = None, conversation_id: str = None, agent_id: str = None):
        """
        批量执行工具调用（流式版本）
        
        对于 agent_task_executor，会 yield SSE 事件
        对于其他工具，直接执行并返回结果
        
        Yields:
            - str: SSE 事件字符串（来自 Sub Agent）
            - Dict: 工具执行结果
        """
        from typing import AsyncGenerator
        
        for tool_call in tool_calls:
            tool_name = tool_call["function"]["name"]
            tool_id = tool_call["id"]

            try:
                arguments_str = tool_call["function"]["arguments"]
                arguments = json.loads(arguments_str) if arguments_str else {}
            except json.JSONDecodeError as e:
                logger.error(f"工具参数JSON解析失败: {arguments_str}, 错误: {e}")
                yield {
                    "tool_call_id": tool_id,
                    "content": f"工具调用解析失败：{str(e)}"
                }
                continue

            # 检查是否为 handoffs 工具（Graph 特有）
            if tool_name.startswith("transfer_to_"):
                selected_node = tool_name[len("transfer_to_"):]
                logger.info(f"执行 handoffs 工具: {tool_name} -> {selected_node}")
                yield {
                    "tool_call_id": tool_id,
                    "content": f"已选择节点: {selected_node}",
                    "_handoffs_selected": selected_node  # 标记这是 handoffs 工具调用
                }
                continue

            # 检查是否为 agent_task_executor（需要流式执行）
            if tool_name == "agent_task_executor":
                logger.info(f"执行系统工具（流式）: {tool_name}")
                # 传递 tool_call_id 到 agent_task_executor
                arguments["tool_call_id"] = tool_id
                async for item in self._call_agent_task_executor_stream(
                    arguments, tool_id, user_id, conversation_id, agent_id
                ):
                    yield item
                continue

            # 其他工具：普通执行
            if is_system_tool(tool_name):
                logger.info(f"执行系统工具: {tool_name}")
                result = await self._call_system_tool(
                    tool_name, arguments, tool_id, user_id, conversation_id, agent_id
                )
                yield result
                continue

            # MCP 工具
            server_name = await self._find_tool_server(tool_name, mcp_servers)
            if not server_name:
                yield {
                    "tool_call_id": tool_id,
                    "content": f"找不到工具 '{tool_name}' 所属的服务器"
                }
                continue

            result = await self._call_single_tool_internal(server_name, tool_name, arguments, tool_id)
            yield result

    async def _call_agent_task_executor_stream(
        self,
        arguments: Dict[str, Any],
        tool_call_id: str,
        user_id: str,
        conversation_id: str,
        agent_id: str
    ):
        """
        调用 agent_task_executor（流式版本）
        
        Yields:
            - str: SSE 事件字符串
            - Dict: 最终工具结果
        """
        try:
            from app.services.system_tools.agent_tools import agent_task_executor
            
            # 添加上下文参数
            arguments["user_id"] = user_id
            arguments["conversation_id"] = conversation_id
            if agent_id:
                arguments["agent_id"] = agent_id
            
            # 调用流式执行版本
            async for item in agent_task_executor.handler(**arguments):
                if isinstance(item, str):
                    # SSE 事件
                    yield item
                else:
                    # 最终结果，格式化为工具结果
                    if isinstance(item, dict):
                        content = json.dumps(item, ensure_ascii=False)
                    else:
                        content = str(item)
                    
                    yield {
                        "tool_call_id": tool_call_id,
                        "content": content
                    }
                    
        except Exception as e:
            logger.error(f"agent_task_executor 流式执行失败: {str(e)}", exc_info=True)
            yield {
                "tool_call_id": tool_call_id,
                "content": f"agent_task_executor 执行失败：{str(e)}"
            }

    async def execute_single_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """执行单个工具"""
        if not self.mcp_service:
            return {"error": "MCP服务未初始化"}
        
        try:
            # 确保服务器已连接
            server_status = await self.mcp_service.get_server_status()
            if server_name not in server_status or not server_status[server_name].get("connected", False):
                logger.info(f"服务器 '{server_name}' 未连接，尝试连接...")
                connect_result = await self.mcp_service.connect_server(server_name)
                if connect_result.get("status") != "connected":
                    error_msg = f"无法连接服务器 '{server_name}': {connect_result.get('error', '未知错误')}"
                    return {"error": error_msg}
            
            # 调用底层MCP客户端
            return await self._call_mcp_client_tool(server_name, tool_name, params)
            
        except Exception as e:
            error_msg = f"调用工具时出错: {str(e)}"
            logger.error(error_msg)
            return {
                "tool_name": tool_name,
                "server_name": server_name,
                "error": error_msg
            }

    async def execute_tool_for_graph(self, tool_name: str, tool_args: Dict[str, Any], 
                                    mcp_servers: List[str]) -> Dict[str, Any]:
        """为图执行器执行单个工具
        
        专门为 graph_executor 和 background_executor 设计的方法。
        返回包含 tool_name, content, server_name 的标准格式。
        
        Args:
            tool_name: 工具名称
            tool_args: 工具参数
            mcp_servers: MCP服务器列表
            
        Returns:
            包含工具执行结果的字典
        """
        # 查找工具所属服务器
        server_name = await self._find_tool_server(tool_name, mcp_servers)
        if not server_name:
            return {
                "tool_name": tool_name,
                "content": f"找不到工具 '{tool_name}' 所属的服务器",
                "error": "工具不存在"
            }

        try:
            # 执行工具
            result = await self.execute_single_tool(server_name, tool_name, tool_args)

            # 处理结果
            if result.get("error"):
                content = f"工具 {tool_name} 执行失败：{result['error']}"
            else:
                # 格式化结果内容
                result_content = result.get("content", "")
                if isinstance(result_content, (dict, list)):
                    content = json.dumps(result_content, ensure_ascii=False)
                else:
                    content = str(result_content)

            return {
                "tool_name": tool_name,
                "content": content,
                "server_name": server_name
            }

        except Exception as e:
            logger.error(f"执行工具 {tool_name} 时出错: {str(e)}")
            return {
                "tool_name": tool_name,
                "content": f"工具执行异常: {str(e)}",
                "error": str(e)
            }

    async def execute_model_tools(self, model_tool_calls: List[Dict], mcp_servers: List[str]) -> List[Dict[str, Any]]:
        """执行模型返回的工具调用"""
        tool_results = []
        tool_call_tasks = []
        
        for i, tool_call in enumerate(model_tool_calls):
            # 处理handoff工具调用
            if "selected_node" in tool_call:
                tool_results.append(tool_call)
                continue
            
            # 处理普通工具调用
            tool_name = tool_call.get("tool_name")
            if tool_name:
                # 查找工具所属服务器
                server_name = await self._find_tool_server(tool_name, mcp_servers)
                if server_name:
                    params = tool_call.get("params", {})
                    task = asyncio.create_task(
                        self.execute_single_tool(server_name, tool_name, params)
                    )
                    tool_call_tasks.append(task)
                else:
                    tool_results.append({
                        "tool_name": tool_name,
                        "error": f"找不到工具 '{tool_name}' 所属的服务器"
                    })
        
        # 等待所有工具执行完成
        if tool_call_tasks:
            task_results = await asyncio.gather(*tool_call_tasks)
            tool_results.extend(task_results)
        
        return tool_results

    async def _call_single_tool_internal(self, server_name: str, tool_name: str, 
                                       arguments: Dict[str, Any], tool_call_id: str) -> Dict[str, Any]:
        """内部单工具调用方法"""
        try:
            result = await self.execute_single_tool(server_name, tool_name, arguments)
            
            if result.get("error"):
                content = f"工具 {tool_name} 执行失败：{result['error']}"
            else:
                # 格式化成功结果
                result_content = result.get("content", "")
                if isinstance(result_content, dict) or isinstance(result_content, list):
                    content = f"工具 {tool_name} 执行成功：{json.dumps(result_content, ensure_ascii=False)}"
                else:
                    content = f"工具 {tool_name} 执行成功：{str(result_content)}"
            
            return {
                "tool_call_id": tool_call_id,
                "content": content
            }
            
        except Exception as e:
            logger.error(f"工具 {tool_name} 执行失败: {str(e)}")
            return {
                "tool_call_id": tool_call_id,
                "content": f"工具 {tool_name} 执行失败：{str(e)}"
            }

    async def _call_system_tool(self, tool_name: str, arguments: Dict[str, Any],
                               tool_call_id: str, user_id: str = None,
                               conversation_id: str = None, agent_id: str = None) -> Dict[str, Any]:
        """调用系统工具"""
        try:
            # 获取工具处理函数
            handler = get_tool_handler(tool_name)
            if not handler:
                logger.error(f"系统工具未找到处理函数: {tool_name}")
                return {
                    "tool_call_id": tool_call_id,
                    "content": f"系统工具 {tool_name} 未找到处理函数"
                }

            # 添加上下文参数
            if user_id:
                arguments["user_id"] = user_id
            if conversation_id:
                arguments["conversation_id"] = conversation_id
            if agent_id:
                arguments["agent_id"] = agent_id

            # 执行工具
            logger.debug(f"调用系统工具 {tool_name}，参数: {arguments}")
            result = await handler(**arguments)

            # 格式化结果
            if isinstance(result, dict):
                content = json.dumps(result, ensure_ascii=False)
            else:
                content = str(result)

            return {
                "tool_call_id": tool_call_id,
                "content": content
            }

        except Exception as e:
            logger.error(f"系统工具 {tool_name} 执行失败: {str(e)}", exc_info=True)
            return {
                "tool_call_id": tool_call_id,
                "content": f"系统工具 {tool_name} 执行失败：{str(e)}"
            }

    async def _find_tool_server(self, tool_name: str, mcp_servers: List[str]) -> Optional[str]:
        """查找工具所属的服务器"""
        try:
            if not tool_name:
                logger.error(f"工具名称为空，无法查找服务器。mcp_servers: {mcp_servers}")
                return None
            
            if not self.mcp_service:
                logger.error(f"MCP服务未初始化，无法查找工具 '{tool_name}' 的服务器")
                return None
            
            if not mcp_servers:
                logger.warning(f"mcp_servers 列表为空，无法查找工具 '{tool_name}' 的服务器")
                return None
                
            all_tools = await self.mcp_service.get_all_tools()
            logger.debug(f"查找工具 '{tool_name}'，可用服务器: {list(all_tools.keys())}, 指定服务器: {mcp_servers}")
            
            for server_name in mcp_servers:
                if server_name in all_tools:
                    for tool in all_tools[server_name]:
                        if tool["name"] == tool_name:
                            logger.info(f"找到工具 '{tool_name}' 在服务器 '{server_name}'")
                            return server_name
                else:
                    logger.warning(f"服务器 '{server_name}' 不在可用工具列表中")
            
            logger.warning(f"在指定的服务器 {mcp_servers} 中未找到工具 '{tool_name}'")
            return None
        except Exception as e:
            logger.error(f"查找工具 '{tool_name}' 服务器时出错: {str(e)}", exc_info=True)
            return None

    async def _call_mcp_client_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """调用MCP客户端工具"""
        if not self.mcp_service:
            return {"error": "MCP服务未初始化"}
        
        # 使用MCP服务现有的客户端调用逻辑
        try:
            
            session = await self.mcp_service._get_session()
            async with session.post(
                f"{self.mcp_service.client_manager.client_url}/tool_call",
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