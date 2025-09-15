"""
MAG SDK - 会话管理客户端API
"""

import requests
from typing import Dict, List, Any, Optional, Iterator,Union
import json
from .. import _BASE_URL, start, is_running

API_BASE = f"{_BASE_URL}/api"

def _ensure_server_running():
    """确保服务器正在运行"""
    if not is_running():
        if not start():
            raise RuntimeError("无法启动MAG服务器")

def chat_completions(
        user_prompt: str,
        model: str,
        conversation_id: Optional[str] = None,
        system_prompt: Optional[str] = None,
        mcp: Optional[List[str]] = None,
        user_id: str = "default_user",
        stream: bool = False
) -> Union[Dict[str, Any], Iterator[Dict[str, Any]]]:
    """
    Chat completions接口 - 支持流式和非流式响应

    参数:
        user_prompt (str): 用户输入内容
        model (str): 模型名称
        conversation_id (str, optional): 对话ID
        system_prompt (str, optional): 系统提示词
        mcp (List[str], optional): MCP服务器列表
        user_id (str, optional): 用户ID
        stream (bool, optional): 是否流式响应

    返回:
        Dict[str, Any]: 非流式响应内容
        Iterator[Dict[str, Any]]: 流式响应（解析后的JSON数据）
    """
    _ensure_server_running()
    payload = {
        "user_prompt": user_prompt,
        "model_name": model,
        "conversation_id": conversation_id,
        "system_prompt": system_prompt,
        "mcp_servers": mcp,
        "user_id": user_id,
        "stream": stream
    }
    # 去除None值
    payload = {k: v for k, v in payload.items() if v is not None}

    if stream:
        # 流式响应 - 返回解析后的JSON数据迭代器
        return _stream_response_generator(payload)
    else:
        # 非流式响应
        response = requests.post(f"{API_BASE}/chat/completions", json=payload)
        response.raise_for_status()
        return response.json()


def _stream_response_generator(payload: Dict[str, Any]) -> Iterator[Dict[str, Any]]:
    """
    内部方法：生成流式响应并解析SSE数据

    返回:
        Iterator[Dict[str, Any]]: 解析后的JSON数据流
    """
    with requests.post(f"{API_BASE}/chat/completions", json=payload, stream=True) as response:
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

def list_conversations(user_id: str = "default_user") -> Dict[str, Any]:
    """
    获取对话列表（返回所有类型的对话）

    参数:
        user_id (str): 用户ID

    返回:
        Dict[str, Any]: 对话列表和总数
    """
    _ensure_server_running()
    params = {"user_id": user_id}
    response = requests.get(f"{API_BASE}/chat/conversations", params=params)
    response.raise_for_status()
    return response.json()

def get_conversation_detail(conversation_id: str) -> Dict[str, Any]:
    """
    获取对话完整内容（支持所有类型的对话）

    参数:
        conversation_id (str): 对话ID

    返回:
        Dict[str, Any]: 对话详情
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/chat/conversations/{conversation_id}")
    response.raise_for_status()
    return response.json()


def get_conversation_metadata(conversation_id: str, user_id: str = "default_user") -> Dict[str, Any]:
    """
    获取指定对话的元数据

    参数:
        conversation_id (str): 对话ID
        user_id (str): 用户ID

    返回:
        Dict[str, Any]: 对话元数据，如果未找到返回None
    """
    # 方式1：客户端过滤（推荐，不需要修改服务端）
    _ensure_server_running()
    conversations = list_conversations(user_id)
    target_conv = next(
        (conv for conv in conversations['conversations'] if conv['_id'] == conversation_id),
        None
    )
    return target_conv

def update_conversation_status(conversation_id: str, status: str, user_id: str = "default_user") -> Dict[str, Any]:
    """
    更新对话状态（活跃/软删除/收藏）

    参数:
        conversation_id (str): 对话ID
        status (str): "active", "deleted", "favorite"
        user_id (str): 用户ID

    返回:
        Dict[str, Any]: 操作结果
    """
    _ensure_server_running()
    payload = {"status": status, "user_id": user_id}
    response = requests.put(f"{API_BASE}/chat/conversations/{conversation_id}/status", json=payload)
    response.raise_for_status()
    return response.json()

def update_conversation_title(conversation_id: str, title: str, user_id: str = "default_user") -> Dict[str, Any]:
    """
    更新对话标题

    参数:
        conversation_id (str): 对话ID
        title (str): 新标题
        user_id (str): 用户ID

    返回:
        Dict[str, Any]: 操作结果
    """
    _ensure_server_running()
    payload = {"title": title, "user_id": user_id}
    response = requests.put(f"{API_BASE}/chat/conversations/{conversation_id}/title", json=payload)
    response.raise_for_status()
    return response.json()

def update_conversation_tags(conversation_id: str, tags: List[str], user_id: str = "default_user") -> Dict[str, Any]:
    """
    更新对话标签

    参数:
        conversation_id (str): 对话ID
        tags (List[str]): 标签列表
        user_id (str): 用户ID

    返回:
        Dict[str, Any]: 操作结果
    """
    _ensure_server_running()
    payload = {"tags": tags, "user_id": user_id}
    response = requests.put(f"{API_BASE}/chat/conversations/{conversation_id}/tags", json=payload)
    response.raise_for_status()
    return response.json()

def permanently_delete_conversation(conversation_id: str, user_id: str = "default_user") -> Dict[str, Any]:
    """
    永久删除对话

    参数:
        conversation_id (str): 对话ID
        user_id (str): 用户ID

    返回:
        Dict[str, Any]: 操作结果
    """
    _ensure_server_running()
    params = {"user_id": user_id}
    response = requests.delete(f"{API_BASE}/chat/conversations/{conversation_id}/permanent", params=params)
    response.raise_for_status()
    return response.json()


def compact_conversation(
        conversation_id: str,
        model_name: str,
        compact_type: str = "simple",
        compact_threshold: int = 2000,
        user_id: str = "default_user"
) -> Dict[str, Any]:
    """
    压缩对话内容

    参数:
        conversation_id (str): 对话ID
        model_name (str): 用于内容总结的模型名称
        compact_type (str): "simple" 或 "smart"
        compact_threshold (int): 压缩阈值
        user_id (str): 用户ID

    返回:
        Dict[str, Any]: 压缩结果
    """
    _ensure_server_running()

    # SDK词汇映射到API词汇
    type_mapping = {
        "simple": "brutal",
        "smart": "precise"
    }

    api_compact_type = type_mapping.get(compact_type, compact_type)

    payload = {
        "conversation_id": conversation_id,
        "model_name": model_name,
        "compact_type": api_compact_type,
        "compact_threshold": compact_threshold,
        "user_id": user_id
    }
    response = requests.post(f"{API_BASE}/chat/conversations/{conversation_id}/compact", json=payload)
    response.raise_for_status()
    return response.json()
