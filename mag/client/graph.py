"""
MAG SDK - 图管理客户端API
"""

import json
import os
import requests
from pathlib import Path
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
    获取所有可用的图
    
    返回:
        List[str]: 图名称列表
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/graphs")
    response.raise_for_status()
    return response.json()

def get(name: str) -> Dict[str, Any]:
    """
    获取特定图的配置
    
    参数:
        name (str): 图名称
    
    返回:
        Dict[str, Any]: 图配置
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/graphs/{name}")
    response.raise_for_status()
    return response.json()

def save(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    保存图配置（创建或更新）
    
    参数:
        config (Dict[str, Any]): 图配置
    
    返回:
        Dict[str, Any]: 操作结果
    """
    _ensure_server_running()
    response = requests.post(f"{API_BASE}/graphs", json=config)
    response.raise_for_status()
    return response.json()

def delete(name: str) -> Dict[str, Any]:
    """
    删除图
    
    参数:
        name (str): 图名称
    
    返回:
        Dict[str, Any]: 操作结果
    """
    _ensure_server_running()
    response = requests.delete(f"{API_BASE}/graphs/{name}")
    response.raise_for_status()
    return response.json()

def rename(old_name: str, new_name: str) -> Dict[str, Any]:
    """
    重命名图
    
    参数:
        old_name (str): 旧名称
        new_name (str): 新名称
    
    返回:
        Dict[str, Any]: 操作结果
    """
    _ensure_server_running()
    response = requests.put(f"{API_BASE}/graphs/{old_name}/rename/{new_name}")
    response.raise_for_status()
    return response.json()

def run(name: str, input_text: str, parallel: bool = False) -> Dict[str, Any]:
    """
    执行图
    
    参数:
        name (str): 图名称
        input_text (str): 输入文本
        parallel (bool): 是否并行执行，默认为False
    
    返回:
        Dict[str, Any]: 执行结果，包含会话ID和输出
    """
    _ensure_server_running()
    payload = {
        "graph_name": name,
        "input_text": input_text,
        "parallel": parallel
    }
    response = requests.post(f"{API_BASE}/graphs/execute", json=payload)
    response.raise_for_status()
    return response.json()

def continue_run(conversation_id: str, input_text: str = None, 
                parallel: bool = False, continue_from_checkpoint: bool = False) -> Dict[str, Any]:
    """
    继续执行会话
    
    参数:
        conversation_id (str): 会话ID
        input_text (str, optional): 新的输入文本，如果为None则从断点继续
        parallel (bool): 是否并行执行，默认为False
        continue_from_checkpoint (bool): 是否从断点继续，默认为False
    
    返回:
        Dict[str, Any]: 执行结果
    """
    _ensure_server_running()
    payload = {
        "conversation_id": conversation_id,
        "input_text": input_text,
        "parallel": parallel,
        "continue_from_checkpoint": continue_from_checkpoint
    }
    response = requests.post(f"{API_BASE}/graphs/continue", json=payload)
    response.raise_for_status()
    return response.json()

def import_file(file_path: str) -> Dict[str, Any]:
    """
    从JSON文件导入图
    
    参数:
        file_path (str): JSON文件路径
    
    返回:
        Dict[str, Any]: 导入结果
    """
    _ensure_server_running()
    # 验证文件存在
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件未找到: {file_path}")
    
    response = requests.post(f"{API_BASE}/graphs/import", json={"file_path": file_path})
    response.raise_for_status()
    return response.json()

def export(name: str) -> Dict[str, Any]:
    """
    导出图为ZIP包
    
    参数:
        name (str): 图名称
    
    返回:
        Dict[str, Any]: 导出结果，包含导出文件路径
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/graphs/{name}/export")
    response.raise_for_status()
    return response.json()

def import_package(file_path: str) -> Dict[str, Any]:
    """
    从ZIP包导入图
    
    参数:
        file_path (str): ZIP文件路径
    
    返回:
        Dict[str, Any]: 导入结果
    """
    _ensure_server_running()
    # 验证文件存在
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件未找到: {file_path}")
    
    response = requests.post(f"{API_BASE}/graphs/import_package", json={"file_path": file_path})
    response.raise_for_status()
    return response.json()

def generate_mcp_script(name: str) -> Dict[str, Any]:
    """
    生成MCP服务器脚本
    
    参数:
        name (str): 图名称
    
    返回:
        Dict[str, Any]: 生成的脚本内容
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/graphs/{name}/generate_mcp")
    response.raise_for_status()
    return response.json()

def create_from_dict(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    从字典创建新图
    
    参数:
        graph_data (Dict[str, Any]): 图配置字典
    
    返回:
        Dict[str, Any]: 操作结果
    """
    return save(graph_data)

def create_from_file(file_path: str) -> Dict[str, Any]:
    """
    从JSON文件创建新图
    
    参数:
        file_path (str): JSON文件路径
    
    返回:
        Dict[str, Any]: 操作结果
    """
    # 验证文件存在
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件未找到: {file_path}")
    
    # 读取JSON文件
    with open(file_path, 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    
    return save(graph_data)