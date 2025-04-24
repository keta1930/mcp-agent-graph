// src/components/graph-editor/AgentNodeComponent.tsx
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, Typography, Tooltip, Tag } from 'antd';
import { BranchesOutlined, RobotOutlined, ApiOutlined, WarningOutlined } from '@ant-design/icons';
import { useMCPStore } from '../../store/mcpStore';

const { Text } = Typography;

interface AgentNodeProps {
  data: {
    id: string;
    name: string;
    is_subgraph: boolean;
    is_start: boolean;
    is_end: boolean;
    model_name?: string;
    subgraph_name?: string;
    mcp_servers: string[];
    selected: boolean;
    onClick: () => void;
  };
}

const AgentNodeComponent: React.FC<AgentNodeProps> = ({ data }) => {
  const {
    name,
    is_subgraph,
    is_start,
    is_end,
    model_name,
    subgraph_name,
    mcp_servers,
    selected,
    onClick
  } = data;

  const { status } = useMCPStore();

  // Check server connection status
  const hasDisconnectedServers = mcp_servers?.some(server => {
    return status[server] && !status[server].connected;
  });

  return (
    <div onClick={onClick}>
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: '#555' }}
      />

      <Card
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {is_subgraph ? (
              <BranchesOutlined style={{ color: '#1677ff' }} />
            ) : (
              <RobotOutlined style={{ color: '#52c41a' }} />
            )}
            <Text strong ellipsis>{name}</Text>
            {/* Only show a small icon when there are disconnected servers */}
            {hasDisconnectedServers && (
              <Tooltip title="Using disconnected servers">
                <WarningOutlined style={{ color: '#faad14', fontSize: '12px' }} />
              </Tooltip>
            )}
          </div>
        }
        style={{
          width: 180,
          border: selected ? '2px solid #1677ff' : '1px solid #d9d9d9',
          borderRadius: '4px',
          boxShadow: hasDisconnectedServers ? '0 0 0 1px #faad14' : '0 1px 2px rgba(0,0,0,0.1)'
        }}
        bodyStyle={{ padding: '8px' }}
      >
        <div style={{ marginBottom: '8px' }}>
          {is_start && <Tag color="green" style={{ marginRight: '4px' }}>Start</Tag>}
          {is_end && <Tag color="blue">End</Tag>}
        </div>

        <div style={{ fontSize: '12px', color: '#666' }}>
          {is_subgraph ? (
            <div className="flex items-center">
              <BranchesOutlined style={{ marginRight: '4px', fontSize: '12px' }} />
              <Text ellipsis style={{ maxWidth: '150px' }}>{subgraph_name || 'N/A'}</Text>
            </div>
          ) : (
            <div className="flex items-center">
              <RobotOutlined style={{ marginRight: '4px', fontSize: '12px' }} />
              <Text ellipsis style={{ maxWidth: '150px' }}>{model_name || 'N/A'}</Text>
            </div>
          )}

          {mcp_servers && mcp_servers.length > 0 && (
            <div className="flex items-center mt-1">
              <ApiOutlined style={{ marginRight: '4px', fontSize: '12px' }} />
              {mcp_servers.length > 1 ? (
                <Tooltip title={mcp_servers.join(', ')}>
                  <Text>{mcp_servers.length} servers</Text>
                </Tooltip>
              ) : (
                <Text ellipsis style={{ maxWidth: '150px' }}>{mcp_servers[0]}</Text>
              )}
            </div>
          )}
        </div>
      </Card>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#555' }}
      />
    </div>
  );
};

export default AgentNodeComponent;