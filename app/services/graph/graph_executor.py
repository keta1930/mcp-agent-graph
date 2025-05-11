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
                               input_text: str,
                               node_outputs: Dict[str, str] = None) -> List[Dict[str, str]]:
        """
        创建Agent的消息列表，支持在提示词中使用{node_name}格式的占位符
        """
        messages = []

        # 如果没有提供节点输出映射，则使用空字典
        if node_outputs is None:
            node_outputs = {}

        # 跟踪已使用的输入节点
        used_input_nodes = set()

        # 处理系统提示词
        system_prompt = node.get("system_prompt", "")
        if system_prompt:
            # 查找并替换占位符
            for node_name, output in node_outputs.items():
                placeholder = "{" + node_name + "}"
                if placeholder in system_prompt:
                    system_prompt = system_prompt.replace(placeholder, output)
                    used_input_nodes.add(node_name)

            messages.append({"role": "system", "content": system_prompt})

        # 处理用户提示词
        user_prompt = node.get("user_prompt", "")
        if user_prompt:
            # 查找并替换占位符
            for node_name, output in node_outputs.items():
                placeholder = "{" + node_name + "}"
                if placeholder in user_prompt:
                    user_prompt = user_prompt.replace(placeholder, output)
                    used_input_nodes.add(node_name)

            # 收集未使用的输入内容
            unused_inputs = []
            for node_name, output in node_outputs.items():
                if node_name not in used_input_nodes and output.strip():
                    unused_inputs.append(output)

            # 如果存在未使用的输入内容，附加到用户提示词末尾
            if unused_inputs and (user_prompt.strip() or not used_input_nodes):
                # 确保有分隔符
                if user_prompt and not user_prompt.endswith("\n"):
                    user_prompt += "\n\n"
                user_prompt += "\n\n".join(unused_inputs)

            messages.append({"role": "user", "content": user_prompt})
        else:
            # 如果没有设置用户提示词，直接使用input_text
            messages.append({"role": "user", "content": input_text})

        return messages

    async def _execute_node(self,
                            node: Dict[str, Any],
                            input_text: str,
                            conversation_id: str,
                            model_service) -> Dict[str, Any]:
        """执行单个节点 - 支持真正的循环执行"""
        try:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                raise ValueError(f"找不到会话 '{conversation_id}'")

            # 获取节点的handoffs参数和当前使用次数
            handoffs_limit = node.get("handoffs")
            node_name = node["name"]

            # 初始化handoffs计数器（如果不存在）
            if "handoffs_counters" not in conversation:
                conversation["handoffs_counters"] = {}

            # 检查是否还可以使用handoffs
            handoffs_enabled = False
            if handoffs_limit is not None:
                current_count = conversation["handoffs_counters"].get(node_name, 0)
                # 只有当前使用次数小于限制时，才启用handoffs
                handoffs_enabled = current_count < handoffs_limit
                logger.info(
                    f"节点 '{node_name}' 的handoffs状态: {current_count}/{handoffs_limit}, 已启用={handoffs_enabled}")

            # 准备节点输入 - 获取当前路径上已执行节点的输出
            node_outputs = self._get_node_outputs_for_inputs(node, conversation)

            # 创建消息
            messages = self._create_agent_messages(node, input_text, node_outputs)

            # 从节点获取模型信息
            model_name = node["model_name"]
            model_config = model_service.get_model(model_name)
            if not model_config:
                raise ValueError(f"找不到模型 '{model_name}'")

            # 提取MCP服务器列表
            mcp_servers = node.get("mcp_servers", [])
            output_enabled = node.get("output_enabled", True)

            # 创建handoffs工具（如果启用）
            handoffs_tools = []
            if handoffs_enabled:
                handoffs_tools = self._create_handoffs_tools(node, conversation["graph_config"])

            # 执行节点 - 根据是否有mcp_servers决定调用方式
            if mcp_servers:
                # 如果有MCP服务器，使用mcp_service执行
                response = await self.mcp_service.execute_node(
                    model_name=model_config["model"],
                    api_key=model_config["api_key"],
                    base_url=model_config["base_url"],
                    messages=messages,
                    mcp_servers=mcp_servers,
                    output_enabled=output_enabled
                )
            else:
                # 如果没有MCP服务器，直接使用model_service执行
                logger.info(f"节点 '{node_name}' 没有MCP服务器，使用model_service直接执行")
                response = await model_service.call_model(
                    model_name=model_name,
                    messages=messages,
                    tools=handoffs_tools if handoffs_tools else None
                )

            # 检查执行状态
            if response.get("status") == "error":
                raise ValueError(response.get("error", "执行节点失败"))

            # 处理工具调用和handoffs选择
            original_tool_calls = response.get("tool_calls", [])
            selected_handoff = None

            # 查找handoffs选择
            for tool_call in original_tool_calls:
                tool_name = tool_call.get("tool_name", "")
                if tool_name.startswith("transfer_to_"):
                    selected_node = tool_name[len("transfer_to_"):]
                    if selected_node in node.get("output_nodes", []):
                        selected_handoff = selected_node

                        # 如果选择了handoffs，增加计数器
                        if handoffs_enabled:
                            current_count = conversation["handoffs_counters"].get(node_name, 0)
                            conversation["handoffs_counters"][node_name] = current_count + 1
                            logger.info(
                                f"节点 '{node_name}' 的handoffs计数更新为: {current_count + 1}/{handoffs_limit}")

                        break

            output_content = str(response.get("content", "") or "")

            # 简单检查节点是否配置了handoffs参数，无需考虑计数状态
            if node.get("handoffs") is not None:
                logger.info(f"节点 '{node_name}' 配置了handoffs参数，将输出设为空字符串")
                output_content = ""
            # 创建结果对象
            result = {
                "node_name": node_name,
                "input": input_text,
                "output": output_content,
                "tool_calls": original_tool_calls,
                "tool_results": response.get("tool_results", []),
                "_original_name": node.get("_original_name", node_name),
                "_node_path": node.get("_node_path", ""),
                "_selected_handoff": selected_handoff
            }

            # 处理全局输出存储
            if node.get("global_output", False) and output_enabled and result["output"]:
                logger.info(f"将节点 '{node_name}' 的输出添加到全局管理")
                self.conversation_manager._add_global_output(
                    conversation_id,
                    node_name,
                    result["output"]
                )

            # 更新节点状态
            if "node_states" not in conversation:
                conversation["node_states"] = {}
            conversation["node_states"][node["name"]] = {
                "messages": messages,
                "result": result
            }

            conversation["results"].append(result)

            return result

        except Exception as e:
            logger.error(f"执行节点 '{node['name']}' 时出错: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())

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
                conversation["results"].append(error_result)

            return error_result

    def _get_node_outputs_for_inputs(self, node: Dict[str, Any], conversation: Dict[str, Any]) -> Dict[str, str]:
        """获取节点输入所需的所有输出结果 - 支持真正的循环执行"""
        node_outputs = {}

        # 处理所有输入节点
        for input_node_name in node.get("input_nodes", []):
            if input_node_name == "start":
                # 获取最新的用户输入
                for result in reversed(conversation["results"]):
                    if result.get("is_start_input", False):
                        node_outputs["start"] = result["input"]
                        break
            else:
                # 获取输入节点的最新结果
                for result in reversed(conversation["results"]):
                    if (not result.get("is_start_input", False) and
                            result.get("node_name") == input_node_name):
                        # 找到了输入节点的最新结果
                        node_outputs[input_node_name] = result["output"]
                        break

        # 处理全局输出内容作为上下文
        context_nodes = node.get("context", [])
        if context_nodes:
            context_mode = node.get("context_mode", "all")
            context_n = node.get("context_n", 1)

            for context_node_name in context_nodes:
                global_outputs = self.conversation_manager._get_global_outputs(
                    conversation["conversation_id"],
                    context_node_name,
                    context_mode,
                    context_n
                )

                if global_outputs:
                    # 合并全局输出内容
                    node_outputs[context_node_name] = "\n\n".join(global_outputs)

        return node_outputs

    async def _execute_graph_step(self,
                                  conversation_id: str,
                                  input_text: str = None,
                                  model_service=None) -> Dict[str, Any]:
        """执行图的一个步骤 - 支持真正的循环执行"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"找不到会话 '{conversation_id}'")

        graph_config = conversation["graph_config"]

        # 初始化执行状态，跟踪当前执行路径而非"完成"状态
        if "current_path" not in conversation:
            conversation["current_path"] = []

        # 如果是第一次执行，找到起始节点
        if not conversation["pending_nodes"] and not conversation["current_path"]:
            start_nodes = self._find_start_nodes(graph_config)

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
                # 记录执行路径
                conversation["current_path"].append(node["name"])

            return {
                "conversation_id": conversation_id,
                "graph_name": conversation["graph_name"],
                "step_results": results,
                "is_complete": self.conversation_manager._is_graph_complete(conversation),
                "next_nodes": conversation["pending_nodes"]
            }

        # 检查是否有handoffs选择
        handoff_node = None
        last_result = None
        for result in reversed(conversation["results"]):
            if not result.get("is_start_input", False):
                last_result = result
                if "_selected_handoff" in result and result["_selected_handoff"]:
                    handoff_node = result["_selected_handoff"]
                    # 清除选择标记，防止重复处理
                    result["_selected_handoff"] = None
                    break

        # 确定下一步执行的节点
        if handoff_node:
            logger.info(f"处理handoffs选择: 执行节点 '{handoff_node}'")

            # 查找选择的节点
            target_node = None
            for node in graph_config["nodes"]:
                if node["name"] == handoff_node:
                    target_node = node
                    break

            if target_node:
                # 重置执行路径，从handoff目标节点开始新的路径
                # 这是实现真正循环的关键 - 不再考虑节点是否"完成"，而是创建新的执行路径
                conversation["current_path"] = []
                conversation["pending_nodes"] = {handoff_node}
            else:
                logger.error(f"找不到选择的节点: {handoff_node}")
                # 如果找不到节点，尝试获取下一批节点
                conversation["pending_nodes"] = self._get_next_nodes(conversation)
        else:
            # 正常流程：根据当前路径获取下一批节点
            conversation["pending_nodes"] = self._get_next_nodes(conversation)

        # 如果没有待执行节点，执行结束
        if not conversation["pending_nodes"]:
            logger.info("没有更多待执行的节点，执行结束")
            return {
                "conversation_id": conversation_id,
                "graph_name": conversation["graph_name"],
                "step_results": [],
                "is_complete": True,
                "next_nodes": []
            }

        # 执行待执行的节点
        results = []
        for node_name in list(conversation["pending_nodes"]):
            # 找到节点配置
            node = None
            for n in graph_config["nodes"]:
                if n["name"] == node_name:
                    node = n
                    break

            if not node:
                logger.error(f"找不到节点 '{node_name}'")
                conversation["pending_nodes"].remove(node_name)
                continue

            # 检查节点的handoffs是否已达到限制
            handoffs_limit = node.get("handoffs")
            if handoffs_limit is not None:
                current_count = conversation.get("handoffs_counters", {}).get(node_name, 0)
                if current_count >= handoffs_limit:
                    logger.info(f"节点 '{node_name}' 的handoffs已达到限制 ({current_count}/{handoffs_limit})，跳过执行")

                    # 创建一个空结果以保持记录完整性
                    empty_result = {
                        "node_name": node_name,
                        "input": self._get_node_input(node, conversation),  # 获取正确的输入以供记录
                        "output": "",  # 输出始终为空
                        "tool_calls": [],
                        "tool_results": [],
                        "_original_name": node.get("_original_name", node_name),
                        "_node_path": node.get("_node_path", ""),
                        "_selected_handoff": None,
                        "_skipped_due_to_handoffs_limit": True  # 标记为因handoffs限制而跳过
                    }
                    results.append(empty_result)
                    conversation["results"].append(empty_result)

                    # 记录此节点到当前执行路径
                    conversation["current_path"].append(node["name"])

                    # 从待处理节点中移除
                    conversation["pending_nodes"].remove(node["name"])

                    # 找出该节点的下游节点并添加到待处理队列
                    current_level = node.get("level", 0)
                    next_level_nodes = []

                    # 找出下一级别的节点
                    for n in graph_config["nodes"]:
                        if n.get("level", 0) == current_level + 1:
                            next_level_nodes.append(n)

                    if next_level_nodes:
                        for next_node in next_level_nodes:
                            conversation["pending_nodes"].add(next_node["name"])
                            logger.info(f"添加跳过节点 '{node_name}' 的下一级别节点 '{next_node['name']}' 到待处理队列")
                    else:
                        # 如果没有下一级别的节点，回退到使用下游节点
                        logger.info(f"节点 '{node_name}' 没有下一级别的节点，尝试查找直接下游节点")
                        downstream_nodes = self._find_next_nodes(node, graph_config)
                        for downstream_node in downstream_nodes:
                            conversation["pending_nodes"].add(downstream_node["name"])
                            logger.info(
                                f"添加跳过节点 '{node_name}' 的下游节点 '{downstream_node['name']}' 到待处理队列")

                    continue

            # 确定节点的输入
            node_input = self._get_node_input(node, conversation)

            # 执行节点
            result = await self._execute_node(node, node_input, conversation_id, model_service)
            results.append(result)

            # 记录此节点到当前执行路径
            conversation["current_path"].append(node["name"])

            # 从待处理节点中移除
            conversation["pending_nodes"].remove(node["name"])

        # 保存最新状态
        self.conversation_manager.update_conversation_file(conversation_id)

        return {
            "conversation_id": conversation_id,
            "graph_name": conversation["graph_name"],
            "step_results": results,
            "is_complete": self.conversation_manager._is_graph_complete(conversation),
            "next_nodes": conversation["pending_nodes"]
        }

    def _get_next_nodes(self, conversation: Dict[str, Any]) -> Set[str]:
        """获取下一批要执行的节点 - 支持真正的循环执行"""
        graph_config = conversation["graph_config"]
        current_path = conversation.get("current_path", [])
        executed_nodes = set(conversation.get("current_path", []))
        # 如果已有待执行的节点，直接返回
        if conversation["pending_nodes"]:
            return conversation["pending_nodes"]

        # 如果没有当前路径，找起始节点
        if not current_path:
            start_nodes = set()
            for node in graph_config["nodes"]:
                if node.get("is_start", False) or "start" in node.get("input_nodes", []):
                    start_nodes.add(node["name"])
            return start_nodes

        # 获取当前路径上的最后一个节点
        last_node_name = current_path[-1] if current_path else None
        if not last_node_name:
            return set()

        # 找到最后一个节点
        last_node = None
        for node in graph_config["nodes"]:
            if node["name"] == last_node_name:
                last_node = node
                break

        if not last_node:
            logger.error(f"找不到当前路径上的最后一个节点: {last_node_name}")
            return set()

        # 找出所有以最后一个节点为输入的下一层节点
        next_nodes = set()

        # 1. 获取最后一个节点的直接输出节点
        for output_node_name in last_node.get("output_nodes", []):
            if output_node_name != "end":  # 排除结束标记
                next_nodes.add(output_node_name)

        # 2. 获取将最后一个节点作为输入的其他节点
        for node in graph_config["nodes"]:
            if last_node_name in node.get("input_nodes", []):
                next_nodes.add(node["name"])

        # 排除终止节点
        return {node_name for node_name in next_nodes if node_name not in executed_nodes}

    def _get_node_input(self, node: Dict[str, Any], conversation: Dict[str, Any]) -> str:
        """根据节点的输入节点计算输入内容，包括全局输出内容"""
        # 收集常规输入节点的输出
        input_nodes = node.get("input_nodes", [])
        inputs = []

        # 处理常规输入
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

        # 处理全局输出内容
        context_nodes = node.get("context", [])
        if context_nodes:
            context_mode = node.get("context_mode", "all")
            context_n = node.get("context_n", 1)

            for context_node_name in context_nodes:
                global_outputs = self.conversation_manager._get_global_outputs(
                    conversation["conversation_id"],
                    context_node_name,
                    context_mode,
                    context_n
                )

                if global_outputs:
                    # 在提示中使用节点名称作为前缀，便于替换
                    context_content = f"{{{context_node_name}}}: " + "\n\n".join(global_outputs)
                    inputs.append(context_content)
                    logger.info(
                        f"为节点 '{node['name']}' 添加了 '{context_node_name}' 的全局输出内容，模式: {context_mode}, n: {context_n}")

        # 合并所有输入
        return "\n\n".join(inputs)

    def _create_handoffs_tools(self, node: Dict[str, Any], graph_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """为handoffs节点创建工具选择列表"""
        tools = []

        for output_node_name in node.get("output_nodes", []):
            # 跳过"end"节点
            if output_node_name == "end":
                continue

            # 查找对应的节点
            target_node = None
            for n in graph_config["nodes"]:
                if n["name"] == output_node_name:
                    target_node = n
                    break

            if not target_node:
                continue

            # 获取节点描述
            node_description = target_node.get("description", "")
            tool_description = f"Handoff to the {output_node_name} {node_description}"

            # 创建工具
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

    async def execute_graph(self,
                            graph_name: str,
                            original_config: Dict[str, Any],
                            flattened_config: Dict[str, Any],
                            input_text: str,
                            parallel: bool = False,
                            model_service=None) -> Dict[str, Any]:
        """执行整个图并返回结果 - 支持真正的循环执行"""
        # 创建会话
        conversation_id = self.conversation_manager.create_conversation_with_config(graph_name, flattened_config)

        # 初始化会话状态
        conversation = self.conversation_manager.get_conversation(conversation_id)
        conversation["original_config"] = original_config
        conversation["parallel"] = parallel
        conversation["current_path"] = []  # 初始化执行路径

        # 记录展开信息
        logger.info(
            f"图 '{graph_name}' 已展开: {len(original_config.get('nodes', []))} 个原始节点 -> {len(flattened_config.get('nodes', []))} 个展开节点")

        # 执行图
        if parallel:
            await self._execute_graph_parallel(conversation_id, input_text, model_service)
        else:
            # 顺序执行
            step_result = await self._execute_graph_step(conversation_id, input_text, model_service)
            while not step_result["is_complete"]:
                step_result = await self._execute_graph_step(conversation_id, None, model_service)
                # 每步执行后更新会话文件
                self.conversation_manager.update_conversation_file(conversation_id)

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
        """继续现有会话 - 支持真正的循环执行"""
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

            # 如果有未处理的handoffs选择，优先处理
            handoff_node = None
            for result in reversed(conversation.get("results", [])):
                if not result.get("is_start_input", False) and result.get("_selected_handoff"):
                    handoff_node = result["_selected_handoff"]
                    # 找到有效的节点
                    target_node = None
                    for node in graph_config["nodes"]:
                        if node["name"] == handoff_node:
                            target_node = node
                            break

                    if target_node:
                        # 清除选择标记，设置待处理节点
                        result["_selected_handoff"] = None
                        conversation["pending_nodes"] = {handoff_node}
                        logger.info(f"从断点继续时处理未完成的handoffs选择: {handoff_node}")
                    break

            # 如果没有未处理的handoffs选择，检查是否需要继续执行
            if not handoff_node and not conversation["pending_nodes"]:
                # 根据当前执行路径计算下一批节点
                conversation["pending_nodes"] = self._get_next_nodes(conversation)
                logger.info(f"从断点继续，找到待处理节点: {conversation['pending_nodes']}")

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
                "current_path": [],  # 重置执行路径
                "results": [r for r in previous_results if r.get("is_start_input", False)],
                "parallel": parallel,
                "handoffs_counters": conversation.get("handoffs_counters", {}),  # 保留handoffs计数
                "global_outputs": conversation.get("global_outputs", {})  # 保留全局输出
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

                # 从起始节点开始执行
                start_nodes = self._find_start_nodes(graph_config)
                conversation["pending_nodes"] = set(node["name"] for node in start_nodes)
                logger.info(f"新输入，从起始节点开始执行: {conversation['pending_nodes']}")

        # 检查是否还有待执行的节点
        if not conversation["pending_nodes"] and self.conversation_manager._is_graph_complete(conversation):
            # 无待执行节点且图已完成，返回当前状态
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
            # 顺序执行
            if not continue_from_checkpoint and input_text:
                step_result = await self._execute_graph_step(conversation_id, input_text, model_service)
            else:
                step_result = await self._execute_graph_step(conversation_id, None, model_service)

            # 继续执行，直到完成
            while not step_result["is_complete"]:
                # 在每次执行步骤后保存会话状态
                self.conversation_manager.update_conversation_file(conversation_id)
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
        """并行执行图 - 支持真正的循环执行"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"找不到会话 '{conversation_id}'")

        graph_config = conversation["graph_config"]

        # 记录用户输入，只有当不是断点续传时才添加
        if input_text is not None:
            conversation["results"].append({
                "is_start_input": True,
                "node_name": "start",
                "input": input_text,
                "output": "",
                "tool_calls": [],
                "tool_results": []
            })

        # 初始化执行路径
        if "current_path" not in conversation:
            conversation["current_path"] = []

        # 如果没有待处理节点，找到起始节点
        if not conversation["pending_nodes"] and not conversation["current_path"]:
            start_nodes = self._find_start_nodes(graph_config)
            conversation["pending_nodes"] = set(node["name"] for node in start_nodes)
            logger.info(f"首次执行，起始节点: {conversation['pending_nodes']}")

        # 获取图中的最大层级，用于分批执行
        max_level = 0
        for node in graph_config.get("nodes", []):
            level = node.get("level", 0)
            max_level = max(max_level, level)

        # 循环执行，直到没有节点可执行
        while conversation["pending_nodes"]:
            # 检查是否有handoffs选择
            handoff_node = None
            for result in reversed(conversation.get("results", [])):
                if not result.get("is_start_input", False) and result.get("_selected_handoff"):
                    handoff_node = result["_selected_handoff"]
                    result["_selected_handoff"] = None  # 清除选择，防止重复处理
                    break

            # 如果有handoffs选择，优先处理它
            if handoff_node:
                logger.info(f"优先处理handoffs选择: 目标节点 '{handoff_node}'")

                # 查找选择的节点
                target_node = None
                for node in graph_config["nodes"]:
                    if node["name"] == handoff_node:
                        target_node = node
                        break

                if target_node:
                    # 重置执行路径，从handoff目标节点开始新的路径
                    conversation["current_path"] = []
                    conversation["pending_nodes"] = {handoff_node}
                    logger.info(f"handoffs选择生效：只处理节点 '{handoff_node}'")
                else:
                    logger.error(f"找不到选择的节点: {handoff_node}")
                    # 如果找不到节点，继续正常执行流程

            # 按层级依次执行
            executed_any_node = False
            for current_level in range(max_level + 1):
                logger.info(f"开始执行层级 {current_level} 的节点")

                # 找出当前层级的可执行节点（在pending_nodes中且所有依赖已就绪）
                executable_nodes = []
                for node in graph_config.get("nodes", []):
                    # 只考虑当前层级的节点
                    if node.get("level", 0) != current_level:
                        continue

                    # 只处理pending_nodes中的节点
                    if node["name"] not in conversation["pending_nodes"]:
                        continue

                    # 检查输入是否可用
                    can_execute = True
                    for input_node_name in node.get("input_nodes", []):
                        if input_node_name == "start":
                            continue  # 起始输入始终可用

                        # 检查是否有此输入节点的结果
                        input_found = False
                        for result in conversation["results"]:
                            if result.get("node_name") == input_node_name:
                                input_found = True
                                break

                        if not input_found:
                            can_execute = False
                            logger.info(f"节点 '{node['name']}' 输入节点 '{input_node_name}' 未就绪，无法执行")
                            break

                    if can_execute:
                        logger.info(f"添加待执行节点: {node['name']}")
                        executable_nodes.append(node)

                # 如果没有可执行节点，跳到下一层级
                if not executable_nodes:
                    logger.info(f"层级 {current_level} 没有可执行节点")
                    continue

                # 并行执行当前层级的节点
                tasks = []
                for node in executable_nodes:
                    # 获取节点输入
                    node_input = self._get_node_input(node, conversation)
                    logger.info(f"执行节点 '{node['name']}', 输入长度: {len(node_input)}")
                    tasks.append(self._execute_node(node, node_input, conversation_id, model_service))
                    # 记录执行路径
                    conversation["current_path"].append(node["name"])


                # 等待所有任务完成
                if tasks:
                    executed_any_node = True
                    results = await asyncio.gather(*tasks)

                    # 从 pending_nodes 中移除已执行的节点
                    for node in executable_nodes:
                        if node["name"] in conversation["pending_nodes"]:
                            conversation["pending_nodes"].remove(node["name"])
                            logger.info(f"节点 '{node['name']}' 执行完成，从待处理列表中移除")

                    # 检查是否有handoffs选择
                    handoff_selections = []
                    for result in results:
                        if "_selected_handoff" in result and result["_selected_handoff"]:
                            handoff_selections.append((result["node_name"], result["_selected_handoff"]))

                    # 处理handoffs选择，立即将选择的节点添加到待处理队列
                    if handoff_selections:
                        for source_node, target_node in handoff_selections:
                            logger.info(f"处理handoffs选择: 从节点 '{source_node}' 到节点 '{target_node}'")
                            # 重置执行路径，准备新的执行序列
                            conversation["current_path"] = []
                            conversation["pending_nodes"] = {target_node}
                        # 立即退出层级循环，下一轮循环会优先处理handoffs选择的节点
                        break

                # 在每个层级执行完后保存会话状态
                self.conversation_manager.update_conversation_file(conversation_id)

            # 如果没有执行任何节点，且没有更多待处理节点，计算下一批
            if not executed_any_node and not conversation["pending_nodes"]:
                next_pending_nodes = self._get_next_nodes(conversation)
                if next_pending_nodes:
                    conversation["pending_nodes"] = next_pending_nodes
                    logger.info(f"当前批次执行完毕，计算下一批待处理节点: {next_pending_nodes}")
                else:
                    logger.info("没有更多待处理节点，执行完成")
                    break