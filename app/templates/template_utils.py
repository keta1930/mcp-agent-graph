import time
import re
from typing import Dict, List, Any, Optional

def generate_conversation_filename(graph_name: str) -> str:
    """生成会话文件名 - 图名称+执行时间"""
    # 使用年月日小时分钟格式
    time_str = time.strftime("%Y%m%d_%H%M%S", time.localtime())
    # 替换图名称中可能的特殊字符
    safe_graph_name = graph_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
    return f"{safe_graph_name}_{time_str}"

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