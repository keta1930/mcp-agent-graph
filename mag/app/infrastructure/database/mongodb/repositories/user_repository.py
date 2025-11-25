"""
用户数据仓库

负责用户数据的CRUD操作
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class UserRepository:
    """用户Repository - 负责users集合的操作"""

    def __init__(self, db, users_collection):
        """初始化用户Repository"""
        self.db = db
        self.collection = users_collection

    async def create_user(
        self,
        user_id: str,
        password_hash: str,
        role: str,
        invited_by_code: Optional[str] = None
    ) -> dict:
        """
        创建用户

        Args:
            user_id: 用户名（唯一）
            password_hash: 密码哈希
            role: 用户角色（user|admin|super_admin）
            invited_by_code: 注册使用的邀请码（可选）

        Returns:
            dict: 创建的用户文档

        Raises:
            Exception: 用户名已存在或创建失败
        """
        try:
            now = datetime.now()

            user_doc = {
                "user_id": user_id,
                "password_hash": password_hash,
                "role": role,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
                "last_login_at": None,
            }

            # 添加邀请码（如果有）
            if invited_by_code:
                user_doc["invited_by_code"] = invited_by_code

            result = await self.collection.insert_one(user_doc)

            user_doc["_id"] = str(result.inserted_id)
            logger.info(f"用户创建成功: {user_id}, 角色: {role}")
            return user_doc

        except Exception as e:
            if "duplicate key" in str(e).lower():
                logger.error(f"用户名已存在: {user_id}")
                raise ValueError(f"用户名已存在: {user_id}")
            logger.error(f"创建用户失败: {str(e)}")
            raise

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """
        根据user_id获取用户

        Args:
            user_id: 用户ID

        Returns:
            dict | None: 用户文档，如果不存在则返回None
        """
        try:
            user = await self.collection.find_one({"user_id": user_id})
            if user:
                return self._convert_objectid_to_str(user)
            return None
        except Exception as e:
            logger.error(f"获取用户失败: {str(e)}")
            return None

    async def list_users(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """
        获取用户列表

        Args:
            skip: 跳过的记录数
            limit: 返回的最大记录数

        Returns:
            List[dict]: 用户列表
        """
        try:
            cursor = self.collection.find().sort("created_at", -1).skip(skip).limit(limit)

            users = []
            async for user in cursor:
                users.append(self._convert_objectid_to_str(user))

            return users
        except Exception as e:
            logger.error(f"获取用户列表失败: {str(e)}")
            return []

    async def update_user_role(self, user_id: str, new_role: str) -> bool:
        """
        更新用户角色

        Args:
            user_id: 用户ID
            new_role: 新角色（user|admin|super_admin）

        Returns:
            bool: 是否更新成功
        """
        try:
            result = await self.collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "role": new_role,
                        "updated_at": datetime.now()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"用户 {user_id} 的角色已更新为: {new_role}")
                return True
            else:
                logger.warning(f"未找到用户或角色未变更: {user_id}")
                return False

        except Exception as e:
            logger.error(f"更新用户角色失败: {str(e)}")
            return False

    async def update_last_login(self, user_id: str) -> bool:
        """
        更新最后登录时间

        Args:
            user_id: 用户ID

        Returns:
            bool: 是否更新成功
        """
        try:
            result = await self.collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "last_login_at": datetime.now(),
                        "updated_at": datetime.now()
                    }
                }
            )

            return result.modified_count > 0

        except Exception as e:
            logger.error(f"更新最后登录时间失败: {str(e)}")
            return False

    async def get_title_generation_model(self, user_id: str) -> Optional[str]:
        """
        获取用户配置的标题生成模型

        Args:
            user_id: 用户ID

        Returns:
            Optional[str]: 模型名称，如果未设置则返回None
        """
        try:
            user = await self.collection.find_one(
                {"user_id": user_id},
                {"title_generation_model": 1}
            )
            return user.get("title_generation_model") if user else None

        except Exception as e:
            logger.error(f"获取标题生成模型配置失败: {str(e)}")
            return None

    async def set_title_generation_model(self, user_id: str, model_name: str) -> bool:
        """
        设置用户的标题生成模型

        Args:
            user_id: 用户ID
            model_name: 模型名称

        Returns:
            bool: 是否设置成功
        """
        try:
            result = await self.collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "title_generation_model": model_name,
                        "updated_at": datetime.now()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"用户 {user_id} 的标题生成模型已设置为: {model_name}")
                return True
            else:
                logger.warning(f"未找到用户或模型未变更: {user_id}")
                return False

        except Exception as e:
            logger.error(f"设置标题生成模型失败: {str(e)}")
            return False

    async def get_user_language(self, user_id: str) -> str:
        """
        获取用户语言设置

        Args:
            user_id: 用户ID

        Returns:
            str: 语言代码，默认返回 "zh"
        """
        try:
            user = await self.collection.find_one(
                {"user_id": user_id},
                {"language": 1}
            )
            return user.get("language", "zh") if user else "zh"

        except Exception as e:
            logger.error(f"获取用户语言设置失败: {str(e)}")
            return "zh"

    async def set_user_language(self, user_id: str, language: str) -> bool:
        """
        设置用户语言

        Args:
            user_id: 用户ID
            language: 语言代码（"zh" 或 "en"）

        Returns:
            bool: 是否设置成功
        """
        try:
            result = await self.collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "language": language,
                        "updated_at": datetime.now()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"用户 {user_id} 的语言已设置为: {language}")
                return True
            else:
                logger.warning(f"未找到用户或语言未变更: {user_id}")
                return False

        except Exception as e:
            logger.error(f"设置用户语言失败: {str(e)}")
            return False

    async def deactivate_user(self, user_id: str) -> bool:
        """
        停用用户（软删除）

        Args:
            user_id: 用户ID

        Returns:
            bool: 是否停用成功
        """
        try:
            result = await self.collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "is_active": False,
                        "updated_at": datetime.now()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"用户 {user_id} 已停用")
                return True
            else:
                logger.warning(f"未找到用户: {user_id}")
                return False

        except Exception as e:
            logger.error(f"停用用户失败: {str(e)}")
            return False

    async def user_exists(self, user_id: str) -> bool:
        """
        检查用户是否存在

        Args:
            user_id: 用户ID

        Returns:
            bool: 用户是否存在
        """
        try:
            count = await self.collection.count_documents({"user_id": user_id})
            return count > 0
        except Exception as e:
            logger.error(f"检查用户存在性失败: {str(e)}")
            return False

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc
