"""
系统工具：list_all_mcps
列出所有的MCP服务器及其工具（对于大于等于3个工具的，只列出前3个）
"""
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format - 多语言）
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "list_all_mcps",
            "description": "列出所有已配置的MCP服务器及其基本信息。返回MCP服务器名称、连接状态、工具数量。对于已连接的服务器，如果工具数量大于等于3个，只显示前3个工具的名称和描述。",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "list_all_mcps",
            "description": "List all configured MCP servers and their basic information. Returns MCP server names, connection status, and tool count. For connected servers with 3 or more tools, only the first 3 tools' names and descriptions are displayed.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
}


def _truncate_tools(tools: List[Dict[str, Any]], limit: int = 3) -> List[Dict[str, Any]]:
    """
    截断工具列表，只保留前N个

    Args:
        tools: 工具列表
        limit: 保留数量

    Returns:
        截断后的工具列表
    """
    if len(tools) < limit:
        return tools
    return tools[:limit]


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    列出所有MCP服务器及其工具

    Args:
        user_id: 用户ID
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "mcps": [
                {
                    "server_name": "filesystem",
                    "status": "connected",
                    "disabled": False,
                    "tool_count": 5,
                    "tools": [
                        {
                            "name": "read_file",
                            "description": "读取文件内容"
                        },
                        {
                            "name": "write_file",
                            "description": "写入文件"
                        },
                        {
                            "name": "list_directory",
                            "description": "列出目录内容"
                        }
                    ],
                    "truncated": True
                }
            ],
            "total_count": 1
        }
    """
    try:
        from app.services.mcp.mcp_service import mcp_service
        from app.infrastructure.database.mongodb import mongodb_client
        from app.services.system_tools.registry import get_current_language

        # 获取当前语言
        language = get_current_language()

        # 1. 获取所有已配置的MCP服务器
        config_data = await mongodb_client.get_mcp_config()
        if not config_data:
            message = "No MCP servers configured" if language == "en" else "当前没有配置任何MCP服务器"
            return {
                "success": True,
                "mcps": [],
                "total_count": 0,
                "message": message
            }

        mcp_config = config_data.get("config", {})
        mcp_servers = mcp_config.get("mcpServers", {})
        
        if not mcp_servers:
            message = "No MCP servers configured" if language == "en" else "当前没有配置任何MCP服务器"
            return {
                "success": True,
                "mcps": [],
                "total_count": 0,
                "message": message
            }

        # 2. 获取已连接服务器的工具信息
        all_tools = await mcp_service.get_all_tools()
        
        # 3. 获取服务器状态
        server_status = await mcp_service.get_server_status()

        # 4. 构建结果
        mcps = []
        for server_name, server_config in mcp_servers.items():
            # 获取服务器状态
            status_info = server_status.get(server_name, {})
            status = status_info.get("status", "disconnected")
            disabled = server_config.get("disabled", False)
            
            mcp_info = {
                "server_name": server_name,
                "status": status,
                "disabled": disabled
            }
            
            # 如果服务器已连接，添加工具信息
            if server_name in all_tools:
                tools = all_tools[server_name]
                tool_count = len(tools)
                
                # 提取工具的名称和描述
                tool_list = []
                for tool in tools:
                    tool_list.append({
                        "name": tool.get("name", ""),
                        "description": tool.get("description", "")
                    })
                
                # 截断工具列表
                truncated = tool_count >= 3
                displayed_tools = _truncate_tools(tool_list, limit=3)
                
                mcp_info.update({
                    "tool_count": tool_count,
                    "tools": displayed_tools,
                    "truncated": truncated
                })
            else:
                # 未连接的服务器
                mcp_info.update({
                    "tool_count": 0,
                    "tools": [],
                    "truncated": False
                })
            
            mcps.append(mcp_info)

        return {
            "success": True,
            "mcps": mcps,
            "total_count": len(mcps)
        }

    except Exception as e:
        logger.error(f"list_all_mcps 执行失败: {str(e)}")
        
        # 根据语言返回错误消息
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()
        
        if language == "en":
            error_msg = f"Failed to get MCP list: {str(e)}"
        else:
            error_msg = f"获取MCP列表失败: {str(e)}"
        
        return {
            "success": False,
            "error": error_msg,
            "mcps": [],
            "total_count": 0
        }
