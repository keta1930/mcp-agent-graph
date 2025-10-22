import asyncio
import logging
import time
import json
from typing import Dict, List, Any, Optional, Set, Tuple, AsyncGenerator
import copy
from app.core.graph_run_storage import graph_run_storage
from app.utils.sse_helper import SSEHelper
from app.utils.output_tools import GraphPromptTemplate
from app.services.mongodb_service import mongodb_service
from app.services.model_service import model_service
from app.utils.graph_helper import GraphHelper

logger = logging.getLogger(__name__)

class GraphExecutor:
    """图执行服务 - 处理图和节点的实际执行流程"""

    def __init__(self, conversation_manager, mcp_service):
        self.conversation_manager = conversation_manager
        self.mcp_service = mcp_service

    async def execute_graph_stream(self,
                                   graph_name: str,
                                   flattened_config: Dict[str, Any],
                                   input_text: str,
                                   model_service=None) -> AsyncGenerator[str, None]:
        """执行整个图并返回流式结果"""
        try:
            conversation_id = await self.conversation_manager.create_conversation_with_config(graph_name,
                                                                                              flattened_config)

            # 立即发送对话ID给前端
            yield SSEHelper.send_json({
                "type": "conversation_created",
                "conversation_id": conversation_id
            })

            conversation = await self.conversation_manager.get_conversation(conversation_id)
            conversation["graph_name"] = graph_name

            # 发送start节点开始事件
            yield SSEHelper.send_node_start("start", 0)

            await self._record_user_input(conversation_id, input_text)

            # 发送start节点结束事件
            yield SSEHelper.send_node_end("start")

            async for sse_data in self._execute_graph_by_level_sequential_stream(conversation_id, model_service):
                yield sse_data

            conversation = await self.conversation_manager.get_conversation(conversation_id)
            final_output = await self.conversation_manager._get_final_output(conversation)
            execution_chain = conversation.get("execution_chain", [])

            await self.conversation_manager.update_conversation_file(conversation_id)

            yield SSEHelper.send_graph_complete(final_output, execution_chain)

        except Exception as e:
            logger.error(f"执行图流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"执行图时出错: {str(e)}")

    async def continue_conversation_stream(self,
                                           conversation_id: str,
                                           input_text: str = None,
                                           model_service=None,
                                           continue_from_checkpoint: bool = False) -> AsyncGenerator[str, None]:
        """继续现有会话并返回流式结果"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                yield SSEHelper.send_error(f"找不到会话 '{conversation_id}'")
                return

            if continue_from_checkpoint or not input_text:
                resumption_info = await self.conversation_manager.check_execution_resumption_point(conversation_id)
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
                    await self._record_user_input(conversation_id, input_text)

                async for sse_data in self._execute_graph_by_level_sequential_stream(conversation_id, model_service):
                    yield sse_data

            conversation = await self.conversation_manager.get_conversation(conversation_id)
            final_output = await self.conversation_manager._get_final_output(conversation)
            execution_chain = conversation.get("execution_chain", [])

            await self.conversation_manager.update_conversation_file(conversation_id)

            yield SSEHelper.send_graph_complete(final_output, execution_chain)

        except Exception as e:
            logger.error(f"继续会话流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"继续会话时出错: {str(e)}")

    async def _execute_graph_by_level_sequential_stream(self, conversation_id: str, model_service=None) -> \
            AsyncGenerator[str, None]:
        """基于层级的顺序执行方法"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            max_level = GraphHelper.get_max_level(graph_config)
            current_level = 0

            while current_level <= max_level:
                logger.info(f"开始执行层级 {current_level}")

                nodes_to_execute = GraphHelper.get_nodes_at_level(graph_config, current_level)

                for node in nodes_to_execute:
                    async for sse_data in self._execute_node_stream(node, conversation_id, model_service):
                        yield sse_data

                    conversation = await self.conversation_manager.get_conversation(conversation_id)
                    last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

                    if self._check_handoffs_in_round(last_round, node):
                        selected_node_name = self._extract_handoffs_selection(last_round)
                        if selected_node_name:
                            selected_node = GraphHelper.find_node_by_name(graph_config, selected_node_name)
                            if selected_node:
                                logger.info(f"检测到handoffs选择: {selected_node_name}，跳转执行")
                                async for sse_data in self._continue_from_handoffs_selection_stream(
                                        conversation_id,
                                        selected_node_name,
                                        model_service
                                ):
                                    yield sse_data
                                return

                current_level += 1

        except Exception as e:
            logger.error(f"执行图层级流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"执行图时出错: {str(e)}")

    async def _continue_graph_by_level_sequential_stream(self,
                                                         conversation_id: str,
                                                         start_level: int,
                                                         restart_node: Optional[str],
                                                         model_service=None) -> AsyncGenerator[str, None]:
        """从指定层级继续顺序执行图"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            max_level = GraphHelper.get_max_level(graph_config)
            current_level = start_level

            if restart_node:
                restart_node_obj = GraphHelper.find_node_by_name(graph_config, restart_node)
                if restart_node_obj:
                    current_level = restart_node_obj.get("level", 0)
                    async for sse_data in self._execute_node_stream(restart_node_obj, conversation_id,
                                                                    model_service):
                        yield sse_data

                    conversation = await self.conversation_manager.get_conversation(conversation_id)
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
                nodes = GraphHelper.get_nodes_at_level(graph_config, current_level)

                for node in nodes:
                    async for sse_data in self._execute_node_stream(node, conversation_id, model_service):
                        yield sse_data

                    conversation = await self.conversation_manager.get_conversation(conversation_id)
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

    async def _continue_from_handoffs_selection_stream(self,
                                                       conversation_id: str,
                                                       target_node: str,
                                                       model_service=None) -> AsyncGenerator[str, None]:
        """从handoffs选择继续执行"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            target_node_obj = GraphHelper.find_node_by_name(graph_config, target_node)
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
        """继续等待handoffs的节点"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            current_node_obj = GraphHelper.find_node_by_name(graph_config, current_node)
            if not current_node_obj:
                yield SSEHelper.send_error(f"找不到当前节点: {current_node}")
                return

            logger.info(f"继续等待handoffs的节点: {current_node}")

            async for sse_data in self._execute_node_stream(current_node_obj, conversation_id,
                                                            model_service):
                yield sse_data

            conversation = await self.conversation_manager.get_conversation(conversation_id)
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
                current_level = current_node_obj.get("level", 0) + 1
                max_level = GraphHelper.get_max_level(graph_config)
                
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

    async def _execute_node_stream(self,
                                   node: Dict[str, Any],
                                   conversation_id: str,
                                   model_service) -> AsyncGenerator[str, None]:
        """执行单个节点"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                yield SSEHelper.send_error(f"找不到会话 '{conversation_id}'")
                return

            node_name = node["name"]
            node_level = node.get("level", 0)

            yield SSEHelper.send_node_start(node_name, node_level)

            conversation["_current_round"] += 1
            current_round = conversation["_current_round"]

            model_name = node["model_name"]
            mcp_servers = node.get("mcp_servers", [])
            output_enabled = node.get("output_enabled", True)

            node_copy = copy.deepcopy(node)
            node_copy["_conversation_id"] = conversation_id

            conversation_messages = await self._create_agent_messages(node_copy)

            handoffs_limit = node.get("handoffs")
            handoffs_status = await self.conversation_manager.get_handoffs_status(conversation_id, node_name)
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
            node_token_usage = {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0
            }

            for iteration in range(max_iterations):
                logger.info(f"节点 '{node_name}' 第 {iteration + 1} 轮对话")

                # 过滤reasoning_content字段
                messages = model_service.filter_reasoning_content(current_messages)

                # 使用model_service进行SSE流式调用
                accumulated_result = None
                async for item in model_service.stream_chat_with_tools(
                    model_name=model_name,
                    messages=messages,
                    tools=all_tools if all_tools else None,
                    yield_chunks=True  # 图执行需要实时yield SSE chunks
                ):
                    if isinstance(item, str):
                        # SSE chunk，通过SSEHelper包装后转发
                        # 从 "data: {...}\n\n" 中提取JSON
                        if item.startswith("data: ") and item.endswith("\n\n"):
                            chunk_json = item[6:-2]  # 去掉 "data: " 和 "\n\n"
                            try:
                                chunk_dict = json.loads(chunk_json)
                                yield SSEHelper.send_openai_chunk(chunk_dict)
                            except:
                                pass  # 忽略解析错误
                    else:
                        # 累积结果
                        accumulated_result = item

                if not accumulated_result:
                    yield SSEHelper.send_error("未收到模型响应")
                    return

                # 获取累积的结果
                accumulated_content = accumulated_result["accumulated_content"]
                accumulated_reasoning = accumulated_result.get("accumulated_reasoning", "")
                current_tool_calls = accumulated_result.get("tool_calls", [])
                iteration_usage = accumulated_result.get("api_usage")

                if iteration_usage:
                    node_token_usage["total_tokens"] += iteration_usage["total_tokens"]
                    node_token_usage["prompt_tokens"] += iteration_usage["prompt_tokens"]
                    node_token_usage["completion_tokens"] += iteration_usage["completion_tokens"]

                assistant_msg = {
                    "role": "assistant",
                }

                if accumulated_reasoning:
                    assistant_msg["reasoning_content"] = accumulated_reasoning

                assistant_msg["content"] = accumulated_content or ""

                if current_tool_calls:
                    assistant_msg["tool_calls"] = current_tool_calls

                round_messages.append(assistant_msg)
                current_messages.append(assistant_msg)

                if not current_tool_calls:
                    assistant_final_output = accumulated_content
                    break

                has_handoffs = False

                for tool_call in current_tool_calls:
                    tool_name = tool_call["function"]["name"]

                    if tool_name.startswith("transfer_to_"):
                        selected_node = tool_name[len("transfer_to_"):]
                        if selected_node in node.get("output_nodes", []):
                            selected_handoff = selected_node
                            has_handoffs = True

                            if handoffs_limit is not None:
                                await self.conversation_manager.update_handoffs_status(
                                    conversation_id, node_name, handoffs_limit, current_handoffs_count + 1,
                                    selected_handoff
                                )

                            tool_content = f"已选择节点: {selected_node}"

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

            if output_enabled:
                final_output = assistant_final_output
            else:
                final_output = "\n".join(tool_results_content) if tool_results_content else ""

            round_data = {
                "round": current_round,
                "node_name": node_name,
                "level": node_level,
                "output_enabled": output_enabled,
                "messages": round_messages,
                "model": model_name
            }

            if mcp_servers:
                round_data["mcp_servers"] = mcp_servers

            conversation["rounds"].append(round_data)

            await mongodb_service.add_round_to_graph_run(conversation_id=conversation_id,round_data=round_data,tools_schema=all_tools)

            if node_token_usage["total_tokens"] > 0:
                await mongodb_service.update_conversation_token_usage(
                    conversation_id=conversation_id,
                    prompt_tokens=node_token_usage["prompt_tokens"],
                    completion_tokens=node_token_usage["completion_tokens"]
                )
                logger.info(f"节点 '{node_name}' token使用量: {node_token_usage}")

            if output_enabled:
                # 对于output_enabled=True的节点，保存assistant的最终输出
                if final_output:
                    await self.conversation_manager._add_global_output(
                        conversation_id,
                        node_name,
                        final_output
                    )
            else:
                # 对于output_enabled=False的节点，保存工具调用结果
                if tool_results_content:
                    tool_output = "\n".join(tool_results_content)
                    await self.conversation_manager._add_global_output(
                        conversation_id,
                        node_name,
                        tool_output
                    )

            save_ext = node.get("save")
            if save_ext and final_output.strip():
                # 从 conversation 获取 graph_name
                graph_name = conversation.get("graph_name", "unknown")
                # 使用 MinIO 存储节点输出
                graph_run_storage.save_node_output(
                    graph_name=graph_name,
                    graph_run_id=conversation_id,
                    node_name=node_name,
                    content=final_output,
                    file_ext=save_ext
                )

            await self._update_execution_chain(conversation)

            await self.conversation_manager.update_conversation_file(conversation_id)

            yield SSEHelper.send_node_end(node_name)

        except Exception as e:
            logger.error(f"执行节点 '{node['name']}' 流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"执行节点时出错: {str(e)}")

    async def _create_agent_messages(self, node: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        创建Agent的消息列表
        """
        messages = []

        conversation_id = node.get("_conversation_id", "")
        conversation = None
        if conversation_id:
            conversation = await self.conversation_manager.get_conversation(conversation_id)

        # 创建简化的模板处理器
        template_processor = GraphPromptTemplate()

        # 获取全局输出历史
        global_outputs = {}
        if conversation:
            global_outputs = conversation.get("global_outputs", {})

        system_prompt = node.get("system_prompt", "")
        if system_prompt:
            # 使用模板处理器渲染动态节点引用
            system_prompt = template_processor.render_template(system_prompt, global_outputs)
            messages.append({"role": "system", "content": system_prompt})

        user_prompt = node.get("user_prompt", "")
        if user_prompt:
            user_prompt = template_processor.render_template(user_prompt, global_outputs)
            messages.append({"role": "user", "content": user_prompt})

        return messages

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

    async def _record_user_input(self, conversation_id: str, input_text: str):
        """记录用户输入为round格式"""
        conversation = await self.conversation_manager.get_conversation(conversation_id)

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

        await mongodb_service.add_round_to_graph_run(conversation_id=conversation_id,round_data=start_round,tools_schema=[])
        await mongodb_service.update_graph_run_global_outputs(conversation_id, "start", input_text)

        if "global_outputs" not in conversation:
            conversation["global_outputs"] = {}

        if "start" not in conversation["global_outputs"]:
            conversation["global_outputs"]["start"] = []

        conversation["global_outputs"]["start"].append(input_text)

    async def _update_execution_chain(self, conversation: Dict[str, Any]):
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

        from app.services.mongodb_service import mongodb_service
        await mongodb_service.update_graph_run_execution_chain(
            conversation["conversation_id"], execution_chain
        )

    def _check_handoffs_in_round(self, round_data: Dict[str, Any], node: Dict[str, Any]) -> bool:
        """检查round中是否有handoffs选择"""
        if not round_data or not round_data.get("messages"):
            return False

        handoffs_limit = node.get("handoffs")
        if handoffs_limit is None:
            return False

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