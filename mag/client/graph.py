"""
MAG SDK - 图管理客户端API
"""

import json
import os
import time

import requests
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, Iterator

# 获取基础URL
from .. import _BASE_URL, start, is_running

API_BASE = f"{_BASE_URL}/api"


def _ensure_server_running():
    """确保服务器正在运行"""
    if not is_running():
        if not start():
            raise RuntimeError("无法启动MAG服务器")


def _stream_response_generator(payload: Dict[str, Any], endpoint: str) -> Iterator[Dict[str, Any]]:
    """
    内部方法：生成流式响应并解析SSE数据

    参数:
        payload: 请求载荷
        endpoint: API端点

    返回:
        Iterator[Dict[str, Any]]: 解析后的JSON数据流
    """
    # 使用SSE模式
    sse_payload = payload.copy()
    sse_payload["background"] = False

    with requests.post(f"{API_BASE}{endpoint}", json=sse_payload, stream=True) as response:
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

def _run_graph_background(payload: Dict[str, Any]) -> str:
    """
    后台运行图并返回conversation_id

    使用新的background=true API参数，直接返回conversation_id

    参数:
        payload: 请求载荷

    返回:
        str: conversation_id
    """
    # 设置后台执行参数
    background_payload = payload.copy()
    background_payload["background"] = True

    # 调用后台执行API
    response = requests.post(f"{API_BASE}/graphs/execute", json=background_payload)
    response.raise_for_status()

    result = response.json()

    # 检查响应状态
    if result.get("status") == "started":
        conversation_id = result.get("conversation_id")
        if not conversation_id:
            raise RuntimeError("后台执行API返回格式错误：缺少conversation_id")
        return conversation_id
    elif result.get("status") == "error":
        error_msg = result.get("message", "未知错误")
        raise RuntimeError(f"后台执行启动失败：{error_msg}")
    else:
        raise RuntimeError(f"后台执行API返回格式错误：{result}")


