// src/components/graph-editor/ServerStatusIndicator.tsx
import React from 'react';
import { Tag, Tooltip } from 'antd';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useMCPStore } from '../../store/mcpStore';

/**
 * A simple server status indicator component, only showing warnings when needed
 */
const ServerStatusIndicator: React.FC = () => {
  const { config, status } = useMCPStore();

  // Check if there are any connected servers
  const connectedServers = Object.entries(status)
    .filter(([_, serverStatus]) => serverStatus?.connected)
    .map(([name]) => name);

  const hasConnectedServers = connectedServers.length > 0;

  // If there are connected servers, don't show the indicator
  if (hasConnectedServers) {
    return null;
  }

  // If no servers are configured, prompt to configure
  if (Object.keys(config.mcpServers || {}).length === 0) {
    return (
      <Tooltip title="Please add and connect servers in the MCP Management page first">
        <Tag
          className="text-xs"
          style={{
            background: 'rgba(212, 165, 116, 0.08)',
            color: '#d4a574',
            border: '1px solid rgba(212, 165, 116, 0.25)',
            borderRadius: '6px',
            padding: '4px 8px'
          }}
        >
          <AlertTriangle size={14} strokeWidth={1.5} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          No MCP servers configured
        </Tag>
      </Tooltip>
    );
  }

  // If servers are configured but not connected
  return (
    <Tooltip title="Please connect at least one server in the MCP Management page, otherwise graphs may not save or execute">
      <Tag
        className="text-xs"
        style={{
          background: 'rgba(212, 165, 116, 0.08)',
          color: '#d4a574',
          border: '1px solid rgba(212, 165, 116, 0.25)',
          borderRadius: '6px',
          padding: '4px 8px'
        }}
      >
        <AlertTriangle size={14} strokeWidth={1.5} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
        MCP servers not connected
      </Tag>
    </Tooltip>
  );
};

export default ServerStatusIndicator;