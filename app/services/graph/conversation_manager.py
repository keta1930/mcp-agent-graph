import logging
import uuid
import time
import copy
from typing import Dict, List, Any, Optional, Set
from app.core.file_manager import FileManager
from app.utils.conversation_template import ConversationTemplate

logger = logging.getLogger(__name__)


class ConversationManager:
    """会话管理服务 - 处理会话状态和结果处理"""

    def __init__(self):
        self.active_conversations: Dict[str, Dict[str, Any]] = {}

    def create_conversation(self, graph_name: str, graph_config: Dict[str, Any]) -> str:
        """创建新的会话"""
        # 生成有意义的会话ID
        file_id = ConversationTemplate.generate_conversation_filename(graph_name)
        conversation_id = file_id

        # 记录开始时间
        start_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

        # 初始化会话状态
        self.active_conversations[conversation_id] = {
            "graph_name": graph_name,
            "graph_config": graph_config,
            "node_states": {},
            "pending_nodes": set(),
            "completed_nodes": set(),
            "results": [],
            "parallel": False,
            "start_time": start_time,
            "conversation_id": conversation_id
        }

        # 创建初始模板和JSON
        initial_md = ConversationTemplate.generate_header(graph_name, conversation_id, "", start_time)
        initial_md += ConversationTemplate.generate_final_output("")

        # 准备JSON内容 - 去除不可序列化的集合类型
        json_content = self._prepare_json_content(self.active_conversations[conversation_id])

        # 保存到文件
        FileManager.save_conversation(conversation_id, graph_name, start_time, initial_md, json_content)

        return conversation_id

    def create_conversation_with_config(self, graph_name: str, graph_config: Dict[str, Any]) -> str:
        """使用指定配置创建新的会话"""
        return self.create_conversation(graph_name, graph_config)

    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取会话状态"""
        # 先查找内存中的活跃会话
        if conversation_id in self.active_conversations:
            return self.active_conversations[conversation_id]

        # 如果内存中不存在，尝试从JSON文件加载
        conversation_json = FileManager.load_conversation_json(conversation_id)
        if conversation_json:
            # 从JSON恢复会话状态
            logger.info(f"从JSON文件恢复会话 {conversation_id}")
            conversation = self._restore_conversation_from_json(conversation_json)
            if conversation:
                # 加入活跃会话
                self.active_conversations[conversation_id] = conversation
                return conversation
            else:
                logger.error(f"无法从JSON恢复会话 {conversation_id}")

        return None

    def _restore_conversation_from_json(self, json_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """从JSON数据恢复会话状态"""
        try:
            # 重建会话对象
            conversation = copy.deepcopy(json_data)

            # 恢复集合类型
            if "pending_nodes_list" in conversation:
                conversation["pending_nodes"] = set(conversation.pop("pending_nodes_list", []))
            else:
                conversation["pending_nodes"] = set()

            if "completed_nodes_list" in conversation:
                conversation["completed_nodes"] = set(conversation.pop("completed_nodes_list", []))
            else:
                conversation["completed_nodes"] = set()

            return conversation
        except Exception as e:
            logger.error(f"从JSON恢复会话状态时出错: {str(e)}")
            return None

    def _prepare_json_content(self, conversation: Dict[str, Any]) -> Dict[str, Any]:
        """准备可序列化的JSON内容"""
        # 深拷贝以避免修改原始数据
        json_content = copy.deepcopy(conversation)

        # 将集合转换为列表
        if "pending_nodes" in json_content:
            json_content["pending_nodes_list"] = list(json_content.pop("pending_nodes", []))

        if "completed_nodes" in json_content:
            json_content["completed_nodes_list"] = list(json_content.pop("completed_nodes", []))

        return json_content

    def delete_conversation(self, conversation_id: str) -> bool:
        """删除会话"""
        # 从内存中移除会话
        if conversation_id in self.active_conversations:
            del self.active_conversations[conversation_id]

        # 删除会话文件
        return FileManager.delete_conversation(conversation_id)

    def update_conversation_file(self, conversation_id: str) -> bool:
        """更新会话文件"""
        if conversation_id not in self.active_conversations:
            logger.error(f"尝试更新不存在的会话: {conversation_id}")
            return False

        conversation = self.active_conversations[conversation_id]

        try:
            # 准备层次结构的会话数据
            conversation_with_hierarchy = self.get_conversation_with_hierarchy(conversation_id)

            # 生成新的Markdown内容
            md_content = ConversationTemplate.generate_template(conversation_with_hierarchy)

            # 准备JSON内容
            json_content = self._prepare_json_content(conversation)

            # 保存更新后的内容
            return FileManager.update_conversation(conversation_id, md_content, json_content)
        except Exception as e:
            logger.error(f"更新会话文件 {conversation_id} 时出错: {str(e)}")
            return False

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
            "node_results": self._restructure_results(conversation),
            "start_time": conversation.get("start_time", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
        }

        return result

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