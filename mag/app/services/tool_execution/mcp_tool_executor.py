"""
MCP 工具执行器

处理 MCP（Model Context Protocol）工具的执行
"""
import json
import logging
from typing import Dict, Any, Optional, List
from app.services.tool_execution.base_executor import BaseToolExecutor

logger = logging.getLogger(__name__)


class MCPToolExecutor(BaseToolExecutor):
    """MCP 工具执行器
    
    专门处理通过 MCP 服务调用的外部工具
    """

    def __init__(self, mcp_service=None):
        """初始化 MCP 工具执行器
        
        Args:
            mcp_service: MCP 服务实例（可选）
        """
        self._mcp_service = mcp_service

    @property
    def mcp_service(self):
        """延迟获取 MCP 服务实例"""
        if self._mcp_service is None:
            from app.services.mcp.mcp_service import mcp_service
            self._mcp_service = mcp_service
        return self._mcp_service

    def can_handle(self, tool_name: str) -> bool:
        """判断是否为 MCP 工具
        
        MCP 工具通过排除法判断：不是系统工具也不是 Handoffs 工具
        
        Args:
            tool_name: 工具名称
            
        Returns:
            True 如果可能是 MCP 工具
        """
        # MCP 工具需要通过查找服务器来确认，这里返回 True 表示可能处理
        return True

    async def execute(self, tool_name: str, arguments: Dict[str, Any], 
                     tool_call_id: str, **context) -> Dict[str, Any]:
        """执行 MCP 工具调用
        
        Args:
            tool_name: 工具名称
            arguments: 工具参数
            tool_call_id: 工具调用ID
            **context: 上下文参数（mcp_servers 必需）
            
        Returns:
            工具执行结果
        """
        mcp_servers = context.get("mcp_servers", [])
        
        try:
            # 查找工具所属服务器
            server_name = await self._find_tool_server(tool_name, mcp_servers)
            if not server_name:
                return self._format_error(
                    tool_call_id,
                    f"找不到工具 '{tool_name}' 所属的服务器"
                )

            # 执行工具
            result = await self._execute_single_tool(server_name, tool_name, arguments)
            
            # 格式化结果
            if result.get("error"):
                content = f"工具 {tool_name} 执行失败：{result['error']}"
            else:
                result_content = result.get("content", "")
                if isinstance(result_content, (dict, list)):
                    content = f"工具 {tool_name} 执行成功：{json.dumps(result_content, ensure_ascii=False)}"
                else:
                    content = f"工具 {tool_name} 执行成功：{str(result_content)}"
            
            return self._format_result(tool_call_id, content)
            
        except Exception as e:
            logger.error(f"MCP 工具 {tool_name} 执行失败: {str(e)}")
            return self._format_error(
                tool_call_id,
                f"工具 {tool_name} 执行失败：{str(e)}"
            )

    async def execute_single_tool(self, server_name: str, tool_name: str, 
                                  params: Dict[str, Any]) -> Dict[str, Any]:
        """执行单个 MCP 工具（不带 tool_call_id）
        
        Args:
            server_name: MCP 服务器名称
            tool_name: 工具名称
            params: 工具参数
            
        Returns:
            工具执行结果
        """
        return await self._execute_single_tool(server_name, tool_name, params)

    async def _execute_single_tool(self, server_name: str, tool_name: str, 
                                   params: Dict[str, Any]) -> Dict[str, Any]:
        """执行单个 MCP 工具的内部实现
        
        Args:
            server_name: MCP 服务器名称
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
            
            # 调用底层 MCP 客户端
            return await self._call_mcp_client_tool(server_name, tool_name, params)
            
        except Exception as e:
            error_msg = f"调用工具时出错: {str(e)}"
            logger.error(error_msg)
            return {
                "tool_name": tool_name,
                "server_name": server_name,
                "error": error_msg
            }

    async def _find_tool_server(self, tool_name: str, mcp_servers: List[str]) -> Optional[str]:
        """查找工具所属的 MCP 服务器
        
        Args:
            tool_name: 工具名称
            mcp_servers: MCP 服务器列表
            
        Returns:
            服务器名称，如果未找到则返回 None
        """
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

    async def _call_mcp_client_tool(self, server_name: str, tool_name: str, 
                                   params: Dict[str, Any]) -> Dict[str, Any]:
        """调用 MCP 客户端工具
        
        Args:
            server_name: MCP 服务器名称
            tool_name: 工具名称
            params: 工具参数
            
        Returns:
            工具执行结果
        """
        if not self.mcp_service:
            return {"error": "MCP服务未初始化"}
        
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
