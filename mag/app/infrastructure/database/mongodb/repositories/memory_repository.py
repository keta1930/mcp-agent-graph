"""
Memory Repository - MongoDB版本
负责记忆的MongoDB存储、检索、更新和删除操作
"""
import logging
import random
import string
from datetime import datetime
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)


class MemoryRepository:
    """Memory管理器类 - MongoDB版本"""

    def __init__(self, db, collection):
        """
        初始化MemoryRepository

        Args:
            db: MongoDB数据库实例
            collection: memories集合
        """
        self.db = db
        self.collection = collection

    def _generate_item_id(self) -> str:
        """生成唯一的 item_id: YYYYMMDD_xxxx"""
        date_part = datetime.now().strftime("%Y%m%d")
        random_suffix = ''.join(random.choices(
            string.ascii_lowercase + string.digits,
            k=4
        ))
        return f"{date_part}_{random_suffix}"

    def _ensure_unique_item_id(self, existing_ids: set) -> str:
        """确保生成的 item_id 在当前分类中唯一"""
        max_attempts = 10
        for _ in range(max_attempts):
            item_id = self._generate_item_id()
            if item_id not in existing_ids:
                return item_id
        # 如果 10 次都冲突（极低概率），使用更长的随机后缀
        date_part = datetime.now().strftime("%Y%m%d")
        random_suffix = ''.join(random.choices(
            string.ascii_lowercase + string.digits,
            k=8
        ))
        return f"{date_part}_{random_suffix}"

    async def list_categories(self, user_id: str, owners: List[str]) -> Dict[str, Any]:
        """
        列出记忆分类

        Args:
            user_id: 用户ID
            owners: owner列表，例如 ["user", "self"]

        Returns:
            Dict[str, Any]: 分类列表
        """
        try:
            result = {"success": True, "data": {}}

            for owner in owners:
                if owner == "user":
                    owner_type = "user"
                    owner_id = user_id
                elif owner == "self":
                    # self 表示 agent，这里暂时使用固定值，后续可以从上下文获取
                    owner_type = "agent"
                    owner_id = "default_agent"
                else:
                    continue

                doc = await self.collection.find_one({
                    "user_id": user_id,
                    "owner_type": owner_type,
                    "owner_id": owner_id
                })

                if doc and "memories" in doc:
                    # 构建包含记忆数量的分类列表
                    categories_with_count = []
                    for category_name, category_data in doc["memories"].items():
                        item_count = len(category_data.get("items", []))
                        categories_with_count.append({
                            "name": category_name,
                            "count": item_count
                        })
                    
                    result["data"][owner] = {
                        "categories": categories_with_count,
                        "total": len(categories_with_count)
                    }
                else:
                    result["data"][owner] = {
                        "categories": [],
                        "total": 0
                    }

            return result

        except Exception as e:
            logger.error(f"列出记忆分类失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "error": f"列出记忆分类失败: {str(e)}"
            }

    async def get_memory(self, user_id: str, queries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        获取记忆内容

        Args:
            user_id: 用户ID
            queries: 查询列表，例如 [{"owner": "user", "categories": ["code_preference"]}]

        Returns:
            Dict[str, Any]: 记忆内容
        """
        try:
            result = {"success": True, "data": {}}
            not_found_categories = {"user": [], "self": []}

            for query in queries:
                owner = query.get("owner")
                categories = query.get("categories", [])

                if owner == "user":
                    owner_type = "user"
                    owner_id = user_id
                elif owner == "self":
                    owner_type = "agent"
                    owner_id = "default_agent"
                else:
                    continue

                doc = await self.collection.find_one({
                    "user_id": user_id,
                    "owner_type": owner_type,
                    "owner_id": owner_id
                })

                if owner not in result["data"]:
                    result["data"][owner] = {}

                for category in categories:
                    if doc and "memories" in doc and category in doc["memories"]:
                        items = doc["memories"][category].get("items", [])
                        # 按 updated_at 降序排序
                        sorted_items = sorted(items, key=lambda x: x.get("updated_at", ""), reverse=True)
                        result["data"][owner][category] = {
                            "items": sorted_items,
                            "total": len(sorted_items)
                        }
                    else:
                        not_found_categories[owner].append(category)

            # 检查是否有未找到的分类
            has_not_found = any(cats for cats in not_found_categories.values())
            if has_not_found:
                return {
                    "success": False,
                    "error": "Categories not found",
                    "details": not_found_categories
                }

            return result

        except Exception as e:
            logger.error(f"获取记忆失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "error": f"获取记忆失败: {str(e)}"
            }

    async def add_memory(self, user_id: str, additions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        添加记忆条目

        Args:
            user_id: 用户ID
            additions: 添加列表，例如 [{"owner": "user", "category": "code_preference", "items": ["content1"]}]

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            total_added = 0

            for addition in additions:
                owner = addition.get("owner")
                category = addition.get("category")
                items = addition.get("items", [])

                if owner == "user":
                    owner_type = "user"
                    owner_id = user_id
                elif owner == "self":
                    owner_type = "agent"
                    owner_id = "default_agent"
                else:
                    continue

                # 获取现有文档以检查已存在的 item_id
                doc = await self.collection.find_one({
                    "user_id": user_id,
                    "owner_type": owner_type,
                    "owner_id": owner_id
                })

                existing_ids = set()
                if doc and "memories" in doc and category in doc["memories"]:
                    existing_ids = {item["item_id"] for item in doc["memories"][category].get("items", [])}

                # 为每个内容创建记忆条目
                new_items = []
                for content in items:
                    if not content:
                        continue

                    item_id = self._ensure_unique_item_id(existing_ids)
                    existing_ids.add(item_id)

                    new_items.append({
                        "item_id": item_id,
                        "content": content,
                        "updated_at": datetime.now().strftime("%Y-%m-%d")
                    })

                if not new_items:
                    continue

                # 使用 upsert 操作添加记忆
                current_date = datetime.now().strftime("%Y-%m-%d")
                result = await self.collection.update_one(
                    {
                        "user_id": user_id,
                        "owner_type": owner_type,
                        "owner_id": owner_id
                    },
                    {
                        "$push": {f"memories.{category}.items": {"$each": new_items}},
                        "$set": {
                            f"memories.{category}.updated_at": current_date,
                            "updated_at": datetime.now()
                        },
                        "$setOnInsert": {
                            "created_at": datetime.now()
                        }
                    },
                    upsert=True
                )

                total_added += len(new_items)

            if total_added > 0:
                logger.info(f"成功添加 {total_added} 条记忆 (user: {user_id})")
                return {
                    "success": True,
                    "message": f"Successfully added {total_added} items"
                }
            else:
                return {
                    "success": False,
                    "error": "No items added"
                }

        except Exception as e:
            logger.error(f"添加记忆失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "error": f"添加记忆失败: {str(e)}"
            }

    async def update_memory(self, user_id: str, updates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        更新记忆条目

        Args:
            user_id: 用户ID
            updates: 更新列表，例如 [{"owner": "user", "category": "code_preference", "item_id": "20240115_a3f2", "content": "new content"}]

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            total_updated = 0
            failed_ids = []

            for update in updates:
                owner = update.get("owner")
                category = update.get("category")
                item_id = update.get("item_id")
                content = update.get("content")

                if owner == "user":
                    owner_type = "user"
                    owner_id = user_id
                elif owner == "self":
                    owner_type = "agent"
                    owner_id = "default_agent"
                else:
                    continue

                # 更新记忆条目
                current_date = datetime.now().strftime("%Y-%m-%d")
                result = await self.collection.update_one(
                    {
                        "user_id": user_id,
                        "owner_type": owner_type,
                        "owner_id": owner_id,
                        f"memories.{category}.items.item_id": item_id
                    },
                    {
                        "$set": {
                            f"memories.{category}.items.$.content": content,
                            f"memories.{category}.items.$.updated_at": current_date,
                            f"memories.{category}.updated_at": current_date,
                            "updated_at": datetime.now()
                        }
                    }
                )

                if result.modified_count > 0:
                    total_updated += 1
                else:
                    failed_ids.append(item_id)

            if total_updated > 0 and not failed_ids:
                logger.info(f"成功更新 {total_updated} 条记忆 (user: {user_id})")
                return {
                    "success": True,
                    "message": f"Successfully updated {total_updated} items"
                }
            elif total_updated > 0 and failed_ids:
                return {
                    "success": False,
                    "error": "Some items not found",
                    "details": {
                        "updated": total_updated,
                        "failed": len(failed_ids),
                        "failed_ids": failed_ids
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "No items updated",
                    "details": {
                        "updated": 0,
                        "failed": len(failed_ids),
                        "failed_ids": failed_ids
                    }
                }

        except Exception as e:
            logger.error(f"更新记忆失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "error": f"更新记忆失败: {str(e)}"
            }

    async def delete_memory(self, user_id: str, deletions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        删除记忆条目

        Args:
            user_id: 用户ID
            deletions: 删除列表，例如 [{"owner": "user", "category": "code_preference", "item_ids": ["20240115_a3f2"]}]

        Returns:
            Dict[str, Any]: 操作结果
        """
        try:
            total_deleted = 0
            failed_ids = []

            for deletion in deletions:
                owner = deletion.get("owner")
                category = deletion.get("category")
                item_ids = deletion.get("item_ids", [])

                if owner == "user":
                    owner_type = "user"
                    owner_id = user_id
                elif owner == "self":
                    owner_type = "agent"
                    owner_id = "default_agent"
                else:
                    continue

                # 删除记忆条目
                current_date = datetime.now().strftime("%Y-%m-%d")
                result = await self.collection.update_one(
                    {
                        "user_id": user_id,
                        "owner_type": owner_type,
                        "owner_id": owner_id
                    },
                    {
                        "$pull": {
                            f"memories.{category}.items": {"item_id": {"$in": item_ids}}
                        },
                        "$set": {
                            f"memories.{category}.updated_at": current_date,
                            "updated_at": datetime.now()
                        }
                    }
                )

                if result.modified_count > 0:
                    # 检查实际删除了多少条
                    doc = await self.collection.find_one({
                        "user_id": user_id,
                        "owner_type": owner_type,
                        "owner_id": owner_id
                    })
                    
                    if doc and "memories" in doc and category in doc["memories"]:
                        remaining_ids = {item["item_id"] for item in doc["memories"][category].get("items", [])}
                        deleted_count = len([iid for iid in item_ids if iid not in remaining_ids])
                        total_deleted += deleted_count
                        failed_ids.extend([iid for iid in item_ids if iid in remaining_ids])
                    else:
                        total_deleted += len(item_ids)

            if total_deleted > 0 and not failed_ids:
                logger.info(f"成功删除 {total_deleted} 条记忆 (user: {user_id})")
                return {
                    "success": True,
                    "message": f"Successfully deleted {total_deleted} items"
                }
            elif total_deleted > 0 and failed_ids:
                return {
                    "success": False,
                    "error": "Some items not found",
                    "details": {
                        "deleted": total_deleted,
                        "failed": len(failed_ids),
                        "failed_ids": failed_ids
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "No items deleted"
                }

        except Exception as e:
            logger.error(f"删除记忆失败 (user: {user_id}): {e}")
            return {
                "success": False,
                "error": f"删除记忆失败: {str(e)}"
            }
