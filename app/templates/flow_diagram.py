from typing import Dict, List, Any, Optional
from .template_utils import sanitize_id


class FlowDiagram:
    """工作流程图生成器"""

    @staticmethod
    def generate_mermaid_diagram(conversation: Dict[str, Any]) -> str:
        """生成表示工作流的Mermaid图表

        基于graph_config创建有向图，从Input到Output，使用简洁的单行连续格式
        """
        # 获取图配置
        graph_config = conversation.get("graph_config", {})
        nodes = graph_config.get("nodes", [])

        # 如果没有节点配置，返回简单图表
        if not nodes:
            return "graph TD\n    Input([\"start\"]) --> Output([\"end\"]);"

        # 初始化Mermaid图表
        mermaid = "graph TD"

        # 定义所有节点和连接
        connections = []

        # 用于跟踪已添加的连接，防止重复
        connection_set = set()

        # 首先添加Input节点
        connections.append("Input([\"start\"])")

        # 定义所有节点和它们的直接连接
        for node in nodes:
            node_name = node["name"]
            is_decision = len(node.get("output_nodes", [])) > 1 or node.get("handoffs") is not None

            shape = "{" if is_decision else "["
            end_shape = "}" if is_decision else "]"

            # 处理输入连接
            for input_node in node.get("input_nodes", []):
                if input_node == "start":
                    connection_key = f"Input-->to-->{node_name}"
                    if connection_key not in connection_set:
                        connections.append(f"Input([\"start\"]) --> {node_name}{shape}\"{node_name}\"{end_shape}")
                        connection_set.add(connection_key)
                else:
                    # 只有当输入节点存在于图配置中才添加连接
                    if any(n["name"] == input_node for n in nodes):
                        connection_key = f"{input_node}-->to-->{node_name}"
                        if connection_key not in connection_set:
                            input_is_decision = any(n["name"] == input_node and (
                                        len(n.get("output_nodes", [])) > 1 or n.get("handoffs") is not None) for n in
                                                    nodes)
                            input_shape = "{" if input_is_decision else "["
                            input_end_shape = "}" if input_is_decision else "]"
                            connections.append(
                                f"{input_node}{input_shape}\"{input_node}\"{input_end_shape} --> {node_name}{shape}\"{node_name}\"{end_shape}")
                            connection_set.add(connection_key)

            # 处理输出连接
            for output_node in node.get("output_nodes", []):
                if output_node == "end":
                    connection_key = f"{node_name}-->to-->Output"
                    if connection_key not in connection_set:
                        connections.append(f"{node_name}{shape}\"{node_name}\"{end_shape} --> Output([\"end\"])")
                        connection_set.add(connection_key)
                else:
                    # 只有当输出节点存在于图配置中才添加连接
                    if any(n["name"] == output_node for n in nodes):
                        connection_key = f"{node_name}-->to-->{output_node}"
                        if connection_key not in connection_set:
                            output_is_decision = any(n["name"] == output_node and (
                                        len(n.get("output_nodes", [])) > 1 or n.get("handoffs") is not None) for n in
                                                     nodes)
                            output_shape = "{" if output_is_decision else "["
                            output_end_shape = "}" if output_is_decision else "]"
                            connections.append(
                                f"{node_name}{shape}\"{node_name}\"{end_shape} --> {output_node}{output_shape}\"{output_node}\"{output_end_shape}")
                            connection_set.add(connection_key)

        # 添加Output节点，确保它至少有一个输入连接
        if not any("Output" in connection for connection in connections):
            # 找到没有输出的节点，将其连接到Output
            for node in nodes:
                if not node.get("output_nodes") or "end" in node.get("output_nodes", []):
                    node_name = node["name"]
                    is_decision = len(node.get("output_nodes", [])) > 1 or node.get("handoffs") is not None
                    shape = "{" if is_decision else "["
                    end_shape = "}" if is_decision else "]"
                    connection_key = f"{node_name}-->to-->Output"
                    if connection_key not in connection_set:
                        connections.append(f"{node_name}{shape}\"{node_name}\"{end_shape} --> Output([\"end\"])")
                        connection_set.add(connection_key)
                    break

        # 组合所有连接
        mermaid += "\n    " + ";\n    ".join(connections) + ";"

        return mermaid