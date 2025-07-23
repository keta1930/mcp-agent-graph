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
from app.models.schema import GraphConfig, AgentNode, NodeResult, GraphResult

# 导入现有的模块
from app.services.graph.graph_processor import GraphProcessor
from app.services.graph.conversation_manager import ConversationManager
from app.services.graph.graph_executor import GraphExecutor
from app.services.graph.ai_graph_generator import AIGraphGenerator

logger = logging.getLogger(__name__)


class GraphService:
    """图执行服务"""

    def __init__(self):
        # 初始化子服务
        self.processor = GraphProcessor(self.get_graph)
        self.conversation_manager = ConversationManager()
        self.executor = GraphExecutor(self.conversation_manager, mcp_service)
        self.ai_generator = AIGraphGenerator()
        self.active_conversations = self.conversation_manager.active_conversations

    async def initialize(self) -> None:
        """初始化图服务"""
        # 确保目录存在
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

        # 先展开所有子图到扁平结构
        flattened_config = self.processor._flatten_all_subgraphs(config)

        # 对扁平化后的图计算一次层级
        config_with_levels = self.processor._calculate_node_levels(flattened_config)

        return FileManager.save_agent(graph_name, config_with_levels)

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
        # 调用processor验证图，并传入模型服务和服务器状态获取函数
        return self.processor.validate_graph(
            graph_config,
            model_service.get_model,
            mcp_service.get_server_status_sync
        )

    def create_conversation(self, graph_name: str) -> str:
        """创建新的会话 - 确保唯一性"""
        # 加载图配置
        graph_config = self.get_graph(graph_name)
        if not graph_config:
            raise ValueError(f"找不到图 '{graph_name}'")

        # 使用会话管理器创建会话（内置唯一性保证）
        try:
            conversation_id = self.conversation_manager.create_conversation(graph_name, graph_config)
            logger.info(f"成功创建会话: {conversation_id}")
            return conversation_id
        except Exception as e:
            logger.error(f"创建会话失败: {str(e)}")
            raise ValueError(f"创建会话失败: {str(e)}")

    def _load_existing_conversations(self) -> None:
        """加载已有的会话文件"""
        try:
            conversation_ids = FileManager.list_conversations()
            logger.info(f"找到 {len(conversation_ids)} 个现有会话文件")

            # 尝试加载部分会话信息，但不放入内存
            for conversation_id in conversation_ids[:5]:  # 仅加载前5个作为示例
                json_data = FileManager.load_conversation_json(conversation_id)
                if json_data:
                    graph_name = json_data.get("graph_name", "未知图")
                    start_time = json_data.get("start_time", "未知时间")
                    completed = json_data.get("completed", False)
                    status = "已完成" if completed else "未完成"
                    logger.info(f"会话: {conversation_id}, 图: {graph_name}, 开始时间: {start_time}, 状态: {status}")
                else:
                    logger.warning(f"会话 {conversation_id} 的JSON文件不存在或无法解析")
        except Exception as e:
            logger.error(f"加载现有会话时出错: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())

    def create_conversation_with_config(self, graph_name: str, graph_config: Dict[str, Any]) -> str:
        """使用指定配置创建新的会话 - 确保唯一性"""
        try:
            conversation_id = self.conversation_manager.create_conversation(graph_name, graph_config)
            logger.info(f"成功创建会话（指定配置）: {conversation_id}")
            return conversation_id
        except Exception as e:
            logger.error(f"创建会话失败（指定配置）: {str(e)}")
            raise ValueError(f"创建会话失败: {str(e)}")

    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取会话状态"""
        return self.conversation_manager.get_conversation(conversation_id)

    def delete_conversation(self, conversation_id: str) -> bool:
        """删除会话"""
        return self.conversation_manager.delete_conversation(conversation_id)

    async def execute_graph(self, graph_name: str, input_text: str, parallel: bool = False) -> Dict[str, Any]:
        """执行整个图并返回结果 - 使用基于层级的新方法"""
        # 加载原始图配置
        original_config = self.get_graph(graph_name)
        if not original_config:
            raise ValueError(f"找不到图 '{graph_name}'")

        # 检查循环引用
        cycle = self.detect_graph_cycles(graph_name)
        if cycle:
            raise ValueError(f"检测到循环引用链: {' -> '.join(cycle)}")

        # 展开图配置，处理所有子图
        flattened_config = self.preprocess_graph(original_config)

        # 使用新的执行器执行图
        return await self.executor.execute_graph(
            graph_name,
            original_config,
            flattened_config,
            input_text,
            parallel,
            model_service
        )

    async def continue_conversation(self,
                                    conversation_id: str,
                                    input_text: str = None,
                                    parallel: bool = False,
                                    continue_from_checkpoint: bool = False) -> Dict[str, Any]:
        """继续现有会话 - 使用基于层级的新方法"""
        conversation = self.conversation_manager.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"找不到会话 '{conversation_id}'")

        # 使用执行器继续会话
        result = await self.executor.continue_conversation(
            conversation_id,
            input_text,
            parallel,
            model_service,
            continue_from_checkpoint
        )

        # 确保更新后的结果被保存到文件
        self.conversation_manager.update_conversation_file(conversation_id)

        return result

    def get_conversation_with_hierarchy(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """获取包含层次结构的会话详情"""
        return self.conversation_manager.get_conversation_with_hierarchy(conversation_id)

    async def ai_generate_graph(self,
                                requirement: str,
                                model_name: str,
                                conversation_id: Optional[str] = None,
                                user_id: str = "default_user",
                                graph_config: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        """AI生成图的流式接口"""
        async for chunk in self.ai_generator.ai_generate_stream(
                requirement=requirement,
                model_name=model_name,
                conversation_id=conversation_id,
                user_id=user_id,
                graph_config=graph_config
        ):
            yield chunk

    def generate_mcp_script(self, graph_name: str, graph_config: Dict[str, Any], host_url: str) -> Dict[str, Any]:
        """生成MCP服务器脚本"""

        # 获取图的描述
        description = graph_config.get("description", "")
        sanitized_graph_name = graph_name.replace(" ", "_").replace("-", "_")

        # 获取模板文件路径
        template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
        parallel_template_path = os.path.join(template_dir, "mcp_parallel_template.py")
        sequential_template_path = os.path.join(template_dir, "mcp_sequential_template.py")

        # 读取模板文件
        try:
            with open(parallel_template_path, 'r', encoding='utf-8') as f:
                parallel_template = f.read()

            with open(sequential_template_path, 'r', encoding='utf-8') as f:
                sequential_template = f.read()
        except FileNotFoundError:
            # 如果模板文件不存在，返回错误
            logger.error(f"找不到MCP脚本模板文件")
            return {
                "graph_name": graph_name,
                "error": "找不到MCP脚本模板文件",
                "script": ""
            }

        # 替换模板中的变量
        format_values = {
            "graph_name": graph_name,
            "sanitized_graph_name": sanitized_graph_name,
            "description": description,
            "host_url": host_url
        }

        parallel_script = parallel_template.format(**format_values)
        sequential_script = sequential_template.format(**format_values)

        # 返回脚本内容
        return {
            "graph_name": graph_name,
            "parallel_script": parallel_script,
            "sequential_script": sequential_script,
            "default_script": sequential_script
        }


# 创建全局图服务实例
graph_service = GraphService()