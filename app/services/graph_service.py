import asyncio
import logging
import json
import uuid
from typing import Dict, List, Any, Optional, Set, Tuple
import re

from app.core.file_manager import FileManager
from app.services.mcp_service import mcp_service
from app.services.model_service import model_service
from app.models.schema import GraphConfig, AgentNode, NodeResult, GraphResult
import copy
import os
logger = logging.getLogger(__name__)


class GraphService:
    """图执行服务"""

    def __init__(self):
        self.active_conversations: Dict[str, Dict[str, Any]] = {}

    async def initialize(self) -> None:
        """初始化图服务"""
        # 确保目录存在
        FileManager.initialize()

    def list_graphs(self) -> List[str]:
        """列出所有可用的图"""
        return FileManager.list_agents()

    def get_graph(self, graph_name: str) -> Optional[Dict[str, Any]]:
        """获取图配置"""
        return FileManager.load_agent(graph_name)

    def save_graph(self, graph_name: str, config: Dict[str, Any]) -> bool:
        """保存图配置"""
        print("save_graph", graph_name, config)

        # 先展开所有子图到扁平结构
        flattened_config = self._flatten_all_subgraphs(config)

        # 对扁平化后的图计算一次层级
        config_with_levels = self._calculate_node_levels(flattened_config)

        return FileManager.save_agent(graph_name, config_with_levels)

    def delete_graph(self, graph_name: str) -> bool:
        """删除图配置"""
        return FileManager.delete_agent(graph_name)

    def rename_graph(self, old_name: str, new_name: str) -> bool:
        """重命名图"""
        return FileManager.rename_agent(old_name, new_name)

    def _flatten_all_subgraphs(self, graph_config: Dict[str, Any]) -> Dict[str, Any]:
        """将图中所有子图完全展开为扁平结构，并更新节点引用关系"""
        import copy
        flattened_config = copy.deepcopy(graph_config)
        flattened_nodes = []

        # 子图名称到输出节点的映射
        subgraph_outputs = {}

        # 第一阶段：展开所有子图节点
        for node in graph_config.get("nodes", []):
            if node.get("is_subgraph", False):
                # 获取子图配置
                subgraph_name = node.get("subgraph_name")
                if not subgraph_name:
                    continue

                subgraph_config = self.get_graph(subgraph_name)
                if not subgraph_config:
                    continue

                # 记录子图的输入输出连接
                node_name = node["name"]
                parent_inputs = node.get("input_nodes", [])
                parent_outputs = node.get("output_nodes", [])

                # 递归展开子图（处理嵌套子图）
                subgraph_flattened = self._flatten_all_subgraphs(subgraph_config)

                # 找出子图中的输出节点（连接到"end"的节点或标记为is_end的节点）
                subgraph_output_nodes = []
                for sub_node in subgraph_flattened.get("nodes", []):
                    if "end" in sub_node.get("output_nodes", []) or sub_node.get("is_end", False):
                        subgraph_output_nodes.append(sub_node["name"])

                # 记录此子图的输出节点（添加前缀后）
                prefixed_output_nodes = [f"{node_name}.{output_node}" for output_node in subgraph_output_nodes]
                subgraph_outputs[node_name] = prefixed_output_nodes

                # 给子图内的节点添加前缀并处理连接关系
                prefix = f"{node_name}."
                for sub_node in subgraph_flattened.get("nodes", []):
                    # 复制节点并更新名称
                    sub_node_copy = copy.deepcopy(sub_node)
                    original_name = sub_node["name"]
                    sub_node_copy["name"] = prefix + original_name

                    # 更新内部连接关系，添加前缀
                    if "input_nodes" in sub_node_copy:
                        new_inputs = []
                        for input_node in sub_node_copy["input_nodes"]:
                            if input_node == "start":
                                # 保留start，稍后处理
                                new_inputs.append(input_node)
                            else:
                                # 为子图内部节点添加前缀
                                new_inputs.append(prefix + input_node)
                        sub_node_copy["input_nodes"] = new_inputs

                    if "output_nodes" in sub_node_copy:
                        new_outputs = []
                        for output_node in sub_node_copy["output_nodes"]:
                            if output_node == "end":
                                # 保留end，稍后处理
                                new_outputs.append(output_node)
                            else:
                                # 为子图内部节点添加前缀
                                new_outputs.append(prefix + output_node)
                        sub_node_copy["output_nodes"] = new_outputs

                    # 处理与外部图的连接
                    # 将"start"替换为父图中指向子图的节点
                    if "input_nodes" in sub_node_copy and "start" in sub_node_copy["input_nodes"]:
                        input_idx = sub_node_copy["input_nodes"].index("start")
                        sub_node_copy["input_nodes"][input_idx:input_idx + 1] = parent_inputs

                    # 将"end"替换为父图中子图指向的节点
                    if "output_nodes" in sub_node_copy and "end" in sub_node_copy["output_nodes"]:
                        output_idx = sub_node_copy["output_nodes"].index("end")
                        sub_node_copy["output_nodes"][output_idx:output_idx + 1] = parent_outputs

                        # 重置子图内的end节点标志，除非这是最外层图
                        if sub_node_copy.get("is_end", False):
                            sub_node_copy["is_end"] = False

                    # 记录原始信息用于结果展示
                    sub_node_copy["_original_name"] = original_name
                    sub_node_copy["_node_path"] = prefix
                    sub_node_copy["_subgraph_name"] = subgraph_name

                    flattened_nodes.append(sub_node_copy)
            else:
                # 普通节点直接添加
                flattened_nodes.append(copy.deepcopy(node))

        # 第二阶段：更新所有节点的输入引用，将引用整个子图的改为引用具体输出节点
        for node in flattened_nodes:
            if "input_nodes" in node:
                updated_inputs = []
                for input_node in node["input_nodes"]:
                    if input_node in subgraph_outputs:
                        # 如果引用了子图，替换为子图的实际输出节点
                        updated_inputs.extend(subgraph_outputs[input_node])
                        # 记录这是从子图引用转换而来
                        node["_input_from_subgraph"] = {
                            "original": input_node,
                            "expanded": subgraph_outputs[input_node]
                        }
                    else:
                        # 保持原有引用
                        updated_inputs.append(input_node)
                node["input_nodes"] = updated_inputs

        flattened_config["nodes"] = flattened_nodes

        # 第三阶段：确保展开后的图仍然有起始和结束节点
        has_start = False
        has_end = False
        for node in flattened_nodes:
            if node.get("is_start", False) or "start" in node.get("input_nodes", []):
                has_start = True
            if node.get("is_end", False) or "end" in node.get("output_nodes", []):
                has_end = True

        if not has_start:
            print("警告：展开后的图没有起始节点")
        if not has_end:
            print("警告：展开后的图没有结束节点")

        return flattened_config

    def _calculate_node_levels(self, graph_config: Dict[str, Any]) -> Dict[str, Any]:
        """重新设计的层级计算算法，正确处理所有依赖关系"""
        try:
            graph_copy = copy.deepcopy(graph_config)
            nodes = graph_copy.get("nodes", [])

            print(f"开始计算层级，共 {len(nodes)} 个节点")

            # 创建节点名称到节点对象的映射
            node_map = {node["name"]: node for node in nodes}

            # 构建依赖关系图（谁依赖谁）
            depends_on = {}
            for node in nodes:
                node_name = node["name"]
                depends_on[node_name] = set()

            # 处理输入依赖：如果B的input_nodes包含A，则B依赖A
            for node in nodes:
                node_name = node["name"]

                for input_name in node.get("input_nodes", []):
                    if input_name != "start" and input_name in node_map:
                        depends_on[node_name].add(input_name)
                        print(f"节点 {node_name} 依赖输入节点 {input_name}")

            # 处理输出依赖：如果A的output_nodes包含B，则B依赖A
            for node in nodes:
                node_name = node["name"]

                for output_name in node.get("output_nodes", []):
                    if output_name != "end" and output_name in node_map:
                        depends_on[output_name].add(node_name)
                        print(f"节点 {output_name} 依赖输出源 {node_name}")

            # 找出起始节点（直接连接到start且没有其他依赖，或者没有任何依赖的节点）
            start_nodes = []
            for node in nodes:
                node_name = node["name"]

                # 如果节点直接连接到start且没有其他实际依赖（排除start）
                if (node.get("is_start", False) or "start" in node.get("input_nodes", [])):
                    # 检查是否只依赖"start"
                    if not depends_on[node_name]:
                        start_nodes.append(node_name)
                        print(f"节点 {node_name} 是纯起始节点，仅依赖start")

            # 如果没有找到纯起始节点，寻找拓扑排序的起点
            if not start_nodes:
                # 找出没有入边的节点（没有被其他节点依赖的节点）
                no_incoming = set()
                for node_name in node_map:
                    if not any(node_name in deps for deps in depends_on.values()):
                        no_incoming.add(node_name)

                if no_incoming:
                    start_nodes = list(no_incoming)
                    print(f"使用拓扑排序找到的起始节点: {start_nodes}")
                else:
                    # 如果所有节点都有依赖关系（可能存在循环），使用所有直接连接到start的节点
                    for node in nodes:
                        if node.get("is_start", False) or "start" in node.get("input_nodes", []):
                            start_nodes.append(node["name"])
                            print(f"图可能存在循环依赖，使用连接到start的节点 {node['name']} 作为起始节点")

            # 如果仍然没有找到起始节点，使用任意节点作为起点
            if not start_nodes and nodes:
                start_nodes = [nodes[0]["name"]]
                print(f"未找到合适的起始节点，使用第一个节点 {start_nodes[0]} 作为起始点")

            # 初始化所有节点的层级
            levels = {node_name: -1 for node_name in node_map}

            # 所有起始节点的层级为0
            for node_name in start_nodes:
                levels[node_name] = 0
                print(f"起始节点 {node_name} 的层级设为0")

            # 反复迭代，直到所有节点的层级都稳定
            changed = True
            max_iterations = len(nodes) * 2  # 防止无限循环
            iteration = 0

            while changed and iteration < max_iterations:
                changed = False
                iteration += 1
                print(f"\n开始第 {iteration} 次迭代")

                for node_name, deps in depends_on.items():
                    old_level = levels[node_name]

                    # 如果是起始节点，不更新层级
                    if node_name in start_nodes:
                        continue

                    # 计算所有依赖的最大层级
                    max_dep_level = -1
                    all_deps_have_level = True

                    for dep in deps:
                        if levels[dep] >= 0:
                            max_dep_level = max(max_dep_level, levels[dep])
                        else:
                            all_deps_have_level = False

                    # 如果所有依赖都有层级
                    if all_deps_have_level and deps:
                        new_level = max_dep_level + 1

                        if old_level != new_level:
                            levels[node_name] = new_level
                            changed = True
                            print(f"  节点 {node_name} 的层级从 {old_level} 更新为 {new_level}")
                    elif not deps:
                        # 如果节点没有依赖，设置为0
                        if old_level != 0:
                            levels[node_name] = 0
                            changed = True
                            print(f"  节点 {node_name} 没有依赖，层级设为0")

                print(f"第 {iteration} 次迭代完成，是否有变化: {changed}")

            # 处理可能因循环依赖而未被赋值的节点
            for node_name in levels:
                if levels[node_name] < 0:
                    print(f"节点 {node_name} 未能确定层级，可能存在循环依赖")

                    # 找出所有依赖节点的最大层级和所有被依赖节点的最小层级
                    max_dep_level = -1
                    min_dependent_level = float('inf')

                    # 检查依赖
                    for dep in depends_on[node_name]:
                        if levels[dep] >= 0:
                            max_dep_level = max(max_dep_level, levels[dep])

                    # 检查被依赖
                    for other_name, deps in depends_on.items():
                        if node_name in deps and levels[other_name] >= 0:
                            min_dependent_level = min(min_dependent_level, levels[other_name])

                    if max_dep_level >= 0:
                        # 如果有已知层级的依赖，层级为最大依赖层级+1
                        levels[node_name] = max_dep_level + 1
                        print(f"  基于依赖设置循环节点 {node_name} 的层级为 {levels[node_name]}")
                    elif min_dependent_level < float('inf'):
                        # 如果有已知层级的被依赖节点，层级为最小被依赖层级-1
                        levels[node_name] = max(0, min_dependent_level - 1)
                        print(f"  基于被依赖设置循环节点 {node_name} 的层级为 {levels[node_name]}")
                    else:
                        # 如果都未知，设为1
                        levels[node_name] = 1
                        print(f"  无法确定依赖关系，设置节点 {node_name} 的层级为1")

            # 更新节点层级
            for node in nodes:
                node_name = node["name"]
                node["level"] = levels[node_name]

            # 打印最终层级
            print("\n最终节点层级:")
            for node in nodes:
                print(f"  节点 {node['name']}: 层级 {node['level']}")

            return graph_copy
        except Exception as e:
            import traceback
            print(f"计算节点层级时出错: {str(e)}")
            print(traceback.format_exc())

            # 出错时，为所有节点设置默认层级
            for node in graph_config.get("nodes", []):
                try:
                    node["level"] = 0
                except:
                    pass
            return graph_config

    def preprocess_graph(self, graph_config: Dict[str, Any], prefix_path: str = "") -> Dict[str, Any]:
        """将包含子图的复杂图展开为扁平化结构"""
        # 首先计算原始图的层级
        graph_config = self._calculate_node_levels(graph_config)

        import copy
        processed_config = copy.deepcopy(graph_config)
        processed_nodes = []

        # 处理每个节点
        for node in processed_config.get("nodes", []):
            if node.get("is_subgraph", False):
                # 展开子图节点
                expanded_nodes = self._expand_subgraph_node(
                    node,
                    prefix_path + node["name"] + "."
                )
                processed_nodes.extend(expanded_nodes)
            else:
                # 保留普通节点，但更新名称添加前缀
                node_copy = copy.deepcopy(node)
                original_name = node["name"]
                prefixed_name = prefix_path + original_name

                # 更新节点名称
                node_copy["name"] = prefixed_name

                # 更新输入/输出连接
                if "input_nodes" in node_copy:
                    node_copy["input_nodes"] = [
                        prefix_path + input_node if input_node != "start" else "start"
                        for input_node in node_copy["input_nodes"]
                    ]

                if "output_nodes" in node_copy:
                    node_copy["output_nodes"] = [
                        prefix_path + output_node if output_node != "end" else "end"
                        for output_node in node_copy["output_nodes"]
                    ]

                # 添加原始节点名称信息（便于调试和结果呈现）
                node_copy["_original_name"] = original_name
                node_copy["_node_path"] = prefix_path

                # 添加处理后的节点
                processed_nodes.append(node_copy)

        processed_config["nodes"] = processed_nodes

        # 重新计算展开后的图的层级
        processed_config = self._calculate_node_levels(processed_config)

        print("\nprocessed_config:\n", processed_config)
        return processed_config

    def _expand_subgraph_node(self, subgraph_node: Dict[str, Any], prefix_path: str) -> List[Dict[str, Any]]:
        """将子图节点展开为多个普通节点"""
        subgraph_name = subgraph_node.get("subgraph_name")
        if not subgraph_name:
            raise ValueError(f"子图节点 '{subgraph_node['name']}' 未指定子图名称")

        subgraph_config = self.get_graph(subgraph_name)
        if not subgraph_config:
            raise ValueError(f"找不到子图 '{subgraph_name}'")

        # 记录子图的输入输出连接
        parent_input_connections = subgraph_node.get("input_nodes", [])
        parent_output_connections = subgraph_node.get("output_nodes", [])

        # 递归处理子图配置
        expanded_config = self.preprocess_graph(subgraph_config, prefix_path)
        expanded_nodes = expanded_config["nodes"]

        # 处理连接关系
        for node in expanded_nodes:
            # 处理输入连接 - 将"start"替换为父图中指向子图的节点
            if "input_nodes" in node and "start" in node["input_nodes"]:
                input_idx = node["input_nodes"].index("start")
                node["input_nodes"][input_idx:input_idx + 1] = parent_input_connections

            # 处理输出连接 - 将"end"替换为父图中子图指向的节点
            if "output_nodes" in node and "end" in node["output_nodes"]:
                output_idx = node["output_nodes"].index("end")
                node["output_nodes"][output_idx:output_idx + 1] = parent_output_connections

                # 修复：如果子图节点被标记为终止节点，将其重置为非终止节点
                if node.get("is_end", False):
                    node["is_end"] = False

            # 记录子图信息
            node["_subgraph_name"] = subgraph_name

        print("expand_subgraph_node\n",expanded_nodes)

        return expanded_nodes

    def detect_graph_cycles(self, graph_name: str, visited: List[str] = None) -> Optional[List[str]]:
        """检测图引用中的循环"""
        if visited is None:
            visited = []

        # 发现循环
        if graph_name in visited:
            return visited + [graph_name]

        # 获取图配置
        graph_config = self.get_graph(graph_name)
        if not graph_config:
            return None

        # 更新访问路径
        current_path = visited + [graph_name]

        # 检查子图节点
        for node in graph_config.get("nodes", []):
            if node.get("is_subgraph", False):
                subgraph_name = node.get("subgraph_name")
                if subgraph_name:
                    # 递归检查
                    cycle = self.detect_graph_cycles(subgraph_name, current_path)
                    if cycle:
                        return cycle

        return None

    def validate_graph(self, graph_config: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """验证图配置是否有效"""
        try:
            # 检查基本结构
            if "name" not in graph_config:
                return False, "缺少图名称"

            if "nodes" not in graph_config or not isinstance(graph_config["nodes"], list):
                return False, "缺少节点列表或格式不正确"

            # 获取所有节点名称
            node_names = set()
            for node in graph_config["nodes"]:
                if "name" not in node:
                    return False, "某个节点缺少名称"
                node_names.add(node["name"])

            # 获取所有服务器状态
            servers_status = mcp_service.get_server_status_sync()

            # 检查所有节点的输入/输出引用
            for node in graph_config["nodes"]:
                # 检查输入节点
                for input_node in node.get("input_nodes", []):
                    if input_node != "start" and input_node not in node_names:
                        return False, f"节点 '{node['name']}' 引用了不存在的输入节点 '{input_node}'"

                # 检查输出节点
                for output_node in node.get("output_nodes", []):
                    if output_node != "end" and output_node not in node_names:
                        return False, f"节点 '{node['name']}' 引用了不存在的输出节点 '{output_node}'"

                # 检查子图节点特殊配置
                if node.get("is_subgraph", False):
                    subgraph_name = node.get("subgraph_name")
                    if not subgraph_name:
                        return False, f"子图节点 '{node['name']}' 未指定子图名称"

                    # 检查子图是否存在
                    subgraph_config = self.get_graph(subgraph_name)
                    if not subgraph_config:
                        return False, f"子图节点 '{node['name']}' 引用了不存在的子图 '{subgraph_name}'"

                    # 检查是否有循环引用
                    if subgraph_name == graph_config.get("name"):
                        return False, f"子图节点 '{node['name']}' 引用了自身，形成循环引用"

                    # 检查深层次循环引用
                    cycle = self.detect_graph_cycles(subgraph_name, [graph_config.get("name")])
                    if cycle:
                        return False, f"检测到循环引用链: {' -> '.join(cycle)}"
                else:
                    # 检查普通节点是否指定了模型
                    if "model_name" not in node:
                        return False, f"节点 '{node['name']}' 未指定模型"

                    # 检查模型是否存在
                    model_config = model_service.get_model(node["model_name"])
                    if not model_config:
                        return False, f"节点 '{node['name']}' 使用了不存在的模型 '{node['model_name']}'"

                # 检查MCP服务器是否存在和连接
                for server_name in node.get("mcp_servers", []):
                    if server_name not in servers_status or not servers_status[server_name].get("connected", False):
                        return False, f"节点 '{node['name']}' 使用了不存在或未连接的MCP服务器 '{server_name}'"

            # 检查是否至少有一个开始节点
            has_start = False
            for node in graph_config["nodes"]:
                if node.get("is_start", False) or "start" in node.get("input_nodes", []):
                    has_start = True
                    break

            if not has_start:
                return False, "图中没有指定开始节点"

            # 检查是否至少有一个结束节点
            has_end = False
            for node in graph_config["nodes"]:
                if node.get("is_end", False) or "end" in node.get("output_nodes", []):
                    has_end = True
                    break

            if not has_end:
                return False, "图中没有指定结束节点"

            return True, None
        except Exception as e:
            logger.error(f"验证图配置时出错: {str(e)}")
            return False, f"验证图配置时出错: {str(e)}"

    def create_conversation(self, graph_name: str) -> str:
        """创建新的会话"""
        conversation_id = str(uuid.uuid4())

        # 加载图配置
        graph_config = self.get_graph(graph_name)
        if not graph_config:
            raise ValueError(f"找不到图 '{graph_name}'")

        # 初始化会话状态
        self.active_conversations[conversation_id] = {
            "graph_name": graph_name,
            "graph_config": graph_config,
            "node_states": {},
            "pending_nodes": set(),
            "completed_nodes": set(),
            "results": [],
            "parallel": False  # 默认使用顺序执行
        }

        return conversation_id

    def create_conversation_with_config(self, graph_name: str, graph_config: Dict[str, Any]) -> str:
        """使用指定配置创建新的会话"""
        conversation_id = str(uuid.uuid4())

        # 初始化会话状态
        self.active_conversations[conversation_id] = {
            "graph_name": graph_name,
            "graph_config": graph_config,
            "node_states": {},
            "pending_nodes": set(),
            "completed_nodes": set(),
            "results": [],
            "parallel": False  # 默认使用顺序执行
        }

        return conversation_id

    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取会话状态"""
        return self.active_conversations.get(conversation_id)

    def delete_conversation(self, conversation_id: str) -> bool:
        """删除会话"""
        if conversation_id in self.active_conversations:
            del self.active_conversations[conversation_id]
            return True
        return False

    def _find_start_nodes(self, graph_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """查找图中的起始节点"""
        start_nodes = []

        for node in graph_config["nodes"]:
            if node.get("is_start", False) or "start" in node.get("input_nodes", []):
                start_nodes.append(node)

        return start_nodes

    def _find_next_nodes(self, current_node: Dict[str, Any], graph_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """查找当前节点的下一个节点"""
        next_nodes = []

        # 获取当前节点的输出节点名称
        output_nodes = current_node.get("output_nodes", [])

        # 如果包含"end"，则表示图执行结束
        if "end" in output_nodes:
            return []

        # 查找匹配的节点
        for node in graph_config["nodes"]:
            if node["name"] in output_nodes or current_node["name"] in node.get("input_nodes", []):
                next_nodes.append(node)

        return next_nodes

    def _create_agent_messages(self,
                               node: Dict[str, Any],
                               input_text: str,
                               tool_results: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, str]]:
        """创建Agent的消息列表"""
        messages = []


        # 创建系统提示词
        system_prompt = node.get("system_prompt", "")
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        # 添加用户提示词（如果有）
        user_prompt = node.get("user_prompt", "")
        if user_prompt:
            user_prompt = user_prompt + input_text
            messages.append({"role": "user", "content": user_prompt})
        else:
            messages.append({"role": "user", "content": input_text})
        return messages

    async def _execute_node(self,
                            node: Dict[str, Any],
                            input_text: str,
                            conversation_id: str) -> Dict[str, Any]:
        """执行单个节点"""
        try:
            # 创建消息
            messages = self._create_agent_messages(node, input_text)

            # 从节点获取模型信息
            model_name = node["model_name"]
            model_config = model_service.get_model(model_name)
            if not model_config:
                raise ValueError(f"找不到模型 '{model_name}'")

            # 提取MCP服务器列表
            mcp_servers = node.get("mcp_servers", [])
            output_enabled = node.get("output_enabled", True)

            # 调用MCP服务执行节点
            response = await mcp_service.execute_node(
                model_name=model_config["model"],
                api_key=model_config["api_key"],
                base_url=model_config["base_url"],
                messages=messages,
                mcp_servers=mcp_servers,
                output_enabled=output_enabled
            )

            # 检查执行状态
            if response.get("status") == "error":
                raise ValueError(response.get("error", "执行节点失败"))
            node_name = node["name"]
            result = {
                "node_name": node_name,
                "input": input_text,
                "output": str(response.get("content", "") or ""),
                "tool_calls": [],
                "tool_results": response.get("tool_calls", []),
                "_original_name": node.get("_original_name", node_name),
                "_node_path": node.get("_node_path", "")
            }

            # 更新会话状态
            conversation = self.active_conversations.get(conversation_id)
            if conversation:
                if "node_states" not in conversation:
                    conversation["node_states"] = {}
                conversation["node_states"][node["name"]] = {
                    "messages": messages,
                    "result": result
                }
                conversation["completed_nodes"].add(node["name"])
                if node["name"] in conversation["pending_nodes"]:
                    conversation["pending_nodes"].remove(node["name"])
                conversation["results"].append(result)
            return result

        except Exception as e:
            logger.error(f"执行节点 '{node['name']}' 时出错: {str(e)}")
            # 创建错误结果
            error_result = {
                "node_name": node["name"],
                "input": input_text,
                "output": f"执行出错: {str(e)}",
                "tool_calls": [],
                "tool_results": [],
                "error": str(e),
                "_original_name": node.get("_original_name", node["name"]),
                "_node_path": node.get("_node_path", "")
            }

            # 更新会话状态
            conversation = self.active_conversations.get(conversation_id)
            if conversation:
                if "node_states" not in conversation:
                    conversation["node_states"] = {}
                conversation["node_states"][node["name"]] = {
                    "error": str(e)
                }
                conversation["completed_nodes"].add(node["name"])
                if node["name"] in conversation["pending_nodes"]:
                    conversation["pending_nodes"].remove(node["name"])
                conversation["results"].append(error_result)

            return error_result

    async def _execute_graph_step(self,
                                  conversation_id: str,
                                  input_text: str = None) -> Dict[str, Any]:
        """执行图的一个步骤"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"找不到会话 '{conversation_id}'")

        graph_config = conversation["graph_config"]

        # 如果是第一次执行，找到起始节点
        if not conversation["completed_nodes"] and not conversation["pending_nodes"]:
            start_nodes = self._find_start_nodes(graph_config)
            conversation["pending_nodes"] = set(node["name"] for node in start_nodes)

            # 记录用户输入
            conversation["results"].append({
                "is_start_input": True,
                "node_name": "start",
                "input": input_text,
                "output": "",
                "tool_calls": [],
                "tool_results": []
            })

            # 执行起始节点
            results = []
            for node in start_nodes:
                result = await self._execute_node(node, input_text, conversation_id)
                results.append(result)
            return {
                "conversation_id": conversation_id,
                "graph_name": conversation["graph_name"],
                "step_results": results,
                "is_complete": self._is_graph_complete(conversation),
                "next_nodes": self._get_next_pending_nodes(conversation)
            }

        # 获取下一批待执行的节点
        pending_nodes = set(self._get_next_pending_nodes(conversation))
        if not pending_nodes:
            # 没有更多待执行的节点，执行结束
            return {
                "conversation_id": conversation_id,
                "graph_name": conversation["graph_name"],
                "step_results": [],
                "is_complete": True,
                "next_nodes": []
            }

        # 执行待执行的节点
        results = []
        for node_name in list(pending_nodes):
            # 找到节点配置
            node = None
            for n in graph_config["nodes"]:
                if n["name"] == node_name:
                    node = n
                    break

            if not node:
                logger.error(f"找不到节点 '{node_name}'")
                continue

            # 确定节点的输入
            node_input = self._get_node_input(node, conversation)

            # 执行节点
            result = await self._execute_node(node, node_input, conversation_id)
            results.append(result)

        return {
            "conversation_id": conversation_id,
            "graph_name": conversation["graph_name"],
            "step_results": results,
            "is_complete": self._is_graph_complete(conversation),
            "next_nodes": self._get_next_pending_nodes(conversation)
        }

    def _is_graph_complete(self, conversation: Dict[str, Any]) -> bool:
        """检查图是否已完成执行"""
        if conversation["pending_nodes"]:
            return False

        # 检查是否所有节点都已执行或没有更多可执行的节点
        graph_config = conversation["graph_config"]
        all_node_names = set(node["name"] for node in graph_config["nodes"])

        # 如果所有节点都已完成或没有更多可执行的节点，则图完成
        return conversation["completed_nodes"] == all_node_names or not self._get_next_pending_nodes(conversation)

    def _get_next_pending_nodes(self, conversation: Dict[str, Any]) -> Set[str]:
        """获取下一批可执行的节点"""
        graph_config = conversation["graph_config"]

        # 如果已有待执行的节点，直接返回
        if conversation["pending_nodes"]:
            return conversation["pending_nodes"]

        # 找出还未执行的节点中，所有输入节点都已执行的节点
        next_nodes = set()
        completed_nodes = conversation["completed_nodes"]

        for node in graph_config["nodes"]:
            # 跳过已完成的节点
            if node["name"] in completed_nodes:
                continue

            # 检查输入节点是否都已完成
            input_nodes = node.get("input_nodes", [])
            all_inputs_ready = True

            for input_node in input_nodes:
                if input_node == "start":
                    continue
                if input_node not in completed_nodes:
                    all_inputs_ready = False
                    break

            if all_inputs_ready:
                next_nodes.add(node["name"])

        # 更新会话的待执行节点
        conversation["pending_nodes"] = next_nodes
        return next_nodes

    def _get_node_input(self, node: Dict[str, Any], conversation: Dict[str, Any]) -> str:
        """根据节点的输入节点计算输入内容"""
        input_nodes = node.get("input_nodes", [])
        if not input_nodes:
            return ""

        # 收集所有输入节点的输出
        inputs = []
        for input_node_name in input_nodes:
            if input_node_name == "start":
                # 输入是用户的原始输入
                for result in conversation["results"]:
                    if result.get("is_start_input", False):
                        inputs.append(result["input"])
                        break
            else:
                # 直接检查节点状态，不再特殊处理子图引用
                if input_node_name in conversation["node_states"]:
                    node_state = conversation["node_states"][input_node_name]
                    if "result" in node_state:
                        inputs.append(node_state["result"]["output"])

        # 合并所有输入
        return "\n\n".join(inputs)

    def _restructure_results(self, conversation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """将扁平化的执行结果重组为层次化结构，便于展示"""
        original_config = conversation.get("original_config", {})
        flattened_results = conversation.get("results", [])

        # 如果没有原始配置或者原始配置就是展开的配置，直接返回结果
        if not original_config or "original_config" not in conversation:
            return flattened_results

        # 获取原始节点列表
        original_nodes = original_config.get("nodes", [])

        # 重组结果
        structured_results = []

        # 先添加start输入（如果有）
        for result in flattened_results:
            if result.get("is_start_input", False):
                structured_results.append(result)

        # 处理每个原始节点
        for node in original_nodes:
            node_name = node["name"]

            if node.get("is_subgraph", False):
                # 子图节点 - 收集所有带有相应前缀的节点结果
                prefix = node_name + "."
                subgraph_results = [
                    result for result in flattened_results
                    if not result.get("is_start_input", False) and
                       (result.get("_node_path", "") + result.get("_original_name", "")).startswith(prefix)
                ]

                # 获取子图的输入/输出
                subgraph_input = self._get_node_input_from_results(node, conversation)
                subgraph_output = self._get_node_output_from_results(node, conversation, prefix)

                # 创建子图结果
                if subgraph_results:
                    subgraph_node_result = {
                        "node_name": node_name,
                        "input": subgraph_input,
                        "output": subgraph_output,
                        "is_subgraph": True,
                        "subgraph_name": node.get("subgraph_name"),
                        "tool_calls": [],
                        "tool_results": [],
                        "subgraph_results": self._organize_subgraph_results(subgraph_results, prefix)
                    }
                    structured_results.append(subgraph_node_result)
            else:
                # 普通节点 - 查找对应的结果
                for result in flattened_results:
                    if not result.get("is_start_input", False) and result.get(
                            "_original_name") == node_name and result.get("_node_path", "") == "":
                        # 复制结果，但移除内部字段
                        clean_result = {k: v for k, v in result.items() if not k.startswith("_")}
                        structured_results.append(clean_result)
                        break

        return structured_results

    def _organize_subgraph_results(self, flattened_results: List[Dict[str, Any]], parent_prefix: str) -> List[
        Dict[str, Any]]:
        """整理子图的扁平化结果为有层次的结构"""

        # 移除父前缀获取相对路径
        def get_relative_path(full_path, parent_prefix):
            if full_path.startswith(parent_prefix):
                return full_path[len(parent_prefix):]
            return full_path

        # 获取直接子节点（没有进一步的点分隔）
        direct_children = []
        for result in flattened_results:
            full_path = result.get("_node_path", "") + result.get("_original_name", "")
            rel_path = get_relative_path(full_path, parent_prefix)

            # 如果是直接子节点（没有点分隔）
            if "." not in rel_path:
                # 复制结果，但移除内部字段
                clean_result = {k: v for k, v in result.items() if not k.startswith("_")}
                # 恢复原始节点名称
                clean_result["node_name"] = result.get("_original_name", clean_result.get("node_name", "unknown"))
                direct_children.append(clean_result)

        return direct_children

    def _get_node_input_from_results(self, node: Dict[str, Any], conversation: Dict[str, Any]) -> str:
        """根据节点的输入节点和结果获取输入内容"""
        input_nodes = node.get("input_nodes", [])
        if not input_nodes:
            return ""

        # 收集所有输入节点的输出
        inputs = []
        for input_node_name in input_nodes:
            if input_node_name == "start":
                # 输入是用户的原始输入
                for result in conversation["results"]:
                    if result.get("is_start_input", False):
                        inputs.append(result["input"])
                        break
            else:
                # 在所有结果中查找输入节点的输出
                for result in conversation["results"]:
                    if not result.get("is_start_input", False) and result.get(
                            "_original_name") == input_node_name and result.get("_node_path", "") == "":
                        inputs.append(result["output"])

        # 合并所有输入
        return "\n\n".join(inputs)

    def _get_node_output_from_results(self, node: Dict[str, Any], conversation: Dict[str, Any], prefix: str) -> str:
        """获取子图的最终输出"""
        results = conversation["results"]
        graph_config = conversation["graph_config"]

        # 查找带有前缀的终止节点
        end_nodes = []
        for config_node in graph_config.get("nodes", []):
            if (config_node.get("is_end", False) or "end" in config_node.get("output_nodes", [])) and config_node.get(
                    "_node_path", "").startswith(prefix):
                end_nodes.append(config_node)

        # 收集所有终止节点的输出
        outputs = []
        for end_node in end_nodes:
            # 在结果中查找对应的节点结果
            for result in results:
                if result.get("node_name") == end_node["name"]:
                    outputs.append(result["output"])
                    break

        # 如果没有找到终止节点，尝试使用最后一个子图节点的输出
        if not outputs:
            # 获取前缀对应的所有结果
            prefix_results = [r for r in results if r.get("node_name", "").startswith(prefix)]
            if prefix_results:
                # 按执行顺序排序
                prefix_results.sort(key=lambda r: results.index(r))
                # 使用最后一个结果的输出
                outputs.append(prefix_results[-1]["output"])

        # 合并所有输出
        return "\n\n".join(outputs)

    def _get_final_output(self, conversation: Dict[str, Any]) -> str:
        """获取图的最终输出"""
        graph_config = conversation["graph_config"]

        # 查找终止节点
        end_nodes = []
        for node in graph_config["nodes"]:
            if node.get("is_end", False) or "end" in node.get("output_nodes", []):
                end_nodes.append(node)

        # 如果找不到明确的终止节点，使用最后执行的节点
        if not end_nodes and conversation["results"]:
            # 过滤掉起始输入
            non_start_results = [r for r in conversation["results"] if not r.get("is_start_input", False)]
            if non_start_results:
                last_result = non_start_results[-1]
                return last_result["output"]
            return ""

        # 收集所有终止节点的输出
        outputs = []
        for node in end_nodes:
            if node["name"] in conversation["node_states"]:
                node_state = conversation["node_states"][node["name"]]
                if "result" in node_state:
                    outputs.append(node_state["result"]["output"])

        # 合并所有输出
        return "\n\n".join(outputs)

    async def execute_graph(self, graph_name: str, input_text: str, parallel: bool = False) -> Dict[str, Any]:
        """执行整个图并返回结果"""
        # 加载原始图配置
        original_config = self.get_graph(graph_name)
        if not original_config:
            raise ValueError(f"找不到图 '{graph_name}'")

        # 检查循环引用
        cycle = self.detect_graph_cycles(graph_name)
        if cycle:
            raise ValueError(f"检测到循环引用链: {' -> '.join(cycle)}")

        # 展开图配置，处理所有子图
        flattened_config = self.preprocess_graph(original_config)

        # 创建会话
        conversation_id = self.create_conversation_with_config(graph_name, flattened_config)

        # 保存原始配置和并行执行设置
        self.active_conversations[conversation_id]["original_config"] = original_config
        self.active_conversations[conversation_id]["parallel"] = parallel

        # 记录展开信息
        logger.info(
            f"图 '{graph_name}' 已展开: {len(original_config.get('nodes', []))} 个原始节点 -> {len(flattened_config.get('nodes', []))} 个展开节点")

        # 执行图
        if parallel:
            await self._execute_graph_parallel(conversation_id, input_text)
        else:
            # 顺序执行
            # 执行第一步（起始节点）
            step_result = await self._execute_graph_step(conversation_id, input_text)

            # 继续执行，直到完成
            while not step_result["is_complete"]:
                step_result = await self._execute_graph_step(conversation_id)

        # 获取最终输出
        conversation = self.active_conversations[conversation_id]
        final_output = self._get_final_output(conversation)

        # 创建结果对象
        result = {
            "conversation_id": conversation_id,
            "graph_name": graph_name,
            "input": input_text,
            "output": final_output,
            "node_results": self._restructure_results(conversation),
            "completed": True
        }

        return result

    async def continue_conversation(self, conversation_id: str, input_text: str, parallel: bool = False) -> Dict[str, Any]:
        """继续现有会话"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"找不到会话 '{conversation_id}'")

        # 重置会话状态，保留图配置和以前的结果
        previous_results = conversation.get("results", [])
        original_config = conversation.get("original_config")
        graph_config = conversation.get("graph_config")
        graph_name = conversation.get("graph_name")

        # 重新创建会话
        self.active_conversations[conversation_id] = {
            "graph_name": graph_name,
            "graph_config": graph_config,
            "original_config": original_config,
            "node_states": {},
            "pending_nodes": set(),
            "completed_nodes": set(),
            "results": [r for r in previous_results if r.get("is_start_input", False)],
            "parallel": parallel  # 设置并行执行标志
        }

        # 添加新的用户输入
        conversation = self.active_conversations[conversation_id]
        conversation["results"].append({
            "is_start_input": True,
            "node_name": "user_input",
            "input": input_text,
            "output": "",
            "tool_calls": [],
            "tool_results": []
        })

        # 执行图
        if parallel:
            await self._execute_graph_parallel(conversation_id, input_text)
        else:
            # 顺序执行
            # 执行第一步（起始节点）
            step_result = await self._execute_graph_step(conversation_id, input_text)

            # 继续执行，直到完成
            while not step_result["is_complete"]:
                step_result = await self._execute_graph_step(conversation_id)

        # 获取最终输出
        final_output = self._get_final_output(conversation)

        # 创建结果对象
        result = {
            "conversation_id": conversation_id,
            "graph_name": graph_name,
            "input": input_text,
            "output": final_output,
            "node_results": self._restructure_results(conversation),
            "completed": True
        }

        return result

    async def _execute_graph_parallel(self, conversation_id: str, input_text: str = None):
        """并行执行图"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"找不到会话 '{conversation_id}'")

        graph_config = conversation["graph_config"]

        # 记录用户输入
        if input_text is not None:
            conversation["results"].append({
                "is_start_input": True,
                "node_name": "start",
                "input": input_text,
                "output": "",
                "tool_calls": [],
                "tool_results": []
            })

        # 获取图中的最大层级
        max_level = 0
        for node in graph_config.get("nodes", []):
            level = node.get("level", 0)
            max_level = max(max_level, level)

        # 按层级依次执行
        for current_level in range(max_level + 1):
            logger.info(f"开始执行层级 {current_level} 的节点")

            # 找出当前层级的所有可执行节点
            executable_nodes = []
            for node in graph_config.get("nodes", []):
                if node.get("level", 0) == current_level:
                    # 检查节点是否可执行（所有依赖都已完成）
                    can_execute = True

                    for input_node_name in node.get("input_nodes", []):
                        if input_node_name != "start" and input_node_name not in conversation["completed_nodes"]:
                            can_execute = False
                            break

                    if can_execute:
                        executable_nodes.append(node)

            # 并行执行当前层级的节点
            tasks = []
            for node in executable_nodes:
                node_input = self._get_node_input(node, conversation)
                tasks.append(self._execute_node(node, node_input, conversation_id))

            # 等待所有任务完成
            if tasks:
                await asyncio.gather(*tasks)

    def get_conversation_with_hierarchy(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取包含层次结构的会话详情"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            return None

        # 结构化会话信息
        result = {
            "conversation_id": conversation_id,
            "graph_name": conversation.get("graph_name", ""),
            "input": next((r["input"] for r in conversation.get("results", []) if r.get("is_start_input", False)), ""),
            "output": self._get_final_output(conversation),
            "completed": self._is_graph_complete(conversation),
            "node_results": self._restructure_results(conversation)
        }

        return result

    def generate_mcp_script(self, graph_name: str, graph_config: Dict[str, Any], host_url: str) -> Dict[str, Any]:
        """生成MCP服务器脚本"""

        # 获取图的描述
        description = graph_config.get("description", "")
        sanitized_graph_name = graph_name.replace(" ", "_").replace("-", "_")

        # 获取模板文件路径
        template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
        parallel_template_path = os.path.join(template_dir, "mcp_parallel_template.py")
        sequential_template_path = os.path.join(template_dir, "mcp_sequential_template.py")

        # 读取模板文件
        try:
            with open(parallel_template_path, 'r', encoding='utf-8') as f:
                parallel_template = f.read()

            with open(sequential_template_path, 'r', encoding='utf-8') as f:
                sequential_template = f.read()
        except FileNotFoundError:
            # 如果模板文件不存在，返回错误
            logger.error(f"找不到MCP脚本模板文件")
            return {
                "graph_name": graph_name,
                "error": "找不到MCP脚本模板文件",
                "script": ""
            }

        # 替换模板中的变量
        format_values = {
            "graph_name": graph_name,
            "sanitized_graph_name": sanitized_graph_name,
            "description": description,
            "host_url": host_url
        }

        parallel_script = parallel_template.format(**format_values)
        sequential_script = sequential_template.format(**format_values)

        # 返回脚本内容
        return {
            "graph_name": graph_name,
            "parallel_script": parallel_script,
            "sequential_script": sequential_script,
            "default_script": sequential_script
        }


# 创建全局图服务实例
graph_service = GraphService()