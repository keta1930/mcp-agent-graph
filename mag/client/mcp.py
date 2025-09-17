"""
MAG SDK - MCP服务器管理客户端API
"""

import requests
import json
from typing import Dict, List, Any, Optional, Union, Iterator

# 获取基础URL
from .. import _BASE_URL, start, is_running

API_BASE = f"{_BASE_URL}/api"


def _ensure_server_running():
    """确保服务器正在运行"""
    if not is_running():
        if not start():
            raise RuntimeError("无法启动MAG服务器")


def _stream_response_generator(payload: Dict[str, Any]) -> Iterator[Dict[str, Any]]:
    """
    内部方法：生成流式响应并解析SSE数据

    返回:
        Iterator[Dict[str, Any]]: 解析后的JSON数据流
    """
    with requests.post(f"{API_BASE}/mcp/generate", json=payload, stream=True) as response:
        response.raise_for_status()
        for line in response.iter_lines():
            if line:
                chunk = line.decode("utf-8")
                if chunk.startswith("data: "):
                    data_part = chunk[6:].strip()  # 去掉 "data: " 前缀
                    if data_part == "[DONE]":
                        break
                    try:
                        yield json.loads(data_part)
                    except json.JSONDecodeError:
                        continue


# ======= MCP SDK 公开方法 =======

def get_mcp_config() -> Dict[str, Any]:
    """
    获取MCP配置

    返回:
        Dict[str, Any]: MCP配置
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/mcp/config")
    response.raise_for_status()
    return response.json()


def update_mcp_config(config: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
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


def mcp_status() -> Dict[str, Dict[str, Any]]:
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
    连接指定的MCP服务器或所有服务器

    参数:
        server_name (str): 服务器名称，使用 "all" 连接所有服务器

    返回:
        Dict[str, Any]: 连接结果
    """
    _ensure_server_running()
    response = requests.post(f"{API_BASE}/mcp/connect/{server_name}")
    response.raise_for_status()
    return response.json()


def disconnect(server_name: str) -> Dict[str, Any]:
    """
    断开指定的MCP服务器连接

    参数:
        server_name (str): 服务器名称

    返回:
        Dict[str, Any]: 断开连接结果
    """
    _ensure_server_running()
    response = requests.post(f"{API_BASE}/mcp/disconnect/{server_name}")
    response.raise_for_status()
    return response.json()


def mcptools() -> Dict[str, List[Dict[str, Any]]]:
    """
    获取所有MCP工具信息

    返回:
        Dict[str, List[Dict[str, Any]]]: 按服务器分组的工具信息
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/mcp/tools")
    response.raise_for_status()
    return response.json()


def add_mcp(servers: Dict[str, Any]) -> Dict[str, Any]:
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


def remove_mcp(names: Union[str, List[str]]) -> Dict[str, Any]:
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
                "failed_removals": [],
                "total_requested": len(server_names)
            }
        except:
            return {
                "status": "error",
                "message": f"HTTP {response.status_code}: {response.text}",
                "removed_servers": [],
                "not_found_servers": [],
                "failed_removals": [],
                "total_requested": len(server_names)
            }


def test_mcptool(server_name: str, tool_name: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    测试MCP工具调用

    参数:
        server_name (str): 服务器名称
        tool_name (str): 工具名称
        params (Dict[str, Any], optional): 工具参数. 默认为None

    返回:
        Dict[str, Any]: 测试结果
    """
    _ensure_server_running()

    if params is None:
        params = {}

    payload = {
        "server_name": server_name,
        "tool_name": tool_name,
        "params": params
    }

    response = requests.post(f"{API_BASE}/mcp/test-tool", json=payload)
    response.raise_for_status()
    return response.json()


def mcp_template() -> Dict[str, str]:
    """
    获取AI生成MCP的提示词模板

    返回:
        Dict[str, str]: 包含模板内容和使用说明
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/mcp/ai-generator-template")
    response.raise_for_status()
    return response.json()


def gen_mcp(
        requirement: str,
        model: str,
        conversation_id: str,
        user_id: str = "default_user",
        stream: bool = True
) -> Union[Dict[str, Any], Iterator[Dict[str, Any]]]:
    """
    AI生成MCP工具

    参数:
        requirement (str): MCP工具需求描述
        model (str): 使用的模型名称
        conversation_id (str): 对话ID，用于多轮交互
        user_id (str, optional): 用户ID
        stream (bool, optional): 是否流式响应，默认为True

    返回:
        Union[Dict[str, Any], Iterator[Dict[str, Any]]]: 生成结果或流式数据
    """
    _ensure_server_running()

    payload = {
        "requirement": requirement,
        "model_name": model,
        "conversation_id": conversation_id,
        "user_id": user_id,
        "stream": stream
    }

    if stream:
        # 流式响应 - 返回解析后的JSON数据迭代器
        return _stream_response_generator(payload)
    else:
        # 非流式响应 - 直接返回API的完整结果
        response = requests.post(f"{API_BASE}/mcp/generate", json=payload)
        response.raise_for_status()
        return response.json()