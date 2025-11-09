// src/services/messageService.ts
import api from './api';
import {
  Message,
  MessageSendRequest,
  MessageListResponse,
  ConversationListResponse,
  TeamUsersResponse,
  UserOnlineStatus,
  WebSocketMessage,
  MarkAsReadRequest,
} from '../types/message';

const WS_BASE_URL = 'ws://localhost:9999/api/messages/ws';

/**
 * WebSocket消息回调函数类型
 */
export type MessageCallback = (message: WebSocketMessage) => void;

/**
 * 消息服务类
 * 处理消息的发送、接收、查询以及WebSocket连接管理
 */
class MessageService {
  private ws: WebSocket | null = null;
  private messageCallbacks: MessageCallback[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isManualClose = false;

  /**
   * 建立WebSocket连接
   */
  connect(token: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket已连接');
      return;
    }

    this.isManualClose = false;
    const wsUrl = `${WS_BASE_URL}?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket连接成功');
        this.reconnectAttempts = 0;

        // 启动心跳
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('收到WebSocket消息:', message);

          // 通知所有订阅者
          this.messageCallbacks.forEach((callback) => {
            try {
              callback(message);
            } catch (error) {
              console.error('消息回调执行失败:', error);
            }
          });
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket连接关闭');
        this.stopHeartbeat();

        // 如果不是手动关闭，尝试重连
        if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          console.log(`将在 ${delay}ms 后尝试重连...`);

          this.reconnectTimer = setTimeout(() => {
            this.connect(token);
          }, delay);
        }
      };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    this.isManualClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.stopHeartbeat();
  }

  /**
   * 订阅WebSocket消息
   */
  subscribe(callback: MessageCallback): () => void {
    this.messageCallbacks.push(callback);

    // 返回取消订阅函数
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index > -1) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 发送WebSocket消息
   */
  private sendWsMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket未连接，无法发送消息');
    }
  }

  /**
   * 心跳定时器
   */
  private heartbeatTimer: NodeJS.Timeout | null = null;

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      this.sendWsMessage({ type: 'ping' });
    }, 30000); // 每30秒发送一次心跳
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 发送正在输入通知
   */
  sendTypingNotification(receiverId: string, isTyping: boolean): void {
    this.sendWsMessage({
      type: 'typing',
      receiver_id: receiverId,
      is_typing: isTyping,
    });
  }

  // ===== REST API方法 =====

  /**
   * 发送消息
   */
  async sendMessage(request: MessageSendRequest): Promise<Message> {
    const response = await api.post<Message>('/messages/send', request);
    return response.data;
  }

  /**
   * 获取消息历史
   */
  async getMessageHistory(
    userId: string,
    skip: number = 0,
    limit: number = 50
  ): Promise<MessageListResponse> {
    const response = await api.get<MessageListResponse>(
      `/messages/history/${userId}`,
      {
        params: { skip, limit },
      }
    );
    return response.data;
  }

  /**
   * 获取会话列表
   */
  async getConversations(): Promise<ConversationListResponse> {
    const response = await api.get<ConversationListResponse>('/messages/conversations');
    return response.data;
  }

  /**
   * 标记消息为已读
   */
  async markMessagesAsRead(messageIds: string[]): Promise<void> {
    const request: MarkAsReadRequest = { message_ids: messageIds };
    await api.post('/messages/mark-read', request);
  }

  /**
   * 获取未读消息数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    const response = await api.get<{ user_id: string; unread_count: number }>(
      `/messages/unread-count/${userId}`
    );
    return response.data.unread_count;
  }

  /**
   * 获取团队所有用户
   */
  async getTeamUsers(): Promise<TeamUsersResponse> {
    const response = await api.get<TeamUsersResponse>('/messages/team-users');
    return response.data;
  }

  /**
   * 获取用户在线状态
   */
  async getUserOnlineStatus(userId: string): Promise<UserOnlineStatus> {
    const response = await api.get<UserOnlineStatus>(
      `/messages/online-status/${userId}`
    );
    return response.data;
  }

  /**
   * 删除会话
   */
  async deleteConversation(userId: string): Promise<void> {
    await api.delete(`/messages/conversation/${userId}`);
  }
}

// 导出单例
export const messageService = new MessageService();
export default messageService;
