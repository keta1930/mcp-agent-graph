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

    @staticmethod
    def generate_graph_readme(graph_config: Dict[str, Any], mcp_config: Dict[str, Any] = None,
                              model_configs: List[Dict[str, Any]] = None) -> str:
        """生成图的README文档"""
        # 提取基本信息
        graph_name = graph_config.get("name", "未命名图")
        graph_description = graph_config.get("description", "无描述")
        nodes = graph_config.get("nodes", [])

        # 构建README内容
        sections = []

        # 添加标题和描述
        sections.append(f"# {graph_name}")
        sections.append(graph_description)
        sections.append("")  # 空行

        # 添加流程图
        sections.append("## 流程图")
        # 创建一个模拟的conversation对象，以便使用现有的generate_mermaid_diagram方法
        mock_conversation = {"graph_config": graph_config}
        mermaid_diagram = FlowDiagram.generate_mermaid_diagram(mock_conversation)
        sections.append("```mermaid")
        sections.append(mermaid_diagram)
        sections.append("```")
        sections.append("")  # 空行

        # 添加节点信息
        sections.append("## 节点列表")
        for node in nodes:
            node_name = node.get("name", "未命名节点")
            node_description = node.get("description", "无描述")
            model_name = node.get("model_name", "无模型")
            sections.append(f"### {node_name}")
            sections.append(f"- 描述: {node_description}")
            sections.append(f"- 使用模型: {model_name}")

            # 添加节点的MCP服务器信息
            mcp_servers = node.get("mcp_servers", [])
            if mcp_servers:
                sections.append(f"- MCP服务器: {', '.join(mcp_servers)}")

            # 添加其他重要信息
            if node.get("is_start"):
                sections.append("- 此节点为图的起始节点")
            if node.get("is_end"):
                sections.append("- 此节点为图的结束节点")
            if node.get("handoffs") is not None:
                sections.append(f"- 最大决策次数: {node.get('handoffs')}")

            sections.append("")  # 节点之间添加空行

        # 添加使用的MCP服务器信息
        if mcp_config and mcp_config.get("mcpServers"):
            mcp_servers = set()
            for node in nodes:
                for server in node.get("mcp_servers", []):
                    mcp_servers.add(server)

            if mcp_servers:
                sections.append("## 使用的MCP服务器")
                for server_name in sorted(mcp_servers):
                    server_config = mcp_config.get("mcpServers", {}).get(server_name, {})
                    disabled = server_config.get("disabled", False)
                    timeout = server_config.get("timeout", 60)
                    sections.append(f"### {server_name}")
                    sections.append(f"- 状态: {'禁用' if disabled else '启用'}")
                    sections.append(f"- 超时: {timeout}秒")

                    # 显示自动批准的工具列表
                    auto_approve = server_config.get("autoApprove", [])
                    if auto_approve:
                        sections.append(f"- 自动批准的工具: {', '.join(auto_approve)}")

                    sections.append("")  # 服务器之间添加空行

        # 添加使用的模型信息
        if model_configs:
            model_names = set()
            for node in nodes:
                if node.get("model_name"):
                    model_names.add(node.get("model_name"))

            if model_names:
                sections.append("## 使用的模型")
                for model_name in sorted(model_names):
                    # 查找对应的模型配置
                    model_config = next((m for m in model_configs if m.get("name") == model_name), None)
                    if model_config:
                        sections.append(f"### {model_name}")
                        sections.append(f"- 基础URL: {model_config.get('base_url', '未指定')}")
                        sections.append(f"- 模型标识符: {model_config.get('model', '未指定')}")
                        sections.append("")  # 模型之间添加空行

        # 组合所有段落
        return "\n".join(sections)