import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from app.utils.permission_utils import can_access_resource, verify_resource_ownership

logger = logging.getLogger(__name__)


class GraphConfigRepository:
    """Graph配置管理器"""

    def __init__(self, db, collection):
        self.db = db
        self.collection = collection

    async def create_graph(self, graph_name: str, graph_config: Dict[str, Any],
                           user_id: str = "default_user") -> bool:
        """创建图配置"""
        try:
            document = {
                "name": graph_name,
                "config": graph_config,
                "user_id": user_id,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            await self.collection.insert_one(document)
            return True
        except Exception as e:
            logger.error(f"创建图配置失败: {str(e)}")
            return False

    async def get_graph(self, graph_name: str, user_id: Optional[str] = None,
                       check_shared: bool = True) -> Optional[Dict[str, Any]]:
        """
        获取图配置

        Args:
            graph_name: 图名称
            user_id: 用户ID（必需，用于定位用户的图）
            check_shared: 是否检查共享权限（仅在user_id不为None时有效）

        Returns:
            包含完整图信息的字典（config, user_id, shared_with等），如果无权访问或不存在则返回None
        """
        try:
            if user_id is None:
                logger.warning(f"get_graph called without user_id for graph '{graph_name}'")
                return None

            doc = await self.collection.find_one({"name": graph_name, "user_id": user_id})
            if not doc:
                return None

            # 验证访问权限
            if not can_access_resource(doc, user_id, require_owner=False):
                logger.warning(
                    f"User {user_id} attempted to access graph '{graph_name}' "
                    f"owned by {doc.get('user_id')}"
                )
                return None

            return doc
        except Exception as e:
            logger.error(f"获取图配置失败: {str(e)}")
            return None

    async def update_graph(self, graph_name: str, graph_config: Dict[str, Any],
                          user_id: Optional[str] = None) -> bool:
        """
        更新图配置

        Args:
            graph_name: 图名称
            graph_config: 新的图配置
            user_id: 用户ID（必需，用于定位用户的图）

        Returns:
            是否更新成功

        Raises:
            ValueError: 当用户无权修改时
        """
        try:
            if user_id is None:
                logger.warning(f"update_graph called without user_id for graph '{graph_name}'")
                return False

            doc = await self.collection.find_one({"name": graph_name, "user_id": user_id})
            if not doc:
                logger.warning(f"Graph '{graph_name}' not found for user '{user_id}'")
                return False

            # 验证所有者权限（只有所有者可以修改）
            verify_resource_ownership(doc, user_id, "graph")

            result = await self.collection.update_one(
                {"name": graph_name, "user_id": user_id},
                {
                    "$set": {
                        "config": graph_config,
                        "updated_at": datetime.now()
                    }
                }
            )
            return result.modified_count > 0 or result.matched_count > 0
        except ValueError:
            # 重新抛出权限错误
            raise
        except Exception as e:
            logger.error(f"更新图配置失败: {str(e)}")
            return False

    async def delete_graph(self, graph_name: str, user_id: Optional[str] = None) -> bool:
        """
        删除图配置

        Args:
            graph_name: 图名称
            user_id: 用户ID（必需，用于定位用户的图）

        Returns:
            是否删除成功

        Raises:
            ValueError: 当用户无权删除时
        """
        try:
            if user_id is None:
                logger.warning(f"delete_graph called without user_id for graph '{graph_name}'")
                return False

            doc = await self.collection.find_one({"name": graph_name, "user_id": user_id})
            if not doc:
                logger.warning(f"Graph '{graph_name}' not found for user '{user_id}'")
                return False

            # 验证所有者权限（只有所有者可以删除）
            verify_resource_ownership(doc, user_id, "graph")

            result = await self.collection.delete_one({"name": graph_name, "user_id": user_id})
            return result.deleted_count > 0
        except ValueError:
            # 重新抛出权限错误
            raise
        except Exception as e:
            logger.error(f"删除图配置失败: {str(e)}")
            return False

    async def list_graphs(self, user_id: str = "default_user") -> List[str]:
        """列出所有图"""
        try:
            cursor = self.collection.find(
                {"user_id": user_id},
                {"name": 1}
            ).sort("updated_at", -1)
            docs = await cursor.to_list(length=None)
            return [doc["name"] for doc in docs]
        except Exception as e:
            logger.error(f"列出图配置失败: {str(e)}")
            return []

    async def rename_graph(self, old_name: str, new_name: str,
                          user_id: Optional[str] = None) -> bool:
        """
        重命名图

        Args:
            old_name: 旧图名称
            new_name: 新图名称
            user_id: 用户ID（必需，用于定位用户的图）

        Returns:
            是否重命名成功

        Raises:
            ValueError: 当用户无权重命名时
        """
        try:
            if user_id is None:
                logger.warning(f"rename_graph called without user_id")
                return False

            doc = await self.collection.find_one({"name": old_name, "user_id": user_id})
            if not doc:
                return False

            # 验证所有者权限
            verify_resource_ownership(doc, user_id, "graph")

            # 检查新名称是否已存在
            existing = await self.collection.find_one({"name": new_name, "user_id": user_id})
            if existing:
                return False

            # 更新config中的name
            config = doc["config"]
            config["name"] = new_name

            # 直接更新文档的name字段
            result = await self.collection.update_one(
                {"name": old_name, "user_id": user_id},
                {
                    "$set": {
                        "name": new_name,
                        "config": config,
                        "updated_at": datetime.now()
                    }
                }
            )
            return result.modified_count > 0
        except ValueError:
            # 重新抛出权限错误
            raise
        except Exception as e:
            logger.error(f"重命名图配置失败: {str(e)}")
            return False

    async def graph_exists(self, graph_name: str, user_id: str = "default_user") -> bool:
        """检查图是否存在"""
        try:
            count = await self.collection.count_documents({"name": graph_name, "user_id": user_id})
            return count > 0
        except Exception as e:
            logger.error(f"检查图是否存在失败: {str(e)}")
            return False

    async def add_version_record(self, graph_name: str, version_record: Dict[str, Any],
                                 user_id: str = "default_user") -> bool:
        """
        添加版本记录到 version_info.versions 数组

        Args:
            graph_name: 图名称
            version_record: 版本记录 {
                "version_id": "...",
                "commit_message": "...",
                "created_at": "...",
                "size": 2048
            }
            user_id: 用户ID
        """
        try:
            result = await self.collection.update_one(
                {"name": graph_name, "user_id": user_id},
                {
                    "$push": {
                        "version_info.versions": {
                            "$each": [version_record],
                            "$position": 0  # 插入到数组开头（最新的在前）
                        }
                    },
                    "$inc": {
                        "version_info.version_count": 1
                    },
                    "$set": {
                        "updated_at": datetime.now()
                    }
                },
                upsert=True  # 如果 version_info 不存在则创建
            )
            return result.modified_count > 0 or result.upserted_id is not None
        except Exception as e:
            logger.error(f"添加版本记录失败: {str(e)}")
            return False

    async def get_version_info(self, graph_name: str, user_id: str = "default_user") -> Optional[Dict[str, Any]]:
        """获取版本信息"""
        try:
            doc = await self.collection.find_one({"name": graph_name, "user_id": user_id})
            return doc.get("version_info") if doc else None
        except Exception as e:
            logger.error(f"获取版本信息失败: {str(e)}")
            return None

    async def remove_version_record(self, graph_name: str, version_id: str,
                                    user_id: str = "default_user") -> bool:
        """
        从 version_info.versions 数组中移除指定版本记录
        """
        try:
            result = await self.collection.update_one(
                {"name": graph_name, "user_id": user_id},
                {
                    "$pull": {
                        "version_info.versions": {
                            "version_id": version_id
                        }
                    },
                    "$inc": {
                        "version_info.version_count": -1
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"移除版本记录失败: {str(e)}")
            return False