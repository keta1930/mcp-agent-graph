import logging
import re
import copy
from datetime import datetime
from typing import Dict, List, Any, Optional, Set, Tuple, AsyncGenerator
import os
from app.infrastructure.storage.file_storage import FileManager
from app.services.mcp.mcp_service import mcp_service
from app.services.model.model_service import model_service
from app.services.prompt.prompt_service import prompt_service
from app.services.graph.graph_processor import GraphProcessor
from app.services.graph.conversation_manager import ConversationManager
from app.services.graph.graph_executor import GraphExecutor
from app.utils.sse_helper import SSEHelper
from app.services.graph.background_executor import BackgroundExecutor
from app.infrastructure.database.mongodb import mongodb_client
from app.infrastructure.storage.object_storage.graph_config_version_manager import graph_config_version_manager

logger = logging.getLogger(__name__)


class GraphService:
    """图执行服务"""

    def __init__(self):
        self.processor = GraphProcessor(self.get_graph)
        self.conversation_manager = ConversationManager()
        self.executor = GraphExecutor(self.conversation_manager, mcp_service)
        self.background_executor = BackgroundExecutor(self.conversation_manager, mcp_service)
        self.active_conversations = self.conversation_manager.active_conversations
        self.mongodb_client = mongodb_client
        self._task_service = None
        self._task_scheduler = None

    async def initialize(self) -> None:
        """初始化图服务"""
        FileManager.initialize()

        # 初始化任务管理组件
        await self._initialize_task_components()

    async def list_graphs(self, user_id: str = "default_user") -> List[str]:
        """
        列出所有可用的图

        Args:
            user_id: 用户ID（用于过滤用户拥有的图）

        Returns:
            图名称列表
        """
        return await self.mongodb_client.list_graph_configs(user_id)

    async def get_graph(self, graph_name: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        获取图配置

        Args:
            graph_name: 图名称
            user_id: 用户ID（如果提供，将验证访问权限）

        Returns:
            图配置字典，如果无权访问或不存在则返回None
        """
        return await self.mongodb_client.get_graph_config(graph_name, user_id)

    async def save_graph(self, graph_name: str, config: Dict[str, Any],
                        user_id: str = "default_user") -> bool:
        """
        保存图配置

        Args:
            graph_name: 图名称
            config: 图配置
            user_id: 用户ID

        Returns:
            是否保存成功
        """
        existing = await self.mongodb_client.graph_config_exists(graph_name, user_id)
        if existing:
            return await self.mongodb_client.update_graph_config(graph_name, config, user_id)
        return await self.mongodb_client.create_graph_config(graph_name, config, user_id)

    async def delete_graph(self, graph_name: str, user_id: Optional[str] = None) -> bool:
        """
        删除图配置（包括所有版本）

        Args:
            graph_name: 图名称
            user_id: 用户ID（如果提供，将验证所有者权限）

        Returns:
            是否删除成功
        """
        # 删除 MongoDB
        mongo_success = await self.mongodb_client.delete_graph_config(graph_name, user_id)

        # 删除 MinIO 所有版本
        effective_user_id = user_id if user_id else "default_user"
        minio_success = graph_config_version_manager.delete_all_versions(graph_name, effective_user_id)

        return mongo_success

    async def rename_graph(self, old_name: str, new_name: str,
                          user_id: Optional[str] = None) -> bool:
        """
        重命名图

        Args:
            old_name: 旧图名称
            new_name: 新图名称
            user_id: 用户ID（如果提供，将验证所有者权限）

        Returns:
            是否重命名成功
        """
        return await self.mongodb_client.rename_graph_config(old_name, new_name, user_id)

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

    async def _preprocess_graph_prompts(self, graph_config: Dict[str, Any], user_id: str = "default_user") -> Dict[str, Any]:
        """
        预处理图配置中的所有提示词引用，替换为实际内容

        Args:
            graph_config: 原始图配置
            user_id: 用户ID，用于获取提示词

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
                # 使用 mongodb_client 获取提示词
                prompt_detail = await self.mongodb_client.get_prompt(prompt_name, user_id)
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

    async def _flatten_all_subgraphs(self, graph_config: Dict[str, Any], user_id: str = "default_user") -> Dict[str, Any]:
        """将图中所有子图完全展开为扁平结构，并更新节点引用关系

        Args:
            graph_config: 图配置
            user_id: 用户ID

        Returns:
            展开后的图配置
        """
        return await self.processor._flatten_all_subgraphs(graph_config, user_id)

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

    async def validate_graph(self, graph_config: Dict[str, Any], user_id: str = "default_user") -> Tuple[bool, Optional[str]]:
        """验证图配置是否有效"""
        # 创建包装函数，传递user_id
        async def get_model_wrapper(model_name: str):
            return await model_service.get_model(model_name, user_id=user_id)

        return await self.processor.validate_graph(
            graph_config,
            get_model_wrapper,
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
                                       conversation_id: Optional[str] = None,
                                       user_id: str = "default_user") -> Dict[str, Any]:
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
                preprocessed_config = await self._preprocess_graph_prompts(graph_config, user_id)

                # 展开子图和计算层级
                flattened_config = await self.processor._flatten_all_subgraphs(preprocessed_config, user_id)
                flattened_config = self.processor._calculate_node_levels(flattened_config)

                # 使用后台执行器执行图
                result = await self.background_executor.execute_graph_background(
                    graph_name, flattened_config, input_text, model_service, user_id
                )
                return result

        except Exception as e:
            logger.error(f"启动后台执行失败: {str(e)}")
            return {
                "status": "error",
                "message": f"启动后台执行失败: {str(e)}"
            }

    async def execute_graph_stream(self, graph_name: str, input_text: str, graph_config,
                                   user_id: str = "default_user") -> AsyncGenerator[str, None]:
        """执行整个图并返回流式结果"""
        try:
            cycle = await self.detect_graph_cycles(graph_name)
            if cycle:
                yield SSEHelper.send_error(f"检测到循环引用链: {' -> '.join(cycle)}")
                return

            # 第一步：预处理提示词引用
            logger.info("开始预处理图配置中的提示词引用")
            preprocessed_config = await self._preprocess_graph_prompts(graph_config, user_id)

            # 第二步：展开子图和计算层级
            flattened_config = await self.processor._flatten_all_subgraphs(preprocessed_config, user_id)
            flattened_config = self.processor._calculate_node_levels(flattened_config)

            # 第三步：执行图
            async for sse_data in self.executor.execute_graph_stream(
                    graph_name,
                    flattened_config,
                    input_text,
                    model_service,
                    user_id
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
                user_id = conversation.get("user_id", "default_user")
                preprocessed_config = await self._preprocess_graph_prompts(original_config, user_id)

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



    def generate_mcp_script(self, graph_name: str, graph_config: Dict[str, Any], host_url: str) -> Dict[str, Any]:
        """生成MCP服务器脚本"""
        description = graph_config.get("description", "")
        sanitized_graph_name = graph_name.replace(" ", "_").replace("-", "_")
        
        # 获取模板文件的绝对路径
        template_dir = os.path.dirname(os.path.abspath(__file__))
        template_path = os.path.join(template_dir, "mcp_sequential_template.py")

        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                sequential_template = f.read()
        except FileNotFoundError:
            logger.error(f"找不到MCP脚本模板文件: {template_path}")
            return {
                "graph_name": graph_name,
                "error": f"找不到MCP脚本模板文件: {template_path}",
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
            from app.services.task.task_service import task_service
            from app.services.task.task_scheduler import task_scheduler

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

    # ======= 版本管理 =======

    async def create_graph_version(self, graph_name: str, commit_message: str, user_id: str = "default_user") -> Dict[str, Any]:
        """
        为当前图配置创建版本快照

        Args:
            graph_name: 图名称
            commit_message: 提交信息（类似 Git commit message）
            user_id: 用户ID，默认为 "default_user"

        Returns:
            Dict: 创建结果
        """
        try:
            # 1. 获取当前 MongoDB 中的配置
            graph_doc = await self.get_graph(graph_name, user_id)
            if not graph_doc:
                return {
                    "status": "error",
                    "message": f"图 '{graph_name}' 不存在"
                }

            # 2. 创建 MinIO 版本
            version_result = graph_config_version_manager.create_version(
                graph_name,
                graph_doc.get("config", {}),
                user_id
            )

            if not version_result:
                return {
                    "status": "error",
                    "message": "创建版本失败"
                }

            version_id = version_result["version_id"]
            size = version_result["size"]

            # 3. 添加版本记录到 MongoDB
            version_record = {
                "version_id": version_id,
                "commit_message": commit_message,
                "created_at": datetime.now().isoformat(),
                "size": size
            }

            success = await self.mongodb_client.add_graph_version_record(graph_name, version_record, user_id)

            if not success:
                logger.warning(f"版本记录添加到 MongoDB 失败，但 MinIO 版本已创建: {version_id}")

            # 4. 获取更新后的版本计数
            version_info = await self.mongodb_client.get_graph_version_info(graph_name, user_id)
            version_count = version_info.get("version_count", 1) if version_info else 1

            return {
                "status": "success",
                "message": f"版本创建成功",
                "version_id": version_id,
                "version_count": version_count
            }

        except Exception as e:
            logger.error(f"创建图版本失败: {str(e)}")
            return {
                "status": "error",
                "message": f"创建版本失败: {str(e)}"
            }

    async def get_graph_versions(self, graph_name: str, user_id: str = "default_user") -> Dict[str, Any]:
        """获取图的所有版本历史"""
        try:
            # 验证用户是否有权访问该图
            graph_config = await self.get_graph(graph_name, user_id)
            if not graph_config:
                logger.warning(f"用户 {user_id} 无权访问图 '{graph_name}' 的版本")
                return {
                    "graph_name": graph_name,
                    "version_count": 0,
                    "versions": []
                }

            version_info = await self.mongodb_client.get_graph_version_info(graph_name, user_id)

            if not version_info or not version_info.get("versions"):
                return {
                    "graph_name": graph_name,
                    "version_count": 0,
                    "versions": []
                }

            return {
                "graph_name": graph_name,
                "version_count": version_info.get("version_count", 0),
                "versions": version_info.get("versions", [])
            }

        except Exception as e:
            logger.error(f"获取版本列表失败: {str(e)}")
            return {
                "graph_name": graph_name,
                "version_count": 0,
                "versions": []
            }

    async def get_graph_version(self, graph_name: str, version_id: str, user_id: str = "default_user") -> Optional[Dict[str, Any]]:
        """
        获取特定版本的配置

        Args:
            graph_name: 图名称
            version_id: 版本ID
            user_id: 用户ID，默认为 "default_user"

        Returns:
            Dict 包含 config 和 commit_message
        """
        try:
            # 从 MinIO 获取配置
            config = graph_config_version_manager.get_version(graph_name, version_id, user_id)
            if not config:
                return None

            # 从 MongoDB 获取 commit_message
            version_info = await self.mongodb_client.get_graph_version_info(graph_name, user_id)
            commit_message = None

            if version_info and version_info.get("versions"):
                for v in version_info["versions"]:
                    if v["version_id"] == version_id:
                        commit_message = v.get("commit_message")
                        break

            return {
                "config": config,
                "commit_message": commit_message
            }

        except Exception as e:
            logger.error(f"获取版本配置失败: {str(e)}")
            return None

    async def delete_graph_version(self, graph_name: str, version_id: str, user_id: str = "default_user") -> Dict[str, Any]:
        """
        删除特定版本

        Args:
            graph_name: 图名称
            version_id: 版本ID
            user_id: 用户ID，默认为 "default_user"

        Returns:
            Dict: 删除结果

        同时删除 MinIO 中的版本和 MongoDB 中的版本记录
        """
        try:
            # 1. 从 MinIO 删除版本
            minio_success = graph_config_version_manager.delete_version(graph_name, version_id, user_id)

            # 2. 从 MongoDB 删除版本记录
            mongo_success = await self.mongodb_client.remove_graph_version_record(graph_name, version_id, user_id)

            if minio_success and mongo_success:
                return {
                    "status": "success",
                    "message": f"版本 {version_id} 已删除"
                }
            elif minio_success and not mongo_success:
                return {
                    "status": "warning",
                    "message": f"版本从 MinIO 删除成功，但 MongoDB 记录删除失败"
                }
            else:
                return {
                    "status": "error",
                    "message": "删除版本失败"
                }

        except Exception as e:
            logger.error(f"删除版本失败: {str(e)}")
            return {
                "status": "error",
                "message": f"删除版本失败: {str(e)}"
            }


graph_service = GraphService()