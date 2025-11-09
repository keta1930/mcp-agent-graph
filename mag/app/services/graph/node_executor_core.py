"""节点执行核心类 - 提供图节点执行的核心逻辑"""
import json
import logging
import copy
from typing import Dict, List, Any, AsyncGenerator
from app.services.model_service import model_service
from app.services.graph.handoffs_manager import HandoffsManager
from app.infrastructure.storage.object_storage import graph_run_storage

logger = logging.getLogger(__name__)


class NodeExecutorCore:
    """节点执行核心类 - 封装节点执行的完整流程"""

    def __init__(self, conversation_manager, tool_executor, message_creator):
        """初始化节点执行核心
        
        Args:
            conversation_manager: 会话管理器
            tool_executor: 工具执行器
            message_creator: 消息创建器
        """
        self.conversation_manager = conversation_manager
        self.tool_executor = tool_executor
        self.message_creator = message_creator

    async def execute_node(self,
                          node: Dict[str, Any],
                          conversation_id: str,
                          yield_sse: bool = False,
                          user_id: str = "default_user") -> AsyncGenerator:
        """执行单个节点的核心逻辑

        Args:
            node: 节点配置
            conversation_id: 会话ID
            yield_sse: 是否yield SSE消息（True=stream模式，False=background模式）
            user_id: 用户ID（可选，将从conversation中获取）

        Yields:
            如果yield_sse=True: yield SSE消息字符串
            最后一条: yield 执行结果字典
        """
        try:
            # 1. 准备执行环境
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                raise Exception(f"找不到会话 '{conversation_id}'")

            # 从 conversation 中获取 user_id，如果没有则使用传入的参数
            actual_user_id = conversation.get("user_id", user_id)

            node_name = node["name"]
            node_level = node.get("level", 0)
            
            conversation["_current_round"] += 1
            current_round = conversation["_current_round"]

            model_name = node["model_name"]
            mcp_servers = node.get("mcp_servers", [])
            output_enabled = node.get("output_enabled", True)

            # 2. 创建消息列表
            node_copy = copy.deepcopy(node)
            node_copy["_conversation_id"] = conversation_id
            conversation_messages = await self.message_creator.create_agent_messages(node_copy)

            # 3. 准备工具列表
            handoffs_tools = await self._prepare_handoffs_tools(
                node, conversation_id, conversation
            )
            mcp_tools = await self._prepare_mcp_tools(mcp_servers)
            all_tools = handoffs_tools + mcp_tools

            # 4. 执行多轮模型调用
            round_messages = conversation_messages.copy()
            current_messages = conversation_messages.copy()
            assistant_final_output = ""
            tool_results_content = []
            has_handoffs = False
            selected_node = None
            
            node_token_usage = {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0
            }

            max_iterations = 10
            for iteration in range(max_iterations):
                logger.info(f"节点 '{node_name}' 第 {iteration + 1} 轮对话")

                # 过滤reasoning_content字段
                messages = model_service.filter_reasoning_content(current_messages)

                # 调用模型
                accumulated_result = None
                async for item in model_service.stream_chat_with_tools(
                    model_name=model_name,
                    messages=messages,
                    tools=all_tools if all_tools else None,
                    yield_chunks=yield_sse,  # 根据模式决定是否yield chunks
                    user_id=actual_user_id
                ):
                    if isinstance(item, str):
                        if yield_sse:
                            yield item
                    else:
                        # 累积结果
                        accumulated_result = item

                if not accumulated_result:
                    raise Exception("未收到模型响应")

                # 提取结果
                accumulated_content = accumulated_result["accumulated_content"]
                accumulated_reasoning = accumulated_result.get("accumulated_reasoning", "")
                current_tool_calls = accumulated_result.get("tool_calls", [])
                iteration_usage = accumulated_result.get("api_usage")

                # 更新token使用量
                if iteration_usage:
                    node_token_usage["total_tokens"] += iteration_usage["total_tokens"]
                    node_token_usage["prompt_tokens"] += iteration_usage["prompt_tokens"]
                    node_token_usage["completion_tokens"] += iteration_usage["completion_tokens"]

                # 构建assistant消息
                assistant_msg = {"role": "assistant"}
                if accumulated_reasoning:
                    assistant_msg["reasoning_content"] = accumulated_reasoning
                assistant_msg["content"] = accumulated_content or ""
                if current_tool_calls:
                    assistant_msg["tool_calls"] = current_tool_calls

                round_messages.append(assistant_msg)
                current_messages.append(assistant_msg)

                # 如果没有工具调用，结束循环
                if not current_tool_calls:
                    assistant_final_output = accumulated_content
                    break

                # 执行工具调用
                for tool_call in current_tool_calls:
                    tool_name = tool_call["function"]["name"]

                    # 处理handoffs工具
                    if tool_name.startswith("transfer_to_"):
                        selected_node_name = tool_name[len("transfer_to_"):]
                        if selected_node_name in node.get("output_nodes", []):
                            has_handoffs = True
                            selected_node = selected_node_name
                            
                            # 更新handoffs状态
                            handoffs_limit = node.get("handoffs")
                            if handoffs_limit is not None:
                                handoffs_status = await self.conversation_manager.get_handoffs_status(
                                    conversation_id, node_name
                                )
                                current_count = handoffs_status.get("used_count", 0)
                                await self.conversation_manager.update_handoffs_status(
                                    conversation_id, node_name, handoffs_limit, 
                                    current_count + 1, selected_node
                                )
                            
                            tool_content = f"已选择节点: {selected_node_name}"
                        else:
                            tool_content = f"无效的节点选择: {selected_node_name}"
                    else:
                        # 执行普通工具
                        try:
                            tool_args = json.loads(tool_call["function"]["arguments"]) if tool_call["function"]["arguments"] else {}
                        except json.JSONDecodeError:
                            tool_args = {}

                        tool_result = await self.tool_executor.execute_tool_for_graph(
                            tool_name, tool_args, mcp_servers
                        )
                        tool_content = tool_result.get("content", "")

                        if tool_content and not tool_name.startswith("transfer_to_"):
                            tool_results_content.append(tool_content)

                    # 添加工具结果消息
                    tool_result_msg = {
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": tool_content
                    }
                    round_messages.append(tool_result_msg)
                    current_messages.append(tool_result_msg)

                    # 发送工具消息（如果是stream模式）
                    if yield_sse:
                        from app.utils.sse_helper import SSEHelper
                        yield SSEHelper.send_tool_message(tool_call["id"], tool_content)

                # 如果有handoffs，结束循环
                if has_handoffs:
                    assistant_final_output = accumulated_content
                    break

            # 5. 处理输出
            if output_enabled:
                final_output = assistant_final_output
            else:
                final_output = "\n".join(tool_results_content) if tool_results_content else ""

            # 6. 保存round数据
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

            from app.infrastructure.database.mongodb import mongodb_client
            await mongodb_client.add_round_to_graph_run(
                conversation_id=conversation_id,
                round_data=round_data,
                tools_schema=all_tools
            )

            # 7. 更新token使用量
            if node_token_usage["total_tokens"] > 0:
                await mongodb_client.update_conversation_token_usage(
                    conversation_id=conversation_id,
                    prompt_tokens=node_token_usage["prompt_tokens"],
                    completion_tokens=node_token_usage["completion_tokens"]
                )
                logger.info(f"节点 '{node_name}' token使用量: {node_token_usage}")

            # 8. 保存全局输出
            if output_enabled and final_output:
                await self.conversation_manager._add_global_output(
                    conversation_id, node_name, final_output
                )
            elif not output_enabled and tool_results_content:
                tool_output = "\n".join(tool_results_content)
                await self.conversation_manager._add_global_output(
                    conversation_id, node_name, tool_output
                )

            # 9. 保存节点输出到MinIO（如果需要）
            save_ext = node.get("save")
            if save_ext and final_output.strip():
                graph_name = conversation.get("graph_name", "unknown")
                user_id = conversation.get("user_id", "default_user")
                graph_run_storage.save_node_output(
                    graph_name=graph_name,
                    graph_run_id=conversation_id,
                    node_name=node_name,
                    content=final_output,
                    file_ext=save_ext,
                    user_id=user_id
                )

            # 10. 更新执行链
            from app.services.graph.execution_chain_manager import ExecutionChainManager
            await ExecutionChainManager.update_execution_chain(conversation)

            # 11. 保存会话文件
            await self.conversation_manager.update_conversation_file(conversation_id)

            # 返回执行结果
            yield {
                "success": True,
                "has_handoffs": has_handoffs,
                "selected_node": selected_node,
                "final_output": final_output
            }

        except Exception as e:
            logger.error(f"执行节点 '{node['name']}' 时出错: {str(e)}")
            if yield_sse:
                from app.utils.sse_helper import SSEHelper
                yield SSEHelper.send_error(str(e))
            raise

    async def _prepare_handoffs_tools(self, node: Dict[str, Any], 
                                     conversation_id: str,
                                     conversation: Dict[str, Any]) -> List[Dict]:
        """准备handoffs工具列表"""
        handoffs_limit = node.get("handoffs")
        handoffs_status = await self.conversation_manager.get_handoffs_status(
            conversation_id, node["name"]
        )
        current_handoffs_count = handoffs_status.get("used_count", 0)
        
        handoffs_enabled = handoffs_limit is not None and current_handoffs_count < handoffs_limit
        
        if handoffs_enabled:
            return HandoffsManager.create_handoffs_tools(node, conversation["graph_config"])
        return []

    async def _prepare_mcp_tools(self, mcp_servers: List[str]) -> List[Dict]:
        """准备MCP工具列表"""
        if not mcp_servers:
            return []
        
        from app.services.mcp_service import mcp_service
        return await mcp_service.prepare_chat_tools(mcp_servers)