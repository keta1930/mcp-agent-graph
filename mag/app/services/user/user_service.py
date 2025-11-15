"""
用户服务

负责用户注册、登录、权限管理等业务逻辑
"""
import logging
from datetime import datetime
from typing import Dict, List, Optional
from app.auth.password import hash_password, verify_password, validate_password_strength

logger = logging.getLogger(__name__)


class UserService:
    """用户服务类"""

    def __init__(self, user_repository, invite_code_repository, mongodb_client=None):
        """
        初始化用户服务

        Args:
            user_repository: 用户Repository实例
            invite_code_repository: 邀请码Repository实例
            mongodb_client: MongoDB客户端实例（用于创建memory文档）
        """
        self.user_repository = user_repository
        self.invite_code_repository = invite_code_repository
        self.mongodb_client = mongodb_client

    async def register_user(
        self,
        user_id: str,
        password: str,
        invite_code: str
    ) -> dict:
        """
        注册用户

        完整流程：
        1. 验证邀请码
        2. 验证密码强度
        3. 检查用户名是否已存在
        4. 加密密码
        5. 创建用户记录
        6. 原子递增邀请码使用次数

        Args:
            user_id: 用户名
            password: 密码
            invite_code: 邀请码

        Returns:
            dict: 创建的用户信息（不包含密码）

        Raises:
            ValueError: 验证失败时抛出异常
        """
        # 1. 验证邀请码
        is_valid, error_msg = await self.invite_code_repository.validate_invite_code(invite_code)
        if not is_valid:
            logger.warning(f"邀请码验证失败: {invite_code}, 原因: {error_msg}")
            raise ValueError(f"邀请码无效: {error_msg}")

        # 2. 验证密码强度
        is_strong, password_error = validate_password_strength(password)
        if not is_strong:
            logger.warning(f"密码强度不足: {password_error}")
            raise ValueError(password_error)

        # 3. 检查用户名是否已存在
        exists = await self.user_repository.user_exists(user_id)
        if exists:
            logger.warning(f"用户名已存在: {user_id}")
            raise ValueError(f"用户名已存在: {user_id}")

        # 4. 加密密码
        password_hash = hash_password(password)

        # 5. 创建用户记录
        try:
            user = await self.user_repository.create_user(
                user_id=user_id,
                password_hash=password_hash,
                role="user",  # 新注册用户默认为普通用户
                invited_by_code=invite_code
            )

            # 6. 创建用户的 memory 文档
            if self.mongodb_client:
                try:
                    await self.mongodb_client.memories_collection.insert_one({
                        "user_id": user_id,
                        "owner_type": "user",
                        "owner_id": user_id,
                        "memories": {},
                        "created_at": datetime.now(),
                        "updated_at": datetime.now()
                    })
                    logger.info(f"为用户创建 memory 文档成功: {user_id}")
                except Exception as mem_error:
                    logger.warning(f"为用户创建 memory 文档失败: {user_id}, 错误: {str(mem_error)}")

            # 7. 原子递增邀请码使用次数
            await self.invite_code_repository.increment_invite_code_usage(invite_code)

            logger.info(f"用户注册成功: {user_id}")

            # 移除密码哈希后返回
            return self._remove_password_hash(user)

        except Exception as e:
            logger.error(f"用户注册失败: {str(e)}")
            raise

    async def authenticate_user(self, user_id: str, password: str) -> Optional[dict]:
        """
        验证用户登录

        Args:
            user_id: 用户名
            password: 密码

        Returns:
            dict | None: 验证成功返回用户信息（不包含密码），失败返回None
        """
        try:
            # 获取用户信息
            user = await self.user_repository.get_user_by_id(user_id)
            if not user:
                logger.warning(f"用户不存在: {user_id}")
                return None

            # 检查账号是否激活
            if not user.get("is_active", False):
                logger.warning(f"账号已停用: {user_id}")
                return None

            # 验证密码
            stored_hash = user.get("password_hash", "")
            if not verify_password(password, stored_hash):
                logger.warning(f"密码错误: {user_id}")
                return None

            # 更新最后登录时间
            await self.user_repository.update_last_login(user_id)

            logger.info(f"用户登录成功: {user_id}")

            # 移除密码哈希后返回
            return self._remove_password_hash(user)

        except Exception as e:
            logger.error(f"用户认证失败: {str(e)}")
            return None

    async def get_user_info(self, user_id: str) -> Optional[dict]:
        """
        获取用户信息（不包含密码）

        Args:
            user_id: 用户ID

        Returns:
            dict | None: 用户信息
        """
        try:
            user = await self.user_repository.get_user_by_id(user_id)
            if user:
                return self._remove_password_hash(user)
            return None
        except Exception as e:
            logger.error(f"获取用户信息失败: {str(e)}")
            return None

    async def list_all_users(self) -> List[dict]:
        """
        获取所有用户（管理员功能）

        Returns:
            List[dict]: 用户列表（不包含密码）
        """
        try:
            users = await self.user_repository.list_users()
            # 移除所有密码哈希
            return [self._remove_password_hash(user) for user in users]
        except Exception as e:
            logger.error(f"获取用户列表失败: {str(e)}")
            return []

    async def promote_user_to_admin(self, user_id: str, operator_user_id: str) -> dict:
        """
        提升用户为管理员

        Args:
            user_id: 要提升的用户ID
            operator_user_id: 操作者ID（用于日志）

        Returns:
            dict: 更新后的用户信息

        Raises:
            ValueError: 用户不存在时抛出异常
        """
        try:
            # 检查用户是否存在
            user = await self.user_repository.get_user_by_id(user_id)
            if not user:
                raise ValueError(f"用户不存在: {user_id}")

            # 更新角色
            success = await self.user_repository.update_user_role(user_id, "admin")
            if not success:
                raise ValueError(f"更新用户角色失败: {user_id}")

            logger.info(f"用户 {user_id} 已提升为管理员，操作者: {operator_user_id}")

            # 获取更新后的用户信息
            updated_user = await self.user_repository.get_user_by_id(user_id)
            return self._remove_password_hash(updated_user)

        except Exception as e:
            logger.error(f"提升用户为管理员失败: {str(e)}")
            raise

    async def deactivate_user(self, user_id: str, operator_user_id: str) -> bool:
        """
        停用用户

        Args:
            user_id: 要停用的用户ID
            operator_user_id: 操作者ID（用于日志）

        Returns:
            bool: 是否停用成功

        Raises:
            ValueError: 尝试停用超级管理员时抛出异常
        """
        try:
            # 检查用户是否存在
            user = await self.user_repository.get_user_by_id(user_id)
            if not user:
                raise ValueError(f"用户不存在: {user_id}")

            # 防止停用超级管理员
            if user.get("role") == "super_admin":
                raise ValueError("不能停用超级管理员")

            # 停用用户
            success = await self.user_repository.deactivate_user(user_id)
            if success:
                logger.info(f"用户 {user_id} 已停用，操作者: {operator_user_id}")

            return success

        except Exception as e:
            logger.error(f"停用用户失败: {str(e)}")
            raise

    def _remove_password_hash(self, user: dict) -> dict:
        """
        移除用户字典中的密码哈希字段

        Args:
            user: 用户字典

        Returns:
            dict: 移除密码后的用户字典
        """
        user_copy = user.copy()
        user_copy.pop("password_hash", None)
        return user_copy
