"""
系统工具：get_graph_spec
获取 Graph 设计规范文档
"""
import logging
import os
from typing import Dict, Any

logger = logging.getLogger(__name__)

# 工具 Schema（OpenAI format)
TOOL_SCHEMA = {
    "zh": {
        "type": "function",
        "function": {
            "name": "get_graph_spec",
            "description": "获取Graph设计规范文档。此文档包含Graph配置的JSON Schema规范和设计指南。Agent可以参考此规范来设计Graph。",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    "en": {
        "type": "function",
        "function": {
            "name": "get_graph_spec",
            "description": "Get Graph design specification document. This document contains the JSON Schema specification and design guidelines for Graph configuration. Agents can refer to this specification to design Graphs.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
}


async def handler(user_id: str, **kwargs) -> Dict[str, Any]:
    """
    获取Graph设计规范文档

    Args:
        user_id: 用户ID
        **kwargs: 其他参数

    Returns:
        {
            "success": True,
            "spec": "规范文档内容..."
        }
    """
    try:
        # 从上下文获取用户语言
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()

        # 获取当前文件所在目录
        current_dir = os.path.dirname(os.path.abspath(__file__))

        # 根据语言选择对应的规范文件
        if language == "en":
            spec_file = os.path.join(current_dir, "graph_design_spec_en.md")
        else:
            spec_file = os.path.join(current_dir, "graph_design_spec_zh.md")

        # 读取规范文档
        if not os.path.exists(spec_file):
            raise FileNotFoundError(f"Specification file not found: {spec_file}")

        with open(spec_file, 'r', encoding='utf-8') as f:
            spec_content = f.read()

        return {
            "success": True,
            "spec": spec_content,
        }

    except Exception as e:
        logger.error(f"get_graph_spec 执行失败: {str(e)}")
        from app.services.system_tools.registry import get_current_language
        language = get_current_language()

        if language == "en":
            error_msg = f"Failed to get Graph specification: {str(e)}"
        else:
            error_msg = f"获取Graph规范文档失败: {str(e)}"

        return {
            "success": False,
            "message": error_msg,
            "spec": ""
        }
