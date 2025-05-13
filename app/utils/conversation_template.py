import time
from typing import Dict, List, Any, Optional

# 导入拆分后的子模块
from .template_utils import generate_conversation_filename, format_timestamp
from .template_utils import get_input_from_conversation, get_node_execution_sequence
from .markdown_generator import MarkdownGenerator
from .html_generator import HTMLGenerator
from .flow_diagram import FlowDiagram

class ConversationTemplate:
    """会话模板生成器 - 向下兼容的协调器"""

    @staticmethod
    def generate_conversation_filename(graph_name: str) -> str:
        """生成会话文件名 - 图名称+执行时间"""
        return generate_conversation_filename(graph_name)

    @staticmethod
    def generate_header(graph_name: str, conversation_id: str, input_text: str, start_time: str = None) -> str:
        """生成会话头部"""
        return MarkdownGenerator.generate_header(graph_name, conversation_id, input_text, start_time)

    @staticmethod
    def generate_node_section(node: Dict[str, Any]) -> str:
        """生成节点执行部分"""
        return MarkdownGenerator.generate_node_section(node)

    @staticmethod
    def generate_final_output(output: str) -> str:
        """生成最终输出部分"""
        return MarkdownGenerator.generate_final_output(output)

    @staticmethod
    def generate_template(conversation: Dict[str, Any]) -> str:
        """生成完整的会话模板，现在包含流程图和按执行顺序排列的节点"""
        return MarkdownGenerator.generate_template(conversation)

    @staticmethod
    def update_template(existing_template: str, conversation: Dict[str, Any]) -> str:
        """更新现有模板，确保所有节点信息都被包含"""
        return MarkdownGenerator.update_template(existing_template, conversation)


class HTMLConversationTemplate:
    """HTML会话模板生成器 - 向下兼容的协调器"""

    @staticmethod
    def _escape_html(text):
        """自定义HTML转义函数 - 保留向下兼容"""
        from .template_utils import escape_html
        return escape_html(text)

    @staticmethod
    def generate_html_template(conversation: Dict[str, Any]) -> str:
        """生成完整的HTML会话模板，现在包含流程图和按执行顺序排列的节点"""
        return HTMLGenerator.generate_html_template(conversation)

    @staticmethod
    def _generate_node_section_html(node: Dict[str, Any], node_id: str = "") -> str:
        """生成节点执行部分的HTML - 保留向下兼容"""
        return HTMLGenerator._generate_node_section_html(node, node_id)