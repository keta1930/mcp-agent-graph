"""
团队设置数据仓库

负责团队设置的CRUD操作
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from bson import ObjectId

logger = logging.getLogger(__name__)


class TeamSettingsRepository:
    """团队设置Repository - 负责team_settings集合的操作"""

    TEAM_CONFIG_ID = "team_config"  # 固定的文档ID

    def __init__(self, db, team_settings_collection):
        """初始化团队设置Repository"""
        self.db = db
        self.collection = team_settings_collection

    async def get_team_settings(self) -> Optional[dict]:
        """
        获取团队设置

        Returns:
            dict | None: 团队设置文档，如果不存在则返回None
        """
        try:
            settings = await self.collection.find_one({"_id": self.TEAM_CONFIG_ID})
            if settings:
                return self._convert_objectid_to_str(settings)
            return None
        except Exception as e:
            logger.error(f"获取团队设置失败: {str(e)}")
            return None

    async def update_team_settings(self, team_name: str, updated_by: str) -> dict:
        """
        更新团队设置

        Args:
            team_name: 团队名称
            updated_by: 更新者user_id

        Returns:
            dict: 更新后的团队设置文档

        Raises:
            Exception: 更新失败
        """
        try:
            now = datetime.now(timezone.utc)

            # 使用 upsert 确保文档存在
            result = await self.collection.find_one_and_update(
                {"_id": self.TEAM_CONFIG_ID},
                {
                    "$set": {
                        "team_name": team_name,
                        "updated_at": now,
                        "updated_by": updated_by
                    },
                    "$setOnInsert": {
                        "created_at": now
                    }
                },
                upsert=True,
                return_document=True  # 返回更新后的文档
            )

            logger.info(f"团队设置已更新: {team_name}, 更新者: {updated_by}")
            return self._convert_objectid_to_str(result)

        except Exception as e:
            logger.error(f"更新团队设置失败: {str(e)}")
            raise

    async def initialize_team_settings(self, team_name: str = "My Team") -> dict:
        """
        初始化团队设置（如果不存在）

        Args:
            team_name: 默认团队名称

        Returns:
            dict: 团队设置文档
        """
        try:
            # 检查是否已存在
            existing = await self.get_team_settings()
            if existing:
                logger.info("团队设置已存在，跳过初始化")
                return existing

            # 创建新的团队设置
            now = datetime.now(timezone.utc)

            settings_doc = {
                "_id": self.TEAM_CONFIG_ID,
                "team_name": team_name,
                "created_at": now,
                "updated_at": now,
                "updated_by": "system"
            }

            await self.collection.insert_one(settings_doc)

            logger.info(f"团队设置初始化成功: {team_name}")
            return self._convert_objectid_to_str(settings_doc)

        except Exception as e:
            if "duplicate key" in str(e).lower():
                # 如果在并发情况下已经创建了，直接返回
                logger.warning("团队设置已被并发创建，获取现有设置")
                return await self.get_team_settings()
            logger.error(f"初始化团队设置失败: {str(e)}")
            raise

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc
