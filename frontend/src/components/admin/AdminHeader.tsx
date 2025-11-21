import React from 'react';
import { Layout, Typography, Space, Tag, Button } from 'antd';
import { Shield, Users, Key, ArrowLeft } from 'lucide-react';
import { COLORS, GRADIENTS, SHADOWS, getTagStyle, getSecondaryButtonStyle } from '../../constants/adminPanelStyles';

const { Header } = Layout;
const { Title } = Typography;

interface AdminHeaderProps {
  title: string;
  usersCount: number;
  inviteCodesCount: number;
  viewMode: 'users' | 'invites';
  onViewModeChange: () => void;
  onBack: () => void;
  t: (key: string, params?: any) => string;
}

/**
 * 管理面板头部组件
 */
const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  usersCount,
  inviteCodesCount,
  viewMode,
  onViewModeChange,
  onBack,
  t,
}) => {
  return (
    <Header style={{
      background: GRADIENTS.header,
      backdropFilter: 'blur(20px)',
      padding: '0 48px',
      borderBottom: 'none',
      boxShadow: SHADOWS.card,
      position: 'relative'
    }}>
      {/* 装饰性底部渐变线 */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '20%',
        right: '20%',
        height: '1px',
        background: GRADIENTS.decorativeLine
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
        {/* 左侧：图标 + 标题 + 统计标签 */}
        <Space size="large">
          <Shield size={28} color={COLORS.primary} strokeWidth={1.5} />
          <Title level={4} style={{
            margin: 0,
            color: COLORS.text,
            fontWeight: 500,
            letterSpacing: '2px',
            fontSize: '18px'
          }}>
            {title}
          </Title>
          <Tag style={getTagStyle(COLORS.primary)}>
            {t('pages.adminPanel.usersCount', { count: usersCount })}
          </Tag>
          <Tag style={getTagStyle(COLORS.tertiary)}>
            {t('pages.adminPanel.inviteCodesCount', { count: inviteCodesCount })}
          </Tag>
        </Space>

        {/* 右侧：视图切换按钮 + 返回按钮 */}
        <Space size="middle">
          <Button
            onClick={onViewModeChange}
            style={{
              ...getSecondaryButtonStyle(),
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.3px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = COLORS.primary;
              e.currentTarget.style.color = COLORS.primary;
              e.currentTarget.style.background = COLORS.whiteAlpha95;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
              e.currentTarget.style.color = COLORS.tertiary;
              e.currentTarget.style.background = COLORS.whiteAlpha85;
            }}
          >
            {viewMode === 'users' ? (
              <>
                <Key size={16} strokeWidth={1.5} />
                {t('pages.adminPanel.inviteCodeManagement')}
              </>
            ) : (
              <>
                <Users size={16} strokeWidth={1.5} />
                {t('pages.adminPanel.userManagement')}
              </>
            )}
          </Button>
          <Button
            icon={<ArrowLeft size={16} strokeWidth={1.5} />}
            onClick={onBack}
            style={{
              ...getSecondaryButtonStyle(),
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {t('pages.adminPanel.backHome')}
          </Button>
        </Space>
      </div>
    </Header>
  );
};

export default AdminHeader;
