import uuid
import time
import threading
import os
import re
from typing import Dict, List, Any, Optional

# 添加线程本地存储和计数器
_thread_local = threading.local()
_counter_lock = threading.Lock()
_global_counter = 0

def generate_conversation_filename(graph_name: str) -> str:
    """生成唯一的会话文件名 - 图名称+高精度时间戳+随机组件"""
    global _global_counter
    
    # 获取高精度时间戳
    now = time.time()
    timestamp = time.strftime("%Y%m%d_%H%M%S", time.localtime(now))
    microseconds = int((now % 1) * 1000000)  # 微秒部分
    
    # 获取进程ID和线程ID
    process_id = os.getpid()
    thread_id = threading.get_ident()
    
    # 获取全局计数器（线程安全）
    with _counter_lock:
        _global_counter += 1
        counter = _global_counter
    
    # 生成短UUID（取前8位）
    short_uuid = str(uuid.uuid4()).split('-')[0]
    
    # 清理图名称（移除特殊字符）
    clean_graph_name = "".join(c for c in graph_name if c.isalnum() or c in ('_', '-'))[:20]
    
    # 组合唯一文件名
    filename = f"{clean_graph_name}_{timestamp}_{microseconds:06d}_{process_id}_{thread_id % 10000}_{counter}_{short_uuid}"
    
    return filename

def format_timestamp(timestamp: str = None) -> str:
    """格式化时间戳"""
    if timestamp is None:
        return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    return timestamp

def escape_html(text: str) -> str:
    """HTML特殊字符转义"""
    if not isinstance(text, str):
        return ""
    # 完整的HTML特殊字符转义
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#39;")

def get_node_execution_sequence(conversation: Dict[str, Any]) -> List[Dict[str, Any]]:
    """获取节点的执行顺序序列
    
    通过分析conversation中的results列表（按添加顺序排列）来确定节点执行顺序
    """
    # 获取执行结果并按执行顺序排序
    results = conversation.get("results", [])
    
    # 过滤掉开始输入节点
    node_results = [r for r in results if not r.get("is_start_input", False)]
    
    # 按照添加到结果列表的顺序返回（这代表了执行顺序）
    return node_results

def get_input_from_conversation(conversation: Dict[str, Any]) -> str:
    """从会话中获取用户输入"""
    # 查找初始输入
    for result in conversation.get("results", []):
        if result.get("is_start_input", False):
            return result.get("input", "")
    
    # 如果在results中没找到，尝试直接获取
    if "input" in conversation:
        return conversation.get("input", "")
    
    return ""

def sanitize_id(text: str) -> str:
    """将文本转换为安全的HTML ID"""
    return re.sub(r'[^a-zA-Z0-9_-]', '_', text)