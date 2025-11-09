import logging
import secrets
import string
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from pymongo.errors import DuplicateKeyError

logger = logging.getLogger(__name__)


class PreviewRepository:
    """Preview管理器类"""

    def __init__(self, db, collection):
        self.db = db
        self.collection = collection

    def _generate_short_key(self, length: int = 8) -> str:
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    def _generate_content_hash(self, content: str) -> str:
        """生成内容哈希值"""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    async def create_preview_share(self, lang: str, title: Optional[str], content: str,
                                   expire_hours: Optional[int] = 72, user_id: str = "default_user") -> Dict[str, Any]:
        """创建预览短链

        Args:
            lang: 语言
            title: 标题
            content: 内容
            expire_hours: 过期小时数
            user_id: 用户ID

        Returns:
            Dict[str, Any]: 包含key的字典
        """
        content_hash = self._generate_content_hash(content)

        existing_doc = await self.collection.find_one({"content_hash": content_hash})
        if existing_doc and existing_doc.get("key"):
            return {"key": existing_doc["key"]}

        key = self._generate_short_key()
        for _ in range(5):
            existing = await self.collection.find_one({"key": key})
            if not existing:
                break
            key = self._generate_short_key()

        now = datetime.now()
        expires_at = None
        if expire_hours and expire_hours > 0:
            expires_at = now + timedelta(hours=expire_hours)

        doc = {
            "key": key,
            "lang": lang,
            "title": title or f"{lang.upper()} 预览",
            "content": content,
            "content_hash": content_hash,
            "user_id": user_id,  # 添加user_id字段
            "created_at": now,
            "expires_at": expires_at,
        }

        try:
            await self.collection.insert_one(doc)
            logger.info(f"预览短链创建成功: {key} (user: {user_id})")
            return {"key": key}
        except DuplicateKeyError:
            existing = await self.collection.find_one({"content_hash": content_hash})
            if existing and existing.get("key"):
                return {"key": existing["key"]}
            return {"key": key}

    async def get_preview_share(self, key: str) -> Optional[Dict[str, Any]]:
        """获取预览短链内容"""
        doc = await self.collection.find_one({"key": key})
        if not doc:
            return None

        return {
            "lang": doc.get("lang", "text"),
            "title": doc.get("title", "内容预览"),
            "content": doc.get("content", ""),
        }