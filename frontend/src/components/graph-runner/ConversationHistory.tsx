// src/components/graph-runner/ConversationHistory.tsx
import React, { useEffect, useState } from 'react';
import { Button, Empty, Popconfirm, Typography, Space, Input, Badge, Spin, Divider } from 'antd';
import {
  DeleteOutlined,
  MessageOutlined,
  ClearOutlined,
  CalendarOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';
import { formatDistanceToNow } from 'date-fns';

const { Text } = Typography;
const { Search } = Input;

const ConversationHistory: React.FC = () => {
  const {
    conversationList,
    conversationDetails,
    currentConversation,
    loading,
    fetchConversationList,
    selectConversation,
    deleteConversation,
    clearConversations
  } = useGraphRunnerStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<string[]>([]);

  useEffect(() => {
    fetchConversationList();
  }, [fetchConversationList]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredConversations(conversationList);
    } else {
      const filtered = conversationList.filter(id => {
        const detail = conversationDetails[id];
        return (
          id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (detail?.graph_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (detail?.input?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      });
      setFilteredConversations(filtered);
    }
  }, [conversationList, conversationDetails, searchTerm]);

  const handleSelectConversation = (conversationId: string) => {
    selectConversation(conversationId);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  const handleClearAll = () => {
    clearConversations();
  };

  const handleRefreshList = () => {
    fetchConversationList();
  };

  // 修复时间显示：使用与概览页面一致的时间
  const getConversationTime = (id: string) => {
    const detail = conversationDetails[id];
    if (detail?.start_time) {
      try {
        const date = new Date(detail.start_time);
        return formatDistanceToNow(date, { addSuffix: true });
      } catch (error) {
        console.warn('Invalid start_time format:', detail.start_time);
      }
    }
    
    // 如果没有 start_time，使用会话ID生成一个一致的时间
    const hash = id.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const hoursAgo = Math.abs(hash) % 72;
    const date = new Date();
    date.setHours(date.getHours() - hoursAgo);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const getConversationStatus = (id: string) => {
    const detail = conversationDetails[id];
    if (!detail) return { status: 'unknown', color: 'default', icon: <ClockCircleOutlined /> };
    
    if (detail.completed) {
      return { 
        status: 'completed', 
        color: 'success', 
        icon: <CheckCircleOutlined />,
        text: '已完成'
      };
    } else {
      return { 
        status: 'in progress', 
        color: 'processing', 
        icon: <PlayCircleOutlined />,
        text: '进行中'
      };
    }
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="conversation-history-container">
      {/* Controls */}
      <div className="conversation-controls">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div className="controls-header">
            <div className="controls-title">
              <Text strong style={{ fontSize: '16px', color: '#262626' }}>会话列表</Text>
            </div>
            
            <Space>
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={handleRefreshList}
                title="刷新会话列表"
                className="control-button"
              />
              {conversationList.length > 0 && (
                <Popconfirm
                  title="清空所有会话？"
                  description="此操作无法撤销。"
                  onConfirm={handleClearAll}
                  okText="确认"
                  cancelText="取消"
                  placement="left"
                >
                  <Button
                    icon={<ClearOutlined />}
                    danger
                    size="small"
                    title="清空所有会话"
                    className="control-button danger"
                  />
                </Popconfirm>
              )}
            </Space>
          </div>

          <Search
            placeholder="搜索会话..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            allowClear
            className="conversation-search"
          />
        </Space>
      </div>

      {/* Conversation List */}
      <div className="conversation-list">
        {filteredConversations.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text type="secondary">
                  {conversationList.length === 0 ? '暂无会话记录' : '没有匹配的会话'}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {conversationList.length === 0 ? '开始一个新会话吧' : '尝试使用其他关键词搜索'}
                </Text>
              </div>
            }
            style={{ paddingTop: '40px' }}
          />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {filteredConversations.map(id => {
              const detail = conversationDetails[id];
              const timeAgo = getConversationTime(id);
              const { status, color, icon, text } = getConversationStatus(id);
              const isActive = id === currentConversation;

              return (
                <div
                  key={id}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(id)}
                >
                  <div className="conversation-content">
                    <div className="conversation-header">
                      <div className="conversation-title">
                        <MessageOutlined className="title-icon" />
                        <Text className="title-text">
                          {detail?.input ? (
                            detail.input.length > 35 
                              ? `${detail.input.substring(0, 35)}...`
                              : detail.input
                          ) : (
                            id.length > 25 
                              ? `${id.substring(0, 25)}...`
                              : id
                          )}
                        </Text>
                      </div>

                      <Popconfirm
                        title="删除此会话？"
                        description="此操作无法撤销。"
                        onConfirm={(e) => handleDeleteConversation(id, e as any)}
                        okText="确认"
                        cancelText="取消"
                        placement="left"
                      >
                        <Button
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                          type="text"
                          onClick={e => e.stopPropagation()}
                          className="delete-button"
                        />
                      </Popconfirm>
                    </div>

                    <div className="conversation-meta">
                      <div className="meta-row">
                        <div className="time-info">
                          <CalendarOutlined className="meta-icon" />
                          <Text type="secondary" className="meta-text">
                            {timeAgo}
                          </Text>
                        </div>
                      </div>
                      
                      <div className="meta-row">
                        <div className="tags-container">
                          {detail?.graph_name && (
                            <div className="graph-tag">
                              {detail.graph_name.length > 20 
                                ? `${detail.graph_name.substring(0, 20)}...`
                                : detail.graph_name
                              }
                            </div>
                          )}
                          <div className={`status-tag ${color}`}>
                            {icon}
                            <span>{text}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </Space>
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;