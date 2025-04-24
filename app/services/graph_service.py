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
        return FileManager.save_agent(graph_name, config)

    def delete_graph(self, graph_name: str) -> bool:
        """删除图配置"""
        return FileManager.delete_agent(graph_name)

    def rename_graph(self, old_name: str, new_name: str) -> bool:
        """重命名图"""
        return FileManager.rename_agent(old_name, new_name)

    def preprocess_graph(self, graph_config: Dict[str, Any], prefix_path: str = "") -> Dict[str, Any]:
        """将包含子图的复杂图展开为扁平化结构"""
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
            "results": []
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
            "results": []
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
                    # 如果没有直接匹配，检查子图节点名称匹配
                    found_subgraph_node = False
                    for completed_node in completed_nodes:
                        # 使用_original_name 和 _node_path 判断子图最终节点
                        if completed_node.startswith(input_node + "."):
                            node_state = conversation.get("node_states", {}).get(completed_node, {})
                            if node_state.get("result", {}).get("_original_name") == "summarize_results":
                                found_subgraph_node = True
                                break

                    if not found_subgraph_node:
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
                # 直接检查节点状态
                if input_node_name in conversation["node_states"]:
                    node_state = conversation["node_states"][input_node_name]
                    if "result" in node_state:
                        inputs.append(node_state["result"]["output"])
                else:
                    for node_id, node_state in conversation["node_states"].items():
                        if node_id.startswith(input_node_name + "."):
                            # 检查是否是子图的最终节点
                            if "result" in node_state and node_state["result"].get(
                                    "_original_name") == "summarize_results":
                                inputs.append(node_state["result"]["output"])
                                break

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

    async def execute_graph(self, graph_name: str, input_text: str) -> Dict[str, Any]:
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

        # 保存原始配置（用于结果呈现）
        self.active_conversations[conversation_id]["original_config"] = original_config

        # 记录展开信息
        logger.info(
            f"图 '{graph_name}' 已展开: {len(original_config.get('nodes', []))} 个原始节点 -> {len(flattened_config.get('nodes', []))} 个展开节点")

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

    async def continue_conversation(self, conversation_id: str, input_text: str) -> Dict[str, Any]:
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
            "results": [r for r in previous_results if r.get("is_start_input", False)]
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

        # 执行第一步
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

    def generate_mcp_script(self, graph_name: str, graph_config: Dict[str, Any], host_url: str) -> str:
        """生成MCP服务器脚本"""
        description = graph_config.get("description", "")
        sanitized_graph_name = graph_name.replace(" ", "_").replace("-", "_")

        script = f'''
from fastmcp import FastMCP
import requests
import json

mcp = FastMCP(
    name="{sanitized_graph_name}_graph",
    instructions="""This server provides access to the MAG graph '{graph_name}'. 
    {description}
    First call get_graph_card() to see input and output format, then call execute_graph() to run the graph."""
    )

@mcp.tool()
def get_graph_card() -> str:
    """Returns information about the graph, including its description, input/output formats, and usage instructions."""
    try:
        response = requests.get("{host_url}/api/graphs/{graph_name}/card")
        if response.status_code == 200:
            card = response.json()
            return json.dumps(card, indent=2)
        else:
            return f"Error fetching graph card: {{response.status_code}} {{response.text}}"
    except Exception as e:
        return f"Error: {{str(e)}}"

@mcp.tool()
def execute_graph(input_text: str, conversation_id: str = None) -> str:
    """Executes the graph with the given input text.

    Args:
        input_text: The input text to send to the graph
        conversation_id: Optional. A conversation ID from a previous execution to continue the conversation

    Returns:
        The result of the graph execution
    """
    try:
        payload = {{"input_text": input_text, "graph_name": "{graph_name}"}}
        if conversation_id:
            payload["conversation_id"] = conversation_id

        response = requests.post("{host_url}/api/graphs/execute", json=payload)

        if response.status_code == 200:
            result = response.json()
            # Format the output in a readable way
            output = f"""RESULT:
                Conversation ID: {{result.get('conversation_id')}}
                Output: {{result.get('output')}}
                Completed: {{result.get('completed', False)}}"""
            return output
        else:
            return f"Error executing graph: {{response.status_code}} {{response.text}}"
    except Exception as e:
        return f"Error: {{str(e)}}"

if __name__ == "__main__":
    mcp.run(transport="stdio")
    '''
        return script


# 创建全局图服务实例
graph_service = GraphService()