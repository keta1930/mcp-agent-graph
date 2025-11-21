import React from 'react';
import { Button } from 'antd';
import { Plus, RefreshCw, Play } from 'lucide-react';
import {
  MCP_COLORS,
  getMCPPrimaryButtonStyle,
  getMCPSecondaryButtonStyle,
  getMCPOutlineButtonStyle,
  MCP_SHADOWS
} from '../../constants/mcpManagerStyles';

interface MCPActionButtonsProps {
  onAddServer: () => void;
  onRefresh: () => void;
  onConnectAll: () => void;
  loading: boolean;
  disabled: boolean;
  t: (key: string, params?: any) => string;
}

/**
 * MCP管理器操作按钮组
 */
const MCPActionButtons: React.FC<MCPActionButtonsProps> = ({
  onAddServer,
  onRefresh,
  onConnectAll,
  loading,
  disabled,
  t,
}) => {
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      marginBottom: '24px'
    }}>
      <Button
        onClick={onAddServer}
        style={getMCPPrimaryButtonStyle()}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `${MCP_SHADOWS.buttonHover}, inset 0 1px 0 rgba(255, 255, 255, 0.3)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = `${MCP_SHADOWS.button}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`;
        }}
      >
        <Plus size={16} strokeWidth={1.5} />
        {t('pages.mcpManager.addServer')}
      </Button>

      <Button
        onClick={onRefresh}
        loading={loading}
        style={getMCPSecondaryButtonStyle()}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = MCP_COLORS.primary;
          e.currentTarget.style.color = MCP_COLORS.primary;
          e.currentTarget.style.background = MCP_COLORS.whiteAlpha95;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
          e.currentTarget.style.color = MCP_COLORS.tertiary;
          e.currentTarget.style.background = MCP_COLORS.whiteAlpha85;
        }}
      >
        <RefreshCw size={16} strokeWidth={1.5} />
        {t('pages.mcpManager.refresh')}
      </Button>

      <Button
        onClick={onConnectAll}
        loading={loading}
        disabled={disabled}
        style={getMCPOutlineButtonStyle()}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
            e.currentTarget.style.borderColor = MCP_COLORS.primary;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = MCP_COLORS.primary;
        }}
      >
        <Play size={16} strokeWidth={1.5} />
        {t('pages.mcpManager.connectAll')}
      </Button>
    </div>
  );
};

export default MCPActionButtons;
