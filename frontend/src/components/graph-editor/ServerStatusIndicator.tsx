// src/components/graph-editor/ServerStatusIndicator.tsx
import React from 'react';
import { Tag, Tooltip } from 'antd';
import { WarningOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
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
        <Tag color="warning" className="text-xs">
          <WarningOutlined /> No MCP servers configured
        </Tag>
      </Tooltip>
    );
  }

  // If servers are configured but not connected
  return (
    <Tooltip title="Please connect at least one server in the MCP Management page, otherwise graphs may not save or execute">
      <Tag color="warning" className="text-xs">
        <WarningOutlined /> MCP servers not connected
      </Tag>
    </Tooltip>
  );
};

export default ServerStatusIndicator;