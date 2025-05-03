import asyncio
import logging
from typing import Dict, List, Any, Optional, Set

logger = logging.getLogger(__name__)


class GraphExecutor:
    """图执行服务 - 处理图和节点的实际执行流程"""

    def __init__(self, conversation_manager, mcp_service):
        """
        初始化图执行器

        Args:
            conversation_manager: 会话管理器实例
            mcp_service: MCP服务实例
        """
        self.conversation_manager = conversation_manager
        self.mcp_service = mcp_service

    def _find_start_nodes(self, graph_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """查找图中的起始节点"""
        start_nodes = []

        for node in graph_config["nodes"]:
            if node.get("is_start", False) or "start" in node.get("input_nodes", []):
                start_nodes.append(node)

        return start_nodes

    def _find_next_nodes(self, current_node: Dict[str, Any], graph_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """查找当前节点的下一个节点"""
        next_nodes = []

        # 获取当前节点的输出节点名称
        output_nodes = current_node.get("output_nodes", [])

        # 如果包含"end"，则表示图执行结束
        if "end" in output_nodes:
            return []

        # 查找匹配的节点
        for node in graph_config["nodes"]:
            if node["name"] in output_nodes or current_node["name"] in node.get("input_nodes", []):
                next_nodes.append(node)

        return next_nodes

    def _create_agent_messages(self,
                               node: Dict[str, Any],
                               input_text: str) -> List[Dict[str, str]]:
        """创建Agent的消息列表"""
        messages = []

        # 创建系统提示词
        system_prompt = node.get("system_prompt", "")
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        # 添加用户提示词（如果有）
        user_prompt = node.get("user_prompt", "")
        if user_prompt:
            user_prompt = user_prompt + input_text
            messages.append({"role": "user", "content": user_prompt})
        else:
            messages.append({"role": "user", "content": input_text})
        return messages

    async def _execute_node(self,
                            node: Dict[str, Any],
                            input_text: str,
                            conversation_id: str,
                            model_service) -> Dict[str, Any]:
        """执行单个节点"""
        try:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                raise ValueError(f"找不到会话 '{conversation_id}'")

            # 创建消息
            messages = self._create_agent_messages(node, input_text)

            # 从节点获取模型信息
            model_name = node["model_name"]
            model_config = model_service.get_model(model_name)
            if not model_config:
                raise ValueError(f"找不到模型 '{model_name}'")

            # 提取MCP服务器列表
            mcp_servers = node.get("mcp_servers", [])
            output_enabled = node.get("output_enabled", True)

            # 调用MCP服务执行节点
            response = await self.mcp_service.execute_node(
                model_name=model_config["model"],
                api_key=model_config["api_key"],
                base_url=model_config["base_url"],
                messages=messages,
                mcp_servers=mcp_servers,
                output_enabled=output_enabled
            )

            # 检查执行状态
            if response.get("status") == "error":
                raise ValueError(response.get("error", "执行节点失败"))
            node_name = node["name"]
            result = {
                "node_name": node_name,
                "input": input_text,
                "output": str(response.get("content", "") or ""),
                "tool_calls": [],
                "tool_results": response.get("tool_calls", []),
                "_original_name": node.get("_original_name", node_name),
                "_node_path": node.get("_node_path", "")
            }

            # 更新会话状态
            if conversation:
                if "node_states" not in conversation:
                    conversation["node_states"] = {}
                conversation["node_states"][node["name"]] = {
                    "messages": messages,
                    "result": result
                }
                conversation["completed_nodes"].add(node["name"])
                if node["name"] in conversation["pending_nodes"]:
                    conversation["pending_nodes"].remove(node["name"])
                conversation["results"].append(result)

                # 增量更新会话文件
                self.conversation_manager.update_conversation_file(conversation_id)

            return result

        except Exception as e:
            logger.error(f"执行节点 '{node['name']}' 时出错: {str(e)}")
            # 创建错误结果
            error_result = {
                "node_name": node["name"],
                "input": input_text,
                "output": f"执行出错: {str(e)}",
                "tool_calls": [],
                "tool_results": [],
                "error": str(e),
                "_original_name": node.get("_original_name", node["name"]),
                "_node_path": node.get("_node_path", "")
            }

            # 更新会话状态
            if conversation:
                if "node_states" not in conversation:
                    conversation["node_states"] = {}
                conversation["node_states"][node["name"]] = {
                    "error": str(e)
                }
                conversation["completed_nodes"].add(node["name"])
                if node["name"] in conversation["pending_nodes"]:
                    conversation["pending_nodes"].remove(node["name"])
                conversation["results"].append(error_result)

                # 即使出错也更新会话文件
                self.conversation_manager.update_conversation_file(conversation_id)

            return error_result

    async def _execute_graph_step(self,
                                  conversation_id: str,
                                  input_text: str = None,
                                  model_service=None) -> Dict[str, Any]:
        """执行图的一个步骤"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"找不到会话 '{conversation_id}'")

        graph_config = conversation["graph_config"]

        # 如果是第一次执行，找到起始节点
        if not conversation["completed_nodes"] and not conversation["pending_nodes"]:
            start_nodes = self._find_start_nodes(graph_config)
            conversation["pending_nodes"] = set(node["name"] for node in start_nodes)

            # 记录用户输入
            conversation["results"].append({
                "is_start_input": True,
                "node_name": "start",
                "input": input_text,
                "output": "",
                "tool_calls": [],
                "tool_results": []
            })

            # 执行起始节点
            results = []
            for node in start_nodes:
                result = await self._execute_node(node, input_text, conversation_id, model_service)
                results.append(result)
            return {
                "conversation_id": conversation_id,
                "graph_name": conversation["graph_name"],
                "step_results": results,
                "is_complete": self.conversation_manager._is_graph_complete(conversation),
                "next_nodes": self.conversation_manager._get_next_pending_nodes(conversation)
            }

        # 获取下一批待执行的节点
        pending_nodes = set(self.conversation_manager._get_next_pending_nodes(conversation))
        if not pending_nodes:
            # 没有更多待执行的节点，执行结束
            return {
                "conversation_id": conversation_id,
                "graph_name": conversation["graph_name"],
                "step_results": [],
                "is_complete": True,
                "next_nodes": []
            }

        # 执行待执行的节点
        results = []
        for node_name in list(pending_nodes):
            # 找到节点配置
            node = None
            for n in graph_config["nodes"]:
                if n["name"] == node_name:
                    node = n
                    break

            if not node:
                logger.error(f"找不到节点 '{node_name}'")
                continue

            # 确定节点的输入
            node_input = self._get_node_input(node, conversation)

            # 执行节点
            result = await self._execute_node(node, node_input, conversation_id, model_service)
            results.append(result)

        return {
            "conversation_id": conversation_id,
            "graph_name": conversation["graph_name"],
            "step_results": results,
            "is_complete": self.conversation_manager._is_graph_complete(conversation),
            "next_nodes": self.conversation_manager._get_next_pending_nodes(conversation)
        }

    def _get_node_input(self, node: Dict[str, Any], conversation: Dict[str, Any]) -> str:
        """根据节点的输入节点计算输入内容"""
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
                # 直接检查节点状态，不再特殊处理子图引用
                if input_node_name in conversation["node_states"]:
                    node_state = conversation["node_states"][input_node_name]
                    if "result" in node_state:
                        inputs.append(node_state["result"]["output"])

        # 合并所有输入
        return "\n\n".join(inputs)

    async def execute_graph(self,
                            graph_name: str,
                            original_config: Dict[str, Any],
                            flattened_config: Dict[str, Any],
                            input_text: str,
                            parallel: bool = False,
                            model_service=None) -> Dict[str, Any]:
        """执行整个图并返回结果"""
        # 创建会话
        conversation_id = self.conversation_manager.create_conversation_with_config(graph_name, flattened_config)

        # 保存原始配置和并行执行设置
        conversation = self.conversation_manager.get_conversation(conversation_id)
        conversation["original_config"] = original_config
        conversation["parallel"] = parallel

        # 记录展开信息
        logger.info(
            f"图 '{graph_name}' 已展开: {len(original_config.get('nodes', []))} 个原始节点 -> {len(flattened_config.get('nodes', []))} 个展开节点")

        # 执行图
        if parallel:
            await self._execute_graph_parallel(conversation_id, input_text, model_service)
        else:
            # 顺序执行
            # 执行第一步（起始节点）
            step_result = await self._execute_graph_step(conversation_id, input_text, model_service)

            # 继续执行，直到完成
            while not step_result["is_complete"]:
                step_result = await self._execute_graph_step(conversation_id, None, model_service)

        # 获取最终输出
        conversation = self.conversation_manager.get_conversation(conversation_id)
        final_output = self.conversation_manager._get_final_output(conversation)

        # 创建结果对象
        result = {
            "conversation_id": conversation_id,
            "graph_name": graph_name,
            "input": input_text,
            "output": final_output,
            "node_results": self.conversation_manager._restructure_results(conversation),
            "completed": True
        }

        return result

    async def continue_conversation(self,
                                    conversation_id: str,
                                    input_text: str = None,
                                    parallel: bool = False,
                                    model_service=None,
                                    continue_from_checkpoint: bool = False) -> Dict[str, Any]:
        """继续现有会话"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"找不到会话 '{conversation_id}'")

        # 获取图配置和名称
        original_config = conversation.get("original_config")
        graph_config = conversation.get("graph_config")
        graph_name = conversation.get("graph_name")

        # 如果是从断点继续而不是提供新输入
        if continue_from_checkpoint:
            logger.info(f"从断点继续会话 {conversation_id}")

            # 保留原有的节点状态和结果，只重新计算待执行节点
            previous_results = conversation.get("results", [])
            completed_nodes = conversation.get("completed_nodes", set())
            node_states = conversation.get("node_states", {})

            # 重新计算待执行节点
            conversation["pending_nodes"] = set()
            for node in graph_config.get("nodes", []):
                # 跳过已完成的节点
                if node["name"] in completed_nodes:
                    continue

                # 检查输入节点是否都已完成
                input_nodes = node.get("input_nodes", [])
                all_inputs_ready = True

                for input_node in input_nodes:
                    if input_node == "start":
                        continue
                    if input_node not in completed_nodes:
                        all_inputs_ready = False
                        break

                if all_inputs_ready:
                    conversation["pending_nodes"].add(node["name"])

            logger.info(f"重新计算待执行节点：{conversation['pending_nodes']}")
        else:
            # 提供了新输入，需要重置会话状态，保留图配置和以前的结果
            previous_results = conversation.get("results", [])

            # 重新创建会话
            self.conversation_manager.active_conversations[conversation_id] = {
                "graph_name": graph_name,
                "graph_config": graph_config,
                "original_config": original_config,
                "node_states": {},
                "pending_nodes": set(),
                "completed_nodes": set(),
                "results": [r for r in previous_results if r.get("is_start_input", False)],
                "parallel": parallel
            }

            # 添加新的用户输入
            conversation = self.conversation_manager.get_conversation(conversation_id)
            if input_text:
                conversation["results"].append({
                    "is_start_input": True,
                    "node_name": "user_input",
                    "input": input_text,
                    "output": "",
                    "tool_calls": [],
                    "tool_results": []
                })

        # 检查是否还有待执行的节点
        if not conversation["pending_nodes"]:
            # 无待执行节点，返回当前状态
            final_output = self.conversation_manager._get_final_output(conversation)
            return {
                "conversation_id": conversation_id,
                "graph_name": graph_name,
                "input": input_text or "",
                "output": final_output,
                "node_results": self.conversation_manager._restructure_results(conversation),
                "completed": True
            }

        # 执行图
        if parallel:
            await self._execute_graph_parallel(conversation_id, input_text if not continue_from_checkpoint else None,
                                               model_service)
        else:
            # 用新输入执行第一步，或者如果是从断点继续则不需要新输入
            if not continue_from_checkpoint and input_text:
                step_result = await self._execute_graph_step(conversation_id, input_text, model_service)
            else:
                step_result = await self._execute_graph_step(conversation_id, None, model_service)

            # 继续执行，直到完成
            while not step_result["is_complete"]:
                step_result = await self._execute_graph_step(conversation_id, None, model_service)

        # 获取最终输出
        conversation = self.conversation_manager.get_conversation(conversation_id)
        final_output = self.conversation_manager._get_final_output(conversation)

        # 创建结果对象
        result = {
            "conversation_id": conversation_id,
            "graph_name": graph_name,
            "input": input_text or "",
            "output": final_output,
            "node_results": self.conversation_manager._restructure_results(conversation),
            "completed": True
        }

        return result

    async def _execute_graph_parallel(self, conversation_id: str, input_text: str = None, model_service=None):
        """并行执行图"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"找不到会话 '{conversation_id}'")

        graph_config = conversation["graph_config"]

        # 记录用户输入
        if input_text is not None:
            conversation["results"].append({
                "is_start_input": True,
                "node_name": "start",
                "input": input_text,
                "output": "",
                "tool_calls": [],
                "tool_results": []
            })

        # 获取图中的最大层级
        max_level = 0
        for node in graph_config.get("nodes", []):
            level = node.get("level", 0)
            max_level = max(max_level, level)

        # 按层级依次执行
        for current_level in range(max_level + 1):
            logger.info(f"开始执行层级 {current_level} 的节点")

            # 找出当前层级的所有可执行节点
            executable_nodes = []
            for node in graph_config.get("nodes", []):
                if node.get("level", 0) == current_level:
                    # 检查节点是否可执行（所有依赖都已完成）
                    can_execute = True

                    for input_node_name in node.get("input_nodes", []):
                        if input_node_name != "start" and input_node_name not in conversation["completed_nodes"]:
                            can_execute = False
                            break

                    if can_execute:
                        executable_nodes.append(node)

            # 并行执行当前层级的节点
            tasks = []
            for node in executable_nodes:
                node_input = self._get_node_input(node, conversation)
                tasks.append(self._execute_node(node, node_input, conversation_id, model_service))

            # 等待所有任务完成
            if tasks:
                await asyncio.gather(*tasks)
