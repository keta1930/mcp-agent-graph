"""
Agent 服务
整合 Agent 管理功能，提供统一的业务逻辑层
"""
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from app.infrastructure.database.mongodb import mongodb_client
from app.services.agent.agent_stream_executor import AgentStreamExecutor
from app.services.model.model_service import model_service
from app.services.mcp.mcp_service import mcp_service
from app.services.system_tools import get_tool_names

logger = logging.getLogger(__name__)


class AgentService:
    """Agent 服务 - 负责 Agent 业务逻辑和数据库交互"""

    def __init__(self):
        """初始化 Agent 服务"""
        self.agent_stream_executor = AgentStreamExecutor()

    async def create_agent(self, agent_config: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """
        创建 Agent

        Args:
            agent_config: Agent 配置字典
            user_id: 用户 ID

        Returns:
            创建结果
        """
        try:
            # 验证配置
            is_valid, error_msg = await self.validate_agent_config(agent_config, user_id)
            if not is_valid:
                return {
                    "success": False,
                    "error": f"Agent 配置验证失败: {error_msg}"
                }

            # 创建 Agent
            agent_id = await mongodb_client.agent_repository.create_agent(agent_config, user_id)

            if agent_id:
                # 创建对应的 memory 文档
                agent_name = agent_config.get('name')
                try:
                    await mongodb_client.memories_collection.insert_one({
                        "user_id": user_id,
                        "owner_type": "agent",
                        "owner_id": agent_name,
                        "memories": {},
                        "created_at": datetime.now(),
                        "updated_at": datetime.now()
                    })
                    logger.info(f"为 Agent 创建 memory 文档成功: {agent_name}")
                except Exception as mem_error:
                    logger.warning(f"为 Agent 创建 memory 文档失败: {agent_name}, 错误: {str(mem_error)}")

                logger.info(f"创建 Agent 成功: {agent_name} (user_id: {user_id})")
                return {
                    "success": True,
                    "agent_id": agent_id,
                    "agent_name": agent_name
                }
            else:
                return {
                    "success": False,
                    "error": "创建 Agent 失败，可能 Agent 名称已存在"
                }

        except Exception as e:
            logger.error(f"创建 Agent 失败: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_agent(self, agent_name: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        获取 Agent

        Args:
            agent_name: Agent 名称
            user_id: 用户 ID

        Returns:
            Agent 文档，不存在返回 None
        """
        try:
            return await mongodb_client.agent_repository.get_agent(agent_name, user_id)
        except Exception as e:
            logger.error(f"获取 Agent 失败 ({agent_name}): {str(e)}")
            return None

    async def update_agent(
        self,
        agent_name: str,
        agent_config: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """
        更新 Agent

        Args:
            agent_name: Agent 名称
            agent_config: 新的 Agent 配置
            user_id: 用户 ID

        Returns:
            更新结果
        """
        try:
            # 验证配置
            is_valid, error_msg = await self.validate_agent_config(agent_config, user_id)
            if not is_valid:
                return {
                    "success": False,
                    "error": f"Agent 配置验证失败: {error_msg}"
                }

            # 更新 Agent
            success = await mongodb_client.agent_repository.update_agent(
                agent_name=agent_name,
                user_id=user_id,
                agent_config=agent_config
            )

            if success:
                logger.info(f"更新 Agent 成功: {agent_name} (user_id: {user_id})")
                return {
                    "success": True,
                    "agent_name": agent_name
                }
            else:
                return {
                    "success": False,
                    "error": "更新 Agent 失败，Agent 可能不存在"
                }

        except Exception as e:
            logger.error(f"更新 Agent 失败 ({agent_name}): {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def delete_agent(self, agent_name: str, user_id: str) -> bool:
        """
        删除 Agent

        Args:
            agent_name: Agent 名称
            user_id: 用户 ID

        Returns:
            删除成功返回 True，失败返回 False
        """
        try:
            success = await mongodb_client.agent_repository.delete_agent(agent_name, user_id)

            if success:
                # 删除对应的 memory 文档
                try:
                    delete_result = await mongodb_client.memories_collection.delete_one({
                        "user_id": user_id,
                        "owner_type": "agent",
                        "owner_id": agent_name
                    })
                    if delete_result.deleted_count > 0:
                        logger.info(f"删除 Agent 的 memory 文档成功: {agent_name}")
                    else:
                        logger.warning(f"未找到 Agent 的 memory 文档: {agent_name}")
                except Exception as mem_error:
                    logger.warning(f"删除 Agent 的 memory 文档失败: {agent_name}, 错误: {str(mem_error)}")

                logger.info(f"删除 Agent 成功: {agent_name} (user_id: {user_id})")
            else:
                logger.warning(f"删除 Agent 失败: {agent_name} (user_id: {user_id})")

            return success

        except Exception as e:
            logger.error(f"删除 Agent 失败 ({agent_name}): {str(e)}")
            return False

    async def list_agents(
        self,
        user_id: str,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        列出 Agents（支持分类过滤和分页）

        Args:
            user_id: 用户 ID
            category: 分类过滤（可选）
            skip: 跳过数量
            limit: 返回数量限制

        Returns:
            包含 agents 列表和总数的字典
        """
        try:
            agents = await mongodb_client.agent_repository.list_agents(
                user_id=user_id,
                category=category,
                skip=skip,
                limit=limit
            )

            total = await mongodb_client.agent_repository.count_agents(
                user_id=user_id,
                category=category
            )

            return {
                "success": True,
                "agents": agents,
                "total": total,
                "skip": skip,
                "limit": limit
            }

        except Exception as e:
            logger.error(f"列出 Agents 失败: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "agents": [],
                "total": 0
            }

    async def list_categories(self, user_id: str) -> List[Dict[str, Any]]:
        """
        列出所有分类及其 Agent 数量

        Args:
            user_id: 用户 ID

        Returns:
            分类列表，格式：[{"category": "coding", "agent_count": 5}, ...]
        """
        try:
            return await mongodb_client.agent_repository.list_categories(user_id)
        except Exception as e:
            logger.error(f"列出分类失败: {str(e)}")
            return []

    async def list_agents_in_category(
        self,
        user_id: str,
        category: str
    ) -> List[Dict[str, Any]]:
        """
        列出指定分类下的所有 Agents（只返回 name 和 tags）

        Args:
            user_id: 用户 ID
            category: 分类名称

        Returns:
            Agent 列表，格式：[{"name": "...", "tags": [...]}, ...]
        """
        try:
            return await mongodb_client.agent_repository.list_agents_in_category(
                user_id=user_id,
                category=category
            )
        except Exception as e:
            logger.error(f"列出分类下 Agents 失败 ({category}): {str(e)}")
            return []

    async def get_agent_details(
        self,
        agent_name: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        获取 Agent 详细信息（包括完整的 card）

        Args:
            agent_name: Agent 名称
            user_id: 用户 ID

        Returns:
            Agent 详情，包含 name, card, category, tags, model, max_actions
        """
        try:
            return await mongodb_client.agent_repository.get_agent_details(
                agent_name=agent_name,
                user_id=user_id
            )
        except Exception as e:
            logger.error(f"获取 Agent 详情失败 ({agent_name}): {str(e)}")
            return None

    async def validate_agent_config(
        self,
        agent_config: Dict[str, Any],
        user_id: str
    ) -> Tuple[bool, Optional[str]]:
        """
        验证 Agent 配置的有效性

        Args:
            agent_config: Agent 配置字典
            user_id: 用户 ID

        Returns:
            (是否有效, 错误信息)
        """
        try:
            # 1. 验证必需字段
            required_fields = ["name", "model"]
            for field in required_fields:
                if field not in agent_config or not agent_config[field]:
                    return False, f"缺少必需字段: {field}"

            # 2. 验证 model 是否存在
            model_name = agent_config.get("model")
            model_config = await model_service.get_model(model_name, user_id)
            if not model_config:
                return False, f"模型不存在: {model_name}"

            # 3. 验证 mcp 服务器列表
            mcp_servers = agent_config.get("mcp", [])
            if mcp_servers:
                # 获取当前配置的所有 MCP 服务器
                mcp_config_data = await mongodb_client.get_mcp_config()
                if mcp_config_data:
                    configured_servers = mcp_config_data.get("config", {}).get("mcpServers", {})
                else:
                    configured_servers = {}

                # 验证每个服务器是否已配置
                for server_name in mcp_servers:
                    if server_name not in configured_servers:
                        return False, f"MCP 服务器未配置: {server_name}"

            # 4. 验证 system_tools 列表
            system_tool_names = agent_config.get("system_tools", [])
            if system_tool_names:
                # 获取所有支持的系统工具名称
                available_tools = get_tool_names()

                # 验证每个工具是否存在
                for tool_name in system_tool_names:
                    if tool_name not in available_tools:
                        return False, f"系统工具不支持: {tool_name}"

            # 5. 验证 max_actions 范围
            max_actions = agent_config.get("max_actions", 50)
            if not isinstance(max_actions, int):
                return False, "max_actions 必须是整数"

            if max_actions < 1 or max_actions > 200:
                return False, "max_actions 必须在 1-200 之间"

            # 6. 验证 category（可选字段，但如果存在则验证）
            category = agent_config.get("category")
            if category is not None and not isinstance(category, str):
                return False, "category 必须是字符串"

            # 7. 验证 tags（可选字段，但如果存在则验证）
            tags = agent_config.get("tags", [])
            if not isinstance(tags, list):
                return False, "tags 必须是列表"

            # 8. 验证 instruction（可选字段，但如果存在则验证）
            instruction = agent_config.get("instruction")
            if instruction is not None and not isinstance(instruction, str):
                return False, "instruction 必须是字符串"

            # 验证通过
            return True, None

        except Exception as e:
            logger.error(f"验证 Agent 配置时出错: {str(e)}")
            return False, f"验证失败: {str(e)}"


# 创建全局 Agent 服务实例
agent_service = AgentService()
