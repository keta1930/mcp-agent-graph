import asyncio
import logging
from typing import Dict, Any, Optional
from app.services.graph.graph_helper import GraphHelper
from app.services.graph.handoffs_manager import HandoffsManager
from app.services.graph.message_creator import MessageCreator
from app.services.tool_execution import ToolExecutor
from app.services.graph.node_executor_core import NodeExecutorCore

logger = logging.getLogger(__name__)

class BackgroundExecutor:
    """后台执行器 - 处理图的后台异步执行"""

    def __init__(self, conversation_manager, mcp_service):
        self.conversation_manager = conversation_manager
        self.mcp_service = mcp_service
        self.message_creator = MessageCreator(conversation_manager)
        self.tool_executor = ToolExecutor(mcp_service)
        self.node_executor_core = NodeExecutorCore(
        conversation_manager, self.tool_executor, self.message_creator
    )

    async def execute_graph_background(self, graph_name: str, flattened_config: Dict[str, Any],
                                       input_text: str, model_service=None, user_id: str = "default_user") -> Dict[str, Any]:
        """后台执行整个图，创建conversation_id后返回，图在后台继续执行"""
        try:
            # 创建conversation
            conversation_id = await self.conversation_manager.create_conversation_with_config(
                graph_name, flattened_config, user_id
            )

            conversation = await self.conversation_manager.get_conversation(conversation_id)
            conversation["graph_name"] = graph_name

            # 记录用户输入
            await self.message_creator.record_user_input(conversation_id, input_text)

            # 启动后台任务执行图
            asyncio.create_task(
                self._execute_graph_background_task(conversation_id, model_service, user_id)
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

            # Get user_id from conversation
            user_id = conversation.get("user_id", "default_user")

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
                self._continue_conversation_background_task(conversation_id, model_service, user_id)
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

    async def _execute_graph_background_task(self, conversation_id: str, model_service, user_id: str = "default_user"):
        """后台执行图的核心任务"""
        try:
            logger.info(f"开始后台执行图: {conversation_id}")

            # 执行图的所有层级
            await self._execute_graph_by_level_background(conversation_id, model_service, user_id)

            # 生成最终结果
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            final_output = await self.conversation_manager._get_final_output(conversation)

            # 保存最终状态
            await self.conversation_manager.update_conversation_file(conversation_id)

            logger.info(f"后台执行图完成: {conversation_id}")

        except Exception as e:
            logger.error(f"后台执行图失败 {conversation_id}: {str(e)}")

    async def _continue_conversation_background_task(self, conversation_id: str, model_service, user_id: str = "default_user"):
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
                await self._continue_from_handoffs_background(conversation_id, target_node, model_service, user_id)
            elif action == "handoffs_wait":
                current_node = resumption_info.get("current_node")
                await self._continue_waiting_handoffs_background(conversation_id, current_node, model_service, user_id)
            elif action == "continue":
                from_level = resumption_info.get("from_level")
                await self._continue_graph_by_level_background(conversation_id, from_level, None, model_service, user_id)
            else:
                await self._execute_graph_by_level_background(conversation_id, model_service, user_id)

            # 生成最终结果
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            final_output = await self.conversation_manager._get_final_output(conversation)

            # 保存最终状态
            await self.conversation_manager.update_conversation_file(conversation_id)

            logger.info(f"后台继续执行完成: {conversation_id}")

        except Exception as e:
            logger.error(f"后台继续执行失败 {conversation_id}: {str(e)}")

    async def _execute_graph_by_level_background(self, conversation_id: str, model_service=None,
                                                 user_id: str = "default_user"):
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
                    await self._execute_node_background(node, conversation_id, model_service, user_id)

                    conversation = await self.conversation_manager.get_conversation(conversation_id)
                    last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

                    if HandoffsManager.check_handoffs_in_round(last_round, node):
                        selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
                        if selected_node_name:
                            logger.info(f"检测到handoffs选择: {selected_node_name}，跳转执行")
                            await self._continue_from_handoffs_background(
                                conversation_id, selected_node_name, model_service, user_id
                            )
                            return

                current_level += 1

        except Exception as e:
            logger.error(f"后台执行图层级时出错: {str(e)}")
            raise

    async def _execute_node_background(self, node: Dict[str, Any], conversation_id: str, model_service, user_id: str = "default_user"):
        """执行单个节点（后台模式）"""
        result = None
        async for item in self.node_executor_core.execute_node(
            node=node,
            conversation_id=conversation_id,
            yield_sse=False,  # 后台模式
            user_id=user_id
        ):
            result = item  # 最后一条是结果
        return result

    async def _continue_from_handoffs_background(self, conversation_id: str, target_node: str, model_service=None,
                                                 user_id: str = "default_user"):
        """从handoffs选择后台继续执行"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            target_node_obj = GraphHelper.find_node_by_name(graph_config, target_node)
            if not target_node_obj:
                raise Exception(f"找不到handoffs目标节点: {target_node}")

            current_level = target_node_obj.get("level", 0)
            await self._continue_graph_by_level_background(conversation_id, current_level, target_node, model_service, user_id)

        except Exception as e:
            logger.error(f"从handoffs选择后台继续执行时出错: {str(e)}")
            raise

    async def _continue_waiting_handoffs_background(self, conversation_id: str, current_node: str, model_service=None,
                                                   user_id: str = "default_user"):
        """后台继续等待handoffs的节点"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            graph_config = conversation["graph_config"]

            current_node_obj = GraphHelper.find_node_by_name(graph_config, current_node)
            if not current_node_obj:
                raise Exception(f"找不到当前节点: {current_node}")

            await self._execute_node_background(current_node_obj, conversation_id, model_service, user_id)

            conversation = await self.conversation_manager.get_conversation(conversation_id)
            last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

            if HandoffsManager.check_handoffs_in_round(last_round, current_node_obj):
                selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
                if selected_node_name:
                    await self._continue_from_handoffs_background(conversation_id, selected_node_name, model_service, user_id)
            else:
                current_level = current_node_obj.get("level", 0) + 1
                max_level = GraphHelper.get_max_level(graph_config)

                if current_level <= max_level:
                    await self._continue_graph_by_level_background(conversation_id, current_level, None, model_service, user_id)

        except Exception as e:
            logger.error(f"后台继续等待handoffs时出错: {str(e)}")
            raise

    async def _continue_graph_by_level_background(self, conversation_id: str, start_level: int,
                                                  restart_node: Optional[str], model_service=None,
                                                  user_id: str = "default_user"):
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
                    await self._execute_node_background(restart_node_obj, conversation_id, model_service, user_id)

                    conversation = await self.conversation_manager.get_conversation(conversation_id)
                    last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

                    if HandoffsManager.check_handoffs_in_round(last_round, restart_node_obj):
                        selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
                        if selected_node_name:
                            await self._continue_graph_by_level_background(
                                conversation_id, current_level, selected_node_name, model_service, user_id
                            )
                            return

                    current_level += 1

            while current_level <= max_level:
                nodes = GraphHelper.get_nodes_at_level(graph_config, current_level)

                for node in nodes:
                    await self._execute_node_background(node, conversation_id, model_service, user_id)

                    conversation = await self.conversation_manager.get_conversation(conversation_id)
                    last_round = conversation["rounds"][-1] if conversation["rounds"] else {}

                    if HandoffsManager.check_handoffs_in_round(last_round, node):
                        selected_node_name = HandoffsManager.extract_handoffs_selection(last_round)
                        if selected_node_name:
                            await self._continue_graph_by_level_background(
                                conversation_id, current_level, selected_node_name, model_service, user_id
                            )
                            return

                current_level += 1

        except Exception as e:
            logger.error(f"后台继续执行图层级时出错: {str(e)}")
            raise