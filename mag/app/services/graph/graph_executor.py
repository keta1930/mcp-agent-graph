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
from app.services.graph.graph_helper import GraphHelper
from app.services.graph.handoffs_manager import HandoffsManager
from app.services.graph.message_creator import MessageCreator
from app.services.graph.execution_chain_manager import ExecutionChainManager
from app.services.mcp.tool_executor import ToolExecutor
from app.services.graph.node_executor_core import NodeExecutorCore

logger = logging.getLogger(__name__)

class GraphExecutor:
    """图执行服务 - 处理图和节点的实际执行流程"""

    def __init__(self, conversation_manager, mcp_service):
        self.conversation_manager = conversation_manager
        self.mcp_service = mcp_service
        self.message_creator = MessageCreator(conversation_manager)
        self.tool_executor = ToolExecutor(mcp_service)
        self.node_executor_core = NodeExecutorCore(
        conversation_manager, self.tool_executor, self.message_creator
    )

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

            await self.message_creator.record_user_input(conversation_id, input_text)

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
                    await self.message_creator.record_user_input(conversation_id, input_text)

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

                    if HandoffsManager.check_handoffs_in_round(last_round, node):
                        selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
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

                    if HandoffsManager.check_handoffs_in_round(last_round, restart_node_obj):
                        selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
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

                    if HandoffsManager.check_handoffs_in_round(last_round, node):
                        selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
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

            if HandoffsManager.check_handoffs_in_round(last_round, current_node_obj):
                selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
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

    async def _execute_node_stream(self, node: Dict[str, Any], conversation_id: str, model_service) -> AsyncGenerator[str, None]:
        """执行单个节点（流式模式）"""
        node_name = node["name"]
        node_level = node.get("level", 0)
        
        # 发送节点开始事件
        yield SSEHelper.send_node_start(node_name, node_level)
        
        # 执行节点并转发所有SSE消息
        result = None
        async for item in self.node_executor_core.execute_node(
            node=node,
            conversation_id=conversation_id,
            yield_sse=True  # 流式模式
        ):
            if isinstance(item, str):
                # SSE消息，直接转发
                yield item
            else:
                # 最后一条是结果字典
                result = item
        
        # 发送节点结束事件
        yield SSEHelper.send_node_end(node_name)