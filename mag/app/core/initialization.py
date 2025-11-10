"""
系统初始化模块

负责系统启动时的初始化工作：
- 创建超级管理员
- 初始化团队设置
- 创建数据库索引
"""

import os
import logging
from datetime import datetime

from app.core.config import settings
from app.auth.password import hash_password
from app.infrastructure.database.mongodb import mongodb_client

logger = logging.getLogger(__name__)


async def initialize_super_admin() -> None:
    """
    从环境变量创建超级管理员（如果不存在）

    环境变量:
        ADMIN_USERNAME: 超级管理员用户名
        ADMIN_PASSWORD: 超级管理员密码

    注意:
        - 如果环境变量未设置，会跳过超级管理员创建
        - 如果超级管理员已存在，不会重复创建
        - 密码会使用bcrypt加密存储
    """
    # 优先使用环境变量，其次使用配置文件
    admin_username = os.getenv("ADMIN_USERNAME") or settings.ADMIN_USERNAME
    admin_password = os.getenv("ADMIN_PASSWORD") or settings.ADMIN_PASSWORD

    if not admin_username or not admin_password:
        logger.warning("ADMIN_USERNAME or ADMIN_PASSWORD not set, skipping super admin creation")
        return

    try:
        # 检查超级管理员是否已存在
        existing = await mongodb_client.users_collection.find_one(
            {"user_id": admin_username}
        )

        if existing:
            logger.info(f"Super admin '{admin_username}' already exists")
            return

        # 创建超级管理员
        password_hash = hash_password(admin_password)

        await mongodb_client.users_collection.insert_one({
            "user_id": admin_username,
            "password_hash": password_hash,
            "role": "super_admin",
            "is_active": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "last_login_at": None
        })

        logger.info(f"Super admin '{admin_username}' created successfully")

    except Exception as e:
        logger.error(f"Failed to initialize super admin: {str(e)}")


async def initialize_team_settings() -> None:
    """
    初始化团队设置（如果不存在）

    默认团队名称: "My Team"

    注意:
        - 如果团队设置已存在，不会重复创建
        - 团队设置是单文档配置，ID固定为"team_config"
    """
    try:
        existing = await mongodb_client.team_settings_collection.find_one(
            {"_id": "team_config"}
        )

        if existing:
            logger.info("Team settings already exist")
            return

        # 创建默认团队设置
        now = datetime.now()

        await mongodb_client.team_settings_collection.insert_one({
            "_id": "team_config",
            "team_name": "My Team",
            "created_at": now,
            "updated_at": now,
            "updated_by": "system"
        })

        logger.info("Default team settings created")

    except Exception as e:
        # 处理并发创建的情况
        if "duplicate key" in str(e).lower():
            logger.info("Team settings already exist (created concurrently)")
            return

        logger.error(f"Failed to initialize team settings: {str(e)}")
        # 团队设置创建失败不应该阻止应用启动


async def initialize_system() -> None:
    """
    执行系统初始化的主函数

    按顺序执行以下初始化步骤：
    1. 初始化超级管理员
    2. 初始化团队设置

    注意:
        - 这个函数应该在MongoDB连接建立后调用
        - 初始化步骤失败不会阻止应用启动
        - 所有步骤都是幂等的，可以重复执行
    """
    logger.info("Starting system initialization...")

    # 1. 初始化超级管理员
    await initialize_super_admin()

    # 2. 初始化团队设置
    await initialize_team_settings()

    logger.info("System initialization completed")
