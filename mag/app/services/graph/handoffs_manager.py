"""Handoffs管理类 - 处理节点间的handoffs逻辑"""
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class HandoffsManager:
    """Handoffs管理类 - 提供handoffs相关的所有功能"""

    @staticmethod
    def create_handoffs_tools(node: Dict[str, Any], graph_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """为handoffs节点创建工具选择列表
        
        将节点的输出节点列表转换为可选择的工具列表，供模型调用。
        
        Args:
            node: 当前节点配置
            graph_config: 图配置字典
            
        Returns:
            OpenAI格式的工具列表
        """
        tools = []
        
        for output_node_name in node.get("output_nodes", []):
            # 跳过 end 节点
            if output_node_name == "end":
                continue

            # 查找目标节点
            target_node = None
            for n in graph_config["nodes"]:
                if n["name"] == output_node_name:
                    target_node = n
                    break

            if not target_node:
                continue

            # 构建工具描述
            node_description = target_node.get("description", "")
            tool_description = f"Transfer to {output_node_name}. {node_description}"

            # 创建工具定义
            tool = {
                "type": "function",
                "function": {
                    "name": f"transfer_to_{output_node_name}",
                    "description": tool_description,
                    "parameters": {
                        "additionalProperties": False,
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            }
            tools.append(tool)
            
        return tools

    @staticmethod
    def check_handoffs_in_round(round_data: Dict[str, Any], node: Dict[str, Any]) -> bool:
        """检查round中是否有handoffs选择
        
        Args:
            round_data: 轮次数据
            node: 节点配置
            
        Returns:
            是否包含handoffs调用
        """
        if not round_data or not round_data.get("messages"):
            return False

        # 检查节点是否有handoffs限制
        handoffs_limit = node.get("handoffs")
        if handoffs_limit is None:
            return False

        # 检查消息中是否有transfer_to_调用
        for message in round_data["messages"]:
            if message.get("role") == "assistant" and message.get("tool_calls"):
                for tool_call in message["tool_calls"]:
                    tool_name = tool_call.get("function", {}).get("name", "")
                    if tool_name.startswith("transfer_to_"):
                        return True
                        
        return False

    @staticmethod
    def extract_handoffs_selection(round_data: Dict[str, Any]) -> Optional[str]:
        """从round中提取handoffs选择的目标节点
        
        Args:
            round_data: 轮次数据
            
        Returns:
            选择的目标节点名称，未找到返回None
        """
        if not round_data or not round_data.get("messages"):
            return None

        # 遍历消息查找transfer_to_调用
        for message in round_data["messages"]:
            if message.get("role") == "assistant" and message.get("tool_calls"):
                for tool_call in message["tool_calls"]:
                    tool_name = tool_call.get("function", {}).get("name", "")
                    if tool_name.startswith("transfer_to_"):
                        # 提取节点名称
                        selected_node = tool_name[len("transfer_to_"):]
                        return selected_node
                        
        return None