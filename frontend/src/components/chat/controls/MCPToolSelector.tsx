// src/components/chat/controls/MCPToolSelector.tsx
import React, { useRef, useEffect } from 'react';
import { Button, Switch, Tooltip, Typography } from 'antd';
import { Wrench } from 'lucide-react';

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

  const getTooltipTitle = () => {
    if (availableMCPServers.length === 0) {
      return '还未注册MCP';
    }
    return `MCP工具 (${enabledMcpCount}个已启用)`;
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <Tooltip title={getTooltipTitle()}>
        <Button
          type="text"
          icon={<Wrench size={14} strokeWidth={1.5} />}
          onClick={() => setShowPanel(!showPanel)}
          size={size}
          style={{
            color: enabledMcpCount > 0 ? '#b85845' : 'rgba(139, 115, 85, 0.75)',
            border: 'none',
            background: showPanel || enabledMcpCount > 0 ? 'rgba(184, 88, 69, 0.1)' : 'transparent',
            transition: 'all 0.2s ease',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#b85845';
            e.currentTarget.style.background = 'rgba(184, 88, 69, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = enabledMcpCount > 0 ? '#b85845' : 'rgba(139, 115, 85, 0.75)';
            e.currentTarget.style.background = showPanel || enabledMcpCount > 0 ? 'rgba(184, 88, 69, 0.1)' : 'transparent';
          }}
        />
      </Tooltip>

      {/* MCP工具面板 */}
      {showPanel && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: '8px',
          minWidth: '260px',
          maxWidth: '320px',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(139, 115, 85, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          zIndex: 1000,
          animation: 'slideUp 0.2s ease-out'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(139, 115, 85, 0.15)'
          }}>
            <Text strong style={{ color: '#2d2d2d', fontSize: '13px' }}>MCP工具</Text>
          </div>
          <div style={{
            padding: '8px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {availableMCPServers.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center'
              }}>
                <Text style={{
                  fontSize: '13px',
                  color: 'rgba(45, 45, 45, 0.65)',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  还未注册MCP服务器
                </Text>
                <Text style={{
                  fontSize: '12px',
                  color: 'rgba(45, 45, 45, 0.45)'
                }}>
                  请前往 MCP Manager 注册
                </Text>
              </div>
            ) : (
              availableMCPServers.map(serverName => {
              const isConnected = getServerConnectionStatus(serverName);
              return (
                <div key={serverName} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(184, 88, 69, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: 1,
                    minWidth: 0
                  }}>
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: isConnected ? '#b85845' : '#d4c4b0',
                        boxShadow: isConnected ? '0 0 0 2px rgba(184, 88, 69, 0.2)' : 'none'
                      }}
                      title={isConnected ? '已连接' : '未连接'}
                    />
                    <Tooltip title={serverName} placement="top">
                      <span style={{
                        fontSize: '13px',
                        color: '#2d2d2d',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>{serverName}</span>
                    </Tooltip>
                  </div>
                  <Switch
                    size="small"
                    checked={selectedMCPServers[serverName] || false}
                    onChange={(checked) => onToggleMCPServer(serverName, checked)}
                  />
                </div>
              );
            })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPToolSelector;
