// src/components/mcp-manager/MCPServerCard.tsx
import React from 'react';
import { Card, Button, Tag, Space, Typography, Tooltip, Popconfirm, Collapse } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ToolOutlined,
  EnvironmentOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { MCPServerConfig } from '../../types/mcp';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface MCPServerCardProps {
  serverName: string;
  config: MCPServerConfig;
  status?: {
    connected: boolean;
    init_attempted: boolean;
    tools: string[];
    error?: string;
    transport_type?: string;
  };
  onConnect: (serverName: string) => void;
  onDisconnect?: (serverName: string) => void;
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
  onDisconnect,
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

  // Check if this is an AI-generated tool
  const isAIGenerated = config.ai_generated || 
    (config.transportType === 'streamable_http' && config.url?.includes('localhost'));

  // Format server arguments for display
  const formattedArgs = Array.isArray(config.args)
    ? config.args.join(' ')
    : String(config.args || '');

  const renderTransportInfo = () => {
    if (config.transportType === 'sse') {
      return (
        <div>
          <Text strong>SSE地址:</Text> {config.url}
        </div>
      );
    } else if (config.transportType === 'streamable_http') {
      return (
        <div>
          <Text strong>HTTP地址:</Text> {config.url}
        </div>
      );
    } else {
      return (
        <div>
          <Text strong>命令:</Text> {config.command} {formattedArgs}
        </div>
      );
    }
  };

  const renderEnvironmentVariables = () => {
    if (!config.env || Object.keys(config.env).length === 0) {
      return null;
    }

    return (
      <div>
        <Text strong>
          <EnvironmentOutlined style={{ marginRight: '4px' }} />
          环境变量:
        </Text>
        <div style={{ marginTop: '4px' }}>
          <Collapse size="small" ghost>
            <Panel 
              header={`已配置 ${Object.keys(config.env).length} 个变量`} 
              key="env"
            >
              <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                {Object.entries(config.env).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '4px' }}>
                    <Text code style={{ marginRight: '8px' }}>{key}</Text>
                    <Text type="secondary">
                      {value.length > 20 ? `${value.substring(0, 20)}...` : value}
                    </Text>
                  </div>
                ))}
              </div>
            </Panel>
          </Collapse>
        </div>
      </div>
    );
  };

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>{serverName}</span>
            {/* AI生成工具标识 */}
            {isAIGenerated && (
              <Tooltip title="AI生成的MCP工具">
                <RobotOutlined 
                  style={{ 
                    marginLeft: '8px', 
                    color: '#722ed1',
                    fontSize: '16px'
                  }} 
                />
              </Tooltip>
            )}
          </div>
          {config.disabled ? (
            <Tag color="gray">已禁用</Tag>
          ) : connected ? (
            <Tag icon={<CheckCircleOutlined />} color="success">已连接</Tag>
          ) : initAttempted ? (
            <Tag icon={<CloseCircleOutlined />} color="error">连接失败</Tag>
          ) : (
            <Tag icon={<ExclamationCircleOutlined />} color="warning">未连接</Tag>
          )}
        </div>
      }
      extra={
        <Space>
          {connected && onDisconnect ? (
            <Button
              icon={<StopOutlined />}
              onClick={() => onDisconnect(serverName)}
              loading={loading}
            >
              断开连接
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => onConnect(serverName)}
              disabled={config.disabled || connected || loading}
              loading={loading}
            >
              连接
            </Button>
          )}
          <Button
            icon={<ToolOutlined />}
            onClick={() => onViewTools(serverName)}
            disabled={!connected}
          >
            工具
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => onEdit(serverName)}
          >
            编辑
          </Button>
          <Popconfirm
            title="您确定要删除这个服务器吗？"
            onConfirm={() => onDelete(serverName)}
            okText="确定"
            cancelText="取消"
          >
            <Button icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <div className="space-y-2">
        <div>
          <Text strong>传输类型:</Text> {config.transportType}
          {isAIGenerated && (
            <Tag color="purple" size="small" style={{ marginLeft: '8px' }}>
              AI生成
            </Tag>
          )}
        </div>
        {renderTransportInfo()}
        <div>
          <Text strong>超时时间:</Text> {config.timeout} 秒
        </div>
        {renderEnvironmentVariables()}
        {Array.isArray(config.autoApprove) && config.autoApprove.length > 0 && (
          <div>
            <Text strong>自动批准:</Text>{' '}
            {config.autoApprove.map(tool => (
              <Tag key={tool} color="blue">{tool}</Tag>
            ))}
          </div>
        )}
        {connected && tools.length > 0 && (
          <div>
            <Text strong>可用工具:</Text>{' '}
            {tools.map(tool => (
              <Tag key={tool} color="green">{tool}</Tag>
            ))}
          </div>
        )}
        {error && (
          <Paragraph type="danger">
            <Text strong>错误:</Text> {error}
          </Paragraph>
        )}
      </div>
    </Card>
  );
};

export default MCPServerCard;