import asyncio
import logging
import time
import json
from typing import Dict, List, Any, Optional, Set, Tuple, AsyncGenerator
import copy
from app.core.file_manager import FileManager
from app.utils.sse_helper import SSEHelper
logger = logging.getLogger(__name__)


class GraphExecutor:
    """图执行服务 - 处理图和节点的实际执行流程"""

    def __init__(self, conversation_manager, mcp_service):
        self.conversation_manager = conversation_manager
        self.mcp_service = mcp_service

    async def execute_graph_stream(self,
                                   graph_name: str,
                                   original_config: Dict[str, Any],
                                   flattened_config: Dict[str, Any],
                                   input_text: str,
                                   model_service=None) -> AsyncGenerator[str, None]:
        """执行整个图并返回流式结果 - 混合方案"""
        try:
            conversation_id = self.conversation_manager.create_conversation_with_config(graph_name, flattened_config)

            conversation = self.conversation_manager.get_conversation(conversation_id)
            conversation["graph_name"] = graph_name

            self._record_user_input(conversation_id, input_text)

            async for sse_data in self._execute_graph_by_level_sequential_stream(conversation_id, model_service):
                yield sse_data

            # 获取最终输出
            conversation = self.conversation_manager.get_conversation(conversation_id)
            final_output = self.conversation_manager._get_final_output(conversation)
            execution_chain = conversation.get("execution_chain", [])

            # 保存会话文件
            self.conversation_manager.update_conversation_file(conversation_id)

            # 发送图完成事件
            yield SSEHelper.send_graph_complete(final_output, execution_chain)

        except Exception as e:
            logger.error(f"执行图流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"执行图时出错: {str(e)}")

    async def continue_conversation_stream(self,
                                           conversation_id: str,
                                           input_text: str = None,
                                           model_service=None,
                                           continue_from_checkpoint: bool = False) -> AsyncGenerator[str, None]:
        """继续现有会话并返回流式结果 - 混合方案"""
        try:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                yield SSEHelper.send_error(f"找不到会话 '{conversation_id}'")
                return

            if continue_from_checkpoint or not input_text:
                resumption_info = self.conversation_manager.check_execution_resumption_point(conversation_id)
                action = resumption_info.get("action")

                if action == "error":
                    yield SSEHelper.send_error(resumption_info.get("message"))
                    return
                elif action == "handoffs_continue":
                    target_node = resumption_info.get("target_node")
                    async for sse_data in self._continue_from_handoffs_selection_stream(conversation_id, target_node,
                                                                                        model_service):
                        yield sse_data
                elif action == "handoffs_wait":
                    current_node = resumption_info.get("current_node")
                    async for sse_data in self._continue_waiting_handoffs_stream(conversation_id, current_node,
                                                                                 model_service):
                        yield sse_data
                elif action == "continue":
                    from_level = resumption_info.get("from_level")
                    async for sse_data in self._continue_graph_by_level_sequential_stream(conversation_id, from_level,
                                                                                          None, model_service):
                        yield sse_data

            else:
                previous_rounds = [r for r in conversation.get("rounds", []) if r.get("node_name") == "start"]
                conversation["rounds"] = previous_rounds
                conversation["_current_round"] = len(previous_rounds)
                conversation["execution_chain"] = []
                conversation["handoffs_status"] = {}

                if input_text:
                    self._record_user_input(conversation_id, input_text)

                async for sse_data in self._execute_graph_by_level_sequential_stream(conversation_id, model_service):
                    yield sse_data

            # 获取最终输出
            conversation = self.conversation_manager.get_conversation(conversation_id)
            final_output = self.conversation_manager._get_final_output(conversation)
            execution_chain = conversation.get("execution_chain", [])

            # 保存会话文件
            self.conversation_manager.update_conversation_file(conversation_id)

            # 发送图完成事件
            yield SSEHelper.send_graph_complete(final_output, execution_chain)

        except Exception as e:
            logger.error(f"继续会话流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"继续会话时出错: {str(e)}")

    async def _execute_graph_by_level_sequential_stream(self, conversation_id: str, model_service=None) -> \
    AsyncGenerator[str, None]:
        """基于层级的顺序执行方法 - 混合方案流式版本（更新版）"""
        try:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            max_level = self._get_max_level(graph_config)
            current_level = 0

            while current_level <= max_level:
                logger.info(f"开始执行层级 {current_level}")

                nodes_to_execute = self._get_nodes_at_level(graph_config, current_level)

                for node in nodes_to_execute:
                    node_input = self._get_node_input_from_rounds(node, conversation)

                    async for sse_data in self._execute_node_stream(node, node_input, conversation_id, model_service):
                        yield sse_data

                    # 检查是否有handoffs选择
                    conversation = self.conversation_manager.get_conversation(conversation_id)
                    last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

                    if self._check_handoffs_in_round(last_round, node):
                        selected_node_name = self._extract_handoffs_selection(last_round)
                        if selected_node_name:
                            selected_node = self._find_node_by_name(graph_config, selected_node_name)
                            if selected_node:
                                logger.info(f"检测到handoffs选择: {selected_node_name}，跳转执行")
                                # 使用专门的handoffs继续方法
                                async for sse_data in self._continue_from_handoffs_selection_stream(
                                        conversation_id,
                                        selected_node_name,
                                        model_service
                                ):
                                    yield sse_data
                                return  # 跳转执行后直接返回

                current_level += 1

        except Exception as e:
            logger.error(f"执行图层级流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"执行图时出错: {str(e)}")

    async def _continue_graph_by_level_sequential_stream(self,
                                                         conversation_id: str,
                                                         start_level: int,
                                                         restart_node: Optional[str],
                                                         model_service=None) -> AsyncGenerator[str, None]:
        """从指定层级继续顺序执行图 - 混合方案流式版本"""
        try:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            max_level = self._get_max_level(graph_config)
            current_level = start_level

            if restart_node:
                restart_node_obj = self._find_node_by_name(graph_config, restart_node)
                if restart_node_obj:
                    current_level = restart_node_obj.get("level", 0)
                    node_input = self._get_node_input_from_rounds(restart_node_obj, conversation)

                    async for sse_data in self._execute_node_stream(restart_node_obj, node_input, conversation_id,
                                                                    model_service):
                        yield sse_data

                    # 检查handoffs
                    conversation = self.conversation_manager.get_conversation(conversation_id)
                    last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

                    if self._check_handoffs_in_round(last_round, restart_node_obj):
                        selected_node_name = self._extract_handoffs_selection(last_round)
                        if selected_node_name:
                            async for sse_data in self._continue_graph_by_level_sequential_stream(
                                    conversation_id,
                                    current_level,
                                    selected_node_name,
                                    model_service
                            ):
                                yield sse_data
                            return

                    current_level += 1

            while current_level <= max_level:
                nodes = self._get_nodes_at_level(graph_config, current_level)

                for node in nodes:
                    node_input = self._get_node_input_from_rounds(node, conversation)

                    async for sse_data in self._execute_node_stream(node, node_input, conversation_id, model_service):
                        yield sse_data

                    # 检查handoffs
                    conversation = self.conversation_manager.get_conversation(conversation_id)
                    last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

                    if self._check_handoffs_in_round(last_round, node):
                        selected_node_name = self._extract_handoffs_selection(last_round)
                        if selected_node_name:
                            async for sse_data in self._continue_graph_by_level_sequential_stream(
                                    conversation_id,
                                    current_level,
                                    selected_node_name,
                                    model_service
                            ):
                                yield sse_data
                            return

                current_level += 1

        except Exception as e:
            logger.error(f"继续执行图层级流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"继续执行图时出错: {str(e)}")

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

    async def _continue_from_handoffs_selection_stream(self,
                                                       conversation_id: str,
                                                       target_node: str,
                                                       model_service=None) -> AsyncGenerator[str, None]:
        """从handoffs选择继续执行 - 混合方案流式版本"""
        try:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            target_node_obj = self._find_node_by_name(graph_config, target_node)
            if not target_node_obj:
                yield SSEHelper.send_error(f"找不到handoffs目标节点: {target_node}")
                return

            logger.info(f"从handoffs选择继续执行: {target_node}")

            current_level = target_node_obj.get("level", 0)
            async for sse_data in self._continue_graph_by_level_sequential_stream(
                    conversation_id,
                    current_level,
                    target_node,
                    model_service
            ):
                yield sse_data

        except Exception as e:
            logger.error(f"从handoffs选择继续执行流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"从handoffs选择继续执行时出错: {str(e)}")

    async def _continue_waiting_handoffs_stream(self,
                                                conversation_id: str,
                                                current_node: str,
                                                model_service=None) -> AsyncGenerator[str, None]:
        """继续等待handoffs的节点 - 混合方案流式版本"""
        try:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            current_node_obj = self._find_node_by_name(graph_config, current_node)
            if not current_node_obj:
                yield SSEHelper.send_error(f"找不到当前节点: {current_node}")
                return

            logger.info(f"继续等待handoffs的节点: {current_node}")

            node_input = self._get_node_input_from_rounds(current_node_obj, conversation)

            async for sse_data in self._execute_node_stream(current_node_obj, node_input, conversation_id,
                                                            model_service):
                yield sse_data

            # 检查handoffs
            conversation = self.conversation_manager.get_conversation(conversation_id)
            last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

            if self._check_handoffs_in_round(last_round, current_node_obj):
                selected_node_name = self._extract_handoffs_selection(last_round)
                if selected_node_name:
                    logger.info(f"检测到新的handoffs选择: {selected_node_name}")
                    async for sse_data in self._continue_from_handoffs_selection_stream(
                            conversation_id,
                            selected_node_name,
                            model_service
                    ):
                        yield sse_data
                else:
                    logger.warning("handoffs节点完成但未找到选择的目标节点")
            else:
                # 如果没有handoffs选择，继续正常的层级执行
                current_level = current_node_obj.get("level", 0) + 1
                max_level = self._get_max_level(graph_config)

                if current_level <= max_level:
                    logger.info(f"handoffs节点完成，继续执行后续层级: {current_level}")
                    async for sse_data in self._continue_graph_by_level_sequential_stream(
                            conversation_id,
                            current_level,
                            None,
                            model_service
                    ):
                        yield sse_data

        except Exception as e:
            logger.error(f"继续等待handoffs流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"继续等待handoffs时出错: {str(e)}")

    # ============= 1. graph_executor.py - _execute_node方法修复 =============

    async def _execute_node_stream(self,
                                   node: Dict[str, Any],
                                   input_text: str,
                                   conversation_id: str,
                                   model_service) -> AsyncGenerator[str, None]:
        """执行单个节点 - 混合方案流式版本"""
        try:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                yield SSEHelper.send_error(f"找不到会话 '{conversation_id}'")
                return

            node_name = node["name"]
            node_level = node.get("level", 0)

            # 发送节点开始事件 - 自定义事件
            yield SSEHelper.send_node_start(node_name, node_level)

            conversation["_current_round"] += 1
            current_round = conversation["_current_round"]

            model_name = node["model_name"]
            mcp_servers = node.get("mcp_servers", [])
            output_enabled = node.get("output_enabled", True)

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
            assistant_final_output = ""
            tool_results_content = []
            selected_handoff = None

            current_messages = conversation_messages.copy()
            max_iterations = 10

            for iteration in range(max_iterations):
                logger.info(f"节点 '{node_name}' 第 {iteration + 1} 轮对话")

                # 获取模型配置和客户端
                model_config = model_service.get_model(model_name)
                if not model_config:
                    yield SSEHelper.send_error(f"找不到模型配置: {model_name}")
                    return

                client = model_service.clients.get(model_name)
                if not client:
                    yield SSEHelper.send_error(f"模型客户端未初始化: {model_name}")
                    return

                # 准备流式调用参数 - 借鉴chat_service的方式
                base_params = {
                    "model": model_config["model"],
                    "messages": current_messages,
                    "stream": True
                }

                if all_tools:
                    base_params["tools"] = all_tools

                # 准备参数
                params, extra_kwargs = model_service.prepare_api_params(base_params, model_config)

                # 流式调用模型
                stream = await client.chat.completions.create(**params, **extra_kwargs)

                # 收集响应数据
                accumulated_content = ""
                current_tool_calls = []
                tool_calls_dict = {}

                # 处理流式响应 - 发送OpenAI标准格式
                async for chunk in stream:
                    chunk_dict = chunk.model_dump()
                    yield SSEHelper.send_openai_chunk(chunk_dict)

                    if chunk.choices and chunk.choices[0].delta:
                        delta = chunk.choices[0].delta

                        if delta.content:
                            accumulated_content += delta.content

                        if delta.tool_calls:
                            for tool_call_delta in delta.tool_calls:
                                index = tool_call_delta.index

                                if index not in tool_calls_dict:
                                    tool_calls_dict[index] = {
                                        "id": tool_call_delta.id or "",
                                        "type": "function",
                                        "function": {
                                            "name": "",
                                            "arguments": ""
                                        }
                                    }

                                if tool_call_delta.id:
                                    tool_calls_dict[index]["id"] = tool_call_delta.id

                                if tool_call_delta.function:
                                    if tool_call_delta.function.name:
                                        tool_calls_dict[index]["function"]["name"] += tool_call_delta.function.name
                                    if tool_call_delta.function.arguments:
                                        tool_calls_dict[index]["function"][
                                            "arguments"] += tool_call_delta.function.arguments

                    if chunk.choices and chunk.choices[0].finish_reason:
                        current_tool_calls = list(tool_calls_dict.values())
                        break

                # 构建assistant消息
                assistant_msg = {
                    "role": "assistant",
                    "content": accumulated_content or ""
                }

                if current_tool_calls:
                    assistant_msg["tool_calls"] = current_tool_calls

                round_messages.append(assistant_msg)
                current_messages.append(assistant_msg)

                if not current_tool_calls:
                    assistant_final_output = accumulated_content
                    break

                # 执行工具调用
                has_handoffs = False

                for tool_call in current_tool_calls:
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

                            tool_content = f"已选择节点: {selected_node}"

                            # 发送工具结果 - OpenAI标准格式
                            yield SSEHelper.send_tool_message(tool_call["id"], tool_content)

                            tool_result_msg = {
                                "role": "tool",
                                "tool_call_id": tool_call["id"],
                                "content": tool_content
                            }
                            round_messages.append(tool_result_msg)
                            current_messages.append(tool_result_msg)
                    else:
                        try:
                            tool_args = json.loads(tool_call["function"]["arguments"]) if tool_call["function"][
                                "arguments"] else {}
                        except json.JSONDecodeError:
                            tool_args = {}

                        tool_result = await self._execute_single_tool(tool_name, tool_args, mcp_servers)
                        tool_content = tool_result.get("content", "")

                        # 发送工具结果 - OpenAI标准格式
                        yield SSEHelper.send_tool_message(tool_call["id"], tool_content)

                        if tool_content and not tool_name.startswith("transfer_to_"):
                            tool_results_content.append(tool_content)

                        tool_result_msg = {
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "content": tool_content
                        }
                        round_messages.append(tool_result_msg)
                        current_messages.append(tool_result_msg)

                if has_handoffs:
                    assistant_final_output = accumulated_content
                    break

            # 根据output_enabled决定最终输出内容
            if output_enabled:
                final_output = assistant_final_output
            else:
                final_output = "\n".join(tool_results_content) if tool_results_content else ""

            # 创建round数据
            round_data = {
                "round": current_round,
                "node_name": node_name,
                "level": node_level,
                "output_enabled": output_enabled,
                "messages": round_messages
            }

            if mcp_servers:
                round_data["mcp_servers"] = mcp_servers

            conversation["rounds"].append(round_data)

            # 处理全局输出存储
            if node.get("global_output", False):
                if output_enabled:
                    if final_output:
                        self.conversation_manager._add_global_output(
                            conversation_id,
                            node_name,
                            final_output
                        )
                else:
                    if tool_results_content:
                        tool_output = "\n".join(tool_results_content)
                        self.conversation_manager._add_global_output(
                            conversation_id,
                            node_name,
                            tool_output
                        )

            # 保存文件
            save_ext = node.get("save")
            if save_ext and final_output.strip():
                FileManager.save_node_output_to_file(
                    conversation_id,
                    node_name,
                    final_output,
                    save_ext
                )

            self._update_execution_chain(conversation)

            # 保存会话状态
            self.conversation_manager.update_conversation_file(conversation_id)

            # 发送节点结束事件 - 自定义事件
            yield SSEHelper.send_node_end(node_name)

        except Exception as e:
            logger.error(f"执行节点 '{node['name']}' 流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"执行节点时出错: {str(e)}")

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
        """获取节点输入所需的所有输出结果 - 支持output_enabled"""
        node_outputs = {}

        for input_node_name in node.get("input_nodes", []):
            if input_node_name == "start":
                user_input = self._get_user_input_from_rounds(conversation)
                if user_input:
                    node_outputs["start"] = user_input
            else:
                # 使用更新后的方法获取节点输出
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
        """从rounds中获取节点输入 - 支持output_enabled"""
        input_nodes = node.get("input_nodes", [])
        inputs = []

        for input_node_name in input_nodes:
            if input_node_name == "start":
                user_input = self._get_user_input_from_rounds(conversation)
                if user_input:
                    inputs.append(user_input)
            else:
                # 使用更新后的方法获取节点输出
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
        """从rounds中获取指定节点的输出 - 支持output_enabled"""
        rounds = conversation.get("rounds", [])
        graph_config = conversation.get("graph_config", {})

        # 查找节点配置以获取output_enabled设置
        node_config = None
        for node in graph_config.get("nodes", []):
            if node["name"] == node_name:
                node_config = node
                break

        # 从最新的对应节点round中获取输出
        for round_data in reversed(rounds):
            if round_data.get("node_name") == node_name:
                messages = round_data.get("messages", [])

                # 检查round中存储的output_enabled设置（优先）
                round_output_enabled = round_data.get("output_enabled")
                if round_output_enabled is None and node_config:
                    # 如果round中没有，使用节点配置
                    round_output_enabled = node_config.get("output_enabled", True)
                else:
                    round_output_enabled = True  # 默认值

                if round_output_enabled:
                    # 获取assistant的最终输出
                    for message in reversed(messages):
                        if message.get("role") == "assistant":
                            return message.get("content", "")
                else:
                    # 获取所有工具结果并拼接
                    tool_contents = []
                    for message in messages:
                        if message.get("role") == "tool":
                            content = message.get("content", "")
                            # 排除handoffs相关的工具结果
                            if content and not content.startswith("已选择节点:"):
                                tool_contents.append(content)

                    return "\n".join(tool_contents) if tool_contents else ""

        return ""

    def _check_handoffs_in_round(self, round_data: Dict[str, Any], node: Dict[str, Any]) -> bool:
        """检查round中是否有handoffs选择"""
        if not round_data or not round_data.get("messages"):
            return False

        handoffs_limit = node.get("handoffs")
        if handoffs_limit is None:
            return False

        # 检查是否有transfer_to_开头的工具调用
        for message in round_data["messages"]:
            if message.get("role") == "assistant" and message.get("tool_calls"):
                for tool_call in message["tool_calls"]:
                    tool_name = tool_call.get("function", {}).get("name", "")
                    if tool_name.startswith("transfer_to_"):
                        return True

        return False

    def _extract_handoffs_selection(self, round_data: Dict[str, Any]) -> Optional[str]:
        """从round中提取handoffs选择"""
        if not round_data or not round_data.get("messages"):
            return None

        for message in round_data["messages"]:
            if message.get("role") == "assistant" and message.get("tool_calls"):
                for tool_call in message["tool_calls"]:
                    tool_name = tool_call.get("function", {}).get("name", "")
                    if tool_name.startswith("transfer_to_"):
                        selected_node = tool_name[len("transfer_to_"):]
                        return selected_node

        return None
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