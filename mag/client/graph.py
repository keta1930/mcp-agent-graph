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

def import_graph(file_path: str) -> Dict[str, Any]:
    """
    导入图配置
    
    支持两种导入方式:
    1. 从JSON文件导入单个图配置
    2. 从ZIP包导入完整图包（含配置、提示词等）
    
    参数:
        file_path (str): 文件路径 (.json 或 .zip)
    
    返回:
        Dict[str, Any]: 导入结果
    """
    _ensure_server_running()
    
    # 验证文件存在
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件未找到: {file_path}")
    
    # 获取文件扩展名（小写）
    file_ext = os.path.splitext(file_path)[1].lower()
    
    # 根据扩展名选择导入方法
    if file_ext == '.zip':
        # ZIP包导入 - 使用 import_package 接口
        endpoint = f"{API_BASE}/graphs/import_package"
    else:
        # 默认使用JSON导入 - 使用 import 接口
        endpoint = f"{API_BASE}/graphs/import"
    
    try:
        # 发送请求
        response = requests.post(endpoint, json={"file_path": file_path})
        
        # 处理响应
        if response.status_code == 200:
            result = response.json()
            return result
        else:
            # 尝试解析错误信息
            try:
                error_data = response.json()
                error_msg = error_data.get('detail', f"HTTP错误 {response.status_code}")
            except:
                error_msg = f"HTTP错误 {response.status_code}: {response.text}"
            
            return {
                "status": "error",
                "message": error_msg
            }
    except Exception as e:
        error_msg = f"导入请求出错: {str(e)}"
        return {
            "status": "error",
            "message": error_msg
        }

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

def get_generate_prompt() -> str:
    """
    生成提示词模板
    
    该函数会获取当前系统中所有可用的MCP工具信息和模型列表，
    并生成一个包含这些信息的提示词模板，用于帮助用户创建图配置。
    
    返回:
        str: 包含工具信息和模型列表的提示词模板
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/prompt-template")
    response.raise_for_status()
    result = response.json()
    return result.get("prompt", "")

def get_optimize_prompt(graph_name: str = None) -> Dict[str, Any]:
    """
    生成优化图的提示词模板
    
    该函数会获取当前系统中所有可用的MCP工具信息和模型列表，
    并生成一个包含这些信息的优化图提示词模板。如果提供图名称，
    还会包含该图的具体配置信息。
    
    参数:
        graph_name (str, optional): 要优化的图名称，如果提供则模板中包含该图的配置
    
    返回:
        Dict[str, Any]: 包含提示词模板和相关信息的字典
            - prompt: 提示词模板内容
            - graph_name: 图名称（如果提供了的话）
            - has_graph_config: 是否包含图配置信息
            - note: 使用说明（当未提供图名称时）
    
    示例:
        >>> # 获取基础优化模板
        >>> template = mag.get_optimize_prompt()
        >>> print(template['prompt'])
        
        >>> # 获取包含特定图配置的优化模板
        >>> template = mag.get_optimize_prompt("my_graph")
        >>> print(f"图名称: {template['graph_name']}")
        >>> print(template['prompt'])
    """
    _ensure_server_running()
    
    params = {}
    if graph_name is not None:
        params['graph_name'] = graph_name
    
    try:
        response = requests.get(f"{API_BASE}/optimize-prompt-template", params=params)
        
        if response.status_code == 200:
            result = response.json()
            return result.get("prompt", "")
        else:
            # 处理错误响应
            try:
                error_data = response.json()
                error_msg = error_data.get('detail', f"HTTP错误 {response.status_code}")
            except:
                error_msg = f"HTTP错误 {response.status_code}: {response.text}"
            
            return {
                "status": "error",
                "message": error_msg,
                "prompt": ""
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"获取优化提示词模板时出错: {str(e)}",
            "prompt": ""
        }

def optimize(graph_name: str, optimization_requirement: str, model_name: str) -> Dict[str, Any]:
    """
    根据需求优化现有图配置
    
    该函数使用指定的AI模型根据用户的优化需求对现有图进行优化，
    并将优化后的图保存到系统中。优化后的图会包含改进的节点配置、
    连接关系和提示词等。
    
    参数:
        graph_name (str): 要优化的图名称
        optimization_requirement (str): 优化需求描述
        model_name (str): 要使用的AI模型名称
    
    返回:
        Dict[str, Any]: 优化结果，包含以下字段：
            - status: 操作状态 ("success" 或 "error")
            - message: 操作消息
            - original_graph_name: 原始图名称
            - optimized_graph_name: 优化后的图名称
            - analysis: AI模型的分析内容
            - model_output: 模型的完整输出
    
    示例:
        >>> import mag
        >>> mag.start()
        >>> result = mag.optimize_graph(
        ...     graph_name="my_research_graph",
        ...     optimization_requirement="优化这个图的性能，减少不必要的节点，改进提示词质量",
        ...     model_name="gpt-4"
        ... )
        >>> if result['status'] == 'success':
        ...     print(f"优化成功！新图名称: {result['optimized_graph_name']}")
        ...     print(f"分析: {result['analysis']}")
        ... else:
        ...     print(f"优化失败: {result['message']}")
    """
    _ensure_server_running()
    
    payload = {
        "graph_name": graph_name,
        "optimization_requirement": optimization_requirement,
        "model_name": model_name
    }
    
    try:
        response = requests.post(f"{API_BASE}/graphs/optimize", json=payload)
        
        if response.status_code == 200:
            return response.json()
        else:
            # 处理错误响应
            try:
                error_data = response.json()
                error_msg = error_data.get('detail', f"HTTP错误 {response.status_code}")
            except:
                error_msg = f"HTTP错误 {response.status_code}: {response.text}"
            
            return {
                "status": "error",
                "message": error_msg
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"优化图时出错: {str(e)}"
        }

def create_from_dict(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    从字典创建新图
    
    参数:
        graph_data (Dict[str, Any]): 图配置字典
    
    返回:
        Dict[str, Any]: 操作结果
    """
    return save(graph_data)

