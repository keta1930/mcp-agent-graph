"""
Refresh Token 数据仓库

负责 refresh_tokens 集合的操作
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)


class RefreshTokenRepository:
    """Refresh Token Repository - 负责 refresh_tokens 集合的操作"""

    def __init__(self, db, refresh_tokens_collection):
        """初始化 Refresh Token Repository"""
        self.db = db
        self.collection = refresh_tokens_collection

    async def create_refresh_token(
        self,
        token_id: str,
        user_id: str,
        expires_at: datetime,
        device_info: Optional[str] = None
    ) -> dict:
        """
        创建刷新令牌记录

        Args:
            token_id: 令牌唯一标识（jti）
            user_id: 所属用户ID
            expires_at: 过期时间
            device_info: 设备信息（可选）

        Returns:
            dict: 创建的令牌文档

        Raises:
            Exception: 创建失败
        """
        try:
            now = datetime.now()

            token_doc = {
                "token_id": token_id,
                "user_id": user_id,
                "created_at": now,
                "expires_at": expires_at,
                "is_revoked": False,
                "revoked_at": None,
                "device_info": device_info
            }

            result = await self.collection.insert_one(token_doc)
            token_doc["_id"] = str(result.inserted_id)

            logger.info(f"Refresh token 创建成功: {token_id} for user {user_id}")
            return token_doc

        except Exception as e:
            logger.error(f"创建 refresh token 失败: {str(e)}")
            raise

    async def get_refresh_token(self, token_id: str) -> Optional[dict]:
        """
        根据 token_id 获取刷新令牌

        Args:
            token_id: 令牌ID

        Returns:
            dict | None: 令牌文档，如果不存在则返回None
        """
        try:
            token = await self.collection.find_one({"token_id": token_id})
            if token:
                return self._convert_objectid_to_str(token)
            return None
        except Exception as e:
            logger.error(f"获取 refresh token 失败: {str(e)}")
            return None

    async def is_token_valid(self, token_id: str) -> bool:
        """
        验证令牌是否有效（未撤销且未过期）

        Args:
            token_id: 令牌ID

        Returns:
            bool: 是否有效
        """
        try:
            token = await self.get_refresh_token(token_id)

            if not token:
                return False

            # 检查是否已撤销
            if token.get("is_revoked", False):
                logger.debug(f"Token {token_id} 已被撤销")
                return False

            # 检查是否过期
            expires_at = token.get("expires_at")
            if expires_at and datetime.now() > expires_at:
                logger.debug(f"Token {token_id} 已过期")
                return False

            return True

        except Exception as e:
            logger.error(f"验证 token 有效性失败: {str(e)}")
            return False

    async def revoke_token(self, token_id: str) -> bool:
        """
        撤销刷新令牌

        Args:
            token_id: 令牌ID

        Returns:
            bool: 是否撤销成功
        """
        try:
            result = await self.collection.update_one(
                {"token_id": token_id},
                {
                    "$set": {
                        "is_revoked": True,
                        "revoked_at": datetime.now()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"Refresh token {token_id} 已撤销")
                return True
            else:
                logger.warning(f"未找到 token: {token_id}")
                return False

        except Exception as e:
            logger.error(f"撤销 token 失败: {str(e)}")
            return False

    async def revoke_all_user_tokens(self, user_id: str) -> int:
        """
        撤销用户的所有刷新令牌

        Args:
            user_id: 用户ID

        Returns:
            int: 撤销的令牌数量
        """
        try:
            result = await self.collection.update_many(
                {
                    "user_id": user_id,
                    "is_revoked": False
                },
                {
                    "$set": {
                        "is_revoked": True,
                        "revoked_at": datetime.now()
                    }
                }
            )

            count = result.modified_count
            logger.info(f"用户 {user_id} 的 {count} 个 refresh token 已撤销")
            return count

        except Exception as e:
            logger.error(f"批量撤销 token 失败: {str(e)}")
            return 0

    async def get_user_tokens(
        self,
        user_id: str,
        include_revoked: bool = False
    ) -> List[dict]:
        """
        获取用户的所有刷新令牌

        Args:
            user_id: 用户ID
            include_revoked: 是否包含已撤销的令牌

        Returns:
            List[dict]: 令牌列表
        """
        try:
            query = {"user_id": user_id}

            if not include_revoked:
                query["is_revoked"] = False

            cursor = self.collection.find(query).sort("created_at", -1)

            tokens = []
            async for token in cursor:
                tokens.append(self._convert_objectid_to_str(token))

            return tokens

        except Exception as e:
            logger.error(f"获取用户 token 列表失败: {str(e)}")
            return []

    async def cleanup_expired_tokens(self) -> int:
        """
        清理过期的刷新令牌

        Returns:
            int: 删除的令牌数量
        """
        try:
            result = await self.collection.delete_many({
                "expires_at": {"$lt": datetime.now()}
            })

            count = result.deleted_count
            if count > 0:
                logger.info(f"清理了 {count} 个过期的 refresh token")

            return count

        except Exception as e:
            logger.error(f"清理过期 token 失败: {str(e)}")
            return 0

    async def get_active_sessions_count(self, user_id: str) -> int:
        """
        获取用户当前活跃会话数

        Args:
            user_id: 用户ID

        Returns:
            int: 活跃会话数
        """
        try:
            count = await self.collection.count_documents({
                "user_id": user_id,
                "is_revoked": False,
                "expires_at": {"$gt": datetime.now()}
            })
            return count

        except Exception as e:
            logger.error(f"获取活跃会话数失败: {str(e)}")
            return 0

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将 ObjectId 转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc
