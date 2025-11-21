import React from 'react';
import { Layout, Typography, Space, Tag, Button } from 'antd';
import { Server, Code, Grid3x3 } from 'lucide-react';
import { MCP_COLORS, MCP_GRADIENTS, MCP_SHADOWS, getMCPTagStyle, getMCPViewSwitchButtonStyle } from '../../constants/mcpManagerStyles';

const { Header } = Layout;
const { Title } = Typography;

interface MCPManagerHeaderProps {
  title: string;
  serversCount: number;
  connectedCount: number;
  viewMode: 'visual' | 'json';
  onViewModeChange: () => void;
  t: (key: string, params?: any) => string;
}

/**
 * MCP管理器头部组件
 */
const MCPManagerHeader: React.FC<MCPManagerHeaderProps> = ({
  title,
  serversCount,
  connectedCount,
  viewMode,
  onViewModeChange,
  t,
}) => {
  return (
    <Header style={{
      background: MCP_GRADIENTS.header,
      backdropFilter: 'blur(20px)',
      padding: '0 48px',
      borderBottom: 'none',
      boxShadow: MCP_SHADOWS.card,
      position: 'relative'
    }}>
      {/* 装饰性底部渐变线 */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '20%',
        right: '20%',
        height: '1px',
        background: MCP_GRADIENTS.decorativeLine
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
        {/* 左侧：图标 + 标题 + 统计标签 */}
        <Space size="large">
          <Server size={28} color={MCP_COLORS.primary} strokeWidth={1.5} />
          <Title level={4} style={{
            margin: 0,
            color: MCP_COLORS.text,
            fontWeight: 500,
            letterSpacing: '2px',
            fontSize: '18px'
          }}>
            {title}
          </Title>
          <Tag style={getMCPTagStyle(MCP_COLORS.primary)}>
            {t('pages.mcpManager.serversCount', { count: serversCount })}
          </Tag>
          <Tag style={getMCPTagStyle(MCP_COLORS.tertiary)}>
            {t('pages.mcpManager.connectedCount', { count: connectedCount })}
          </Tag>
        </Space>

        {/* 右侧：视图切换按钮 */}
        <Button
          onClick={onViewModeChange}
          style={getMCPViewSwitchButtonStyle()}
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
          {viewMode === 'visual' ? (
            <>
              <Code size={16} strokeWidth={1.5} />
              {t('pages.mcpManager.jsonView')}
            </>
          ) : (
            <>
              <Grid3x3 size={16} strokeWidth={1.5} />
              {t('pages.mcpManager.listView')}
            </>
          )}
        </Button>
      </div>
    </Header>
  );
};

export default MCPManagerHeader;
