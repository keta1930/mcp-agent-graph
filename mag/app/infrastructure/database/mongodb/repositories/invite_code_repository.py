"""
邀请码数据仓库

负责邀请码数据的CRUD操作
"""
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone
from bson import ObjectId

logger = logging.getLogger(__name__)


class InviteCodeRepository:
    """邀请码Repository - 负责invite_codes集合的操作"""

    def __init__(self, db, invite_codes_collection):
        """初始化邀请码Repository"""
        self.db = db
        self.collection = invite_codes_collection

    async def create_invite_code(
        self,
        code: str,
        created_by: str,
        max_uses: Optional[int] = None,
        expires_at: Optional[datetime] = None,
        description: Optional[str] = None
    ) -> dict:
        """
        创建邀请码

        Args:
            code: 邀请码
            created_by: 创建者user_id
            max_uses: 最大使用次数（None表示无限制）
            expires_at: 过期时间（None表示永不过期）
            description: 描述信息

        Returns:
            dict: 创建的邀请码文档

        Raises:
            Exception: 邀请码已存在或创建失败
        """
        try:
            now = datetime.now()

            invite_code_doc = {
                "code": code,
                "is_active": True,
                "created_by": created_by,
                "created_at": now,
                "updated_at": now,
                "max_uses": max_uses,
                "current_uses": 0,
                "expires_at": expires_at,
                "description": description
            }

            result = await self.collection.insert_one(invite_code_doc)

            invite_code_doc["_id"] = str(result.inserted_id)
            logger.info(f"邀请码创建成功: {code}, 创建者: {created_by}")
            return invite_code_doc

        except Exception as e:
            if "duplicate key" in str(e).lower():
                logger.error(f"邀请码已存在: {code}")
                raise ValueError(f"邀请码已存在: {code}")
            logger.error(f"创建邀请码失败: {str(e)}")
            raise

    async def get_invite_code(self, code: str) -> Optional[dict]:
        """
        获取邀请码

        Args:
            code: 邀请码

        Returns:
            dict | None: 邀请码文档，如果不存在则返回None
        """
        try:
            invite_code = await self.collection.find_one({"code": code})
            if invite_code:
                return self._convert_objectid_to_str(invite_code)
            return None
        except Exception as e:
            logger.error(f"获取邀请码失败: {str(e)}")
            return None

    async def list_invite_codes(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """
        获取邀请码列表

        Args:
            skip: 跳过的记录数
            limit: 返回的最大记录数

        Returns:
            List[dict]: 邀请码列表
        """
        try:
            cursor = self.collection.find().sort("created_at", -1).skip(skip).limit(limit)

            invite_codes = []
            async for code in cursor:
                invite_codes.append(self._convert_objectid_to_str(code))

            return invite_codes
        except Exception as e:
            logger.error(f"获取邀请码列表失败: {str(e)}")
            return []

    async def update_invite_code_status(self, code: str, is_active: bool) -> bool:
        """
        更新邀请码状态

        Args:
            code: 邀请码
            is_active: 是否激活

        Returns:
            bool: 是否更新成功
        """
        try:
            result = await self.collection.update_one(
                {"code": code},
                {
                    "$set": {
                        "is_active": is_active,
                        "updated_at": datetime.now()
                    }
                }
            )

            if result.modified_count > 0:
                status = "激活" if is_active else "停用"
                logger.info(f"邀请码 {code} 已{status}")
                return True
            else:
                logger.warning(f"未找到邀请码或状态未变更: {code}")
                return False

        except Exception as e:
            logger.error(f"更新邀请码状态失败: {str(e)}")
            return False

    async def increment_invite_code_usage(self, code: str) -> bool:
        """
        原子递增邀请码使用次数

        Args:
            code: 邀请码

        Returns:
            bool: 是否递增成功
        """
        try:
            result = await self.collection.update_one(
                {"code": code},
                {
                    "$inc": {"current_uses": 1},
                    "$set": {"updated_at": datetime.now()}
                }
            )

            if result.modified_count > 0:
                logger.info(f"邀请码 {code} 使用次数已递增")
                return True
            else:
                logger.warning(f"未找到邀请码: {code}")
                return False

        except Exception as e:
            logger.error(f"递增邀请码使用次数失败: {str(e)}")
            return False

    async def validate_invite_code(self, code: str) -> Tuple[bool, str]:
        """
        验证邀请码

        检查邀请码是否存在、是否激活、是否过期、是否达到使用上限

        Args:
            code: 邀请码

        Returns:
            Tuple[bool, str]: (是否有效, 错误消息)
        """
        try:
            invite_code = await self.get_invite_code(code)

            # 检查邀请码是否存在
            if not invite_code:
                return False, "邀请码不存在"

            # 检查是否激活
            if not invite_code.get("is_active", False):
                return False, "邀请码已停用"

            # 检查是否过期
            expires_at = invite_code.get("expires_at")
            if expires_at:
                # 使用本地时间进行比较
                if isinstance(expires_at, datetime):
                    if datetime.now() > expires_at:
                        return False, "邀请码已过期"

            # 检查是否达到使用上限
            max_uses = invite_code.get("max_uses")
            if max_uses is not None:
                current_uses = invite_code.get("current_uses", 0)
                if current_uses >= max_uses:
                    return False, "邀请码已达到使用上限"

            return True, ""

        except Exception as e:
            logger.error(f"验证邀请码失败: {str(e)}")
            return False, "验证邀请码时发生错误"

    def _convert_objectid_to_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """将ObjectId转换为字符串"""
        if isinstance(doc.get("_id"), ObjectId):
            doc["_id"] = str(doc["_id"])
        return doc
