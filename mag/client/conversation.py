"""
MAG SDK - 会话管理客户端API
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

def list() -> List[str]:
    """
    列出所有会话
    
    返回:
        List[str]: 会话ID列表
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/conversations")
    response.raise_for_status()
    return response.json()

def get(conversation_id: str) -> Dict[str, Any]:
    """
    获取会话状态
    
    参数:
        conversation_id (str): 会话ID
    
    返回:
        Dict[str, Any]: 会话状态
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/conversations/{conversation_id}")
    response.raise_for_status()
    return response.json()

def get_hierarchy(conversation_id: str) -> Dict[str, Any]:
    """
    获取会话层次结构
    
    参数:
        conversation_id (str): 会话ID
    
    返回:
        Dict[str, Any]: 会话层次结构
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/conversations/{conversation_id}/hierarchy")
    response.raise_for_status()
    return response.json()

def delete(conversation_id: str) -> Dict[str, Any]:
    """
    删除会话
    
    参数:
        conversation_id (str): 会话ID
    
    返回:
        Dict[str, Any]: 操作结果
    """
    _ensure_server_running()
    response = requests.delete(f"{API_BASE}/conversations/{conversation_id}")
    response.raise_for_status()
    return response.json()