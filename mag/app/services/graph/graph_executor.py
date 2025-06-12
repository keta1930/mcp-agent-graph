import asyncio
import logging
import time
from typing import Dict, List, Any, Optional, Set, Tuple
import copy
from app.core.file_manager import FileManager

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

    async def execute_graph(self,
                            graph_name: str,
                            original_config: Dict[str, Any],
                            flattened_config: Dict[str, Any],
                            input_text: str,
                            parallel: bool = False,
                            model_service=None) -> Dict[str, Any]:
        """执行整个图并返回结果 - 基于层级的简化执行方式"""
        # 创建会话
        conversation_id = self.conversation_manager.create_conversation_with_config(graph_name, flattened_config)

        # 初始化会话状态
        conversation = self.conversation_manager.get_conversation(conversation_id)
        conversation["original_config"] = original_config
        conversation["parallel"] = parallel
        conversation["graph_name"] = graph_name  # 保存图名称，用于文件替换

        # 记录用户输入
        self._record_user_input(conversation_id, input_text)

        # 执行图
        if parallel:
            await self._execute_graph_by_level_parallel(conversation_id, model_service)
        else:
            await self._execute_graph_by_level_sequential(conversation_id, model_service)

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
        """继续现有会话 - 基于层级的简化执行方式"""
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

            # 检查是否有未处理的handoffs选择
            restart_node = None
            for result in reversed(conversation.get("results", [])):
                if not result.get("is_start_input", False) and result.get("_selected_handoff"):
                    restart_node = result["_selected_handoff"]
                    # 清除选择标记
                    result["_selected_handoff"] = None
                    break

            # 如果有重启节点，从该节点开始执行
            if restart_node:
                logger.info(f"从断点继续时处理未完成的handoffs选择: {restart_node}")
                # 查找该节点
                restart_node_obj = self._find_node_by_name(graph_config, restart_node)

                if restart_node_obj:
                    current_level = restart_node_obj.get("level", 0)

                    # 使用相应的执行方法继续执行
                    if parallel:
                        await self._continue_graph_by_level_parallel(conversation_id, current_level, restart_node,
                                                                     model_service)
                    else:
                        await self._continue_graph_by_level_sequential(conversation_id, current_level, restart_node,
                                                                       model_service)
                else:
                    logger.error(f"找不到重启节点: {restart_node}")
            else:
                # 找出上次执行到的最大层级
                max_executed_level = self._get_max_executed_level(conversation)

                # 继续执行下一层级
                if parallel:
                    await self._continue_graph_by_level_parallel(conversation_id, max_executed_level + 1, None,
                                                                 model_service)
                else:
                    await self._continue_graph_by_level_sequential(conversation_id, max_executed_level + 1, None,
                                                                   model_service)
        else:
            # 提供了新输入，重新开始执行
            # 保留以前的结果，但重新执行图
            previous_results = [r for r in conversation.get("results", []) if r.get("is_start_input", False)]

            # 更新会话，重置状态但保留历史输入
            conversation["results"] = previous_results

            # 添加新的用户输入
            if input_text:
                self._record_user_input(conversation_id, input_text)

            # 重新执行图
            if parallel:
                await self._execute_graph_by_level_parallel(conversation_id, model_service)
            else:
                await self._execute_graph_by_level_sequential(conversation_id, model_service)

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

    def _record_user_input(self, conversation_id: str, input_text: str):
        """记录用户输入，并将其添加到全局管理内容中"""
        conversation = self.conversation_manager.get_conversation(conversation_id)

        # 添加到会话结果列表
        conversation["results"].append({
            "is_start_input": True,
            "node_name": "start",
            "input": input_text,
            "output": "",
            "tool_calls": [],
            "tool_results": []
        })

        # 将用户输入添加到全局管理内容中，便于任何节点通过context或占位符引用
        if "global_outputs" not in conversation:
            conversation["global_outputs"] = {}

        # 确保start作为特殊的全局管理节点
        if "start" not in conversation["global_outputs"]:
            conversation["global_outputs"]["start"] = []

        # 添加用户输入到全局管理的start节点内容
        conversation["global_outputs"]["start"].append(input_text)

        logger.info(f"已将用户输入添加到全局管理内容中，可通过context=['start']或占位符start引用")

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

    def _get_nodes_starting_from(self, graph_config: Dict[str, Any], start_node_name: str) -> List[Dict[str, Any]]:
        """获取从特定节点开始的执行序列"""
        # 找到起始节点
        start_node = self._find_node_by_name(graph_config, start_node_name)
        if not start_node:
            return []

        # 仅返回该节点，后续节点会在下一层级处理
        return [start_node]

    def _get_node_input_simple(self, node: Dict[str, Any], conversation: Dict[str, Any]) -> str:
        """简化版的节点输入获取方法"""
        input_nodes = node.get("input_nodes", [])
        inputs = []

        # 处理输入节点
        for input_node_name in input_nodes:
            if input_node_name == "start":
                # 获取用户输入
                for result in conversation["results"]:
                    if result.get("is_start_input", False):
                        inputs.append(result["input"])
                        break
            else:
                # 获取节点输出
                for result in reversed(conversation["results"]):
                    if result.get("node_name") == input_node_name:
                        inputs.append(result["output"])
                        break

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
                    inputs.append("\n\n".join(global_outputs))

        # 合并所有输入
        return "\n\n".join(inputs)

    def _get_max_executed_level(self, conversation: Dict[str, Any]) -> int:
        """获取已执行节点中的最大层级"""
        graph_config = conversation["graph_config"]
        max_level = -1

        # 遍历所有结果，找出已执行节点的最大层级
        for result in conversation.get("results", []):
            if result.get("is_start_input", False):
                continue

            node_name = result.get("node_name")
            node = self._find_node_by_name(graph_config, node_name)

            if node:
                level = node.get("level", 0)
                max_level = max(max_level, level)

        return max_level

    async def _execute_graph_by_level_sequential(self, conversation_id: str, model_service=None):
        """基于层级的顺序执行方法"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        graph_config = conversation["graph_config"]

        # 找出所有层级
        max_level = self._get_max_level(graph_config)

        # 指示是否需要重新从特定节点开始执行
        restart_from_node = None

        # 从层级0开始顺序执行
        current_level = 0

        while current_level <= max_level:
            
            logger.info(f"开始执行层级 {current_level}")

            # 如果有重启点，则只处理该节点和后续节点
            if restart_from_node:
                nodes_to_execute = self._get_nodes_starting_from(graph_config, restart_from_node)
                restart_from_node = None  # 重置重启点
            else:
                # 获取当前层级的所有节点
                nodes_to_execute = self._get_nodes_at_level(graph_config, current_level)

            # 顺序执行当前层级的节点
            for i, node in enumerate(nodes_to_execute):
                # 获取节点输入
                node_input = self._get_node_input_simple(node, conversation)

                # 执行节点
                result = await self._execute_node(node, node_input, conversation_id, model_service)

                # 保存会话状态
                self.conversation_manager.update_conversation_file(conversation_id)

                # 检查是否有handoffs选择
                if result.get("_selected_handoff"):
                    # 找到选择的节点
                    selected_node_name = result["_selected_handoff"]
                    selected_node = self._find_node_by_name(graph_config, selected_node_name)

                    if selected_node:
                        logger.info(f"检测到handoffs选择: {selected_node_name}，重新开始执行")
                        # 清除选择标记
                        result["_selected_handoff"] = None
                        # 设置重启点
                        restart_from_node = selected_node_name
                        # 从选择的节点所在层级重新开始
                        current_level = selected_node.get("level", 0)
                        break

            # 如果没有重启点，正常进入下一层级
            if not restart_from_node:
                current_level += 1

    async def _execute_graph_by_level_parallel(self, conversation_id: str, model_service=None):
        """基于层级的并行执行方法"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        graph_config = conversation["graph_config"]

        # 找出所有层级
        max_level = self._get_max_level(graph_config)

        # 指示是否需要重新从特定节点开始执行
        restart_from_node = None

        # 从层级0开始并行执行
        current_level = 0

        while current_level <= max_level:
            logger.info(f"开始并行执行层级 {current_level}")

            # 如果有重启点，则只处理该节点和后续节点
            if restart_from_node:
                nodes_to_execute = self._get_nodes_starting_from(graph_config, restart_from_node)
                restart_from_node = None  # 重置重启点
            else:
                # 获取当前层级的所有节点
                nodes_to_execute = self._get_nodes_at_level(graph_config, current_level)

            # 为每个节点创建任务
            tasks = []
            for node in nodes_to_execute:
                # 获取节点输入
                node_input = self._get_node_input_simple(node, conversation)

                # 创建执行任务
                tasks.append(self._execute_node(node, node_input, conversation_id, model_service))

            # 并行执行所有任务
            if tasks:
                results = await asyncio.gather(*tasks)

                # 保存会话状态
                self.conversation_manager.update_conversation_file(conversation_id)

                # 检查是否有handoffs选择
                handoff_selection = None
                for result in results:
                    if result.get("_selected_handoff"):
                        handoff_selection = result
                        break

                # 处理handoffs选择
                if handoff_selection:
                    selected_node_name = handoff_selection["_selected_handoff"]
                    selected_node = self._find_node_by_name(graph_config, selected_node_name)

                    if selected_node:
                        logger.info(f"检测到handoffs选择: {selected_node_name}，重新开始执行")
                        # 清除选择标记
                        handoff_selection["_selected_handoff"] = None
                        # 设置重启点
                        restart_from_node = selected_node_name
                        # 从选择的节点所在层级重新开始
                        current_level = selected_node.get("level", 0)
                        continue

            # 进入下一层级
            current_level += 1

    async def _continue_graph_by_level_sequential(self,
                                                  conversation_id: str,
                                                  start_level: int,
                                                  restart_node: Optional[str],
                                                  model_service=None):
        """从指定层级继续顺序执行图"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        graph_config = conversation["graph_config"]

        # 获取最大层级
        max_level = self._get_max_level(graph_config)

        # 当前层级
        current_level = start_level

        # 优先处理重启节点
        if restart_node:
            restart_node_obj = self._find_node_by_name(graph_config, restart_node)
            if restart_node_obj:
                # 重设当前层级
                current_level = restart_node_obj.get("level", 0)

                # 执行重启节点
                node_input = self._get_node_input_simple(restart_node_obj, conversation)
                result = await self._execute_node(restart_node_obj, node_input, conversation_id, model_service)

                # 保存会话状态
                self.conversation_manager.update_conversation_file(conversation_id)

                # 检查是否有新的handoffs选择
                if result.get("_selected_handoff"):
                    # 递归处理
                    await self._continue_graph_by_level_sequential(
                        conversation_id,
                        current_level,
                        result["_selected_handoff"],
                        model_service
                    )
                    return

                # 继续执行下一层级
                current_level += 1

        # 继续执行剩余层级
        while current_level <= max_level:
            # 当前层级的所有节点
            nodes = self._get_nodes_at_level(graph_config, current_level)

            for node in nodes:
                # 获取节点输入
                node_input = self._get_node_input_simple(node, conversation)

                # 执行节点
                result = await self._execute_node(node, node_input, conversation_id, model_service)

                # 保存会话状态
                self.conversation_manager.update_conversation_file(conversation_id)

                # 检查是否有handoffs选择
                if result.get("_selected_handoff"):
                    # 递归处理
                    await self._continue_graph_by_level_sequential(
                        conversation_id,
                        current_level,
                        result["_selected_handoff"],
                        model_service
                    )
                    return

            # 进入下一层级
            current_level += 1

    async def _continue_graph_by_level_parallel(self,
                                                conversation_id: str,
                                                start_level: int,
                                                restart_node: Optional[str],
                                                model_service=None):
        """从指定层级继续并行执行图"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        graph_config = conversation["graph_config"]

        # 获取最大层级
        max_level = self._get_max_level(graph_config)

        # 当前层级
        current_level = start_level

        # 优先处理重启节点
        if restart_node:
            restart_node_obj = self._find_node_by_name(graph_config, restart_node)
            if restart_node_obj:
                # 重设当前层级
                current_level = restart_node_obj.get("level", 0)

                # 执行重启节点
                node_input = self._get_node_input_simple(restart_node_obj, conversation)
                result = await self._execute_node(restart_node_obj, node_input, conversation_id, model_service)

                # 保存会话状态
                self.conversation_manager.update_conversation_file(conversation_id)

                # 检查是否有新的handoffs选择
                if result.get("_selected_handoff"):
                    # 递归处理
                    await self._continue_graph_by_level_parallel(
                        conversation_id,
                        current_level,
                        result["_selected_handoff"],
                        model_service
                    )
                    return

                # 继续执行下一层级
                current_level += 1

        # 继续执行剩余层级
        while current_level <= max_level:
            # 当前层级的所有节点
            nodes = self._get_nodes_at_level(graph_config, current_level)

            # 创建并行任务
            tasks = []
            for node in nodes:
                # 获取节点输入
                node_input = self._get_node_input_simple(node, conversation)

                # 创建任务
                tasks.append(self._execute_node(node, node_input, conversation_id, model_service))

            # 并行执行任务
            if tasks:
                results = await asyncio.gather(*tasks)

                # 保存会话状态
                self.conversation_manager.update_conversation_file(conversation_id)

                # 检查是否有handoffs选择
                handoff_selection = None
                for result in results:
                    if result.get("_selected_handoff"):
                        handoff_selection = result
                        break

                # 处理handoffs选择
                if handoff_selection:
                    # 递归处理
                    await self._continue_graph_by_level_parallel(
                        conversation_id,
                        current_level,
                        handoff_selection["_selected_handoff"],
                        model_service
                    )
                    return

            # 进入下一层级
            current_level += 1

    def _create_agent_messages(self,
                               node: Dict[str, Any],
                               input_text: str,
                               node_outputs: Dict[str, str] = None) -> List[Dict[str, str]]:
        """
        创建Agent的消息列表
        """
        messages = []

        # 如果没有提供节点输出映射，则使用空字典
        if node_outputs is None:
            node_outputs = {}

        # 确保有conversation_id
        conversation_id = node.get("_conversation_id", "")
        if not conversation_id:
            logger.warning("节点缺少会话ID，可能无法正确处理提示词文件")

        # 获取会话以找出图名称
        conversation = None
        graph_name = ""
        if conversation_id:
            conversation = self.conversation_manager.get_conversation(conversation_id)
            if conversation:
                graph_name = conversation.get("graph_name", "")

        # 跟踪已使用的输入节点
        used_input_nodes = set()

        # 处理系统提示词
        system_prompt = node.get("system_prompt", "")
        if system_prompt:
            # 如果有图名称，尝试替换提示词中的文件占位符
            if graph_name:
                system_prompt = FileManager.replace_prompt_file_placeholders(graph_name, system_prompt)

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
            # 如果有图名称，尝试替换提示词中的文件占位符
            if graph_name:
                user_prompt = FileManager.replace_prompt_file_placeholders(graph_name, user_prompt)

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

            node_copy = copy.deepcopy(node)
            node_copy["_conversation_id"] = conversation_id

            # 创建消息
            messages = self._create_agent_messages(node_copy, input_text, node_outputs)

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

            # 检查节点是否配置了save参数，如果有则保存输出到文件
            save_ext = node.get("save")
            if save_ext and output_content.strip():
                logger.info(f"节点 '{node_name}' 配置了save参数，将输出保存为.{save_ext}文件")
                saved_path = FileManager.save_node_output_to_file(
                    conversation_id,
                    node_name,
                    output_content,
                    save_ext
                )
                # 将保存路径添加到结果中，方便后续引用
                if saved_path:
                    result["saved_file_path"] = saved_path

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
        """获取节点输入所需的所有输出结果"""
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