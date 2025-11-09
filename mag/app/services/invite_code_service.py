"""
邀请码服务

负责邀请码生成、管理等业务逻辑
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
from app.utils.invite_code_generator import generate_invite_code

logger = logging.getLogger(__name__)


class InviteCodeService:
    """邀请码服务类"""

    def __init__(self, invite_code_repository):
        """
        初始化邀请码服务

        Args:
            invite_code_repository: 邀请码Repository实例
        """
        self.invite_code_repository = invite_code_repository

    async def generate_invite_code(
        self,
        created_by: str,
        max_uses: Optional[int] = None,
        expires_at: Optional[datetime] = None,
        description: Optional[str] = None
    ) -> dict:
        """
        生成邀请码

        自动生成形如 TEAM-XXXXXX 的邀请码，确保唯一性

        Args:
            created_by: 创建者user_id
            max_uses: 最大使用次数（None表示无限制）
            expires_at: 过期时间（None表示永不过期）
            description: 描述信息

        Returns:
            dict: 生成的邀请码信息

        Raises:
            Exception: 生成失败时抛出异常
        """
        # 生成邀请码，确保唯一性（最多重试10次）
        max_retries = 10
        for attempt in range(max_retries):
            code = generate_invite_code(prefix="TEAM", length=6)

            try:
                # 尝试创建邀请码
                invite_code = await self.invite_code_repository.create_invite_code(
                    code=code,
                    created_by=created_by,
                    max_uses=max_uses,
                    expires_at=expires_at,
                    description=description
                )

                logger.info(f"邀请码生成成功: {code}, 创建者: {created_by}")
                return invite_code

            except ValueError as e:
                # 如果邀请码已存在，重试
                if "已存在" in str(e):
                    logger.warning(f"邀请码冲突，重试: {code}")
                    continue
                else:
                    raise

        # 如果重试10次都失败，抛出异常
        raise Exception("生成邀请码失败：超过最大重试次数")

    async def list_invite_codes(self) -> List[dict]:
        """
        获取所有邀请码

        Returns:
            List[dict]: 邀请码列表
        """
        try:
            return await self.invite_code_repository.list_invite_codes()
        except Exception as e:
            logger.error(f"获取邀请码列表失败: {str(e)}")
            return []

    async def toggle_invite_code(self, code: str, is_active: bool) -> dict:
        """
        切换邀请码状态

        Args:
            code: 邀请码
            is_active: 是否激活

        Returns:
            dict: 更新后的邀请码信息

        Raises:
            ValueError: 邀请码不存在时抛出异常
        """
        try:
            # 检查邀请码是否存在
            invite_code = await self.invite_code_repository.get_invite_code(code)
            if not invite_code:
                raise ValueError(f"邀请码不存在: {code}")

            # 更新状态
            success = await self.invite_code_repository.update_invite_code_status(code, is_active)
            if not success:
                raise ValueError(f"更新邀请码状态失败: {code}")

            status = "激活" if is_active else "停用"
            logger.info(f"邀请码 {code} 已{status}")

            # 获取更新后的邀请码信息
            updated_code = await self.invite_code_repository.get_invite_code(code)
            return updated_code

        except Exception as e:
            logger.error(f"切换邀请码状态失败: {str(e)}")
            raise

    async def get_invite_code_usage_stats(self, code: str) -> dict:
        """
        获取邀请码使用统计

        Args:
            code: 邀请码

        Returns:
            dict: 邀请码使用统计信息

        Raises:
            ValueError: 邀请码不存在时抛出异常
        """
        try:
            # 获取邀请码信息
            invite_code = await self.invite_code_repository.get_invite_code(code)
            if not invite_code:
                raise ValueError(f"邀请码不存在: {code}")

            # 构建统计信息
            stats = {
                "code": code,
                "is_active": invite_code.get("is_active", False),
                "current_uses": invite_code.get("current_uses", 0),
                "max_uses": invite_code.get("max_uses"),
                "usage_rate": None,
                "is_expired": False,
                "is_exhausted": False
            }

            # 计算使用率
            if stats["max_uses"] is not None:
                stats["usage_rate"] = stats["current_uses"] / stats["max_uses"]
                stats["is_exhausted"] = stats["current_uses"] >= stats["max_uses"]

            # 检查是否过期
            expires_at = invite_code.get("expires_at")
            if expires_at:
                # 确保比较时使用带时区的datetime
                if isinstance(expires_at, datetime):
                    from datetime import timezone
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone.utc)
                    stats["is_expired"] = datetime.now(timezone.utc) > expires_at

            return stats

        except Exception as e:
            logger.error(f"获取邀请码使用统计失败: {str(e)}")
            raise