def _run_graph_and_wait_for_completion(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    运行图并等待完成，然后返回完整的conversation详情

    参数:
        payload: 请求载荷

    返回:
        Dict[str, Any]: 完整的conversation详情
    """
    conversation_id = None
    graph_completed = False

    # 确保使用SSE模式（background=false）
    sse_payload = payload.copy()
    sse_payload["background"] = False

    # 第一步：执行图并监控完成状态
    with requests.post(f"{API_BASE}/graphs/execute", json=sse_payload, stream=True) as response:
        response.raise_for_status()

        for line in response.iter_lines():
            if line:
                chunk = line.decode("utf-8")
                if chunk.startswith("data: "):
                    data_part = chunk[6:].strip()
                    if data_part == "[DONE]":
                        break
                    try:
                        data = json.loads(data_part)

                        # 获取conversation_id
                        if data.get("type") == "conversation_created":
                            conversation_id = data.get("conversation_id")

                        # 检测图执行完成
                        elif data.get("type") == "graph_complete":
                            graph_completed = True
                            break

                    except json.JSONDecodeError:
                        continue

    if not conversation_id:
        raise RuntimeError("无法获取conversation_id，图启动失败")

    if not graph_completed:
        raise RuntimeError("图执行未完成或执行失败")

    # 第二步：等待数据保存并获取conversation详情
    time.sleep(1)

    max_retries = 3
    for attempt in range(max_retries):
        try:
            # 调用conversation detail API
            response = requests.get(f"{API_BASE}/chat/conversations/{conversation_id}")
            response.raise_for_status()
            conversation_detail = response.json()

            # 验证数据完整性
            if conversation_detail.get("_id") and conversation_detail.get("rounds"):
                return conversation_detail
            else:
                # 数据可能还没有完全保存，等待重试
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                else:
                    raise RuntimeError("获取到的conversation详情不完整")

        except requests.RequestException as e:
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            else:
                raise RuntimeError(f"获取conversation详情失败: {str(e)}")

    raise RuntimeError("获取conversation详情失败：达到最大重试次数")

# ======= 基本图管理 =======

def list_graph() -> List[str]:
    """
    获取所有可用的图

    返回:
        List[str]: 图名称列表
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/graphs")
    response.raise_for_status()
    return response.json()


def get_graph_config(graph_name: str) -> Dict[str, Any]:
    """
    获取特定图的配置

    参数:
        name (str): 图名称

    返回:
        Dict[str, Any]: 图配置
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/graphs/{graph_name}")
    response.raise_for_status()
    return response.json()


def get_graph_detail(graph_name: str) -> Dict[str, Any]:
    """
    获取图的详细信息（包括配置和README文件内容）

    参数:
        name (str): 图名称

    返回:
        Dict[str, Any]: 包含图配置和README内容的字典
            - name: 图名称
            - config: 图配置
            - readme: README文件内容
    """
    _ensure_server_running()
    response = requests.get(f"{API_BASE}/graphs/{graph_name}/readme")

    # 处理响应
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        return {"name": graph_name, "config": None, "readme": None, "error": f"找不到图 '{graph_name}'"}
    else:
        try:
            error_data = response.json()
            error_msg = error_data.get('detail', f"HTTP错误 {response.status_code}")
        except:
            error_msg = f"HTTP错误 {response.status_code}: {response.text}"

        return {"name": graph_name, "config": None, "readme": None, "error": error_msg}

# ======= 图执行 =======

def run_graph(name: str, input_text: str, stream: bool = False, background: bool = False) -> Union[Dict[str, Any], Iterator[Dict[str, Any]], str]:
    """
    执行图 - 支持后台运行和前台监控模式

    参数:
        name (str): 图名称
        input_text (str): 输入文本
        stream (bool): 是否使用流式响应，仅在background=False时有效
        background (bool): 是否后台运行，默认为False
                          - True: 启动图执行后立即返回conversation_id
                          - False: 根据stream参数决定行为

    返回:
        - background=True: 返回 conversation_id (str)
        - background=False + stream=True: 返回流式数据迭代器 (Iterator[Dict[str, Any]])
        - background=False + stream=False: 返回完整的conversation详情 (Dict[str, Any])
    """
    _ensure_server_running()
    payload = {
        "graph_name": name,
        "input_text": input_text
    }

    if background:
        # 后台运行模式：启动图执行并立即返回conversation_id
        return _run_graph_background(payload)
    elif stream:
        # 前台流式模式：返回流式数据迭代器
        return _stream_response_generator(payload, "/graphs/execute")
    else:
        # 前台非流式模式：等待图执行完成并返回conversation详情
        return _run_graph_and_wait_for_completion(payload)


# ======= AI 图生成 =======
def generate(requirement: str, model_name: str, mcp_servers: List[str] = None,
             conversation_id: Optional[str] = None, user_id: str = "default_user",
             stream: bool = False) -> Union[Dict[str, Any], Iterator[Dict[str, Any]]]:
    """
    根据需求自动生成图配置

    该函数使用指定的AI模型根据用户的自然语言需求自动生成完整的图配置，
    并将其保存到系统中。生成的图会包含适当的节点、连接关系和提示词。

    参数:
        requirement (str): 用户的图生成需求描述
        model_name (str): 要使用的AI模型名称
        mcp_servers (List[str], optional): 需要使用的MCP服务器列表
        conversation_id (str, optional): 对话ID，用于多轮交互
        user_id (str, optional): 用户ID
        stream (bool): 是否使用流式响应，默认为False

    返回:
        Union[Dict[str, Any], Iterator[Dict[str, Any]]]: 生成结果或流式数据

        非流式响应包含以下字段：
            - status: 操作状态 ("success" 或 "error")
            - message: 操作消息
            - graph_name: 生成的图名称
            - analysis: AI模型的分析内容
            - model_output: 模型的完整输出
    """
    _ensure_server_running()

    if mcp_servers is None:
        mcp_servers = []

    payload = {
        "requirement": requirement,
        "model_name": model_name,
        "conversation_id": conversation_id,
        "mcp_servers": mcp_servers,
        "user_id": user_id,
        "stream": stream
    }

    if stream:
        # 流式响应 - 返回解析后的JSON数据迭代器
        return _stream_response_generator(payload, "/graphs/generate")
    else:
        # 非流式响应 - 直接返回API的完整结果
        response = requests.post(f"{API_BASE}/graphs/generate", json=payload)
        response.raise_for_status()
        return response.json()


def optimize(graph_name: str, optimization_requirement: str, model_name: str,
             mcp_servers: List[str] = None, conversation_id: Optional[str] = None,
             user_id: str = "default_user", stream: bool = False) -> Union[Dict[str, Any], Iterator[Dict[str, Any]]]:
    """
    根据需求优化现有图配置

    该函数使用指定的AI模型根据用户的优化需求对现有图进行优化，
    并将优化后的图保存到系统中。优化后的图会包含改进的节点配置、
    连接关系和提示词等。

    参数:
        graph_name (str): 要优化的图名称
        optimization_requirement (str): 优化需求描述
        model_name (str): 要使用的AI模型名称
        mcp_servers (List[str], optional): 需要使用的MCP服务器列表
        conversation_id (str, optional): 对话ID，用于多轮交互
        user_id (str, optional): 用户ID
        stream (bool): 是否使用流式响应，默认为False

    返回:
        Union[Dict[str, Any], Iterator[Dict[str, Any]]]: 优化结果或流式数据

        非流式响应包含以下字段：
            - status: 操作状态 ("success" 或 "error")
            - message: 操作消息
            - graph_name: 优化后的图名称
            - analysis: AI模型的分析内容
            - model_output: 模型的完整输出
    """
    _ensure_server_running()

    if mcp_servers is None:
        mcp_servers = []

    payload = {
        "requirement": optimization_requirement,
        "model_name": model_name,
        "graph_name": graph_name,
        "conversation_id": conversation_id,
        "mcp_servers": mcp_servers,
        "user_id": user_id,
        "stream": stream
    }

    # 添加可选参数
    if conversation_id is not None:
        payload["conversation_id"] = conversation_id

    if stream:
        # 流式响应 - 返回解析后的JSON数据迭代器
        return _stream_response_generator(payload, "/graphs/generate")
    else:
        # 非流式响应 - 直接返回API的完整结果
        response = requests.post(f"{API_BASE}/graphs/generate", json=payload)
        response.raise_for_status()
        return response.json()


# ======= 提示词模板 =======
def graph_gen_prompt(mcp_servers: List[str] = None) -> str:
    """
    生成图创建的提示词模板

    该函数会获取当前系统中所有可用的MCP工具信息和模型列表，
    并生成一个包含这些信息的提示词模板，用于帮助用户创建图配置。

    参数:
        mcp_servers (List[str], optional): 需要包含的MCP服务器列表

    返回:
        str: 包含工具信息和模型列表的提示词模板
    """
    _ensure_server_running()

    payload = {}
    if mcp_servers is not None:
        payload["mcp_servers"] = mcp_servers

    response = requests.post(f"{API_BASE}/prompt-template", json=payload)
    response.raise_for_status()
    result = response.json()
    return result.get("prompt", "")


# ======= 图管理 =======
def save_graph(config: Dict[str, Any]) -> Dict[str, Any]:
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


def delete_graph(name: str) -> Dict[str, Any]:
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


def rename_graph(old_name: str, new_name: str) -> Dict[str, Any]:
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


def export_graph(name: str) -> Dict[str, Any]:
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


# ======= MCP 脚本生成 =======
def graph_to_mcp(name: str) -> Dict[str, Any]:
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