// src/components/mcp-manager/MCPServerCard.tsx
import React from 'react';
import { Card, Button, Tag, Space, Typography, Tooltip, Popconfirm } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { MCPServerConfig } from '../../types/mcp';

const { Text, Paragraph } = Typography;

interface MCPServerCardProps {
  serverName: string;
  config: MCPServerConfig;
  status?: {
    connected: boolean;
    init_attempted: boolean;
    tools: string[];
    error?: string;
  };
  onConnect: (serverName: string) => void;
  onEdit: (serverName: string) => void;
  onDelete: (serverName: string) => void;
  onViewTools: (serverName: string) => void;
  loading: boolean;
}

const MCPServerCard: React.FC<MCPServerCardProps> = ({
  serverName,
  config,
  status,
  onConnect,
  onEdit,
  onDelete,
  onViewTools,
  loading,
}) => {
  // Determine status information
  const connected = status?.connected || false;
  const initAttempted = status?.init_attempted || false;
  const tools = status?.tools || [];
  const error = status?.error || '';

  // Format server arguments for display
  const formattedArgs = Array.isArray(config.args)
    ? config.args.join(' ')
    : String(config.args || '');

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span>{serverName}</span>
          {config.disabled ? (
            <Tag color="gray">Disabled</Tag>
          ) : connected ? (
            <Tag icon={<CheckCircleOutlined />} color="success">Connected</Tag>
          ) : initAttempted ? (
            <Tag icon={<CloseCircleOutlined />} color="error">Failed</Tag>
          ) : (
            <Tag icon={<ExclamationCircleOutlined />} color="warning">Not Connected</Tag>
          )}
        </div>
      }
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => onConnect(serverName)}
            disabled={config.disabled || connected || loading}
            loading={loading}
          >
            Connect
          </Button>
          <Button
            icon={<ToolOutlined />}
            onClick={() => onViewTools(serverName)}
            disabled={!connected}
          >
            Tools
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => onEdit(serverName)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this server?"
            onConfirm={() => onDelete(serverName)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <div className="space-y-2">
        <div>
          <Text strong>Transport Type:</Text> {config.transportType}
        </div>
        <div>
          <Text strong>Command:</Text> {config.command} {formattedArgs}
        </div>
        {config.transportType === 'http' && (
          <div>
            <Text strong>Base URL:</Text> {config.base_url}
          </div>
        )}
        <div>
          <Text strong>Timeout:</Text> {config.timeout} seconds
        </div>
        {Array.isArray(config.autoApprove) && config.autoApprove.length > 0 && (
          <div>
            <Text strong>Auto Approve:</Text>{' '}
            {config.autoApprove.map(tool => (
              <Tag key={tool} color="blue">{tool}</Tag>
            ))}
          </div>
        )}
        {connected && tools.length > 0 && (
          <div>
            <Text strong>Available Tools:</Text>{' '}
            {tools.map(tool => (
              <Tag key={tool} color="green">{tool}</Tag>
            ))}
          </div>
        )}
        {error && (
          <Paragraph type="danger">
            <Text strong>Error:</Text> {error}
          </Paragraph>
        )}
      </div>
    </Card>
  );
};

export default MCPServerCard;