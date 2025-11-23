// src/components/mcp-manager/MCPServerCard.tsx
import React from 'react';
import { Card, Tag, Space, Typography, Tooltip, Popconfirm, Collapse } from 'antd';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Play,
  Square,
  Wrench,
  Cloud,
  Bot,
  User,
  Clock,
  ChevronDown
} from 'lucide-react';
import { MCPServerConfig } from '../../types/mcp';
import { useT } from '../../i18n/hooks';

const { Text } = Typography;
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
  currentUserId?: string;    // 当前用户ID
  currentUserRole?: string;  // 当前用户角色
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
  currentUserId,
  currentUserRole,
}) => {
  const t = useT();
  
  // Determine status information
  const connected = status?.connected || false;
  const initAttempted = status?.init_attempted || false;
  const tools = status?.tools || [];
  const error = status?.error || '';

  // Check if this is an AI-generated tool
  const isAIGenerated = config.ai_generated ||
    (config.transportType === 'streamable_http' && config.url?.includes('localhost'));

  // 权限检查：只有提供者或管理员可以删除
  const canDelete = currentUserRole === 'admin' ||
    !config.provider_user_id ||
    config.provider_user_id === currentUserId;

  // 检查是否是当前用户添加的
  const isOwnServer = config.provider_user_id === currentUserId;

  // Format server arguments for display
  const formattedArgs = Array.isArray(config.args)
    ? config.args.join(' ')
    : String(config.args || '');

  const renderTransportInfo = () => {
    if (config.transportType === 'sse') {
      return (
        <div>
          <Text strong>{t('pages.mcpManager.card.sseUrl')}:</Text> {config.url}
        </div>
      );
    } else if (config.transportType === 'streamable_http') {
      return (
        <div>
          <Text strong>{t('pages.mcpManager.card.httpUrl')}:</Text> {config.url}
        </div>
      );
    } else {
      return (
        <div>
          <Text strong>{t('pages.mcpManager.card.command')}:</Text> {config.command} {formattedArgs}
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
        <Text strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <Cloud size={14} strokeWidth={1.5} style={{ color: '#8b7355' }} />
          {t('pages.mcpManager.card.envVars')}
        </Text>
        <div style={{ marginTop: '8px' }}>
          <Collapse
            size="small"
            ghost
            expandIcon={({ isActive }) => (
              <ChevronDown
                size={16}
                strokeWidth={1.5}
                style={{
                  color: '#8b7355',
                  transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease'
                }}
              />
            )}
            style={{
              background: 'rgba(250, 248, 245, 0.6)',
              border: '1px solid rgba(139, 115, 85, 0.12)',
              borderRadius: '6px'
            }}
          >
            <Panel
              header={
                <span style={{ fontSize: '13px', color: 'rgba(45, 45, 45, 0.75)' }}>
                  {t('pages.mcpManager.card.envVarsConfigured', { count: Object.keys(config.env).length })}
                </span>
              }
              key="env"
            >
              <div style={{
                background: 'rgba(255, 255, 255, 0.6)',
                padding: '10px 12px',
                borderRadius: '4px',
                border: '1px solid rgba(139, 115, 85, 0.1)'
              }}>
                {Object.entries(config.env).map(([key, value]) => (
                  <div key={key} style={{
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <code style={{
                      background: 'rgba(139, 115, 85, 0.08)',
                      color: '#8b7355',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      border: '1px solid rgba(139, 115, 85, 0.15)'
                    }}>
                      {key}
                    </code>
                    <span style={{
                      fontSize: '13px',
                      color: 'rgba(45, 45, 45, 0.65)'
                    }}>
                      {value.length > 20 ? `${value.substring(0, 20)}...` : value}
                    </span>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: '#2d2d2d' }}>{serverName}</span>
            {isAIGenerated && (
              <Tooltip title={t('pages.mcpManager.card.aiGeneratedTooltip')}>
                <Bot
                  size={16}
                  strokeWidth={1.5}
                  style={{
                    color: '#a0826d'
                  }}
                />
              </Tooltip>
            )}
          </div>
          {config.disabled ? (
            <Tag
              style={{
                background: 'rgba(158, 161, 159, 0.1)',
                color: '#9ea19f',
                border: '1px solid rgba(158, 161, 159, 0.2)',
                borderRadius: '6px',
                fontSize: '12px',
                padding: '2px 10px'
              }}
            >
              {t('pages.mcpManager.card.disabled')}
            </Tag>
          ) : connected ? (
            <Tag
              style={{
                background: 'rgba(139, 195, 74, 0.1)',
                color: '#689f38',
                border: '1px solid rgba(139, 195, 74, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                padding: '2px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <CheckCircle size={12} strokeWidth={2} />
              {t('pages.mcpManager.card.connected')}
            </Tag>
          ) : initAttempted ? (
            <Tag
              style={{
                background: 'rgba(184, 88, 69, 0.1)',
                color: '#b85845',
                border: '1px solid rgba(184, 88, 69, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                padding: '2px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <XCircle size={12} strokeWidth={2} />
              {t('pages.mcpManager.card.connectionFailed')}
            </Tag>
          ) : (
            <Tag
              style={{
                background: 'rgba(212, 165, 116, 0.1)',
                color: '#d4a574',
                border: '1px solid rgba(212, 165, 116, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                padding: '2px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <AlertCircle size={12} strokeWidth={2} />
              {t('pages.mcpManager.card.notConnected')}
            </Tag>
          )}
        </div>
      }
      extra={
        <Space size={6}>
          {connected && onDisconnect ? (
            <div
              onClick={() => onDisconnect(serverName)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                color: '#8b7355',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '13px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.color = '#b85845';
                  e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#8b7355';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Square size={14} strokeWidth={1.5} />
              {t('pages.mcpManager.card.disconnect')}
            </div>
          ) : (
            <div
              onClick={() => !config.disabled && !connected && !loading && onConnect(serverName)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                background: config.disabled || connected || loading ? 'rgba(139, 115, 85, 0.1)' : 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                color: config.disabled || connected || loading ? 'rgba(139, 115, 85, 0.4)' : '#fff',
                cursor: config.disabled || connected || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: config.disabled || connected || loading ? 'none' : '0 1px 3px rgba(184, 88, 69, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!config.disabled && !connected && !loading) {
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(184, 88, 69, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!config.disabled && !connected && !loading) {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(184, 88, 69, 0.2)';
                }
              }}
            >
              <Play size={14} strokeWidth={1.5} />
              {t('pages.mcpManager.card.connect')}
            </div>
          )}
          <div
            onClick={() => !(!connected) && onViewTools(serverName)}
            style={{
              padding: '4px',
              borderRadius: '4px',
              color: !connected ? 'rgba(139, 115, 85, 0.3)' : '#8b7355',
              cursor: !connected ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (connected) {
                e.currentTarget.style.color = '#b85845';
                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = connected ? '#8b7355' : 'rgba(139, 115, 85, 0.3)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Wrench size={15} strokeWidth={1.5} />
          </div>
          <div
            onClick={() => onEdit(serverName)}
            style={{
              padding: '4px',
              borderRadius: '4px',
              color: '#8b7355',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#b85845';
              e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8b7355';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Edit2 size={15} strokeWidth={1.5} />
          </div>
          <Tooltip title={!canDelete ? t('pages.mcpManager.card.deletePermissionDenied') : ''}>
            <Popconfirm
              title={t('pages.mcpManager.card.deleteConfirm')}
              onConfirm={() => onDelete(serverName)}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
              disabled={!canDelete}
              okButtonProps={{
                style: {
                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 500,
                  boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
                }
              }}
              cancelButtonProps={{
                style: {
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  color: '#8b7355',
                  fontWeight: 500
                }
              }}
              overlayStyle={{
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(139, 115, 85, 0.2)'
              }}
            >
              <div
                style={{
                  padding: '4px',
                  borderRadius: '4px',
                  color: !canDelete ? 'rgba(184, 88, 69, 0.3)' : '#b85845',
                  cursor: !canDelete ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (canDelete) {
                    e.currentTarget.style.background = 'rgba(184, 88, 69, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Trash2 size={15} strokeWidth={1.5} />
              </div>
            </Popconfirm>
          </Tooltip>
        </Space>
      }
      style={{
        borderRadius: '6px',
        border: '1px solid rgba(139, 115, 85, 0.15)',
        boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        background: 'rgba(255, 255, 255, 0.85)',
        transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
      }}
      styles={{
        body: { padding: '16px 20px' }
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
        e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
        e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {config.provider_user_id && (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#2d2d2d',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <User size={14} strokeWidth={1.5} style={{ color: '#8b7355' }} />
              {t('pages.mcpManager.card.provider')}
            </span>
            <Tag
              style={{
                background: isOwnServer ? 'rgba(184, 88, 69, 0.1)' : 'rgba(139, 115, 85, 0.08)',
                color: isOwnServer ? '#b85845' : '#8b7355',
                border: `1px solid ${isOwnServer ? 'rgba(184, 88, 69, 0.25)' : 'rgba(139, 115, 85, 0.2)'}`,
                borderRadius: '6px',
                fontSize: '12px',
                padding: '2px 10px'
              }}
            >
              {config.provider_user_id}
              {isOwnServer && ` (${t('pages.mcpManager.card.me')})`}
            </Tag>
            {config.created_at && (
              <span style={{
                fontSize: '13px',
                color: 'rgba(45, 45, 45, 0.65)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Clock size={12} strokeWidth={1.5} />
                {new Date(config.created_at).toLocaleString('zh-CN')}
              </span>
            )}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#2d2d2d' }}>
            {t('pages.mcpManager.card.transportType')}
          </span>
          <span style={{ fontSize: '14px', color: 'rgba(45, 45, 45, 0.75)' }}>
            {config.transportType}
          </span>
          {isAIGenerated && (
            <Tag
              style={{
                background: 'rgba(160, 130, 109, 0.1)',
                color: '#a0826d',
                border: '1px solid rgba(160, 130, 109, 0.25)',
                borderRadius: '6px',
                fontSize: '11px',
                padding: '1px 8px'
              }}
            >
              {t('pages.mcpManager.card.aiGenerated')}
            </Tag>
          )}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(45, 45, 45, 0.85)' }}>
          {renderTransportInfo()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#2d2d2d' }}>
            {t('pages.mcpManager.card.timeout')}
          </span>
          <span style={{ fontSize: '14px', color: 'rgba(45, 45, 45, 0.75)' }}>
            {config.timeout} {t('pages.mcpManager.card.seconds')}
          </span>
        </div>
        {renderEnvironmentVariables()}
        {Array.isArray(config.autoApprove) && config.autoApprove.length > 0 && (
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#2d2d2d',
              marginBottom: '6px'
            }}>
              {t('pages.mcpManager.card.autoApprove')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {config.autoApprove.map(tool => (
                <Tag
                  key={tool}
                  style={{
                    background: 'rgba(139, 115, 85, 0.08)',
                    color: '#8b7355',
                    border: '1px solid rgba(139, 115, 85, 0.2)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    padding: '2px 10px'
                  }}
                >
                  {tool}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {connected && tools.length > 0 && (
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#2d2d2d',
              marginBottom: '6px'
            }}>
              {t('pages.mcpManager.card.availableTools')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tools.map(tool => (
                <Tag
                  key={tool}
                  style={{
                    background: 'rgba(139, 195, 74, 0.1)',
                    color: '#689f38',
                    border: '1px solid rgba(139, 195, 74, 0.25)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    padding: '2px 10px'
                  }}
                >
                  {tool}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {error && (
          <div style={{
            padding: '12px',
            background: 'rgba(255, 245, 243, 0.9)',
            border: '1px solid rgba(184, 88, 69, 0.3)',
            borderRadius: '6px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#b85845',
              marginBottom: '4px'
            }}>
              {t('pages.mcpManager.card.error')}
            </div>
            <div style={{
              fontSize: '13px',
              color: 'rgba(184, 88, 69, 0.85)',
              lineHeight: '1.6'
            }}>
              {error}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MCPServerCard;
