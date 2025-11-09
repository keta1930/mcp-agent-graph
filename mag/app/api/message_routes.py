"""
消息API路由

处理实时聊天消息的发送、接收、查询等操作
"""
import logging
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect, Query
from datetime import datetime

from app.models.message_schema import (
    MessageSendRequest,
    Message,
    MessageListResponse,
    ConversationListResponse,
    ConversationListItem,
    MarkAsReadRequest,
    TeamUsersResponse,
    UserListItem,
    UserOnlineStatus
)
from app.auth.dependencies import get_current_user
from app.auth.jwt import verify_token
from app.models.auth_schema import CurrentUser
from app.infrastructure.database.mongodb import mongodb_client
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messages", tags=["Messages"])


# ===== WebSocket路由 =====

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket连接端点

    客户端通过此端点建立WebSocket连接以接收实时消息
    需要提供JWT token作为查询参数进行认证
    """
    user_id = None

    try:
        # 验证JWT token
        payload = verify_token(token)
        user_id = payload.get("user_id")

        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # 建立连接
        await websocket_manager.connect(websocket, user_id)

        # 发送连接成功消息
        await websocket.send_json({
            "type": "connected",
            "data": {
                "user_id": user_id,
                "timestamp": datetime.now().isoformat(),
                "online_users": list(websocket_manager.get_online_users())
            }
        })

        # 保持连接并处理客户端消息
        while True:
            data = await websocket.receive_json()

            # 处理客户端发送的不同类型的消息
            message_type = data.get("type")

            if message_type == "ping":
                # 心跳响应
                await websocket.send_json({
                    "type": "pong",
                    "data": {"timestamp": datetime.now().isoformat()}
                })

            elif message_type == "typing":
                # 转发正在输入的通知
                receiver_id = data.get("receiver_id")
                is_typing = data.get("is_typing", True)

                if receiver_id:
                    await websocket_manager.send_typing_notification(
                        receiver_id, user_id, is_typing
                    )

    except WebSocketDisconnect:
        logger.info(f"WebSocket连接断开: {user_id}")
    except Exception as e:
        logger.error(f"WebSocket错误: {str(e)}")
    finally:
        if user_id:
            websocket_manager.disconnect(user_id)
            # 广播用户下线状态
            await websocket_manager.broadcast_user_status(user_id, False)


# ===== RESTful API路由 =====

@router.post("/send", response_model=Message)
async def send_message(
    request: MessageSendRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    发送消息

    发送一条消息给指定用户，消息会实时推送给在线的接收者
    """
    try:
        # 检查数据库连接
        if not mongodb_client.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务未就绪"
            )

        # 不能发送消息给自己
        if request.receiver_id == current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不能发送消息给自己"
            )

        # 验证接收者存在
        receiver_exists = await mongodb_client.user_repository.user_exists(request.receiver_id)
        if not receiver_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"接收者不存在: {request.receiver_id}"
            )

        # 创建消息
        message_doc = await mongodb_client.message_repository.create_message(
            sender_id=current_user.user_id,
            receiver_id=request.receiver_id,
            content=request.content,
            message_type=request.message_type
        )

        if not message_doc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="创建消息失败"
            )

        # 构建消息响应
        message = Message(
            message_id=message_doc["message_id"],
            sender_id=message_doc["sender_id"],
            receiver_id=message_doc["receiver_id"],
            content=message_doc["content"],
            message_type=message_doc["message_type"],
            is_read=message_doc["is_read"],
            created_at=message_doc["created_at"],
            read_at=message_doc.get("read_at")
        )

        # 实时推送给接收者（如果在线）
        await websocket_manager.send_new_message_notification(
            request.receiver_id,
            message.model_dump(mode='json')
        )

        logger.info(f"消息发送成功: {current_user.user_id} -> {request.receiver_id}")
        return message

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"发送消息失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"发送消息失败: {str(e)}"
        )


