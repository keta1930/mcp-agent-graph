import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
import aiohttp

logger = logging.getLogger(__name__)


class ToolExecutor:
    """统一的工具调用执行器"""

    def __init__(self, mcp_service=None):
        """
        初始化工具执行器
        
        Args:
            mcp_service: MCP服务实例，用于实际的工具调用
        """
        self.mcp_service = mcp_service

    async def execute_tools_batch(self, tool_calls: List[Dict[str, Any]], mcp_servers: List[str]) -> List[Dict[str, Any]]:
        """
        批量执行工具调用
        
        Args:
            tool_calls: 工具调用列表
            mcp_servers: MCP服务器列表
            
        Returns:
            工具执行结果列表
        """
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
            
            # 查找工具所属服务器
            server_name = await self._find_tool_server(tool_name, mcp_servers)
            if not server_name:
                tool_results.append({
                    "tool_call_id": tool_id,
                    "content": f"找不到工具 '{tool_name}' 所属的服务器"
                })
                continue
            
            # 创建异步任务
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

    async def execute_single_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行单个工具
        
        Args:
            server_name: 服务器名称
            tool_name: 工具名称  
            params: 工具参数
            
        Returns:
            工具执行结果
        """
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

    async def execute_model_tools(self, model_tool_calls: List[Dict], mcp_servers: List[str]) -> List[Dict[str, Any]]:
        """
        执行模型返回的工具调用
        
        Args:
            model_tool_calls: 模型返回的工具调用列表
            mcp_servers: 可用的MCP服务器列表
            
        Returns:
            工具执行结果列表
        """
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

    async def _find_tool_server(self, tool_name: str, mcp_servers: List[str]) -> Optional[str]:
        """
        查找工具所属的服务器
        
        Args:
            tool_name: 工具名称
            mcp_servers: 可用服务器列表
            
        Returns:
            服务器名称或None
        """
        try:
            if not self.mcp_service:
                return None
                
            all_tools = await self.mcp_service.get_all_tools()
            for server_name in mcp_servers:
                if server_name in all_tools:
                    for tool in all_tools[server_name]:
                        if tool["name"] == tool_name:
                            return server_name
            return None
        except Exception as e:
            logger.error(f"查找工具服务器时出错: {str(e)}")
            return None

    async def _call_mcp_client_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        调用MCP客户端工具
        """
        if not self.mcp_service:
            return {"error": "MCP服务未初始化"}
        
        # 使用MCP服务现有的客户端调用逻辑
        try:
            
            session = await self.mcp_service._get_session()
            async with session.post(
                f"{self.mcp_service.client_url}/tool_call",
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