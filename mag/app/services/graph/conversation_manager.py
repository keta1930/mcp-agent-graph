import re
import logging
import uuid
import time
import copy
import threading
from typing import Dict, List, Any, Optional, Set
from app.core.file_manager import FileManager
from app.utils.output_tools import _parse_placeholder, _format_content_with_default_style

logger = logging.getLogger(__name__)


class ConversationManager:
    """会话管理服务 - 处理会话状态和结果处理"""

    def __init__(self):
        self.active_conversations: Dict[str, Dict[str, Any]] = {}
        self._conversation_lock = threading.Lock()  # 添加线程锁
        self._active_conversation_ids = set()  # 跟踪活跃的会话ID

    def _generate_unique_conversation_id(self, graph_name: str, max_retries: int = 10) -> str:
        """生成唯一的会话ID，确保不冲突"""
        for attempt in range(max_retries):
            # 生成候选ID
            candidate_id = f"{graph_name}_{int(time.time() * 1000000)}_{str(uuid.uuid4())[:8]}"

            # 检查是否冲突
            with self._conversation_lock:
                # 检查内存中的活跃会话
                if candidate_id not in self._active_conversation_ids:
                    # 检查文件系统中是否存在
                    conversation_dir = FileManager.get_conversation_dir(candidate_id)
                    if not conversation_dir.exists():
                        # 预先占用这个ID
                        self._active_conversation_ids.add(candidate_id)
                        logger.info(f"生成唯一会话ID: {candidate_id} (尝试 {attempt + 1})")
                        return candidate_id

            # 如果冲突，等待很短时间后重试（避免时间戳完全相同）
            time.sleep(0.001 * (attempt + 1))
            logger.warning(f"会话ID冲突，重试生成: {candidate_id} (尝试 {attempt + 1})")

        # 如果多次重试失败，使用UUID后备方案
        fallback_id = f"{graph_name}_{int(time.time() * 1000000)}_{str(uuid.uuid4())}"
        logger.error(f"会话ID生成重试失败，使用后备方案: {fallback_id}")

        with self._conversation_lock:
            self._active_conversation_ids.add(fallback_id)

        return fallback_id

    def create_conversation(self, graph_name: str, graph_config: Dict[str, Any]) -> str:
        """创建新的会话"""
        # 生成唯一的会话ID
        conversation_id = self._generate_unique_conversation_id(graph_name)

        # 记录开始时间
        start_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

        try:
            # 初始化会话状态 - 不再使用pending_nodes和current_path
            self.active_conversations[conversation_id] = {
                "graph_name": graph_name,
                "graph_config": graph_config,
                "node_states": {},
                "results": [],
                "start_time": start_time,
                "conversation_id": conversation_id,
                "handoffs_counters": {},
                "global_outputs": {}
            }

            # 准备JSON内容
            json_content = self._prepare_json_content(self.active_conversations[conversation_id])

            # 原子性保存到文件（只保存JSON）
            success = FileManager.save_conversation_atomic(
                conversation_id, graph_name, start_time, json_content
            )

            if not success:
                # 如果保存失败，清理并重试
                self._cleanup_failed_conversation(conversation_id)
                raise RuntimeError(f"无法创建会话文件: {conversation_id}")

            logger.info(f"成功创建会话: {conversation_id}")
            return conversation_id

        except Exception as e:
            # 出错时清理
            self._cleanup_failed_conversation(conversation_id)
            raise

    def _cleanup_failed_conversation(self, conversation_id: str):
        """清理失败的会话创建"""
        try:
            # 从内存中移除
            if conversation_id in self.active_conversations:
                del self.active_conversations[conversation_id]

            # 从活跃ID集合中移除
            with self._conversation_lock:
                self._active_conversation_ids.discard(conversation_id)

            # 清理可能已创建的文件
            FileManager.cleanup_conversation_files(conversation_id)

        except Exception as e:
            logger.error(f"清理失败会话时出错: {str(e)}")

    def _add_global_output(self, conversation_id: str, node_name: str, output: str) -> None:
        """添加全局输出内容"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            logger.error(f"尝试添加全局输出到不存在的会话: {conversation_id}")
            return

        # 初始化节点的全局输出列表（如果不存在）
        if "global_outputs" not in conversation:
            conversation["global_outputs"] = {}

        if node_name not in conversation["global_outputs"]:
            conversation["global_outputs"][node_name] = []

        # 添加输出到全局存储
        conversation["global_outputs"][node_name].append(output)
        logger.info(f"已添加节点 '{node_name}' 的全局输出，当前共 {len(conversation['global_outputs'][node_name])} 条")

    def _get_global_outputs(self, conversation_id: str, node_name: str, mode: str = "all") -> List[str]:
        """全局输出获取函数，支持新的context_mode格式"""
        conversation = self.get_conversation(conversation_id)
        if not conversation or "global_outputs" not in conversation or node_name not in conversation["global_outputs"]:
            logger.debug(f"找不到节点 '{node_name}' 的全局输出内容")
            return []

        outputs = conversation["global_outputs"][node_name]

        # 记录调试信息
        logger.debug(f"节点 '{node_name}' 的全局输出内容数量: {len(outputs)}")
        logger.debug(f"请求模式: {mode}")

        if mode == "all":
            # 获取全部内容
            logger.debug(f"返回全部 {len(outputs)} 条记录")
            return outputs.copy()
        else:
            # 尝试解析为数字
            try:
                n = int(mode)
                if n <= 0:
                    logger.error(f"无效的context_mode数值: {mode}，必须大于0")
                    return []

                # 获取最新n条
                result = outputs[-n:] if outputs else []
                logger.debug(f"返回最新 {len(result)} 条记录（请求{n}条）")
                return result
            except ValueError:
                logger.error(f"无效的context_mode格式: {mode}，必须是'all'或正整数字符串")
                return []

    def update_conversation_file(self, conversation_id: str) -> bool:
        """更新会话文件"""
        if conversation_id not in self.active_conversations:
            logger.error(f"尝试更新不存在的会话: {conversation_id}")
            return False

        conversation = self.active_conversations[conversation_id]

        try:
            # 准备JSON内容
            json_content = self._prepare_json_content(conversation)

            # 保存更新后的内容（只更新JSON）
            return FileManager.update_conversation(conversation_id, json_content)
        except Exception as e:
            logger.error(f"更新会话文件 {conversation_id} 时出错: {str(e)}")
            return False

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

            # 确保handoffs_counters存在
            if "handoffs_counters" not in conversation:
                conversation["handoffs_counters"] = {}

            # 确保global_outputs存在
            if "global_outputs" not in conversation:
                conversation["global_outputs"] = {}

            return conversation
        except Exception as e:
            logger.error(f"从JSON恢复会话状态时出错: {str(e)}")
            return None

    def _prepare_json_content(self, conversation: Dict[str, Any]) -> Dict[str, Any]:
        """准备可序列化的JSON内容"""
        # 深拷贝以避免修改原始数据
        json_content = copy.deepcopy(conversation)

        # 确保handoffs_counters存在
        if "handoffs_counters" not in json_content:
            json_content["handoffs_counters"] = {}

        # 确保global_outputs存在
        if "global_outputs" not in json_content:
            json_content["global_outputs"] = {}

        return json_content

    def delete_conversation(self, conversation_id: str) -> bool:
        """删除会话"""
        try:
            # 从内存中移除会话
            if conversation_id in self.active_conversations:
                del self.active_conversations[conversation_id]

            # 从活跃ID集合中移除
            with self._conversation_lock:
                self._active_conversation_ids.discard(conversation_id)

            # 删除会话文件
            return FileManager.delete_conversation(conversation_id)

        except Exception as e:
            logger.error(f"删除会话时出错: {str(e)}")
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

        # 先添加start输入
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
        """获取图的最终输出 - 修复模式选择逻辑"""
        graph_config = conversation["graph_config"]
        results = conversation.get("results", [])

        # 检查是否有自定义的end_template
        end_template = graph_config.get("end_template")

        # 如果有自定义模板，使用模板生成输出
        if end_template:
            # 收集所有节点的输出用于替换模板
            node_outputs = {}

            # 收集所有非开始节点的最新输出
            for result in results:
                if not result.get("is_start_input", False):
                    node_name = result.get("node_name")
                    node_outputs[node_name] = result["output"]

            # 获取start节点内容（用户输入）
            for result in results:
                if result.get("is_start_input", False):
                    node_outputs["start"] = result["input"]
                    break

            # 寻找并处理所有占位符
            output = end_template

            # 正则表达式匹配占位符
            placeholder_pattern = r'\{([^}]+)\}'
            placeholders = re.findall(placeholder_pattern, output)

            for placeholder in placeholders:
                # 解析占位符
                node_name, mode = _parse_placeholder(placeholder)

                # 如果是需要历史数据的模式，则总是从全局变量获取
                if mode != "1":  # 非单条结果模式
                    # 从全局变量获取多条结果
                    global_outputs = self._get_global_outputs(
                        conversation["conversation_id"],
                        node_name,
                        mode
                    )

                    if global_outputs:
                        # 使用默认格式化方法
                        replacement = _format_content_with_default_style(global_outputs)
                        output = output.replace(f"{{{placeholder}}}", replacement)
                    else:
                        # 未找到内容，替换为空字符串
                        output = output.replace(f"{{{placeholder}}}", "")
                else:
                    # 对于单条结果的模式，可以从node_outputs获取
                    if node_name in node_outputs:
                        replacement = node_outputs[node_name]
                        output = output.replace(f"{{{placeholder}}}", replacement)
                    else:
                        # 尝试从全局变量获取单条结果
                        global_outputs = self._get_global_outputs(
                            conversation["conversation_id"],
                            node_name,
                            "1"
                        )

                        if global_outputs:
                            replacement = global_outputs[0]
                            output = output.replace(f"{{{placeholder}}}", replacement)
                        else:
                            output = output.replace(f"{{{placeholder}}}", "")

            return output

    def get_conversation_with_hierarchy(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取包含层次结构的会话详情"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            return None

        # 获取附件文件列表
        attachments = FileManager.get_conversation_attachments(conversation_id)

        # 结构化会话信息
        result = {
            "conversation_id": conversation_id,
            "graph_name": conversation.get("graph_name", ""),
            "input": next((r["input"] for r in conversation.get("results", []) if r.get("is_start_input", False)), ""),
            "output": self._get_final_output(conversation),
            "completed": self.is_graph_execution_complete(conversation),
            "node_results": self._restructure_results(conversation),
            "start_time": conversation.get("start_time", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())),
            "graph_config": conversation.get("graph_config", {}),
            "results": conversation.get("results", []),
            "attachments": attachments,
            "node_states": conversation.get("node_states", {}),
            "handoffs_counters": conversation.get("handoffs_counters", {}),
            "global_outputs": conversation.get("global_outputs", {}),
        }

        return result

    def is_graph_execution_complete(self, conversation: Dict[str, Any]) -> bool:
        """检查图是否执行完毕 - 基于层级的简化判断方式"""
        graph_config = conversation["graph_config"]

        # 如果没有结果，表示尚未开始执行
        if not conversation.get("results", []):
            return False

        # 查找是否有未处理的handoffs选择
        for result in conversation.get("results", []):
            if not result.get("is_start_input", False) and result.get("_selected_handoff"):
                return False

        # 获取最高层级
        max_level = 0
        for node in graph_config.get("nodes", []):
            level = node.get("level", 0)
            max_level = max(max_level, level)

        # 检查每个层级是否都有至少一个节点已执行
        executed_nodes = set()
        for result in conversation.get("results", []):
            if not result.get("is_start_input", False):
                executed_nodes.add(result.get("node_name"))

        # 检查每个层级
        for level in range(max_level + 1):
            level_nodes = [node for node in graph_config.get("nodes", [])
                           if node.get("level", 0) == level]

            # 检查此层级是否有节点已执行
            level_executed = False
            for node in level_nodes:
                if node["name"] in executed_nodes:
                    level_executed = True
                    break

            if not level_executed:
                # 发现未执行的层级
                return False

        # 所有层级都至少有一个节点已执行
        return True