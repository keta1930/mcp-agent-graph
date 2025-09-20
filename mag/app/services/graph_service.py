import asyncio
import logging
import json
import uuid
from typing import Dict, List, Any, Optional, Set, Tuple, AsyncGenerator
import re
import os

from app.core.file_manager import FileManager
from app.services.mcp_service import mcp_service
from app.services.model_service import model_service
from app.models.graph_schema import GraphConfig, AgentNode
from app.services.graph.graph_processor import GraphProcessor
from app.services.graph.conversation_manager import ConversationManager
from app.services.graph.graph_executor import GraphExecutor
from app.services.graph.ai_graph_generator import AIGraphGenerator
from app.utils.sse_helper import SSEHelper

logger = logging.getLogger(__name__)


class GraphService:
    """图执行服务"""

    def __init__(self):
        self.processor = GraphProcessor(self.get_graph)
        self.conversation_manager = ConversationManager()
        self.executor = GraphExecutor(self.conversation_manager, mcp_service)
        self.ai_generator = AIGraphGenerator()
        self.active_conversations = self.conversation_manager.active_conversations

    async def initialize(self) -> None:
        """初始化图服务"""
        FileManager.initialize()

    def list_graphs(self) -> List[str]:
        """列出所有可用的图"""
        return FileManager.list_agents()

    def get_graph(self, graph_name: str) -> Optional[Dict[str, Any]]:
        """获取图配置"""
        return FileManager.load_agent(graph_name)

    def save_graph(self, graph_name: str, config: Dict[str, Any]) -> bool:
        """保存图配置"""
        print("save_graph", graph_name, config)
        return FileManager.save_agent(graph_name, config)

    def delete_graph(self, graph_name: str) -> bool:
        """删除图配置"""
        return FileManager.delete_agent(graph_name)

    def rename_graph(self, old_name: str, new_name: str) -> bool:
        """重命名图"""
        return FileManager.rename_agent(old_name, new_name)

    def _flatten_all_subgraphs(self, graph_config: Dict[str, Any]) -> Dict[str, Any]:
        """将图中所有子图完全展开为扁平结构，并更新节点引用关系"""
        return self.processor._flatten_all_subgraphs(graph_config)

    def _calculate_node_levels(self, graph_config: Dict[str, Any]) -> Dict[str, Any]:
        """重新设计的层级计算算法，正确处理所有依赖关系"""
        return self.processor._calculate_node_levels(graph_config)

    def preprocess_graph(self, graph_config: Dict[str, Any], prefix_path: str = "") -> Dict[str, Any]:
        """将包含子图的复杂图展开为扁平化结构"""
        return self.processor.preprocess_graph(graph_config, prefix_path)

    def _expand_subgraph_node(self, subgraph_node: Dict[str, Any], prefix_path: str) -> List[Dict[str, Any]]:
        """将子图节点展开为多个普通节点"""
        return self.processor._expand_subgraph_node(subgraph_node, prefix_path)

    def detect_graph_cycles(self, graph_name: str, visited: List[str] = None) -> Optional[List[str]]:
        """检测图引用中的循环"""
        return self.processor.detect_graph_cycles(graph_name, visited)

    def validate_graph(self, graph_config: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """验证图配置是否有效"""
        return self.processor.validate_graph(
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

    async def execute_graph_stream(self, graph_name: str, input_text: str,graph_config) -> AsyncGenerator[str, None]:
        """执行整个图并返回流式结果"""
        try:
            cycle = self.detect_graph_cycles(graph_name)
            if cycle:
                yield SSEHelper.send_error(f"检测到循环引用链: {' -> '.join(cycle)}")
                return

            flattened_config = self.processor._flatten_all_subgraphs(graph_config)
            flattened_config = self.processor._calculate_node_levels(flattened_config)

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


graph_service = GraphService()