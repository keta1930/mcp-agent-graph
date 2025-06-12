import copy
import logging
from typing import Dict, List, Any, Optional, Tuple

logger = logging.getLogger(__name__)


class GraphProcessor:
    """图处理服务 - 处理图的展开、层级计算等核心功能"""

    def __init__(self, get_graph_func):
        """
        初始化图处理器
        """
        self.get_graph = get_graph_func


    def _flatten_all_subgraphs(self, graph_config: Dict[str, Any]) -> Dict[str, Any]:
        """将图中所有子图完全展开为扁平结构，并更新节点引用关系"""
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
            if "start" in node.get("input_nodes", []):
                has_start = True
            if "end" in node.get("output_nodes", []):
                has_end = True

        if not has_start:
            print("警告：展开后的图没有起始节点")
        if not has_end:
            print("警告：展开后的图没有结束节点")

        return flattened_config

    def _calculate_node_levels(self, graph_config: Dict[str, Any]) -> Dict[str, Any]:
        """重新设计的层级计算算法，正确处理所有依赖关系，包括handoffs引起的循环"""
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
            # 但忽略handoffs节点产生的循环依赖
            for node in nodes:
                node_name = node["name"]
                handoffs = node.get("handoffs")

                # 如果节点有handoffs参数，不建立从output_nodes到该节点的依赖
                # 这样可以避免handoffs引起的循环依赖影响层级计算
                if handoffs is None:
                    for output_name in node.get("output_nodes", []):
                        if output_name != "end" and output_name in node_map:
                            # 检查目标节点是否有指向当前节点的依赖（循环依赖）
                            target_node = node_map[output_name]
                            if node_name not in target_node.get("output_nodes", []):
                                depends_on[output_name].add(node_name)
                                print(f"节点 {output_name} 依赖输出源 {node_name}")
                else:
                    print(f"节点 {node_name} 有handoffs参数 ({handoffs})，忽略其输出节点依赖以避免循环")

            # 找出起始节点（直接连接到start且没有其他依赖，或者没有任何依赖的节点）
            start_nodes = []
            for node in nodes:
                node_name = node["name"]

                # 如果节点直接连接到start且没有其他实际依赖（排除start）
                if "start" in node.get("input_nodes", []):
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
                        if "start" in node.get("input_nodes", []):
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
                        # 如果都未知，检查节点是否有handoffs参数
                        node = node_map[node_name]
                        if node.get("handoffs") is not None:
                            # handoffs节点尽量放在较低层级，让它的输出节点先执行
                            levels[node_name] = 1
                            print(f"  节点 {node_name} 有handoffs参数，设置层级为1")
                        else:
                            # 其他情况设为1
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

    def validate_graph(self, graph_config: Dict[str, Any],
                      get_model_func, get_servers_status_func) -> Tuple[bool, Optional[str]]:
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
            servers_status = get_servers_status_func()

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
                    model_config = get_model_func(node["model_name"])
                    if not model_config:
                        return False, f"节点 '{node['name']}' 使用了不存在的模型 '{node['model_name']}'"

                # 检查MCP服务器是否存在和连接
                for server_name in node.get("mcp_servers", []):
                    if server_name not in servers_status or not servers_status[server_name].get("connected", False):
                        return False, f"节点 '{node['name']}' 使用了不存在或未连接的MCP服务器 '{server_name}'"

            # 检查是否至少有一个开始节点
            has_start = False
            for node in graph_config["nodes"]:
                if "start" in node.get("input_nodes", []):
                    has_start = True
                    break

            if not has_start:
                return False, "图中没有指定开始节点（需要在某个节点的input_nodes中包含'start'）"

            # 检查是否至少有一个结束节点
            has_end = False
            for node in graph_config["nodes"]:
                if "end" in node.get("output_nodes", []):
                    has_end = True
                    break

            if not has_end:
                return False, "图中没有指定结束节点（需要在某个节点的output_nodes中包含'end'）"

            return True, None
        except Exception as e:
            logger.error(f"验证图配置时出错: {str(e)}")
            return False, f"验证图配置时出错: {str(e)}"