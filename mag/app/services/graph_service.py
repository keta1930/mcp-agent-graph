import asyncio
import logging
import json
import uuid
import re
import copy
from typing import Dict, List, Any, Optional, Set, Tuple, AsyncGenerator
import os
from app.core.file_manager import FileManager
from app.services.mcp_service import mcp_service
from app.services.model_service import model_service
from app.services.prompt_service import prompt_service
from app.models.graph_schema import GraphConfig, AgentNode
from app.services.graph.graph_processor import GraphProcessor
from app.services.graph.conversation_manager import ConversationManager
from app.services.graph.graph_executor import GraphExecutor
from app.services.graph.ai_graph_generator import AIGraphGenerator
from app.utils.sse_helper import SSEHelper
from app.services.graph.background_executor import BackgroundExecutor
from app.services.mongodb_service import mongodb_service

logger = logging.getLogger(__name__)


class GraphService:
    """图执行服务"""

    def __init__(self):
        self.processor = GraphProcessor(self.get_graph)
        self.conversation_manager = ConversationManager()
        self.executor = GraphExecutor(self.conversation_manager, mcp_service)
        self.background_executor = BackgroundExecutor(self.conversation_manager, mcp_service)
        self.ai_generator = AIGraphGenerator()
        self.active_conversations = self.conversation_manager.active_conversations
        self.mongodb_service = mongodb_service
        self._task_service = None
        self._task_scheduler = None

    async def initialize(self) -> None:
        """初始化图服务"""
        FileManager.initialize()

        # 初始化任务管理组件
        await self._initialize_task_components()

    async def list_graphs(self) -> List[str]:
        """列出所有可用的图"""
        return await self.mongodb_service.list_graph_configs()

    async def get_graph(self, graph_name: str) -> Optional[Dict[str, Any]]:
        """获取图配置"""
        return await self.mongodb_service.get_graph_config(graph_name)

    async def save_graph(self, graph_name: str, config: Dict[str, Any]) -> bool:
        """保存图配置"""
        existing = await self.mongodb_service.graph_config_exists(graph_name)
        if existing:
            return await self.mongodb_service.update_graph_config(graph_name, config)
        return await self.mongodb_service.create_graph_config(graph_name, config)

    async def delete_graph(self, graph_name: str) -> bool:
        """删除图配置"""
        return await self.mongodb_service.delete_graph_config(graph_name)

    async def rename_graph(self, old_name: str, new_name: str) -> bool:
        """重命名图"""
        return await self.mongodb_service.rename_graph_config(old_name, new_name)

    def _extract_prompt_references(self, text: str) -> Set[str]:
        """
        从文本中提取所有提示词引用

        Args:
            text: 包含可能的提示词引用的文本

        Returns:
            Set[str]: 提示词名称集合
        """
        if not text:
            return set()

        # 匹配 {{@prompt_name}} 格式
        prompt_pattern = r'\{\{@([^}]+)\}\}'
        matches = re.findall(prompt_pattern, text)

        # 清理并返回提示词名称
        return {match.strip() for match in matches}

    async def _preprocess_graph_prompts(self, graph_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        预处理图配置中的所有提示词引用，替换为实际内容

        Args:
            graph_config: 原始图配置

        Returns:
            Dict[str, Any]: 处理后的图配置（提示词引用已替换为实际内容）
        """
        # 创建图配置的深拷贝，保持原始配置不变
        processed_config = copy.deepcopy(graph_config)

        # 收集所有需要的提示词引用
        all_prompt_refs = set()

        # 扫描所有节点的system_prompt和user_prompt
        for node in processed_config.get("nodes", []):
            system_prompt = node.get("system_prompt", "")
            user_prompt = node.get("user_prompt", "")

            all_prompt_refs.update(self._extract_prompt_references(system_prompt))
            all_prompt_refs.update(self._extract_prompt_references(user_prompt))

        # 扫描end_template
        end_template = processed_config.get("end_template", "")
        all_prompt_refs.update(self._extract_prompt_references(end_template))

        # 如果没有提示词引用，直接返回
        if not all_prompt_refs:
            logger.info("图配置中未发现提示词引用，跳过预处理")
            return processed_config

        logger.info(f"发现提示词引用: {list(all_prompt_refs)}")

        # 批量获取所有提示词内容
        prompt_contents = {}
        for prompt_name in all_prompt_refs:
            try:
                # 直接调用PromptManager的同步方法
                prompt_detail = prompt_service.prompt_manager.get_prompt(prompt_name)
                if prompt_detail:
                    prompt_contents[prompt_name] = prompt_detail.content
                    logger.info(f"成功获取提示词: {prompt_name}")
                else:
                    prompt_contents[prompt_name] = ""
                    logger.warning(f"提示词不存在，使用空内容: {prompt_name}")
            except Exception as e:
                prompt_contents[prompt_name] = ""
                logger.error(f"获取提示词失败，使用空内容: {prompt_name}, 错误: {str(e)}")

        # 定义替换函数
        def replace_prompt_refs(text: str) -> str:
            if not text:
                return text

            def replace_match(match):
                prompt_name = match.group(1).strip()
                return prompt_contents.get(prompt_name, "")

            return re.sub(r'\{\{@([^}]+)\}\}', replace_match, text)

        # 替换所有节点中的提示词引用
        for node in processed_config.get("nodes", []):
            if "system_prompt" in node:
                node["system_prompt"] = replace_prompt_refs(node["system_prompt"])
            if "user_prompt" in node:
                node["user_prompt"] = replace_prompt_refs(node["user_prompt"])

        # 替换end_template中的提示词引用
        if "end_template" in processed_config:
            processed_config["end_template"] = replace_prompt_refs(processed_config["end_template"])

        logger.info("提示词预处理完成")
        return processed_config

    async def _flatten_all_subgraphs(self, graph_config: Dict[str, Any]) -> Dict[str, Any]:
        """将图中所有子图完全展开为扁平结构，并更新节点引用关系"""
        return await self.processor._flatten_all_subgraphs(graph_config)

    def _calculate_node_levels(self, graph_config: Dict[str, Any]) -> Dict[str, Any]:
        """重新设计的层级计算算法，正确处理所有依赖关系"""
        return self.processor._calculate_node_levels(graph_config)

    async def preprocess_graph(self, graph_config: Dict[str, Any], prefix_path: str = "") -> Dict[str, Any]:
        """将包含子图的复杂图展开为扁平化结构"""
        return await self.processor.preprocess_graph(graph_config, prefix_path)

    async def _expand_subgraph_node(self, subgraph_node: Dict[str, Any], prefix_path: str) -> List[Dict[str, Any]]:
        """将子图节点展开为多个普通节点"""
        return await self.processor._expand_subgraph_node(subgraph_node, prefix_path)

    async def detect_graph_cycles(self, graph_name: str, visited: List[str] = None) -> Optional[List[str]]:
        """检测图引用中的循环"""
        return await self.processor.detect_graph_cycles(graph_name, visited)

    async def validate_graph(self, graph_config: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """验证图配置是否有效"""
        return await self.processor.validate_graph(
            graph_config,
            model_service.get_model,
            mcp_service.get_server_status_sync
        )

    async def create_conversation(self, graph_name: str) -> str:
        """创建新的会话"""
        graph_config = self.get_graph(graph_name)
        if not graph_config:
            raise ValueError(f"找不到图 '{graph_name}'")

        try:
            conversation_id = await self.conversation_manager.create_conversation(graph_name, graph_config)
            logger.info(f"成功创建会话: {conversation_id}")
            return conversation_id
        except Exception as e:
            logger.error(f"创建会话失败: {str(e)}")
            raise ValueError(f"创建会话失败: {str(e)}")

    async def create_conversation_with_config(self, graph_name: str, graph_config: Dict[str, Any]) -> str:
        """使用指定配置创建新的会话"""
        try:
            conversation_id = await self.conversation_manager.create_conversation(graph_name, graph_config)
            logger.info(f"成功创建会话（指定配置）: {conversation_id}")
            return conversation_id
        except Exception as e:
            logger.error(f"创建会话失败（指定配置）: {str(e)}")
            raise ValueError(f"创建会话失败: {str(e)}")

    async def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取会话状态"""
        return await self.conversation_manager.get_conversation(conversation_id)

    async def execute_graph_background(self, graph_name: str, input_text: str,
                                       graph_config: Dict[str, Any],
                                       conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """后台异步执行图，执行到创建conversation_id后立即返回，图在后台继续运行"""
        try:
            # 检测图循环（和SSE版本一样的前期检查）
            cycle = await self.detect_graph_cycles(graph_name)
            if cycle:
                return {
                    "status": "error",
                    "message": f"检测到循环引用链: {' -> '.join(cycle)}"
                }

            if conversation_id:
                # 继续现有会话的后台执行
                conversation = await self.get_conversation(conversation_id)
                if not conversation:
                    return {
                        "status": "error",
                        "message": f"找不到会话 '{conversation_id}'"
                    }

                # 使用后台执行器继续会话
                result = await self.background_executor.continue_conversation_background(
                    conversation_id, input_text, model_service
                )
                return result
            else:
                # 预处理提示词引用
                logger.info("开始预处理图配置中的提示词引用")
                preprocessed_config = await self._preprocess_graph_prompts(graph_config)

                # 展开子图和计算层级
                flattened_config = await self.processor._flatten_all_subgraphs(preprocessed_config)
                flattened_config = self.processor._calculate_node_levels(flattened_config)

                # 使用后台执行器执行图
                result = await self.background_executor.execute_graph_background(
                    graph_name, flattened_config, input_text, model_service
                )
                return result

        except Exception as e:
            logger.error(f"启动后台执行失败: {str(e)}")
            return {
                "status": "error",
                "message": f"启动后台执行失败: {str(e)}"
            }

    async def execute_graph_stream(self, graph_name: str, input_text: str, graph_config) -> AsyncGenerator[str, None]:
        """执行整个图并返回流式结果"""
        try:
            cycle = await self.detect_graph_cycles(graph_name)
            if cycle:
                yield SSEHelper.send_error(f"检测到循环引用链: {' -> '.join(cycle)}")
                return

            # 第一步：预处理提示词引用
            logger.info("开始预处理图配置中的提示词引用")
            preprocessed_config = await self._preprocess_graph_prompts(graph_config)

            # 第二步：展开子图和计算层级
            flattened_config = await self.processor._flatten_all_subgraphs(preprocessed_config)
            flattened_config = self.processor._calculate_node_levels(flattened_config)

            # 第三步：执行图
            async for sse_data in self.executor.execute_graph_stream(
                    graph_name,
                    flattened_config,
                    input_text,
                    model_service
            ):
                yield sse_data

        except Exception as e:
            logger.error(f"执行图流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"执行图时出错: {str(e)}")

    async def continue_conversation_stream(self,
                                           conversation_id: str,
                                           input_text: str = None,
                                           continue_from_checkpoint: bool = False) -> AsyncGenerator[str, None]:
        """继续现有会话并返回流式结果"""
        try:
            conversation = await self.conversation_manager.get_conversation(conversation_id)
            if not conversation:
                yield SSEHelper.send_error(f"找不到会话 '{conversation_id}'")
                return

            # 如果是新的输入，需要重新预处理提示词
            if input_text and not continue_from_checkpoint:
                logger.info("继续会话需要预处理图配置中的提示词引用")
                original_config = conversation.get("graph_config", {})
                preprocessed_config = await self._preprocess_graph_prompts(original_config)

                # 更新会话中的图配置为预处理后的版本
                conversation["graph_config"] = preprocessed_config

            async for sse_data in self.executor.continue_conversation_stream(
                    conversation_id,
                    input_text,
                    model_service,
                    continue_from_checkpoint
            ):
                yield sse_data

            await self.conversation_manager.update_conversation_file(conversation_id)

        except Exception as e:
            logger.error(f"继续会话流式处理时出错: {str(e)}")
            yield SSEHelper.send_error(f"继续会话时出错: {str(e)}")

    async def ai_generate_graph(self,
                                requirement: str,
                                model_name: str,
                                mcp_servers: List[str],
                                conversation_id: Optional[str] = None,
                                user_id: str = "default_user",
                                graph_config: Optional[Dict[str, Any]] = None,
                                ) -> AsyncGenerator[str, None]:
        """AI生成图的流式接口"""
        async for chunk in self.ai_generator.ai_generate_stream(
                requirement=requirement,
                model_name=model_name,
                mcp_servers=mcp_servers,
                conversation_id=conversation_id,
                user_id=user_id,
                graph_config=graph_config,
        ):
            yield chunk

    def generate_mcp_script(self, graph_name: str, graph_config: Dict[str, Any], host_url: str) -> Dict[str, Any]:
        """生成MCP服务器脚本"""
        description = graph_config.get("description", "")
        sanitized_graph_name = graph_name.replace(" ", "_").replace("-", "_")

        template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
        sequential_template_path = os.path.join(template_dir, "mcp_sequential_template.py")

        try:
            with open(sequential_template_path, 'r', encoding='utf-8') as f:
                sequential_template = f.read()
        except FileNotFoundError:
            logger.error(f"找不到MCP脚本模板文件")
            return {
                "graph_name": graph_name,
                "error": "找不到MCP脚本模板文件",
                "script": ""
            }

        format_values = {
            "graph_name": graph_name,
            "sanitized_graph_name": sanitized_graph_name,
            "description": description,
            "host_url": host_url
        }

        sequential_script = sequential_template.format(**format_values)

        return {
            "graph_name": graph_name,
            "sequential_script": sequential_script,
            "default_script": sequential_script
        }

    # ======= 任务管理集成 =======

    async def _initialize_task_components(self):
        """初始化任务管理组件"""
        try:
            # 延迟导入以避免循环导入
            from app.services.task_service import task_service
            from app.services.task_scheduler import task_scheduler

            self._task_service = task_service
            self._task_scheduler = task_scheduler

            # 初始化任务服务
            await self._task_service.initialize()

            # 加载活跃任务到调度器
            await self._task_scheduler.load_active_tasks()

            logger.info("任务管理组件初始化成功")

        except Exception as e:
            logger.error(f"任务管理组件初始化失败: {str(e)}")

    @property
    def task_service(self):
        """获取任务服务实例"""
        return self._task_service

    @property
    def task_scheduler(self):
        """获取任务调度器实例"""
        return self._task_scheduler


graph_service = GraphService()