def get_detail(name: str) -> Dict[str, Any]:
    """
    获取图的详细信息（包括配置和README文件内容）
    
    参数:
        name (str): 图名称
    
    返回:
        Dict[str, Any]: 包含图配置和README内容的字典
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/graphs/{name}/readme")
    
    # 处理响应
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        print(f"警告: 找不到图 '{name}'")
        return {"name": name, "config": None, "readme": None}
    else:
        try:
            error_data = response.json()
            error_msg = error_data.get('detail', f"HTTP错误 {response.status_code}")
        except:
            error_msg = f"HTTP错误 {response.status_code}: {response.text}"
        
        print(f"错误: {error_msg}")
        return {"name": name, "config": None, "readme": None, "error": error_msg}
        
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

def generate(requirement: str, model_name: str) -> Dict[str, Any]:
    """
    根据需求自动生成图配置
    
    该函数使用指定的AI模型根据用户的自然语言需求自动生成完整的图配置，
    并将其保存到系统中。生成的图会包含适当的节点、连接关系和提示词。
    
    参数:
        requirement (str): 用户的图生成需求描述
        model_name (str): 要使用的AI模型名称
    
    返回:
        Dict[str, Any]: 生成结果，包含以下字段：
            - status: 操作状态 ("success" 或 "error")
            - message: 操作消息
            - graph_name: 生成的图名称
            - analysis: AI模型的分析内容
            - model_output: 模型的完整输出
    
    示例:
        >>> import mag
        >>> mag.start()
        >>> result = mag.generate_graph(
        ...     requirement="创建一个能够搜索网络并生成报告的工作流",
        ...     model_name="gpt-4"
        ... )
        >>> print(f"生成的图名称: {result['graph_name']}")
    """
    _ensure_server_running()
    
    payload = {
        "requirement": requirement,
        "model_name": model_name
    }
    
    try:
        response = requests.post(f"{API_BASE}/graphs/generate", json=payload)
        
        if response.status_code == 200:
            return response.json()
        else:
            # 处理错误响应
            try:
                error_data = response.json()
                error_msg = error_data.get('detail', f"HTTP错误 {response.status_code}")
            except:
                error_msg = f"HTTP错误 {response.status_code}: {response.text}"
            
            return {
                "status": "error",
                "message": error_msg
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"生成图时出错: {str(e)}"
        }