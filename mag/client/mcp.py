"""
MAG SDK - MCP服务器管理客户端API
"""

import requests
from typing import Dict, List, Any, Optional

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

def add_server(name: str, config: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """
    添加新的MCP服务器配置
    
    参数:
        name (str): 服务器名称
        config (Dict[str, Any]): 服务器配置
    
    返回:
        Dict[str, Dict[str, Any]]: 更新结果
    """
    _ensure_server_running()
    
    # 获取当前配置
    current_config = get_config()
    
    # 添加新服务器
    if "mcpServers" not in current_config:
        current_config["mcpServers"] = {}
    
    current_config["mcpServers"][name] = config
    
    # 更新配置
    return update_config(current_config)

def remove_server(name: str) -> Dict[str, Dict[str, Any]]:
    """
    删除MCP服务器配置
    
    参数:
        name (str): 服务器名称
    
    返回:
        Dict[str, Dict[str, Any]]: 更新结果
    """
    _ensure_server_running()
    
    # 获取当前配置
    current_config = get_config()
    
    # 删除服务器
    if "mcpServers" in current_config and name in current_config["mcpServers"]:
        del current_config["mcpServers"][name]
    
    # 更新配置
    return update_config(current_config)