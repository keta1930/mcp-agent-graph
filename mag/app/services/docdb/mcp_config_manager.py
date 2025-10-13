import logging
from typing import Dict, Any, Optional
from datetime import datetime
from pymongo.errors import DuplicateKeyError

logger = logging.getLogger(__name__)


class MCPConfigManager:
    """MCP配置管理器 - 使用乐观锁机制"""

    def __init__(self, db, collection):
        self.db = db
        self.collection = collection
        self.config_id = "mcp_config"

    async def create_mcp_config(self, initial_config: Dict[str, Any] = None) -> bool:
        """创建初始MCP配置"""
        try:
            config_doc = {
                "_id": self.config_id,
                "version": 1,
                "config": initial_config or {"mcpServers": {}},
                "updated_at": datetime.now()
            }
            await self.collection.insert_one(config_doc)
            logger.info("MCP配置初始化成功")
            return True
        except DuplicateKeyError:
            logger.info("MCP配置已存在")
            return True
        except Exception as e:
            logger.error(f"创建MCP配置失败: {str(e)}")
            return False

    async def get_mcp_config(self) -> Optional[Dict[str, Any]]:
        """获取MCP配置"""
        try:
            doc = await self.collection.find_one({"_id": self.config_id})
            if doc:
                return {
                    "config": doc.get("config", {"mcpServers": {}}),
                    "version": doc.get("version", 1),
                    "updated_at": doc.get("updated_at")
                }

            await self.create_mcp_config()
            return {
                "config": {"mcpServers": {}},
                "version": 1,
                "updated_at": datetime.now()
            }
        except Exception as e:
            logger.error(f"获取MCP配置失败: {str(e)}")
            return None

    async def update_mcp_config(self, new_config: Dict[str, Any], expected_version: int) -> Dict[str, Any]:
        """更新MCP配置

        Args:
            new_config: 新的配置内容
            expected_version: 客户端读取时的版本号

        Returns:
            成功: {"success": True, "version": new_version}
            版本冲突: {"success": False, "error": "version_conflict", "current_version": x, "expected_version": y}
            其他失败: {"success": False, "error": "错误信息"}
        """
        try:
            new_version = expected_version + 1

            result = await self.collection.update_one(
                {"_id": self.config_id, "version": expected_version},
                {
                    "$set": {
                        "config": new_config,
                        "version": new_version,
                        "updated_at": datetime.now()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"MCP配置更新成功，版本: {expected_version} -> {new_version}")
                return {"success": True, "version": new_version}

            current_doc = await self.collection.find_one({"_id": self.config_id})
            if not current_doc:
                await self.create_mcp_config(new_config)
                return {"success": True, "version": 1}

            current_version = current_doc.get("version", 0)
            if current_version != expected_version:
                logger.warning(
                    f"版本冲突: 期望版本={expected_version}, 当前版本={current_version}"
                )
                return {
                    "success": False,
                    "error": "version_conflict",
                    "message": "配置已被其他用户修改，请刷新后重试",
                    "current_version": current_version,
                    "expected_version": expected_version
                }

            return {"success": False, "error": "update_failed"}

        except Exception as e:
            logger.error(f"更新MCP配置失败: {str(e)}")
            return {"success": False, "error": str(e)}