@router.get("/history/{user_id}", response_model=MessageListResponse)
async def get_message_history(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取与指定用户的消息历史

    返回与指定用户的聊天记录，支持分页
    """
    try:
        # 检查数据库连接
        if not mongodb_client.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务未就绪"
            )

        # 获取消息列表
        messages_docs = await mongodb_client.message_repository.get_messages_between_users(
            current_user.user_id, user_id, skip, limit
        )

        # 获取总数
        total = await mongodb_client.message_repository.get_message_count_between_users(
            current_user.user_id, user_id
        )

        # 转换为Pydantic模型
        messages = [
            Message(
                message_id=doc["message_id"],
                sender_id=doc["sender_id"],
                receiver_id=doc["receiver_id"],
                content=doc["content"],
                message_type=doc["message_type"],
                is_read=doc["is_read"],
                created_at=doc["created_at"],
                read_at=doc.get("read_at")
            )
            for doc in messages_docs
        ]

        has_more = (skip + len(messages)) < total

        return MessageListResponse(
            messages=messages,
            total=total,
            has_more=has_more
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取消息历史失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取消息历史失败: {str(e)}"
        )


@router.get("/conversations", response_model=ConversationListResponse)
async def get_conversations(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取会话列表

    返回当前用户的所有聊天会话，包含最后一条消息和未读数
    """
    try:
        # 检查数据库连接
        if not mongodb_client.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务未就绪"
            )

        # 获取会话列表
        conversations_docs = await mongodb_client.message_repository.get_conversations_list(
            current_user.user_id
        )

        # 转换为Pydantic模型
        conversations = []
        for doc in conversations_docs:
            last_message_doc = doc.get("last_message")
            last_message = None

            if last_message_doc:
                last_message = Message(
                    message_id=last_message_doc["message_id"],
                    sender_id=last_message_doc["sender_id"],
                    receiver_id=last_message_doc["receiver_id"],
                    content=last_message_doc["content"],
                    message_type=last_message_doc["message_type"],
                    is_read=last_message_doc["is_read"],
                    created_at=last_message_doc["created_at"],
                    read_at=last_message_doc.get("read_at")
                )

            conversations.append(
                ConversationListItem(
                    user_id=doc["user_id"],
                    last_message=last_message,
                    unread_count=doc["unread_count"],
                    last_message_time=doc.get("last_message_time")
                )
            )

        return ConversationListResponse(
            conversations=conversations,
            total=len(conversations)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取会话列表失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取会话列表失败: {str(e)}"
        )


@router.post("/mark-read")
async def mark_messages_as_read(
    request: MarkAsReadRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    标记消息为已读

    将指定的消息标记为已读状态
    """
    try:
        # 检查数据库连接
        if not mongodb_client.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务未就绪"
            )

        # 标记消息为已读
        updated_count = await mongodb_client.message_repository.mark_messages_as_read(
            request.message_ids, current_user.user_id
        )

        # 如果有消息被标记为已读，通知发送者
        if updated_count > 0:
            # 获取第一条消息来确定发送者（假设所有消息来自同一发送者）
            # 这里简化处理，实际应该按发送者分组
            # TODO: 改进为按发送者分组通知
            pass

        return {
            "status": "success",
            "message": f"已标记 {updated_count} 条消息为已读",
            "updated_count": updated_count
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"标记消息为已读失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"标记消息为已读失败: {str(e)}"
        )


@router.get("/unread-count/{user_id}")
async def get_unread_count(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取与指定用户的未读消息数量

    返回来自指定用户的未读消息数
    """
    try:
        # 检查数据库连接
        if not mongodb_client.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务未就绪"
            )

        unread_count = await mongodb_client.message_repository.get_unread_count(
            current_user.user_id, user_id
        )

        return {
            "user_id": user_id,
            "unread_count": unread_count
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取未读消息数失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取未读消息数失败: {str(e)}"
        )


@router.get("/team-users", response_model=TeamUsersResponse)
async def get_team_users(
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取团队所有用户列表

    返回所有可以聊天的团队成员，包含在线状态
    """
    try:
        # 检查数据库连接
        if not mongodb_client.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务未就绪"
            )

        # 获取所有用户
        users_docs = await mongodb_client.user_repository.list_users(skip=0, limit=1000)

        # 获取在线用户集合
        online_users = websocket_manager.get_online_users()

        # 转换为响应模型
        users = []
        for doc in users_docs:
            # 排除当前用户自己
            if doc["user_id"] == current_user.user_id:
                continue

            is_online = doc["user_id"] in online_users
            last_seen = None

            if not is_online:
                last_seen = websocket_manager.get_user_last_seen(doc["user_id"])

            users.append(
                UserListItem(
                    user_id=doc["user_id"],
                    role=doc["role"],
                    is_online=is_online,
                    last_seen=last_seen
                )
            )

        return TeamUsersResponse(
            users=users,
            total=len(users)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取团队用户列表失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取团队用户列表失败: {str(e)}"
        )


@router.get("/online-status/{user_id}", response_model=UserOnlineStatus)
async def get_user_online_status(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    获取指定用户的在线状态

    返回用户是否在线及最后在线时间
    """
    try:
        is_online = websocket_manager.is_user_online(user_id)
        last_seen = websocket_manager.get_user_last_seen(user_id)

        return UserOnlineStatus(
            user_id=user_id,
            is_online=is_online,
            last_seen=last_seen
        )

    except Exception as e:
        logger.error(f"获取用户在线状态失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取用户在线状态失败: {str(e)}"
        )


@router.delete("/conversation/{user_id}")
async def delete_conversation(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    删除与指定用户的所有消息

    彻底删除与指定用户的聊天记录
    """
    try:
        # 检查数据库连接
        if not mongodb_client.is_connected:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="数据库服务未就绪"
            )

        deleted_count = await mongodb_client.message_repository.delete_conversation(
            current_user.user_id, user_id
        )

        return {
            "status": "success",
            "message": f"已删除 {deleted_count} 条消息",
            "deleted_count": deleted_count
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除会话失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除会话失败: {str(e)}"
        )
