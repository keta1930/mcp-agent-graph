"""
MAG SDK - MCP服务器管理客户端API
"""

import requests
from typing import Dict, List, Any, Optional, Union

# 获取基础URL
from .. import _BASE_URL, start, is_running

API_BASE = f"{_BASE_URL}/api"

def _ensure_server_running():
    """确保服务器正在运行"""
    if not is_running():
        if not start():
            raise RuntimeError("无法启动MAG服务器")

def get_config() -> Dict[str, Any]:
    """
    获取MCP配置
    
    返回:
        Dict[str, Any]: MCP配置
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/mcp/config")
    response.raise_for_status()
    return response.json()

def update_config(config: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    更新MCP配置
    
    参数:
        config (Dict[str, Any]): MCP配置
    
    返回:
        Dict[str, Dict[str, Any]]: 操作结果
    """
    _ensure_server_running()
    response = requests.post(f"{API_BASE}/mcp/config", json=config)
    response.raise_for_status()
    return response.json()

def get_status() -> Dict[str, Dict[str, Any]]:
    """
    获取MCP服务器状态
    
    返回:
        Dict[str, Dict[str, Any]]: 服务器状态字典
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/mcp/status")
    response.raise_for_status()
    return response.json()

def connect(server_name: str) -> Dict[str, Any]:
    """
    连接指定的MCP服务器
    
    参数:
        server_name (str): 服务器名称
    
    返回:
        Dict[str, Any]: 连接结果
    """
    _ensure_server_running()
    response = requests.post(f"{API_BASE}/mcp/connect/{server_name}")
    response.raise_for_status()
    return response.json()

def get_tools() -> Dict[str, List[Dict[str, Any]]]:
    """
    获取所有MCP工具信息
    
    返回:
        Dict[str, List[Dict[str, Any]]]: 按服务器分组的工具信息
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/mcp/tools")
    response.raise_for_status()
    return response.json()

def add_server(servers: Dict[str, Any]) -> Dict[str, Any]:
    """
    添加新的MCP服务器配置
    
    参数:
        servers (Dict[str, Any]): 包含mcpServers的完整配置
    
    返回:
        Dict[str, Any]: 添加结果
    """
    _ensure_server_running()
    
    response = requests.post(f"{API_BASE}/mcp/add", json=servers)
    
    # 不再抛出异常，直接返回响应内容
    if response.status_code == 200:
        return response.json()
    else:
        # 如果返回其他状态码，尝试解析错误信息
        try:
            error_data = response.json()
            return {
                "status": "error",
                "message": f"HTTP {response.status_code}: {error_data.get('detail', '未知错误')}",
                "added_servers": [],
                "duplicate_servers": [],
                "skipped_servers": []
            }
        except:
            return {
                "status": "error",
                "message": f"HTTP {response.status_code}: {response.text}",
                "added_servers": [],
                "duplicate_servers": [],
                "skipped_servers": []
            }

def remove_server(names: Union[str, List[str]]) -> Dict[str, Any]:
    """
    删除MCP服务器配置（支持单个或批量删除）
    
    参数:
        names (Union[str, List[str]]): 服务器名称或服务器名称列表
    
    返回:
        Dict[str, Any]: 删除结果
    """
    _ensure_server_running()
    
    # 统一处理为列表格式
    if isinstance(names, str):
        server_names = [names]
    else:
        server_names = names
    
    response = requests.post(f"{API_BASE}/mcp/remove", json=server_names)
    
    # 不再抛出异常，直接返回响应内容
    if response.status_code == 200:
        return response.json()
    else:
        # 如果返回其他状态码，尝试解析错误信息
        try:
            error_data = response.json()
            return {
                "status": "error",
                "message": f"HTTP {response.status_code}: {error_data.get('detail', '未知错误')}",
                "removed_servers": [],
                "not_found_servers": [],
                "total_requested": len(server_names)
            }
        except:
            return {
                "status": "error",
                "message": f"HTTP {response.status_code}: {response.text}",
                "removed_servers": [],
                "not_found_servers": [],
                "total_requested": len(server_names)
            }