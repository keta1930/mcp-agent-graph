// src/pages/TeamChat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Layout, List, Input, Button, Avatar, Badge, Typography, message as antMessage, Spin, Empty, Space, Tooltip } from 'antd';
import { SendOutlined, UserOutlined, MessageOutlined, CloseCircleOutlined } from '@ant-design/icons';
import messageService from '../services/messageService';
import {
  Message,
  UserListItem,
  ConversationListItem,
  WebSocketMessage,
} from '../types/message';
import './TeamChat.css';

const { Sider, Content, Header } = Layout;
const { TextArea } = Input;
const { Text, Title } = Typography;

/**
 * 团队聊天页面
 * 提供实时聊天功能，用户可以与团队成员互相发送消息
 */
const TeamChat: React.FC = () => {
  // 状态管理
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 滚动到消息底部
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * 初始化WebSocket连接
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      antMessage.error('请先登录');
      window.location.href = '/';
      return;
    }

    // 解析token获取当前用户ID（简化处理，实际应该从后端获取）
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.user_id);
    } catch (error) {
      console.error('解析token失败:', error);
    }

    // 连接WebSocket
    messageService.connect(token);

    // 订阅WebSocket消息
    const unsubscribe = messageService.subscribe((wsMessage: WebSocketMessage) => {
      handleWebSocketMessage(wsMessage);
    });

    // 加载初始数据
    loadTeamUsers();
    loadConversations();

    // 清理函数
    return () => {
      unsubscribe();
      messageService.disconnect();
    };
  }, []);

  /**
   * 当选择用户时加载消息历史
   */
  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser.user_id);
    }
  }, [selectedUser]);

  /**
   * 自动滚动到底部
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * 处理WebSocket消息
   */
  const handleWebSocketMessage = (wsMessage: WebSocketMessage) => {
    console.log('收到WebSocket消息:', wsMessage);

    switch (wsMessage.type) {
      case 'connected':
        console.log('WebSocket已连接');
        const connectedUsers = wsMessage.data.online_users || [];
        setOnlineUsers(new Set(connectedUsers));
        break;

      case 'new_message':
        handleNewMessage(wsMessage.data);
        break;

      case 'user_status':
        handleUserStatusChange(wsMessage.data);
        break;

      case 'typing':
        // TODO: 显示正在输入提示
        break;

      default:
        break;
    }
  };

  /**
   * 处理新消息
   */
  const handleNewMessage = (newMessage: Message) => {
    // 如果是当前会话的消息，添加到消息列表
    if (
      selectedUser &&
      (newMessage.sender_id === selectedUser.user_id ||
        newMessage.receiver_id === selectedUser.user_id)
    ) {
      setMessages((prev) => [...prev, newMessage]);

      // 如果是接收的消息，标记为已读
      if (newMessage.receiver_id === currentUserId) {
        markAsRead([newMessage.message_id]);
      }
    }

    // 刷新会话列表
    loadConversations();
  };

  /**
   * 处理用户状态变化
   */
  const handleUserStatusChange = (data: any) => {
    const { user_id, is_online } = data;

    setOnlineUsers((prev) => {
      const updated = new Set(prev);
      if (is_online) {
        updated.add(user_id);
      } else {
        updated.delete(user_id);
      }
      return updated;
    });

    // 更新用户列表中的在线状态
    setUsers((prev) =>
      prev.map((user) =>
        user.user_id === user_id ? { ...user, is_online } : user
      )
    );
  };

  /**
   * 加载团队用户列表
   */
  const loadTeamUsers = async () => {
    try {
      const response = await messageService.getTeamUsers();
      setUsers(response.users);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      antMessage.error('加载用户列表失败');
    }
  };

  /**
   * 加载会话列表
   */
  const loadConversations = async () => {
    try {
      const response = await messageService.getConversations();
      setConversations(response.conversations);
    } catch (error) {
      console.error('加载会话列表失败:', error);
    }
  };

  /**
   * 加载消息历史
   */
  const loadMessages = async (userId: string) => {
    setLoading(true);
    try {
      const response = await messageService.getMessageHistory(userId, 0, 100);
      setMessages(response.messages);

      // 标记未读消息为已读
      const unreadIds = response.messages
        .filter((msg) => !msg.is_read && msg.receiver_id === currentUserId)
        .map((msg) => msg.message_id);

      if (unreadIds.length > 0) {
        await markAsRead(unreadIds);
      }
    } catch (error) {
      console.error('加载消息历史失败:', error);
      antMessage.error('加载消息历史失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 发送消息
   */
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedUser) {
      return;
    }

    setSending(true);
    try {
      const newMessage = await messageService.sendMessage({
        receiver_id: selectedUser.user_id,
        content: messageInput.trim(),
        message_type: 'text',
      });

      setMessages((prev) => [...prev, newMessage]);
      setMessageInput('');
      loadConversations();
    } catch (error) {
      console.error('发送消息失败:', error);
      antMessage.error('发送消息失败');
    } finally {
      setSending(false);
    }
  };

  /**
   * 标记消息为已读
   */
  const markAsRead = async (messageIds: string[]) => {
    try {
      await messageService.markMessagesAsRead(messageIds);
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  /**
   * 处理输入框变化
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);

    // 发送正在输入通知
    if (selectedUser && e.target.value) {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      messageService.sendTypingNotification(selectedUser.user_id, true);

      typingTimerRef.current = setTimeout(() => {
        messageService.sendTypingNotification(selectedUser.user_id, false);
      }, 1000);
    }
  };

  /**
   * 处理Enter键发送
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /**
   * 获取未读消息数
   */
  const getUnreadCount = (userId: string): number => {
    const conv = conversations.find((c) => c.user_id === userId);
    return conv?.unread_count || 0;
  };

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 左侧用户列表 */}
      <Sider width={280} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0 }}>
            <MessageOutlined /> 团队消息
          </Title>
        </div>

        <List
          dataSource={users}
          renderItem={(user) => {
            const isOnline = onlineUsers.has(user.user_id);
            const unreadCount = getUnreadCount(user.user_id);

            return (
              <List.Item
                onClick={() => setSelectedUser(user)}
                style={{
                  cursor: 'pointer',
                  backgroundColor:
                    selectedUser?.user_id === user.user_id ? '#e6f7ff' : 'transparent',
                  padding: '12px 16px',
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Badge dot={isOnline} status={isOnline ? 'success' : 'default'}>
                      <Avatar icon={<UserOutlined />} />
                    </Badge>
                  }
                  title={
                    <Space>
                      <Text strong>{user.user_id}</Text>
                      {unreadCount > 0 && (
                        <Badge count={unreadCount} style={{ backgroundColor: '#52c41a' }} />
                      )}
                    </Space>
                  }
                  description={
                    <Text type="secondary">{isOnline ? '在线' : '离线'}</Text>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Sider>

      {/* 右侧聊天区域 */}
      <Layout>
        {selectedUser ? (
          <>
            {/* 聊天头部 */}
            <Header
              style={{
                background: '#fff',
                padding: '0 24px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Space>
                <Avatar icon={<UserOutlined />} />
                <div>
                  <Text strong>{selectedUser.user_id}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {onlineUsers.has(selectedUser.user_id) ? '在线' : '离线'}
                  </Text>
                </div>
              </Space>
            </Header>

            {/* 消息列表 */}
            <Content
              style={{
                padding: '24px',
                overflowY: 'auto',
                backgroundColor: '#f5f5f5',
              }}
            >
              {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                  <Spin size="large" />
                </div>
              ) : messages.length === 0 ? (
                <Empty description="暂无消息" />
              ) : (
                <div className="messages-container">
                  {messages.map((msg) => {
                    const isSent = msg.sender_id === currentUserId;
                    return (
                      <div
                        key={msg.message_id}
                        className={`message-item ${isSent ? 'sent' : 'received'}`}
                      >
                        <div className="message-bubble">
                          <div className="message-content">{msg.content}</div>
                          <div className="message-time">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </Content>

            {/* 输入区域 */}
            <div
              style={{
                padding: '16px',
                borderTop: '1px solid #f0f0f0',
                backgroundColor: '#fff',
              }}
            >
              <Space.Compact style={{ width: '100%' }}>
                <TextArea
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息... (Enter发送, Shift+Enter换行)"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  style={{ resize: 'none' }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sending}
                  onClick={sendMessage}
                >
                  发送
                </Button>
              </Space.Compact>
            </div>
          </>
        ) : (
          <Content
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5',
            }}
          >
            <Empty description="请选择一个用户开始聊天" />
          </Content>
        )}
      </Layout>
    </Layout>
  );
};

export default TeamChat;
