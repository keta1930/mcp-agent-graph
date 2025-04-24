// src/components/graph-runner/ConversationHistory.tsx
import React from 'react';
import { Button, Empty, Popconfirm, Typography, Tooltip } from 'antd';
import {
  DeleteOutlined,
  HistoryOutlined,
  MessageOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';

const { Text } = Typography;

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
          <HistoryOutlined style={{ marginRight: '8px' }} />
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
            {conversationIds.map(id => (
              <div
                key={id}
                className={`conversation-item ${id === currentConversation ? 'active' : ''}`}
                onClick={() => executeGraph(conversations[id].input, id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <MessageOutlined style={{ marginRight: '8px', color: id === currentConversation ? '#1d4ed8' : '#9ca3af' }} />
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
                      />
                    </Popconfirm>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;