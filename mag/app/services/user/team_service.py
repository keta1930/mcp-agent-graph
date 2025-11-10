"""
团队服务

负责团队设置管理等业务逻辑
"""
import logging
from typing import Dict

logger = logging.getLogger(__name__)


class TeamService:
    """团队服务类"""

    def __init__(self, team_settings_repository):
        """
        初始化团队服务

        Args:
            team_settings_repository: 团队设置Repository实例
        """
        self.team_settings_repository = team_settings_repository

    async def get_team_settings(self) -> dict:
        """
        获取团队设置

        Returns:
            dict: 团队设置信息

        Raises:
            ValueError: 团队设置不存在时抛出异常
        """
        try:
            settings = await self.team_settings_repository.get_team_settings()
            if not settings:
                raise ValueError("团队设置不存在，请先初始化")

            return settings

        except Exception as e:
            logger.error(f"获取团队设置失败: {str(e)}")
            raise

    async def update_team_name(self, team_name: str, updated_by: str) -> dict:
        """
        更新团队名称

        Args:
            team_name: 新的团队名称
            updated_by: 更新者user_id

        Returns:
            dict: 更新后的团队设置

        Raises:
            Exception: 更新失败时抛出异常
        """
        try:
            # 更新团队设置
            updated_settings = await self.team_settings_repository.update_team_settings(
                team_name=team_name,
                updated_by=updated_by
            )

            logger.info(f"团队名称已更新为: {team_name}, 更新者: {updated_by}")
            return updated_settings

        except Exception as e:
            logger.error(f"更新团队名称失败: {str(e)}")
            raise
