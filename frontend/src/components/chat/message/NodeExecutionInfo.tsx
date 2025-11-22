// 节点执行信息组件
import React from 'react';
import { Typography, Tag, Tooltip } from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useT } from '../../../i18n/hooks';

const { Text } = Typography;

interface NodeExecutionInfoProps {
  nodeName: string;
  level: number;
  outputEnabled?: string;
  mcpServers?: string[];
  status: 'running' | 'completed' | 'pending';
}

/**
 * 节点执行信息组件
 * 显示Graph执行模式下的节点状态和信息
 */
const NodeExecutionInfo: React.FC<NodeExecutionInfoProps> = ({
  nodeName,
  level,
  outputEnabled,
  mcpServers,
  status
}) => {
  const t = useT();

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <LoadingOutlined className="status-icon running" />;
      case 'completed':
        return <CheckCircleOutlined className="status-icon completed" />;
      case 'pending':
        return <PlayCircleOutlined className="status-icon pending" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return '#b85845';
      case 'completed':
        return '#a0826d';
      case 'pending':
        return '#d4a574';
      default:
        return '#9ea19f';
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: getStatusColor(),
            animation: status === 'running' ? 'pulse 2s ease-in-out infinite' : 'none'
          }} />
          {getStatusIcon()}
        </div>
        <div>
          <Text strong style={{ color: '#2d2d2d', fontSize: '14px' }}>
            {t('pages.chatSystem.messageDisplay.nodeLabel', { name: nodeName })}
          </Text>
          <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '13px', marginLeft: '6px' }}>
            ({t('pages.chatSystem.messageDisplay.level')} {level})
          </Text>
        </div>
      </div>

      {mcpServers && mcpServers.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Tooltip title={mcpServers.join(', ')}>
            <Tag style={{
              background: 'rgba(160, 130, 109, 0.08)',
              color: '#a0826d',
              border: '1px solid rgba(160, 130, 109, 0.2)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '2px 10px',
              fontSize: '12px'
            }}>
              {t('pages.chatSystem.messageDisplay.mcpTools', { count: mcpServers.length })}
            </Tag>
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default NodeExecutionInfo;
