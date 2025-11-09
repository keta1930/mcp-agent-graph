"""
WebSocket连接管理器

负责管理所有活跃的WebSocket连接，处理消息的实时推送
"""
import logging
from typing import Dict, Set, Optional
from fastapi import WebSocket
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket连接管理器"""

    def __init__(self):
        # 存储活跃连接: {user_id: WebSocket}
        self.active_connections: Dict[str, WebSocket] = {}

        # 存储在线用户的最后活跃时间: {user_id: datetime}
        self.user_last_seen: Dict[str, datetime] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """
        接受WebSocket连接并存储

        Args:
            websocket: WebSocket连接
            user_id: 用户ID
        """
        await websocket.accept()

        # 如果用户已有连接，先关闭旧连接
        if user_id in self.active_connections:
            try:
                old_ws = self.active_connections[user_id]
                await old_ws.close()
                logger.info(f"关闭用户 {user_id} 的旧连接")
            except Exception as e:
                logger.error(f"关闭旧连接失败: {str(e)}")

        self.active_connections[user_id] = websocket
        self.user_last_seen[user_id] = datetime.now()

        logger.info(f"用户 {user_id} 已连接，当前在线用户数: {len(self.active_connections)}")

        # 广播用户上线消息
        await self.broadcast_user_status(user_id, True)

    def disconnect(self, user_id: str):
        """
        断开WebSocket连接

        Args:
            user_id: 用户ID
        """
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            self.user_last_seen[user_id] = datetime.now()
            logger.info(f"用户 {user_id} 已断开连接，当前在线用户数: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, user_id: str):
        """
        发送消息给指定用户

        Args:
            message: 消息内容（字典格式）
            user_id: 目标用户ID
        """
        if user_id in self.active_connections:
            try:
                websocket = self.active_connections[user_id]
                await websocket.send_json(message)
                logger.debug(f"发送消息给用户 {user_id}: {message.get('type')}")
            except Exception as e:
                logger.error(f"发送消息给用户 {user_id} 失败: {str(e)}")
                # 如果发送失败，移除该连接
                self.disconnect(user_id)

    async def broadcast_user_status(self, user_id: str, is_online: bool):
        """
        广播用户在线状态变化

        Args:
            user_id: 用户ID
            is_online: 是否在线
        """
        message = {
            "type": "user_status",
            "data": {
                "user_id": user_id,
                "is_online": is_online,
                "timestamp": datetime.now().isoformat()
            }
        }

        # 发送给所有在线用户
        for connection_user_id in list(self.active_connections.keys()):
            if connection_user_id != user_id:  # 不发送给自己
                await self.send_personal_message(message, connection_user_id)

    async def send_new_message_notification(
        self,
        receiver_id: str,
        message_data: dict
    ):
        """
        发送新消息通知给接收者

        Args:
            receiver_id: 接收者用户ID
            message_data: 消息数据
        """
        notification = {
            "type": "new_message",
            "data": message_data
        }

        await self.send_personal_message(notification, receiver_id)

    async def send_message_read_notification(
        self,
        sender_id: str,
        message_ids: list,
        reader_id: str
    ):
        """
        发送消息已读通知给发送者

        Args:
            sender_id: 发送者用户ID
            message_ids: 已读的消息ID列表
            reader_id: 读者用户ID
        """
        notification = {
            "type": "message_read",
            "data": {
                "message_ids": message_ids,
                "reader_id": reader_id,
                "read_at": datetime.now().isoformat()
            }
        }

        await self.send_personal_message(notification, sender_id)

    async def send_typing_notification(
        self,
        receiver_id: str,
        sender_id: str,
        is_typing: bool
    ):
        """
        发送正在输入通知

        Args:
            receiver_id: 接收者用户ID
            sender_id: 发送者用户ID
            is_typing: 是否正在输入
        """
        notification = {
            "type": "typing",
            "data": {
                "sender_id": sender_id,
                "is_typing": is_typing
            }
        }

        await self.send_personal_message(notification, receiver_id)

    def is_user_online(self, user_id: str) -> bool:
        """
        检查用户是否在线

        Args:
            user_id: 用户ID

        Returns:
            bool: 用户是否在线
        """
        return user_id in self.active_connections

    def get_online_users(self) -> Set[str]:
        """
        获取所有在线用户ID

        Returns:
            Set[str]: 在线用户ID集合
        """
        return set(self.active_connections.keys())

    def get_user_last_seen(self, user_id: str) -> Optional[datetime]:
        """
        获取用户最后在线时间

        Args:
            user_id: 用户ID

        Returns:
            Optional[datetime]: 最后在线时间
        """
        return self.user_last_seen.get(user_id)

    def get_online_count(self) -> int:
        """
        获取在线用户数量

        Returns:
            int: 在线用户数量
        """
        return len(self.active_connections)


# 创建全局连接管理器实例
websocket_manager = ConnectionManager()
