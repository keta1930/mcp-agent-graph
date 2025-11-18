"""节点执行核心类 - 提供图节点执行的核心逻辑"""
import json
import logging
import copy
from typing import Dict, List, Any, AsyncGenerator
from app.services.model.model_service import model_service
from app.services.graph.handoffs_manager import HandoffsManager
from app.services.agent.agent_stream_executor import AgentStreamExecutor

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
        self.agent_stream_executor = AgentStreamExecutor()

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

            output_enabled = node.get("output_enabled", True)

            # 2. 加载有效配置（智能合并 Agent 配置和 Node 配置）
            effective_config = await self.agent_stream_executor._load_effective_config(
                agent_name=node.get("agent_name"),
                user_id=actual_user_id,
                model_name=node.get("model_name"),
                system_prompt=node.get("system_prompt"),
                mcp_servers=node.get("mcp_servers"),
                system_tools=node.get("system_tools"),
                max_iterations=node.get("max_iterations")
            )

            if not effective_config:
                raise Exception(f"无法加载节点 '{node_name}' 的有效配置")

            # 使用合并后的配置
            agent_name = effective_config["agent_name"]
            model_name = effective_config["model_name"]
            mcp_servers = effective_config["mcp_servers"]
            system_tools = effective_config["system_tools"]
            max_iterations = effective_config["max_iterations"]

            # 3. 创建消息列表
            node_copy = copy.deepcopy(node)
            node_copy["_conversation_id"] = conversation_id
            conversation_messages = await self.message_creator.create_agent_messages(node_copy)

            # 4. 准备工具列表
            handoffs_tools = await self._prepare_handoffs_tools(
                node, conversation_id, conversation
            )
            mcp_tools = await self._prepare_mcp_tools(mcp_servers)
            
            # 准备系统工具
            system_tools_list = []
            if system_tools:
                from app.services.system_tools import get_system_tools_by_names
                system_tools_list = get_system_tools_by_names(system_tools)
            
            all_tools = handoffs_tools + mcp_tools + system_tools_list

            # 5. 调用 AgentStreamExecutor 执行节点
            round_messages = []
            node_token_usage = {
                "total_tokens": 0,
                "prompt_tokens": 0,
                "completion_tokens": 0
            }
            has_handoffs = False
            selected_node = None
            assistant_final_output = ""
            tool_results_content = []

            # 调用 Agent 执行器
            async for item in self.agent_stream_executor.run_agent_loop(
                agent_name=agent_name,
                model_name=model_name,
                messages=conversation_messages,
                tools=all_tools,
                mcp_servers=mcp_servers,
                max_iterations=max_iterations,
                user_id=actual_user_id,
                conversation_id=conversation_id,
                task_id=None,
                is_graph_node=True
            ):
                if isinstance(item, str):
                    # SSE 事件，直接转发
                    if yield_sse:
                        yield item
                else:
                    # 结果字典
                    round_messages = item.get("round_messages", [])
                    node_token_usage = item.get("round_token_usage", {})

            # 6. 检查是否有 handoffs 选择
            for msg in round_messages:
                if msg.get("role") == "assistant" and msg.get("tool_calls"):
                    for tool_call in msg["tool_calls"]:
                        tool_name = tool_call["function"]["name"]
                        if tool_name.startswith("transfer_to_"):
                            selected_node_name = tool_name[len("transfer_to_"):]
                            if selected_node_name in node.get("output_nodes", []):
                                has_handoffs = True
                                selected_node = selected_node_name
                                
                                # 更新 handoffs 状态
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
                                break
                    if has_handoffs:
                        break

            # 7. 提取最终输出
            for msg in round_messages:
                if msg.get("role") == "assistant":
                    assistant_final_output = msg.get("content", "")
                elif msg.get("role") == "tool" and not msg.get("content", "").startswith("已选择节点:"):
                    tool_content = msg.get("content", "")
                    if tool_content:
                        tool_results_content.append(tool_content)

            # 8. 处理输出
            if output_enabled:
                final_output = assistant_final_output
            else:
                final_output = "\n".join(tool_results_content) if tool_results_content else ""

            # 9. 保存round数据
            round_data = {
                "round": current_round,
                "node_name": node_name,
                "agent_name": agent_name,
                "level": node_level,
                "output_enabled": output_enabled,
                "messages": round_messages,
                "model": model_name,
                "prompt_tokens": node_token_usage.get("prompt_tokens", 0),
                "completion_tokens": node_token_usage.get("completion_tokens", 0)
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

            # 10. 更新token使用量
            if node_token_usage["total_tokens"] > 0:
                await mongodb_client.conversation_repository.update_conversation_token_usage(
                    conversation_id=conversation_id,
                    prompt_tokens=node_token_usage["prompt_tokens"],
                    completion_tokens=node_token_usage["completion_tokens"]
                )
                logger.info(f"节点 '{node_name}' token使用量: {node_token_usage}")

            # 11. 保存全局输出
            if output_enabled and final_output:
                await self.conversation_manager._add_global_output(
                    conversation_id, node_name, final_output
                )
            elif not output_enabled and tool_results_content:
                tool_output = "\n".join(tool_results_content)
                await self.conversation_manager._add_global_output(
                    conversation_id, node_name, tool_output
                )

            # 12. 更新执行链
            from app.services.graph.execution_chain_manager import ExecutionChainManager
            await ExecutionChainManager.update_execution_chain(conversation)

            # 13. 保存会话文件
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
        
        from app.services.mcp.mcp_service import mcp_service
        return await mcp_service.prepare_chat_tools(mcp_servers)