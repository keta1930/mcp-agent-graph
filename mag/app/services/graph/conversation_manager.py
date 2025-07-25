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
        self._conversation_lock = threading.Lock()
        self._active_conversation_ids = set()

    def _generate_unique_conversation_id(self, graph_name: str, max_retries: int = 10) -> str:
        """生成唯一的会话ID，确保不冲突"""
        for attempt in range(max_retries):
            candidate_id = f"{graph_name}_{int(time.time() * 1000000)}_{str(uuid.uuid4())[:8]}"

            with self._conversation_lock:
                if candidate_id not in self._active_conversation_ids:
                    conversation_dir = FileManager.get_conversation_dir(candidate_id)
                    if not conversation_dir.exists():
                        self._active_conversation_ids.add(candidate_id)
                        logger.info(f"生成唯一会话ID: {candidate_id} (尝试 {attempt + 1})")
                        return candidate_id

            time.sleep(0.001 * (attempt + 1))
            logger.warning(f"会话ID冲突，重试生成: {candidate_id} (尝试 {attempt + 1})")

        fallback_id = f"{graph_name}_{int(time.time() * 1000000)}_{str(uuid.uuid4())}"
        logger.error(f"会话ID生成重试失败，使用后备方案: {fallback_id}")

        with self._conversation_lock:
            self._active_conversation_ids.add(fallback_id)

        return fallback_id

    def create_conversation(self, graph_name: str, graph_config: Dict[str, Any]) -> str:
        """创建新的会话"""
        conversation_id = self._generate_unique_conversation_id(graph_name)
        start_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())

        try:
            self.active_conversations[conversation_id] = {
                "_id": conversation_id,
                "conversation_id": conversation_id,
                "graph_name": graph_name,
                "graph_config": graph_config,
                "rounds": [],
                "input": "",
                "global_outputs": {},
                "final_result": "",
                "execution_chain": [],
                "handoffs_status": {},
                "start_time": start_time,
                "_current_round": 0
            }

            json_content = self._prepare_json_content(self.active_conversations[conversation_id])
            success = FileManager.save_conversation_atomic(
                conversation_id, graph_name, start_time, json_content
            )

            if not success:
                self._cleanup_failed_conversation(conversation_id)
                raise RuntimeError(f"无法创建会话文件: {conversation_id}")

            logger.info(f"成功创建会话: {conversation_id}")
            return conversation_id

        except Exception as e:
            self._cleanup_failed_conversation(conversation_id)
            raise

    def create_conversation_with_config(self, graph_name: str, graph_config: Dict[str, Any]) -> str:
        """使用指定配置创建新的会话"""
        return self.create_conversation(graph_name, graph_config)

    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取会话状态"""
        if conversation_id in self.active_conversations:
            return self.active_conversations[conversation_id]

        conversation_json = FileManager.load_conversation_json(conversation_id)
        if conversation_json:
            logger.info(f"从JSON文件恢复会话 {conversation_id}")
            conversation = self._restore_conversation_from_json(conversation_json)
            if conversation:
                self.active_conversations[conversation_id] = conversation
                return conversation
            else:
                logger.error(f"无法从JSON恢复会话 {conversation_id}")

        return None

    def delete_conversation(self, conversation_id: str) -> bool:
        """删除会话"""
        try:
            if conversation_id in self.active_conversations:
                del self.active_conversations[conversation_id]

            with self._conversation_lock:
                self._active_conversation_ids.discard(conversation_id)

            return FileManager.delete_conversation(conversation_id)

        except Exception as e:
            logger.error(f"删除会话时出错: {str(e)}")
            return False

    def update_conversation_file(self, conversation_id: str) -> bool:
        """更新会话文件"""
        if conversation_id not in self.active_conversations:
            logger.error(f"尝试更新不存在的会话: {conversation_id}")
            return False

        conversation = self.active_conversations[conversation_id]

        try:
            json_content = self._prepare_json_content(conversation)
            return FileManager.update_conversation(conversation_id, json_content)
        except Exception as e:
            logger.error(f"更新会话文件 {conversation_id} 时出错: {str(e)}")
            return False

    def get_conversation_with_hierarchy(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取包含层次结构的会话详情 - 直接返回JSON格式"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            return None

        attachments = FileManager.get_conversation_attachments(conversation_id)
        final_output = self._get_final_output(conversation)

        result = {
            "_id": conversation_id,
            "conversation_id": conversation_id,
            "graph_name": conversation.get("graph_name", ""),
            "rounds": conversation.get("rounds", []),
            "graph_config": conversation.get("graph_config", {}),
            "input": conversation.get("input", ""),
            "global_outputs": conversation.get("global_outputs", {}),
            "final_result": final_output,
            "execution_chain": conversation.get("execution_chain", []),
            "handoffs_status": conversation.get("handoffs_status", {}),
            "completed": self.is_graph_execution_complete(conversation),
            "start_time": conversation.get("start_time", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())),
            "attachments": attachments
        }

        return result

    def _add_global_output(self, conversation_id: str, node_name: str, output: str) -> None:
        """添加全局输出内容"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            logger.error(f"尝试添加全局输出到不存在的会话: {conversation_id}")
            return

        if "global_outputs" not in conversation:
            conversation["global_outputs"] = {}

        if node_name not in conversation["global_outputs"]:
            conversation["global_outputs"][node_name] = []

        conversation["global_outputs"][node_name].append(output)
        logger.info(f"已添加节点 '{node_name}' 的全局输出，当前共 {len(conversation['global_outputs'][node_name])} 条")

    def _get_global_outputs(self, conversation_id: str, node_name: str, mode: str = "all") -> List[str]:
        """全局输出获取函数，支持新的context_mode格式"""
        conversation = self.get_conversation(conversation_id)
        if not conversation or "global_outputs" not in conversation or node_name not in conversation["global_outputs"]:
            logger.debug(f"找不到节点 '{node_name}' 的全局输出内容")
            return []

        outputs = conversation["global_outputs"][node_name]

        logger.debug(f"节点 '{node_name}' 的全局输出内容数量: {len(outputs)}")
        logger.debug(f"请求模式: {mode}")

        if mode == "all":
            logger.debug(f"返回全部 {len(outputs)} 条记录")
            return outputs.copy()
        else:
            try:
                n = int(mode)
                if n <= 0:
                    logger.error(f"无效的context_mode数值: {mode}，必须大于0")
                    return []

                result = outputs[-n:] if outputs else []
                logger.debug(f"返回最新 {len(result)} 条记录（请求{n}条）")
                return result
            except ValueError:
                logger.error(f"无效的context_mode格式: {mode}，必须是'all'或正整数字符串")
                return []

    def update_handoffs_status(self, conversation_id: str, node_name: str,
                               total_limit: int, used_count: int, last_selection: str = None) -> None:
        """更新handoffs状态"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            return

        if "handoffs_status" not in conversation:
            conversation["handoffs_status"] = {}

        conversation["handoffs_status"][node_name] = {
            "total_limit": total_limit,
            "used_count": used_count,
            "last_selection": last_selection
        }

        logger.info(f"更新节点 '{node_name}' 的handoffs状态: {used_count}/{total_limit}")

    def get_handoffs_status(self, conversation_id: str, node_name: str) -> Dict[str, Any]:
        """获取handoffs状态"""
        conversation = self.get_conversation(conversation_id)
        if not conversation or "handoffs_status" not in conversation:
            return {}

        return conversation["handoffs_status"].get(node_name, {})

    def check_execution_resumption_point(self, conversation_id: str) -> Dict[str, Any]:
        """检查执行恢复点，用于断点传续"""
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            return {"action": "error", "message": "会话不存在"}

        rounds = conversation.get("rounds", [])
        if not rounds:
            return {"action": "start", "message": "会话未开始"}

        last_round = rounds[-1]
        last_node_name = last_round.get("node_name")

        if last_node_name == "start":
            return {"action": "continue", "from_level": 0, "message": "从第一层级开始执行"}

        graph_config = conversation.get("graph_config", {})
        last_node = None
        for node in graph_config.get("nodes", []):
            if node["name"] == last_node_name:
                last_node = node
                break

        if not last_node:
            return {"action": "error", "message": f"找不到节点配置: {last_node_name}"}

        handoffs_status = self.get_handoffs_status(conversation_id, last_node_name)
        has_handoffs = last_node.get("handoffs") is not None

        if has_handoffs and handoffs_status:
            used_count = handoffs_status.get("used_count", 0)
            total_limit = handoffs_status.get("total_limit", 0)
            last_selection = handoffs_status.get("last_selection")

            if used_count < total_limit and last_selection:
                return {
                    "action": "handoffs_continue",
                    "target_node": last_selection,
                    "message": f"继续执行handoffs选择的节点: {last_selection}"
                }
            elif used_count < total_limit:
                return {
                    "action": "handoffs_wait",
                    "current_node": last_node_name,
                    "message": f"等待handoffs选择，剩余次数: {total_limit - used_count}"
                }

        next_level = last_round.get("level", 0) + 1
        return {
            "action": "continue",
            "from_level": next_level,
            "message": f"从层级 {next_level} 继续执行"
        }

    def _get_final_output(self, conversation: Dict[str, Any]) -> str:
        """获取图的最终输出 - 从rounds中获取数据"""
        graph_config = conversation["graph_config"]
        rounds = conversation.get("rounds", [])

        end_template = graph_config.get("end_template")

        if end_template:
            node_outputs = {}

            for round_data in rounds:
                node_name = round_data.get("node_name", "")
                messages = round_data.get("messages", [])

                if node_name == "start":
                    for msg in messages:
                        if msg.get("role") == "user":
                            node_outputs["start"] = msg.get("content", "")
                            break
                else:
                    for msg in reversed(messages):
                        if msg.get("role") == "assistant":
                            node_outputs[node_name] = msg.get("content", "")
                            break

            output = end_template
            placeholder_pattern = r'\{([^}]+)\}'
            placeholders = re.findall(placeholder_pattern, output)

            for placeholder in placeholders:
                node_name, mode = _parse_placeholder(placeholder)

                if mode != "1":
                    global_outputs = self._get_global_outputs(
                        conversation["conversation_id"],
                        node_name,
                        mode
                    )
                    if global_outputs:
                        replacement = _format_content_with_default_style(global_outputs)
                        output = output.replace(f"{{{placeholder}}}", replacement)
                    else:
                        output = output.replace(f"{{{placeholder}}}", "")
                else:
                    if node_name in node_outputs:
                        output = output.replace(f"{{{placeholder}}}", node_outputs[node_name])
                    else:
                        global_outputs = self._get_global_outputs(
                            conversation["conversation_id"],
                            node_name,
                            "1"
                        )
                        if global_outputs:
                            output = output.replace(f"{{{placeholder}}}", global_outputs[0])
                        else:
                            output = output.replace(f"{{{placeholder}}}", "")

            conversation["final_result"] = output
            return output

        if not rounds:
            return ""

        for round_data in reversed(rounds):
            if round_data.get("node_name") != "start":
                messages = round_data.get("messages", [])
                for msg in reversed(messages):
                    if msg.get("role") == "assistant":
                        final_output = msg.get("content", "")
                        conversation["final_result"] = final_output
                        return final_output

        return ""

    def is_graph_execution_complete(self, conversation: Dict[str, Any]) -> bool:
        """检查图是否执行完毕 - 基于rounds的判断"""
        graph_config = conversation["graph_config"]
        rounds = conversation.get("rounds", [])

        if not rounds:
            return False

        max_level = 0
        for node in graph_config.get("nodes", []):
            level = node.get("level", 0)
            max_level = max(max_level, level)

        executed_levels = set()
        for round_data in rounds:
            if round_data.get("node_name") != "start":
                level = round_data.get("level", 0)
                executed_levels.add(level)

        for level in range(max_level + 1):
            if level not in executed_levels:
                return False

        return True

    def _cleanup_failed_conversation(self, conversation_id: str):
        """清理失败的会话创建"""
        try:
            if conversation_id in self.active_conversations:
                del self.active_conversations[conversation_id]

            with self._conversation_lock:
                self._active_conversation_ids.discard(conversation_id)

            FileManager.cleanup_conversation_files(conversation_id)

        except Exception as e:
            logger.error(f"清理失败会话时出错: {str(e)}")

    def _restore_conversation_from_json(self, json_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """从JSON数据恢复会话状态"""
        try:
            conversation = copy.deepcopy(json_data)

            if "global_outputs" not in conversation:
                conversation["global_outputs"] = {}
            if "rounds" not in conversation:
                conversation["rounds"] = []
            if "execution_chain" not in conversation:
                conversation["execution_chain"] = []
            if "handoffs_status" not in conversation:
                conversation["handoffs_status"] = {}

            conversation["_current_round"] = len(conversation["rounds"])

            return conversation
        except Exception as e:
            logger.error(f"从JSON恢复会话状态时出错: {str(e)}")
            return None

    def _prepare_json_content(self, conversation: Dict[str, Any]) -> Dict[str, Any]:
        """准备可序列化的JSON内容"""
        json_content = copy.deepcopy(conversation)

        json_content.pop("_current_round", None)

        if "global_outputs" not in json_content:
            json_content["global_outputs"] = {}
        if "rounds" not in json_content:
            json_content["rounds"] = []
        if "execution_chain" not in json_content:
            json_content["execution_chain"] = []
        if "handoffs_status" not in json_content:
            json_content["handoffs_status"] = {}

        return json_content