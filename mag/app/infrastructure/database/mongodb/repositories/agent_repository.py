import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class AgentRepository:
    """Agent Repository - 负责 agents 集合的 CRUD 操作"""

    def __init__(self, db, agents_collection):
        """初始化 Agent Repository"""
        self.db = db
        self.agents_collection = agents_collection

    async def create_agent(self, agent_config: Dict[str, Any], user_id: str) -> Optional[str]:
        """
        创建 Agent

        Args:
            agent_config: Agent 配置字典
            user_id: 用户 ID

        Returns:
            创建成功返回 Agent ID，失败返回 None
        """
        try:
            now = datetime.now()
            agent_name = agent_config.get("name")

            agent_doc = {
                "name": agent_name,
                "agent_config": agent_config,
                "user_id": user_id,
                "created_at": now,
                "updated_at": now
            }

            result = await self.agents_collection.insert_one(agent_doc)
            logger.info(f"创建 Agent 成功: {agent_name}, user_id: {user_id}")
            return str(result.inserted_id)

        except Exception as e:
            logger.error(f"创建 Agent 失败: {str(e)}")
            if "duplicate key" in str(e).lower():
                logger.warning(f"Agent 已存在: {agent_name} (user_id: {user_id})")
            return None

    async def get_agent(self, agent_name: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        获取 Agent（通过 name + user_id）

        Args:
            agent_name: Agent 名称
            user_id: 用户 ID

        Returns:
            Agent 文档，不存在返回 None
        """
        try:
            agent = await self.agents_collection.find_one({
                "name": agent_name,
                "user_id": user_id
            })

            if agent:
                return self._convert_objectid_to_str(agent)
            return None

        except Exception as e:
            logger.error(f"获取 Agent 失败 ({agent_name}): {str(e)}")
            return None

    async def get_agent_by_id(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        获取 Agent（通过 _id）

        Args:
            agent_id: Agent ID

        Returns:
            Agent 文档，不存在返回 None
        """
        try:
            agent = await self.agents_collection.find_one({"_id": ObjectId(agent_id)})

            if agent:
                return self._convert_objectid_to_str(agent)
            return None

        except Exception as e:
            logger.error(f"通过 ID 获取 Agent 失败 ({agent_id}): {str(e)}")
            return None

    async def update_agent(
        self,
        agent_name: str,
        user_id: str,
        agent_config: Dict[str, Any]
    ) -> bool:
        """
        更新 Agent

        Args:
            agent_name: Agent 名称
            user_id: 用户 ID
            agent_config: 新的 Agent 配置

        Returns:
            更新成功返回 True，失败返回 False
        """
        try:
            update_doc = {
                "$set": {
                    "agent_config": agent_config,
                    "updated_at": datetime.now()
                }
            }

            result = await self.agents_collection.update_one(
                {"name": agent_name, "user_id": user_id},
                update_doc
            )

            if result.modified_count > 0:
                logger.info(f"更新 Agent 成功: {agent_name}")
                return True
            else:
                logger.warning(f"Agent 未找到或无变化: {agent_name}")
                return False

        except Exception as e:
            logger.error(f"更新 Agent 失败 ({agent_name}): {str(e)}")
            return False

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
            result = await self.agents_collection.delete_one({
                "name": agent_name,
                "user_id": user_id
            })

            if result.deleted_count > 0:
                logger.info(f"删除 Agent 成功: {agent_name}")
                return True
            else:
                logger.warning(f"Agent 未找到: {agent_name}")
                return False

        except Exception as e:
            logger.error(f"删除 Agent 失败 ({agent_name}): {str(e)}")
            return False

    async def list_agents(
        self,
        user_id: str,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        列出 Agents（支持分类过滤）

        Args:
            user_id: 用户 ID
            category: 分类过滤（可选）
            skip: 跳过数量
            limit: 返回数量限制

        Returns:
            Agent 列表
        """
        try:
            query = {"user_id": user_id}
            if category:
                query["agent_config.category"] = category

            cursor = self.agents_collection.find(query).sort("updated_at", -1).skip(skip).limit(limit)
            agents = await cursor.to_list(length=limit)

            return [self._convert_objectid_to_str(agent) for agent in agents]

        except Exception as e:
            logger.error(f"列出 Agents 失败: {str(e)}")
            return []

    async def list_categories(self, user_id: str) -> List[Dict[str, Any]]:
        """
        列出所有分类及其 Agent 数量

        Args:
            user_id: 用户 ID

        Returns:
            分类列表，格式：[{"category": "coding", "agent_count": 5}, ...]
        """
        try:
            pipeline = [
                {"$match": {"user_id": user_id}},
                {
                    "$group": {
                        "_id": "$agent_config.category",
                        "agent_count": {"$sum": 1}
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "category": "$_id",
                        "agent_count": 1
                    }
                },
                {"$sort": {"category": 1}}
            ]

            categories = await self.agents_collection.aggregate(pipeline).to_list(None)
            return categories

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
            cursor = self.agents_collection.find(
                {
                    "user_id": user_id,
                    "agent_config.category": category
                },
                {
                    "name": 1,
                    "agent_config.tags": 1,
                    "_id": 0
                }
            ).sort("name", 1)

            agents = await cursor.to_list(length=None)

            # 重构返回格式
            result = []
            for agent in agents:
                result.append({
                    "name": agent.get("name"),
                    "tags": agent.get("agent_config", {}).get("tags", [])
                })

            return result

        except Exception as e:
            logger.error(f"列出分类下 Agents 失败 ({category}): {str(e)}")
            return []

    async def get_agent_details(self, agent_name: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        获取 Agent 详细信息（包括完整的 card）

        Args:
            agent_name: Agent 名称
            user_id: 用户 ID

        Returns:
            Agent 详情，包含 name, card, category, tags, model, max_actions
        """
        try:
            agent = await self.get_agent(agent_name, user_id)

            if not agent:
                return None

            agent_config = agent.get("agent_config", {})

            return {
                "name": agent_config.get("name"),
                "card": agent_config.get("card"),
                "category": agent_config.get("category"),
                "tags": agent_config.get("tags", []),
                "model": agent_config.get("model"),
                "max_actions": agent_config.get("max_actions", 50)
            }

        except Exception as e:
            logger.error(f"获取 Agent 详情失败 ({agent_name}): {str(e)}")
            return None

    async def count_agents(self, user_id: str, category: Optional[str] = None) -> int:
        """
        统计 Agent 数量

        Args:
            user_id: 用户 ID
            category: 分类过滤（可选）

        Returns:
            Agent 数量
        """
        try:
            query = {"user_id": user_id}
            if category:
                query["agent_config.category"] = category

            count = await self.agents_collection.count_documents(query)
            return count

        except Exception as e:
            logger.error(f"统计 Agent 数量失败: {str(e)}")
            return 0

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将 ObjectId 转换为字符串"""
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc
