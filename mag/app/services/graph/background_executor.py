import asyncio
import logging
import time
import json
from typing import Dict, List, Any, Optional, Set, Tuple
import copy
from app.core.graph_run_storage import graph_run_storage
from app.services.model_service import model_service
from app.services.graph.graph_helper import GraphHelper
from app.services.graph.handoffs_manager import HandoffsManager
from app.services.graph.message_creator import MessageCreator
from app.services.graph.execution_chain_manager import ExecutionChainManager

logger = logging.getLogger(__name__)

class BackgroundExecutor:
    """后台执行器 - 处理图的后台异步执行"""

    def __init__(self, conversation_manager, mcp_service):
        self.conversation_manager = conversation_manager
        self.mcp_service = mcp_service
        self.message_creator = MessageCreator(conversation_manager)

    async def execute_graph_background(self, graph_name: str, flattened_config: Dict[str, Any],
                                       input_text: str, model_service=None) -> Dict[str, Any]:
        """后台执行整个图，创建conversation_id后返回，图在后台继续执行"""
        try:
            # 创建conversation
            conversation_id = await self.conversation_manager.create_conversation_with_config(
                graph_name, flattened_config
            )

            conversation = await self.conversation_manager.get_conversation(conversation_id)
            conversation["graph_name"] = graph_name

            # 记录用户输入
            await self.message_creator.record_user_input(conversation_id, input_text)

            # 启动后台任务执行图
            asyncio.create_task(
                self._execute_graph_background_task(conversation_id, model_service)
            )

            # 返回conversation_id
            return {
                "status": "started",
                "conversation_id": conversation_id,
                "message": "图已在后台开始执行"
            }

        except Exception as e:
            logger.error(f"后台执行图时出错: {str(e)}")
            return {
                "status": "error",
                "message": f"后台执行图时出错: {str(e)}"
            }

    async def continue_conversation_background(self, conversation_id: str, input_text: str = None,
                                               model_service=None) -> Dict[str, Any]:
        """后台继续现有会话"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                return {
                    "status": "error",
                    "message": f"找不到会话 '{conversation_id}'"
                }

            if input_text:
                # 重置会话状态并记录新输入
                previous_rounds = [r for r in conversation.get("rounds", []) if r.get("node_name") == "start"]
                conversation["rounds"] = previous_rounds
                conversation["_current_round"] = len(previous_rounds)
                conversation["execution_chain"] = []
                conversation["handoffs_status"] = {}

                await self.message_creator.record_user_input(conversation_id, input_text)

            # 启动后台继续执行任务
            asyncio.create_task(
                self._continue_conversation_background_task(conversation_id, model_service)
            )

            return {
                "status": "started",
                "conversation_id": conversation_id,
                "message": "会话已在后台继续执行"
            }

        except Exception as e:
            logger.error(f"后台继续会话时出错: {str(e)}")
            return {
                "status": "error",
                "message": f"后台继续会话时出错: {str(e)}"
            }

    async def _execute_graph_background_task(self, conversation_id: str, model_service):
        """后台执行图的核心任务"""
        try:
            logger.info(f"开始后台执行图: {conversation_id}")

            # 执行图的所有层级
            await self._execute_graph_by_level_background(conversation_id, model_service)

            # 生成最终结果
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            final_output = await self.conversation_manager._get_final_output(conversation)

            # 保存最终状态
            await self.conversation_manager.update_conversation_file(conversation_id)

            logger.info(f"后台执行图完成: {conversation_id}")

        except Exception as e:
            logger.error(f"后台执行图失败 {conversation_id}: {str(e)}")

    async def _continue_conversation_background_task(self, conversation_id: str, model_service):
        """后台继续现有会话的执行任务"""
        try:
            logger.info(f"开始后台继续执行: {conversation_id}")

            # 检查恢复点并继续执行
            resumption_info = await self.conversation_manager.check_execution_resumption_point(conversation_id)
            action = resumption_info.get("action")

            if action == "error":
                raise Exception(resumption_info.get("message"))
            elif action == "handoffs_continue":
                target_node = resumption_info.get("target_node")
                await self._continue_from_handoffs_background(conversation_id, target_node, model_service)
            elif action == "handoffs_wait":
                current_node = resumption_info.get("current_node")
                await self._continue_waiting_handoffs_background(conversation_id, current_node, model_service)
            elif action == "continue":
                from_level = resumption_info.get("from_level")
                await self._continue_graph_by_level_background(conversation_id, from_level, None, model_service)
            else:
                await self._execute_graph_by_level_background(conversation_id, model_service)

            # 生成最终结果
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            final_output = await self.conversation_manager._get_final_output(conversation)

            # 保存最终状态
            await self.conversation_manager.update_conversation_file(conversation_id)

            logger.info(f"后台继续执行完成: {conversation_id}")

        except Exception as e:
            logger.error(f"后台继续执行失败 {conversation_id}: {str(e)}")

    async def _execute_graph_by_level_background(self, conversation_id: str, model_service=None):
        """基于层级的后台顺序执行方法"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            max_level = GraphHelper.get_max_level(graph_config)
            current_level = 0

            while current_level <= max_level:
                logger.info(f"后台执行层级 {current_level}")

                nodes_to_execute = GraphHelper.get_nodes_at_level(graph_config, current_level)

                for node in nodes_to_execute:
                    # 执行节点
                    await self._execute_node_background(node, conversation_id, model_service)

                    conversation = await self.conversation_manager.get_conversation(conversation_id)
                    last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

                    if HandoffsManager.check_handoffs_in_round(last_round, node):
                        selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
                        if selected_node_name:
                            logger.info(f"检测到handoffs选择: {selected_node_name}，跳转执行")
                            await self._continue_from_handoffs_background(
                                conversation_id, selected_node_name, model_service
                            )
                            return

                current_level += 1

        except Exception as e:
            logger.error(f"后台执行图层级时出错: {str(e)}")
            raise

    async def _execute_node_background(self, node: Dict[str, Any], conversation_id: str, model_service):
        """后台执行单个节点"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                raise Exception(f"找不到会话 '{conversation_id}'")

            node_name = node["name"]
            node_level = node.get("level", 0)

            conversation["_current_round"] += 1
            current_round = conversation["_current_round"]

            model_name = node["model_name"]
            mcp_servers = node.get("mcp_servers", [])
            output_enabled = node.get("output_enabled", True)

            node_copy = copy.deepcopy(node)
            node_copy["_conversation_id"] = conversation_id

            conversation_messages = await self.message_creator.create_agent_messages(node_copy)

            handoffs_limit = node.get("handoffs")
            handoffs_status = await self.conversation_manager.get_handoffs_status(conversation_id, node_name)
            current_handoffs_count = handoffs_status.get("used_count", 0)

            handoffs_enabled = handoffs_limit is not None and current_handoffs_count < handoffs_limit

            handoffs_tools = []
            if handoffs_enabled:
                handoffs_tools = HandoffsManager.create_handoffs_tools(node, conversation["graph_config"])

            mcp_tools = []
            if mcp_servers:
                mcp_tools = await self.mcp_service.prepare_chat_tools(mcp_servers)

            all_tools = handoffs_tools + mcp_tools

            round_messages = conversation_messages.copy()
            assistant_final_output = ""
            tool_results_content = []

            current_messages = conversation_messages.copy()
            max_iterations = 10
            node_token_usage = {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0
            }

            for iteration in range(max_iterations):
                # 过滤reasoning_content字段
                messages = model_service.filter_reasoning_content(current_messages)

                # 使用model_service进行流式调用（不yield chunks，只获取累积结果）
                accumulated_result = None
                async for item in model_service.stream_chat_with_tools(
                    model_name=model_name,
                    messages=messages,
                    tools=all_tools if all_tools else None,
                    yield_chunks=False  # 后台执行不需要实时yield
                ):
                    if not isinstance(item, str):
                        # 累积结果
                        accumulated_result = item

                if not accumulated_result:
                    raise Exception("未收到模型响应")

                # 获取累积的结果
                accumulated_content = accumulated_result["accumulated_content"]
                accumulated_reasoning = accumulated_result.get("accumulated_reasoning", "")
                current_tool_calls = accumulated_result.get("tool_calls", [])
                iteration_usage = accumulated_result.get("api_usage")

                if iteration_usage:
                    node_token_usage["total_tokens"] += iteration_usage["total_tokens"]
                    node_token_usage["prompt_tokens"] += iteration_usage["prompt_tokens"]
                    node_token_usage["completion_tokens"] += iteration_usage["completion_tokens"]

                assistant_msg = {"role": "assistant"}
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
                            has_handoffs = True
                            if handoffs_limit is not None:
                                await self.conversation_manager.update_handoffs_status(
                                    conversation_id, node_name, handoffs_limit, current_handoffs_count + 1,
                                    selected_node
                                )
                            tool_content = f"已选择节点: {selected_node}"
                        else:
                            tool_content = f"无效的节点选择: {selected_node}"
                    else:
                        try:
                            tool_args = json.loads(tool_call["function"]["arguments"]) if tool_call["function"][
                                "arguments"] else {}
                        except json.JSONDecodeError:
                            tool_args = {}

                        tool_result = await self._execute_single_tool(tool_name, tool_args, mcp_servers)
                        tool_content = tool_result.get("content", "")

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

            from app.services.mongodb_service import mongodb_service
            await mongodb_service.add_round_to_graph_run(conversation_id=conversation_id,round_data=round_data,tools_schema=all_tools)

            if node_token_usage["total_tokens"] > 0:
                await mongodb_service.update_conversation_token_usage(
                    conversation_id=conversation_id,
                    prompt_tokens=node_token_usage["prompt_tokens"],
                    completion_tokens=node_token_usage["completion_tokens"]
                )
                logger.info(f"节点 '{node_name}' token使用量: {node_token_usage}")

            if output_enabled and final_output:
                await self.conversation_manager._add_global_output(conversation_id, node_name, final_output)
            elif not output_enabled and tool_results_content:
                tool_output = "\n".join(tool_results_content)
                await self.conversation_manager._add_global_output(conversation_id, node_name, tool_output)

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

            await ExecutionChainManager.update_execution_chain(conversation)
            await self.conversation_manager.update_conversation_file(conversation_id)

        except Exception as e:
            logger.error(f"后台执行节点 '{node['name']}' 时出错: {str(e)}")
            raise

    async def _execute_single_tool(self, tool_name: str, tool_args: Dict[str, Any], mcp_servers: List[str]) -> Dict[
        str, Any]:
        """执行单个工具"""
        server_name = await self._find_tool_server(tool_name, mcp_servers)
        if not server_name:
            return {"tool_name": tool_name, "content": f"找不到工具 '{tool_name}' 所属的服务器", "error": "工具不存在"}

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

            return {"tool_name": tool_name, "content": content, "server_name": server_name}

        except Exception as e:
            logger.error(f"执行工具 {tool_name} 时出错: {str(e)}")
            return {"tool_name": tool_name, "content": f"工具执行异常: {str(e)}", "error": str(e)}

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

    async def _continue_from_handoffs_background(self, conversation_id: str, target_node: str, model_service=None):
        """从handoffs选择后台继续执行"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            target_node_obj = GraphHelper.find_node_by_name(graph_config, target_node)
            if not target_node_obj:
                raise Exception(f"找不到handoffs目标节点: {target_node}")

            current_level = target_node_obj.get("level", 0)
            await self._continue_graph_by_level_background(conversation_id, current_level, target_node, model_service)

        except Exception as e:
            logger.error(f"从handoffs选择后台继续执行时出错: {str(e)}")
            raise

    async def _continue_waiting_handoffs_background(self, conversation_id: str, current_node: str, model_service=None):
        """后台继续等待handoffs的节点"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            current_node_obj = GraphHelper.find_node_by_name(graph_config, current_node)
            if not current_node_obj:
                raise Exception(f"找不到当前节点: {current_node}")

            await self._execute_node_background(current_node_obj, conversation_id, model_service)

            conversation = await self.conversation_manager.get_conversation(conversation_id)
            last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

            if HandoffsManager.check_handoffs_in_round(last_round, current_node_obj):
                selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
                if selected_node_name:
                    await self._continue_from_handoffs_background(conversation_id, selected_node_name, model_service)
            else:
                current_level = current_node_obj.get("level", 0) + 1
                max_level = GraphHelper.get_max_level(graph_config)

                if current_level <= max_level:
                    await self._continue_graph_by_level_background(conversation_id, current_level, None, model_service)

        except Exception as e:
            logger.error(f"后台继续等待handoffs时出错: {str(e)}")
            raise

    async def _continue_graph_by_level_background(self, conversation_id: str, start_level: int,
                                                  restart_node: Optional[str], model_service=None):
        """从指定层级后台继续顺序执行图"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            max_level = GraphHelper.get_max_level(graph_config)
            current_level = start_level

            if restart_node:
                restart_node_obj = GraphHelper.find_node_by_name(graph_config, restart_node)
                if restart_node_obj:
                    current_level = restart_node_obj.get("level", 0)
                    await self._execute_node_background(restart_node_obj, conversation_id, model_service)

                    conversation = await self.conversation_manager.get_conversation(conversation_id)
                    last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

                    if HandoffsManager.check_handoffs_in_round(last_round, restart_node_obj):
                        selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
                        if selected_node_name:
                            await self._continue_graph_by_level_background(
                                conversation_id, current_level, selected_node_name, model_service
                            )
                            return

                    current_level += 1

            while current_level <= max_level:
                nodes = GraphHelper.get_nodes_at_level(graph_config, current_level)

                for node in nodes:
                    await self._execute_node_background(node, conversation_id, model_service)

                    conversation = await self.conversation_manager.get_conversation(conversation_id)
                    last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

                    if HandoffsManager.check_handoffs_in_round(last_round, node):
                        selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
                        if selected_node_name:
                            await self._continue_graph_by_level_background(
                                conversation_id, current_level, selected_node_name, model_service
                            )
                            return

                current_level += 1

        except Exception as e:
            logger.error(f"后台继续执行图层级时出错: {str(e)}")
            raise