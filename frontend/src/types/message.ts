// src/types/message.ts

/**
 * 消息类型
 */
export interface Message {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

/**
 * 发送消息请求
 */
export interface MessageSendRequest {
  receiver_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file';
}

/**
 * 消息列表响应
 */
export interface MessageListResponse {
  messages: Message[];
  total: number;
  has_more: boolean;
}

/**
 * 会话列表项
 */
export interface ConversationListItem {
  user_id: string;
  last_message?: Message;
  unread_count: number;
  last_message_time?: string;
}

/**
 * 会话列表响应
 */
export interface ConversationListResponse {
  conversations: ConversationListItem[];
  total: number;
}

/**
 * 用户列表项
 */
export interface UserListItem {
  user_id: string;
  role: string;
  is_online: boolean;
  last_seen?: string;
}

/**
 * 团队用户列表响应
 */
export interface TeamUsersResponse {
  users: UserListItem[];
  total: number;
}

/**
 * 用户在线状态
 */
export interface UserOnlineStatus {
  user_id: string;
  is_online: boolean;
  last_seen?: string;
}

/**
 * WebSocket消息类型
 */
export type WebSocketMessageType =
  | 'connected'
  | 'new_message'
  | 'message_read'
  | 'user_status'
  | 'typing'
  | 'pong';

/**
 * WebSocket消息
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
}

/**
 * 标记已读请求
 */
export interface MarkAsReadRequest {
  message_ids: string[];
}
