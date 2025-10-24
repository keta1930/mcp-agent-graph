// src/components/chat/controls/MCPToolSelector.tsx
import React, { useRef, useEffect } from 'react';
import { Button, Switch, Tooltip, Typography } from 'antd';
import { ToolOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * MCP 工具选择器组件属性
 */
interface MCPToolSelectorProps {
  /** 可用的 MCP 服务器列表 */
  availableMCPServers: string[];
  /** MCP 服务器选择状态 */
  selectedMCPServers: Record<string, boolean>;
  /** MCP 服务器状态变更回调 */
  onToggleMCPServer: (serverName: string, enabled: boolean) => void;
  /** 获取服务器连接状态 */
  getServerConnectionStatus: (serverName: string) => boolean;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义类名 */
  className?: string;
}

/**
 * MCP 工具选择器组件
 *
 * 用于在对话输入区域选择和管理 MCP 工具服务器。
 * 提供一个下拉面板,显示所有可用的 MCP 服务器及其连接状态,
 * 用户可以通过开关来启用/禁用特定的服务器。
 */
const MCPToolSelector: React.FC<MCPToolSelectorProps> = ({
  availableMCPServers,
  selectedMCPServers,
  onToggleMCPServer,
  getServerConnectionStatus,
  size = 'small',
  className = ''
}) => {
  const [showPanel, setShowPanel] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 计算已启用的 MCP 服务器数量
  const enabledMcpCount = Object.values(selectedMCPServers).filter(Boolean).length;

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

  // 如果没有可用的 MCP 服务器,不渲染组件
  if (availableMCPServers.length === 0) {
    return null;
  }

  return (
    <div className={`mcp-tools-container ${className}`} ref={dropdownRef}>
      <Tooltip title={`MCP工具 (${enabledMcpCount}个已启用)`}>
        <Button
          type="text"
          icon={<ToolOutlined />}
          className={`mcp-tools-button ${showPanel ? 'active' : ''} ${enabledMcpCount > 0 ? 'has-enabled' : ''}`}
          onClick={() => setShowPanel(!showPanel)}
          size={size}
        />
      </Tooltip>

      {/* MCP工具面板 */}
      {showPanel && (
        <div className="mcp-tools-panel">
          <div className="mcp-tools-header">
            <Text strong>MCP工具</Text>
          </div>
          <div className="mcp-tools-list">
            {availableMCPServers.map(serverName => {
              const isConnected = getServerConnectionStatus(serverName);
              return (
                <div key={serverName} className="mcp-tool-item">
                  <div className="mcp-tool-info">
                    <div
                      className={`mcp-connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}
                      title={isConnected ? '已连接' : '未连接'}
                    />
                    <Tooltip title={serverName} placement="top">
                      <span className="mcp-tool-name">{serverName}</span>
                    </Tooltip>
                  </div>
                  <Switch
                    size="small"
                    checked={selectedMCPServers[serverName] || false}
                    onChange={(checked) => onToggleMCPServer(serverName, checked)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPToolSelector;
