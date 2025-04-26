// src/components/graph-runner/ConversationHistory.tsx
import React from 'react';
import { Button, Empty, Popconfirm, Typography, Tooltip, Space } from 'antd';
import {
  DeleteOutlined,
  HistoryOutlined,
  MessageOutlined,
  ClearOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';
import { formatDistanceToNow } from 'date-fns';

const { Text } = Typography;

// 生成一个伪随机时间戳用于演示
const getRandomTimestamp = (id: string) => {
  // 用会话ID生成一个稳定的随机时间（仅用于演示）
  const hash = id.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const hoursAgo = Math.abs(hash) % 72; // 0-72小时前
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);

  return date;
};

const ConversationHistory: React.FC = () => {
  const {
    conversations,
    currentConversation,
    executeGraph,
    deleteConversation,
    clearConversations
  } = useGraphRunnerStore();

  const conversationIds = Object.keys(conversations);

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  const handleClearAll = () => {
    clearConversations();
  };

  return (
    <div className="graph-card history-card">
      <div className="graph-card-header">
        <h3 className="graph-card-title">
          <HistoryOutlined className="card-icon" />
          Conversation History
        </h3>

        {conversationIds.length > 0 && (
          <Popconfirm
            title="Clear all conversations?"
            description="This action cannot be undone."
            onConfirm={handleClearAll}
            okText="Yes"
            cancelText="No"
            placement="left"
          >
            <Button
              icon={<ClearOutlined />}
              danger
              size="small"
              className="clear-all-btn"
            >
              Clear All
            </Button>
          </Popconfirm>
        )}
      </div>

      <div className="graph-card-body">
        {conversationIds.length === 0 ? (
          <div className="custom-empty">
            <HistoryOutlined className="custom-empty-icon" />
            <Text className="custom-empty-text">No conversation history</Text>
          </div>
        ) : (
          <div className="conversation-list">
            {conversationIds.map(id => {
              const timestamp = getRandomTimestamp(id);
              const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });

              return (
                <div
                  key={id}
                  className={`conversation-item ${id === currentConversation ? 'active' : ''}`}
                  onClick={() => executeGraph(conversations[id].input, id)}
                >
                  <div className="conversation-content">
                    <div className="conversation-header">
                      <div className="conversation-main">
                        <MessageOutlined className={`conversation-icon ${id === currentConversation ? 'active' : ''}`} />
                        <div className="conversation-text">
                          {conversations[id].input.substring(0, 30)}
                          {conversations[id].input.length > 30 ? '...' : ''}
                        </div>
                      </div>

                      <div className="conversation-actions">
                        <Popconfirm
                          title="Delete this conversation?"
                          description="This action cannot be undone."
                          onConfirm={(e) => handleDeleteConversation(id, e as React.MouseEvent)}
                          okText="Yes"
                          cancelText="No"
                          placement="left"
                        >
                          <Button
                            icon={<DeleteOutlined />}
                            size="small"
                            danger
                            type="text"
                            onClick={e => e.stopPropagation()}
                            className="delete-conversation-btn"
                          />
                        </Popconfirm>
                      </div>
                    </div>

                    <div className="conversation-footer">
                      <Space size="small">
                        <CalendarOutlined className="time-icon" />
                        <Text type="secondary" className="conversation-time">{timeAgo}</Text>
                      </Space>

                      <div className="conversation-graph">
                        <Text type="secondary" className="graph-name">{conversations[id].graph_name}</Text>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;