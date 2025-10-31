import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

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
                "_id": graph_name,
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

    async def get_graph(self, graph_name: str) -> Optional[Dict[str, Any]]:
        """获取图配置"""
        try:
            doc = await self.collection.find_one({"_id": graph_name})
            return doc.get("config") if doc else None
        except Exception as e:
            logger.error(f"获取图配置失败: {str(e)}")
            return None

    async def update_graph(self, graph_name: str, graph_config: Dict[str, Any]) -> bool:
        """更新图配置"""
        try:
            result = await self.collection.update_one(
                {"_id": graph_name},
                {
                    "$set": {
                        "config": graph_config,
                        "updated_at": datetime.now()
                    }
                }
            )
            return result.modified_count > 0 or result.matched_count > 0
        except Exception as e:
            logger.error(f"更新图配置失败: {str(e)}")
            return False

    async def delete_graph(self, graph_name: str) -> bool:
        """删除图配置"""
        try:
            result = await self.collection.delete_one({"_id": graph_name})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"删除图配置失败: {str(e)}")
            return False

    async def list_graphs(self, user_id: str = "default_user") -> List[str]:
        """列出所有图"""
        try:
            cursor = self.collection.find(
                {"user_id": user_id},
                {"_id": 1}
            ).sort("updated_at", -1)
            docs = await cursor.to_list(length=None)
            return [doc["_id"] for doc in docs]
        except Exception as e:
            logger.error(f"列出图配置失败: {str(e)}")
            return []

    async def rename_graph(self, old_name: str, new_name: str) -> bool:
        """重命名图"""
        try:
            doc = await self.collection.find_one({"_id": old_name})
            if not doc:
                return False

            existing = await self.collection.find_one({"_id": new_name})
            if existing:
                return False

            config = doc["config"]
            config["name"] = new_name

            new_doc = {
                "_id": new_name,
                "name": new_name,
                "config": config,
                "user_id": doc["user_id"],
                "created_at": doc["created_at"],
                "updated_at": datetime.now()
            }

            await self.collection.insert_one(new_doc)
            await self.collection.delete_one({"_id": old_name})
            return True
        except Exception as e:
            logger.error(f"重命名图配置失败: {str(e)}")
            return False

    async def graph_exists(self, graph_name: str) -> bool:
        """检查图是否存在"""
        try:
            count = await self.collection.count_documents({"_id": graph_name})
            return count > 0
        except Exception as e:
            logger.error(f"检查图是否存在失败: {str(e)}")
            return False