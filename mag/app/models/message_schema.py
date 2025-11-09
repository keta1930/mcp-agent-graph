"""
消息相关的Pydantic Schema模型
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class MessageSendRequest(BaseModel):
    """
    发送消息请求模型
    """
    receiver_id: str = Field(..., description="接收者用户ID")
    content: str = Field(..., description="消息内容", min_length=1, max_length=10000)
    message_type: str = Field(default="text", description="消息类型: text|image|file")


class Message(BaseModel):
    """
    消息模型
    """
    message_id: str = Field(..., description="消息ID")
    sender_id: str = Field(..., description="发送者用户ID")
    receiver_id: str = Field(..., description="接收者用户ID")
    content: str = Field(..., description="消息内容")
    message_type: str = Field(..., description="消息类型: text|image|file")
    is_read: bool = Field(default=False, description="是否已读")
    created_at: datetime = Field(..., description="创建时间")
    read_at: Optional[datetime] = Field(None, description="阅读时间")


class MessageListResponse(BaseModel):
    """
    消息列表响应
    """
    messages: List[Message] = Field(..., description="消息列表")
    total: int = Field(..., description="总数量")
    has_more: bool = Field(..., description="是否还有更多消息")


class ConversationListItem(BaseModel):
    """
    会话列表项
    """
    user_id: str = Field(..., description="对话用户ID")
    last_message: Optional[Message] = Field(None, description="最后一条消息")
    unread_count: int = Field(default=0, description="未读消息数")
    last_message_time: Optional[datetime] = Field(None, description="最后消息时间")


class ConversationListResponse(BaseModel):
    """
    会话列表响应
    """
    conversations: List[ConversationListItem] = Field(..., description="会话列表")
    total: int = Field(..., description="总数量")


class MarkAsReadRequest(BaseModel):
    """
    标记消息为已读请求
    """
    message_ids: List[str] = Field(..., description="消息ID列表")


class UserOnlineStatus(BaseModel):
    """
    用户在线状态
    """
    user_id: str = Field(..., description="用户ID")
    is_online: bool = Field(..., description="是否在线")
    last_seen: Optional[datetime] = Field(None, description="最后在线时间")


class UserListItem(BaseModel):
    """
    用户列表项（用于显示可聊天的用户）
    """
    user_id: str = Field(..., description="用户ID")
    role: str = Field(..., description="用户角色")
    is_online: bool = Field(default=False, description="是否在线")
    last_seen: Optional[datetime] = Field(None, description="最后在线时间")


class TeamUsersResponse(BaseModel):
    """
    团队用户列表响应
    """
    users: List[UserListItem] = Field(..., description="用户列表")
    total: int = Field(..., description="总数量")


class WebSocketMessage(BaseModel):
    """
    WebSocket消息模型
    """
    type: str = Field(..., description="消息类型: new_message|message_read|user_online|user_offline|typing")
    data: dict = Field(..., description="消息数据")
