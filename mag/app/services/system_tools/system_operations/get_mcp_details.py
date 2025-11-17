"""
系统工具：get_mcp_details
查看指定MCP服务器的详细工具信息
"""
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format）
TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_mcp_details",
        "description": "查看指定MCP服务器的详细信息。返回服务器的配置信息（command、args等）和所有工具的名称与描述（如果已连接）。可以一次查询多个MCP服务器。",
        "parameters": {
            "type": "object",
            "properties": {
                "server_names": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "要查询的MCP服务器名称列表"
                }
            },
            "required": ["server_names"]
        }
    }
}


async def handler(user_id: str, server_names: List[str], **kwargs) -> Dict[str, Any]:
    """
    获取指定MCP服务器的详细信息

    Args:
        user_id: 用户ID
        server_names: MCP服务器名称列表
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "servers": [
                {
                    "server_name": "filesystem",
                    "status": "connected",
                    "disabled": False,
                    "config": {
                        "command": "uvx",
                        "args": ["mcp-server-filesystem"],
                        "timeout": 60
                    },
                    "tool_count": 5,
                    "tools": [
                        {
                            "name": "read_file",
                            "description": "读取文件内容"
                        },
                        {
                            "name": "write_file",
                            "description": "写入文件"
                        }
                    ]
                }
            ]
        }
    """
    try:
        from app.services.mcp.mcp_service import mcp_service
        from app.infrastructure.database.mongodb import mongodb_client

        # 1. 获取MCP配置
        config_data = await mongodb_client.get_mcp_config()
        if not config_data:
            return {
                "success": False,
                "error": "当前没有配置任何MCP服务器",
                "servers": []
            }

        mcp_config = config_data.get("config", {})
        mcp_servers = mcp_config.get("mcpServers", {})

        # 2. 获取已连接服务器的工具信息
        all_tools = await mcp_service.get_all_tools()

        # 3. 构建结果
        servers = []
        not_found = []
        
        for server_name in server_names:
            if server_name not in mcp_servers:
                not_found.append(server_name)
                continue
            
            server_config = mcp_servers[server_name]
            
            # 构建服务器信息
            server_info = {
                "server_name": server_name,
                "config": {
                    "command": server_config.get("command", ""),
                    "args": server_config.get("args", []),
                    "timeout": server_config.get("timeout", 60),
                    "transportType": server_config.get("transportType", "stdio")
                }
            }
            
            # 如果有额外的配置信息，也包含进来
            if "env" in server_config:
                server_info["config"]["env"] = server_config["env"]
            if "ai_generated" in server_config:
                server_info["config"]["ai_generated"] = server_config["ai_generated"]
            
            # 如果服务器已连接，添加工具信息
            if server_name in all_tools:
                tools = all_tools[server_name]
                
                # 提取工具的名称和描述
                tool_list = []
                for tool in tools:
                    tool_list.append({
                        "name": tool.get("name", ""),
                        "description": tool.get("description", "")
                    })
                
                server_info.update({
                    "tool_count": len(tool_list),
                    "tools": tool_list
                })
            else:
                # 未连接的服务器
                server_info.update({
                    "tool_count": 0,
                    "tools": [],
                    "message": "服务器未连接，无法获取工具信息"
                })
            
            servers.append(server_info)

        result = {
            "success": True,
            "servers": servers
        }
        
        if not_found:
            result["warning"] = f"以下MCP服务器未配置: {', '.join(not_found)}"
            result["not_found"] = not_found

        return result

    except Exception as e:
        logger.error(f"get_mcp_details 执行失败: {str(e)}")
        return {
            "success": False,
            "error": f"获取MCP详情失败: {str(e)}",
            "servers": []
        }
