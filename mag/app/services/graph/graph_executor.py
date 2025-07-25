import asyncio
import logging
import time
import json
from typing import Dict, List, Any, Optional, Set, Tuple
import copy
from app.core.file_manager import FileManager

logger = logging.getLogger(__name__)


class GraphExecutor:
    """图执行服务 - 处理图和节点的实际执行流程"""

    def __init__(self, conversation_manager, mcp_service):
        self.conversation_manager = conversation_manager
        self.mcp_service = mcp_service

    async def execute_graph(self,
                            graph_name: str,
                            original_config: Dict[str, Any],
                            flattened_config: Dict[str, Any],
                            input_text: str,
                            model_service=None) -> Dict[str, Any]:
        """执行整个图并返回结果 - 直接返回JSON格式"""
        conversation_id = self.conversation_manager.create_conversation_with_config(graph_name, flattened_config)

        conversation = self.conversation_manager.get_conversation(conversation_id)
        conversation["graph_name"] = graph_name

        self._record_user_input(conversation_id, input_text)

        await self._execute_graph_by_level_sequential(conversation_id, model_service)

        conversation = self.conversation_manager.get_conversation(conversation_id)
        final_output = self.conversation_manager._get_final_output(conversation)

        self.conversation_manager.update_conversation_file(conversation_id)

        result = {
            "_id": conversation_id,
            "conversation_id": conversation_id,
            "graph_name": graph_name,
            "rounds": conversation.get("rounds", []),
            "graph_config": conversation.get("graph_config", {}),
            "input": input_text,
            "global_outputs": conversation.get("global_outputs", {}),
            "final_result": final_output,
            "execution_chain": conversation.get("execution_chain", []),
            "handoffs_status": conversation.get("handoffs_status", {}),
            "completed": True
        }

        return result

    async def continue_conversation(self,
                                    conversation_id: str,
                                    input_text: str = None,
                                    model_service=None,
                                    continue_from_checkpoint: bool = False) -> Dict[str, Any]:
        """继续现有会话 - 支持完整的断点传续"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"找不到会话 '{conversation_id}'")

        graph_name = conversation.get("graph_name")

        if continue_from_checkpoint or not input_text:
            logger.info(f"从断点继续会话 {conversation_id}")

            resumption_info = self.conversation_manager.check_execution_resumption_point(conversation_id)
            action = resumption_info.get("action")

            if action == "error":
                raise ValueError(resumption_info.get("message"))
            elif action == "handoffs_continue":
                target_node = resumption_info.get("target_node")
                await self._continue_from_handoffs_selection(conversation_id, target_node, model_service)
            elif action == "handoffs_wait":
                current_node = resumption_info.get("current_node")
                await self._continue_waiting_handoffs(conversation_id, current_node, model_service)
            elif action == "continue":
                from_level = resumption_info.get("from_level")
                await self._continue_graph_by_level_sequential(conversation_id, from_level, None, model_service)

        else:
            previous_rounds = [r for r in conversation.get("rounds", []) if r.get("node_name") == "start"]
            conversation["rounds"] = previous_rounds
            conversation["_current_round"] = len(previous_rounds)
            conversation["execution_chain"] = []
            conversation["handoffs_status"] = {}

            if input_text:
                self._record_user_input(conversation_id, input_text)

            await self._execute_graph_by_level_sequential(conversation_id, model_service)

        conversation = self.conversation_manager.get_conversation(conversation_id)
        final_output = self.conversation_manager._get_final_output(conversation)

        self.conversation_manager.update_conversation_file(conversation_id)

        result = {
            "_id": conversation_id,
            "conversation_id": conversation_id,
            "graph_name": graph_name,
            "rounds": conversation.get("rounds", []),
            "graph_config": conversation.get("graph_config", {}),
            "input": input_text or conversation.get("input", ""),
            "global_outputs": conversation.get("global_outputs", {}),
            "final_result": final_output,
            "execution_chain": conversation.get("execution_chain", []),
            "handoffs_status": conversation.get("handoffs_status", {}),
            "completed": True
        }

        return result

    async def _execute_graph_by_level_sequential(self, conversation_id: str, model_service=None):
        """基于层级的顺序执行方法 - 修复handoffs跳转逻辑"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        graph_config = conversation["graph_config"]

        max_level = self._get_max_level(graph_config)
        current_level = 0

        while current_level <= max_level:
            logger.info(f"开始执行层级 {current_level}")

            nodes_to_execute = self._get_nodes_at_level(graph_config, current_level)

            for node in nodes_to_execute:
                node_input = self._get_node_input_from_rounds(node, conversation)

                result = await self._execute_node(node, node_input, conversation_id, model_service)

                self.conversation_manager.update_conversation_file(conversation_id)

                # 检测到handoffs选择时，立即跳转执行被选择的节点
                if result.get("_selected_handoff"):
                    selected_node_name = result["_selected_handoff"]
                    selected_node = self._find_node_by_name(graph_config, selected_node_name)

                    if selected_node:
                        logger.info(f"检测到handoffs选择: {selected_node_name}，立即跳转执行")

                        # 立即执行被选择的节点，然后从该节点的层级继续
                        target_level = selected_node.get("level", 0)
                        await self._continue_graph_by_level_sequential(
                            conversation_id,
                            target_level,
                            selected_node_name,  # 直接指定要执行的节点
                            model_service
                        )
                        return  # 跳转执行完成，退出当前执行流程

            # 如果没有handoffs跳转，继续下一层级
            current_level += 1

    async def _continue_graph_by_level_sequential(self,
                                                  conversation_id: str,
                                                  start_level: int,
                                                  restart_node: Optional[str],
                                                  model_service=None):
        """从指定层级继续顺序执行图 - 优化handoffs节点重启逻辑"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        graph_config = conversation["graph_config"]

        max_level = self._get_max_level(graph_config)
        current_level = start_level

        # 如果指定了重启节点，先执行该节点
        if restart_node:
            restart_node_obj = self._find_node_by_name(graph_config, restart_node)
            if restart_node_obj:
                current_level = restart_node_obj.get("level", 0)
                logger.info(f"执行handoffs选择的节点: {restart_node}")

                node_input = self._get_node_input_from_rounds(restart_node_obj, conversation)
                result = await self._execute_node(restart_node_obj, node_input, conversation_id, model_service)

                self.conversation_manager.update_conversation_file(conversation_id)

                # 检查重启节点是否也有handoffs选择
                if result.get("_selected_handoff"):
                    next_selected = result["_selected_handoff"]
                    logger.info(f"handoffs节点 {restart_node} 又选择了: {next_selected}")

                    # 递归处理连续的handoffs跳转
                    await self._continue_graph_by_level_sequential(
                        conversation_id,
                        current_level,
                        next_selected,
                        model_service
                    )
                    return

                # 执行完重启节点，继续下一层级
                current_level += 1

        # 继续正常的层级执行流程
        while current_level <= max_level:
            logger.info(f"继续执行层级 {current_level}")

            nodes = self._get_nodes_at_level(graph_config, current_level)

            for node in nodes:
                node_input = self._get_node_input_from_rounds(node, conversation)
                result = await self._execute_node(node, node_input, conversation_id, model_service)

                self.conversation_manager.update_conversation_file(conversation_id)

                # 在继续执行中也要处理handoffs
                if result.get("_selected_handoff"):
                    selected_node_name = result["_selected_handoff"]
                    logger.info(f"层级执行中检测到handoffs选择: {selected_node_name}")

                    await self._continue_graph_by_level_sequential(
                        conversation_id,
                        current_level,
                        selected_node_name,
                        model_service
                    )
                    return

            current_level += 1

    async def _execute_handoffs_jump(self,
                                     conversation_id: str,
                                     target_node_name: str,
                                     model_service) -> Dict[str, Any]:
        """执行handoffs跳转到指定节点"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        graph_config = conversation["graph_config"]

        target_node = self._find_node_by_name(graph_config, target_node_name)
        if not target_node:
            logger.error(f"handoffs目标节点不存在: {target_node_name}")
            return {"error": f"目标节点不存在: {target_node_name}"}

        logger.info(f"执行handoffs跳转: {target_node_name} (level {target_node.get('level', 0)})")

        # 执行目标节点
        node_input = self._get_node_input_from_rounds(target_node, conversation)
        result = await self._execute_node(target_node, node_input, conversation_id, model_service)

        self.conversation_manager.update_conversation_file(conversation_id)

        return result

    def _log_handoffs_execution(self, from_node: str, to_node: str, conversation_id: str):
        """记录handoffs执行信息"""
        logger.info(f"Handoffs跳转: {from_node} -> {to_node} (会话: {conversation_id})")

        # 可以在这里添加更详细的执行链条记录
        conversation = self.conversation_manager.get_conversation(conversation_id)
        if conversation and "execution_chain" in conversation:
            # 记录handoffs跳转信息
            if not conversation["execution_chain"]:
                conversation["execution_chain"] = []

            # 在执行链中标记handoffs跳转
            last_chain = conversation["execution_chain"][-1] if conversation["execution_chain"] else []
            if isinstance(last_chain, list) and from_node in last_chain:
                # 在同一level中添加handoffs标记
                handoffs_marker = f"{from_node}→{to_node}"
                if handoffs_marker not in last_chain:
                    last_chain.append(handoffs_marker)

    async def _continue_from_handoffs_selection(self, conversation_id: str, target_node: str, model_service=None):
        """从handoffs选择继续执行 - 确保正确的执行顺序"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        graph_config = conversation["graph_config"]

        target_node_obj = self._find_node_by_name(graph_config, target_node)
        if not target_node_obj:
            logger.error(f"找不到handoffs目标节点: {target_node}")
            return

        current_level = target_node_obj.get("level", 0)
        logger.info(f"从handoffs选择继续执行: {target_node} (level {current_level})")

        # 使用改进的continue方法，确保正确处理handoffs链
        await self._continue_graph_by_level_sequential(
            conversation_id,
            current_level,
            target_node,
            model_service
        )

    async def _continue_waiting_handoffs(self, conversation_id: str, current_node: str, model_service=None):
        """继续等待handoffs的节点"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        graph_config = conversation["graph_config"]

        current_node_obj = self._find_node_by_name(graph_config, current_node)
        if not current_node_obj:
            logger.error(f"找不到当前节点: {current_node}")
            return

        node_input = self._get_node_input_from_rounds(current_node_obj, conversation)
        result = await self._execute_node(current_node_obj, node_input, conversation_id, model_service)

        self.conversation_manager.update_conversation_file(conversation_id)

        if result.get("_selected_handoff"):
            await self._continue_from_handoffs_selection(conversation_id, result["_selected_handoff"], model_service)

    async def _execute_node(self,
                            node: Dict[str, Any],
                            input_text: str,
                            conversation_id: str,
                            model_service) -> Dict[str, Any]:
        """执行单个节点 - 支持完整的消息记录和handoffs"""
        try:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                raise ValueError(f"找不到会话 '{conversation_id}'")

            conversation["_current_round"] += 1
            current_round = conversation["_current_round"]

            node_name = node["name"]
            model_name = node["model_name"]
            mcp_servers = node.get("mcp_servers", [])
            output_enabled = node.get("output_enabled", True)
            node_level = node.get("level", 0)

            node_outputs = self._get_node_outputs_for_inputs(node, conversation)
            node_copy = copy.deepcopy(node)
            node_copy["_conversation_id"] = conversation_id

            conversation_messages = self._create_agent_messages(node_copy, input_text, node_outputs)

            handoffs_limit = node.get("handoffs")
            handoffs_status = self.conversation_manager.get_handoffs_status(conversation_id, node_name)
            current_handoffs_count = handoffs_status.get("used_count", 0)

            handoffs_enabled = handoffs_limit is not None and current_handoffs_count < handoffs_limit

            handoffs_tools = []
            if handoffs_enabled:
                handoffs_tools = self._create_handoffs_tools(node, conversation["graph_config"])

            mcp_tools = []
            if mcp_servers:
                mcp_tools = await self.mcp_service.prepare_chat_tools(mcp_servers)

            all_tools = handoffs_tools + mcp_tools

            round_messages = conversation_messages.copy()
            final_output = ""
            selected_handoff = None

            current_messages = conversation_messages.copy()
            max_iterations = 10

            for iteration in range(max_iterations):
                logger.info(f"节点 '{node_name}' 第 {iteration + 1} 轮对话")

                result = await model_service.call_model(
                    model_name=model_name,
                    messages=current_messages,
                    tools=all_tools if all_tools else None
                )

                if result["status"] != "success":
                    raise ValueError(result.get("error", "模型调用失败"))

                assistant_content = result.get("content", "")
                raw_tool_calls = result.get("raw_tool_calls", [])

                assistant_msg = {
                    "role": "assistant",
                    "content": assistant_content
                }
                if raw_tool_calls:
                    assistant_msg["tool_calls"] = raw_tool_calls

                round_messages.append(assistant_msg)
                current_messages.append(assistant_msg)

                if not raw_tool_calls:
                    final_output = assistant_content
                    break

                tool_results = []
                has_handoffs = False

                for tool_call in raw_tool_calls:
                    tool_name = tool_call["function"]["name"]

                    if tool_name.startswith("transfer_to_"):
                        selected_node = tool_name[len("transfer_to_"):]
                        if selected_node in node.get("output_nodes", []):
                            selected_handoff = selected_node
                            has_handoffs = True

                            if handoffs_limit is not None:
                                self.conversation_manager.update_handoffs_status(
                                    conversation_id, node_name, handoffs_limit, current_handoffs_count + 1,
                                    selected_handoff
                                )

                            tool_result_msg = {
                                "role": "tool",
                                "tool_call_id": tool_call["id"],
                                "content": f"已选择节点: {selected_node}"
                            }
                            round_messages.append(tool_result_msg)
                            current_messages.append(tool_result_msg)
                            tool_results.append({
                                "tool_name": tool_name,
                                "content": f"选择了节点: {selected_node}",
                                "selected_node": selected_node
                            })
                    else:
                        try:
                            tool_args = json.loads(tool_call["function"]["arguments"]) if tool_call["function"][
                                "arguments"] else {}
                        except json.JSONDecodeError:
                            tool_args = {}

                        tool_result = await self._execute_single_tool(tool_name, tool_args, mcp_servers)

                        tool_result_msg = {
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "content": tool_result.get("content", "")
                        }
                        round_messages.append(tool_result_msg)
                        current_messages.append(tool_result_msg)
                        tool_results.append(tool_result)

                if has_handoffs:
                    final_output = assistant_content
                    break

            round_data = {
                "round": current_round,
                "node_name": node_name,
                "level": node_level,
                "messages": round_messages
            }

            if mcp_servers:
                round_data["mcp_servers"] = mcp_servers

            conversation["rounds"].append(round_data)

            if node.get("global_output", False) and output_enabled and final_output:
                logger.info(f"将节点 '{node_name}' 的输出添加到全局管理")
                self.conversation_manager._add_global_output(
                    conversation_id,
                    node_name,
                    final_output
                )

            save_ext = node.get("save")
            if save_ext and final_output.strip():
                FileManager.save_node_output_to_file(
                    conversation_id,
                    node_name,
                    final_output,
                    save_ext
                )

            self._update_execution_chain(conversation)

            result = {
                "node_name": node_name,
                "input": input_text,
                "output": final_output,
                "tool_calls": [],
                "tool_results": [],
                "_selected_handoff": selected_handoff
            }

            return result

        except Exception as e:
            logger.error(f"执行节点 '{node['name']}' 时出错: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())

            error_result = {
                "node_name": node["name"],
                "input": input_text,
                "output": f"执行出错: {str(e)}",
                "tool_calls": [],
                "tool_results": [],
                "error": str(e)
            }

            return error_result

    async def _execute_single_tool(self, tool_name: str, tool_args: Dict[str, Any], mcp_servers: List[str]) -> Dict[
        str, Any]:
        """执行单个工具"""
        server_name = await self._find_tool_server(tool_name, mcp_servers)
        if not server_name:
            return {
                "tool_name": tool_name,
                "content": f"找不到工具 '{tool_name}' 所属的服务器",
                "error": "工具不存在"
            }

        try:
            result = await self.mcp_service.call_tool(server_name, tool_name, tool_args)

            if result.get("error"):
                content = f"工具 {tool_name} 执行失败：{result['error']}"
            else:
                result_content = result.get("content", "")
                if isinstance(result_content, (dict, list)):
                    content = json.dumps(result_content, ensure_ascii=False)
                else:
                    content = str(result_content)

            return {
                "tool_name": tool_name,
                "content": content,
                "server_name": server_name
            }

        except Exception as e:
            logger.error(f"执行工具 {tool_name} 时出错: {str(e)}")
            return {
                "tool_name": tool_name,
                "content": f"工具执行异常: {str(e)}",
                "error": str(e)
            }

    async def _find_tool_server(self, tool_name: str, mcp_servers: List[str]) -> Optional[str]:
        """查找工具所属的服务器"""
        try:
            all_tools = await self.mcp_service.get_all_tools()
            for server_name in mcp_servers:
                if server_name in all_tools:
                    for tool in all_tools[server_name]:
                        if tool["name"] == tool_name:
                            return server_name
            return None
        except Exception as e:
            logger.error(f"查找工具服务器时出错: {str(e)}")
            return None

    def _create_handoffs_tools(self, node: Dict[str, Any], graph_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """为handoffs节点创建工具选择列表"""
        tools = []

        for output_node_name in node.get("output_nodes", []):
            if output_node_name == "end":
                continue

            target_node = None
            for n in graph_config["nodes"]:
                if n["name"] == output_node_name:
                    target_node = n
                    break

            if not target_node:
                continue

            node_description = target_node.get("description", "")
            tool_description = f"Transfer to {output_node_name}. {node_description}"

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

    def _create_agent_messages(self,
                               node: Dict[str, Any],
                               input_text: str,
                               node_outputs: Dict[str, str] = None) -> List[Dict[str, str]]:
        """创建Agent的消息列表"""
        messages = []

        if node_outputs is None:
            node_outputs = {}

        conversation_id = node.get("_conversation_id", "")
        conversation = None
        graph_name = ""
        if conversation_id:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            if conversation:
                graph_name = conversation.get("graph_name", "")

        used_input_nodes = set()

        system_prompt = node.get("system_prompt", "")
        if system_prompt:
            if graph_name:
                system_prompt = FileManager.replace_prompt_file_placeholders(graph_name, system_prompt)

            for node_name, output in node_outputs.items():
                placeholder = "{" + node_name + "}"
                if placeholder in system_prompt:
                    system_prompt = system_prompt.replace(placeholder, output)
                    used_input_nodes.add(node_name)

            messages.append({"role": "system", "content": system_prompt})

        user_prompt = node.get("user_prompt", "")
        if user_prompt:
            if graph_name:
                user_prompt = FileManager.replace_prompt_file_placeholders(graph_name, user_prompt)

            for node_name, output in node_outputs.items():
                placeholder = "{" + node_name + "}"
                if placeholder in user_prompt:
                    user_prompt = user_prompt.replace(placeholder, output)
                    used_input_nodes.add(node_name)

            unused_inputs = []
            for node_name, output in node_outputs.items():
                if node_name not in used_input_nodes and output.strip():
                    unused_inputs.append(output)

            if unused_inputs and (user_prompt.strip() or not used_input_nodes):
                if user_prompt and not user_prompt.endswith("\n"):
                    user_prompt += "\n\n"
                user_prompt += "\n\n".join(unused_inputs)

            messages.append({"role": "user", "content": user_prompt})
        else:
            messages.append({"role": "user", "content": input_text})

        return messages

    def _record_user_input(self, conversation_id: str, input_text: str):
        """记录用户输入为round格式"""
        conversation = self.conversation_manager.get_conversation(conversation_id)

        conversation["_current_round"] += 1
        current_round = conversation["_current_round"]

        conversation["input"] = input_text

        start_round = {
            "round": current_round,
            "node_name": "start",
            "level": 0,
            "messages": [
                {
                    "role": "user",
                    "content": input_text
                }
            ]
        }
        conversation["rounds"].append(start_round)

        if "global_outputs" not in conversation:
            conversation["global_outputs"] = {}

        if "start" not in conversation["global_outputs"]:
            conversation["global_outputs"]["start"] = []

        conversation["global_outputs"]["start"].append(input_text)

        logger.info(f"已记录用户输入为round {current_round}")

    def _update_execution_chain(self, conversation: Dict[str, Any]):
        """更新execution_chain - 按level合并相邻节点"""
        rounds = conversation.get("rounds", [])

        if not rounds:
            conversation["execution_chain"] = []
            return

        execution_chain = []
        current_level_group = []
        current_level = None

        for round_data in rounds:
            node_name = round_data.get("node_name", "")
            level = round_data.get("level", 0)

            if current_level is None:
                current_level = level
                current_level_group = [node_name]
            elif level == current_level:
                if node_name not in current_level_group:
                    current_level_group.append(node_name)
            else:
                if current_level_group:
                    execution_chain.append(current_level_group)
                current_level = level
                current_level_group = [node_name]

        if current_level_group:
            execution_chain.append(current_level_group)

        conversation["execution_chain"] = execution_chain

    def _get_node_outputs_for_inputs(self, node: Dict[str, Any], conversation: Dict[str, Any]) -> Dict[str, str]:
        """获取节点输入所需的所有输出结果"""
        node_outputs = {}

        for input_node_name in node.get("input_nodes", []):
            if input_node_name == "start":
                user_input = self._get_user_input_from_rounds(conversation)
                if user_input:
                    node_outputs["start"] = user_input
            else:
                node_output = self._get_node_output_from_rounds(conversation, input_node_name)
                if node_output:
                    node_outputs[input_node_name] = node_output

        context_nodes = node.get("context", [])
        if context_nodes:
            context_mode = node.get("context_mode", "all")

            for context_node_name in context_nodes:
                global_outputs = self.conversation_manager._get_global_outputs(
                    conversation["conversation_id"],
                    context_node_name,
                    context_mode
                )

                if global_outputs:
                    node_outputs[context_node_name] = "\n\n".join(global_outputs)

        return node_outputs

    def _get_node_input_from_rounds(self, node: Dict[str, Any], conversation: Dict[str, Any]) -> str:
        """从rounds中获取节点输入"""
        input_nodes = node.get("input_nodes", [])
        inputs = []

        for input_node_name in input_nodes:
            if input_node_name == "start":
                user_input = self._get_user_input_from_rounds(conversation)
                if user_input:
                    inputs.append(user_input)
            else:
                node_output = self._get_node_output_from_rounds(conversation, input_node_name)
                if node_output:
                    inputs.append(node_output)

        context_nodes = node.get("context", [])
        if context_nodes:
            context_mode = node.get("context_mode", "all")

            for context_node_name in context_nodes:
                global_outputs = self.conversation_manager._get_global_outputs(
                    conversation["conversation_id"],
                    context_node_name,
                    context_mode
                )

                if global_outputs:
                    inputs.append("\n\n".join(global_outputs))

        return "\n\n".join(inputs)

    def _get_user_input_from_rounds(self, conversation: Dict[str, Any]) -> str:
        """从rounds中获取最新的用户输入"""
        rounds = conversation.get("rounds", [])

        for round_data in reversed(rounds):
            if round_data.get("node_name") == "start":
                messages = round_data.get("messages", [])
                for message in messages:
                    if message.get("role") == "user":
                        return message.get("content", "")

        return ""

    def _get_node_output_from_rounds(self, conversation: Dict[str, Any], node_name: str) -> str:
        """从rounds中获取指定节点的最新输出"""
        rounds = conversation.get("rounds", [])

        for round_data in reversed(rounds):
            if round_data.get("node_name") == node_name:
                messages = round_data.get("messages", [])
                for message in reversed(messages):
                    if message.get("role") == "assistant":
                        return message.get("content", "")

        return ""

    def _get_max_level(self, graph_config: Dict[str, Any]) -> int:
        """获取图中的最大层级"""
        max_level = 0
        for node in graph_config.get("nodes", []):
            level = node.get("level", 0)
            max_level = max(max_level, level)
        return max_level

    def _get_nodes_at_level(self, graph_config: Dict[str, Any], level: int) -> List[Dict[str, Any]]:
        """获取指定层级的所有节点"""
        return [node for node in graph_config.get("nodes", [])
                if node.get("level", 0) == level]

    def _find_node_by_name(self, graph_config: Dict[str, Any], node_name: str) -> Optional[Dict[str, Any]]:
        """通过名称查找节点"""
        for node in graph_config.get("nodes", []):
            if node["name"] == node_name:
                return node
        return None