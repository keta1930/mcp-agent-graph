import logging
from typing import Dict, Any, Optional
from datetime import datetime
from pymongo.errors import DuplicateKeyError

logger = logging.getLogger(__name__)


class MCPConfigRepository:
    """MCP配置管理器 - 团队级配置，使用乐观锁机制"""

    TEAM_MCP_CONFIG_ID = "team_mcp_config"  # 固定的文档ID，全团队共享

    def __init__(self, db, collection):
        self.db = db
        self.collection = collection

    async def initialize_mcp_config(self, initial_config: Dict[str, Any] = None) -> bool:
        """初始化团队MCP配置

        Args:
            initial_config: 初始配置内容

        Returns:
            bool: 是否成功
        """
        try:
            config_doc = {
                "_id": self.TEAM_MCP_CONFIG_ID,
                "version": 1,
                "config": initial_config or {"mcpServers": {}},
                "updated_at": datetime.now(),
                "created_at": datetime.now()
            }
            await self.collection.insert_one(config_doc)
            logger.info("团队MCP配置初始化成功")
            return True
        except DuplicateKeyError:
            logger.info("团队MCP配置已存在")
            return True
        except Exception as e:
            logger.error(f"创建团队MCP配置失败: {str(e)}")
            return False

    async def get_mcp_config(self) -> Optional[Dict[str, Any]]:
        """获取团队MCP配置

        Returns:
            Optional[Dict[str, Any]]: MCP配置，包含config、version、updated_at
        """
        try:
            doc = await self.collection.find_one({"_id": self.TEAM_MCP_CONFIG_ID})

            if doc:
                return {
                    "config": doc.get("config", {"mcpServers": {}}),
                    "version": doc.get("version", 1),
                    "updated_at": doc.get("updated_at")
                }

            # 如果不存在，自动初始化
            await self.initialize_mcp_config()
            return {
                "config": {"mcpServers": {}},
                "version": 1,
                "updated_at": datetime.now()
            }
        except Exception as e:
            logger.error(f"获取团队MCP配置失败: {str(e)}")
            return None

    async def update_mcp_config(self, new_config: Dict[str, Any],
                               expected_version: int) -> Dict[str, Any]:
        """更新团队MCP配置（使用乐观锁）

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
                {"_id": self.TEAM_MCP_CONFIG_ID, "version": expected_version},
                {
                    "$set": {
                        "config": new_config,
                        "version": new_version,
                        "updated_at": datetime.now()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"团队MCP配置更新成功，版本: {expected_version} -> {new_version}")
                return {"success": True, "version": new_version}

            # 检查是否是版本冲突
            current_doc = await self.collection.find_one({"_id": self.TEAM_MCP_CONFIG_ID})
            if not current_doc:
                # 配置不存在，自动创建
                await self.initialize_mcp_config(new_config)
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
            logger.error(f"更新团队MCP配置失败: {str(e)}")
            return {"success": False, "error": str(e)}

    async def check_server_provider(self, server_name: str, user_id: str) -> bool:
        """检查用户是否是指定MCP服务器的提供者

        Args:
            server_name: 服务器名称
            user_id: 用户ID

        Returns:
            bool: 是否是提供者
        """
        try:
            doc = await self.collection.find_one({"_id": self.TEAM_MCP_CONFIG_ID})
            if not doc:
                return False

            config = doc.get("config", {})
            servers = config.get("mcpServers", {})
            server_config = servers.get(server_name, {})

            provider_user_id = server_config.get("provider_user_id")
            return provider_user_id == user_id

        except Exception as e:
            logger.error(f"检查MCP服务器提供者失败: {str(e)}")
            return False
