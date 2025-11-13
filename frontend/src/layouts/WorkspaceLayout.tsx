// src/layouts/WorkspaceLayout.tsx
import React, { useState, CSSProperties } from 'react';
import { Modal, message } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  Network,
  Cpu,
  Wrench,
  Plug,
  MessageSquareText,
  FolderOpen,
  Home,
  Power,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { shutdownSystem } from '../services/systemService';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { useT } from '../i18n';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      const response = await shutdownSystem();
      message.success(t('pages.workspace.shutdownSuccess'));

      if (response && response.active_sessions) {
        message.info(t('pages.workspace.shutdownActiveSessions', { count: response.active_sessions }));
      }

      setConfirmModalVisible(false);
      message.loading(t('pages.workspace.shutdownPending'), 10);
    } catch (error) {
      console.error('关闭服务失败:', error);
      message.error(t('pages.workspace.shutdownFailed'));
      setIsShuttingDown(false);
    }
  };

  const showConfirmModal = () => {
    setConfirmModalVisible(true);
  };

  const handleCancel = () => {
    setConfirmModalVisible(false);
  };

  const handleBackHome = () => {
    navigate('/');
  };

  const navItems = [
    { path: '/workspace/agent-manager', icon: Bot, labelKey: 'pages.workspace.agentManager' },
    { path: '/workspace/graph-editor', icon: Network, labelKey: 'pages.workspace.graphEditor' },
    { path: '/workspace/model-manager', icon: Cpu, labelKey: 'pages.workspace.modelManager' },
    { path: '/workspace/system-tools', icon: Wrench, labelKey: 'pages.workspace.systemTools' },
    { path: '/workspace/mcp-manager', icon: Plug, labelKey: 'pages.workspace.mcpManager' },
    { path: '/workspace/prompt-manager', icon: MessageSquareText, labelKey: 'pages.workspace.promptManager' },
    { path: '/workspace/file-manager', icon: FolderOpen, labelKey: 'pages.workspace.fileManager' },
  ];

  // 侧边栏容器样式
  const sidebarStyle: CSSProperties = {
    width: collapsed ? '72px' : '280px',
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #faf8f5 0%, #f5f3f0 100%)',
    borderRight: '1px solid rgba(139, 115, 85, 0.12)',
    boxShadow: '2px 0 8px rgba(139, 115, 85, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
    position: 'relative',
    overflow: 'hidden'
  };

  // Header 样式
  const headerStyle: CSSProperties = {
    padding: collapsed ? '24px 0' : '24px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'space-between',
    borderBottom: '1px solid rgba(139, 115, 85, 0.08)',
    background: 'rgba(255, 255, 255, 0.5)',
    position: 'relative'
  };

  const headerDecorStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: collapsed ? '15%' : '20%',
    right: collapsed ? '15%' : '20%',
    height: '1px',
    background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.25) 50%, transparent)'
  };

  const titleStyle: CSSProperties = {
    fontSize: '15px',
    fontWeight: 500,
    color: '#2d2d2d',
    margin: 0,
    letterSpacing: '0.5px',
    opacity: collapsed ? 0 : 1,
    transition: 'opacity 0.3s ease',
    whiteSpace: 'nowrap'
  };

  const toggleButtonStyle: CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.15)',
    background: 'rgba(255, 255, 255, 0.8)',
    color: '#8b7355',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)'
  };

  // 导航区域样式
  const navigationStyle: CSSProperties = {
    flex: 1,
    padding: collapsed ? '20px 12px' : '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
    overflowX: 'hidden'
  };

  const getNavItemStyle = (isActive: boolean, isHovered: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? '0' : '12px',
    padding: collapsed ? '12px' : '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
    position: 'relative',
    justifyContent: collapsed ? 'center' : 'flex-start',
    background: isActive 
      ? 'rgba(184, 88, 69, 0.08)'
      : isHovered 
        ? 'rgba(139, 115, 85, 0.05)'
        : 'transparent',
    border: `1px solid ${isActive ? 'rgba(184, 88, 69, 0.2)' : 'transparent'}`,
    boxShadow: isActive 
      ? '0 2px 6px rgba(184, 88, 69, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
      : 'none',
    color: isActive ? '#b85845' : '#2d2d2d',
    transform: isHovered && !collapsed ? 'translateX(2px)' : 'translateX(0)'
  });

  const navLabelStyle: CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '0.3px',
    opacity: collapsed ? 0 : 1,
    transition: 'opacity 0.3s ease',
    whiteSpace: 'nowrap'
  };

  // Footer 样式
  const footerStyle: CSSProperties = {
    padding: collapsed ? '20px 12px' : '20px 16px',
    borderTop: '1px solid rgba(139, 115, 85, 0.08)',
    background: 'rgba(255, 255, 255, 0.5)',
    display: 'flex',
    flexDirection: collapsed ? 'column' : 'row',
    gap: '8px',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  };

  const footerDecorStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: collapsed ? '15%' : '20%',
    right: collapsed ? '15%' : '20%',
    height: '1px',
    background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.25) 50%, transparent)'
  };

  const footerButtonStyle = (isHovered: boolean, isDanger: boolean = false): CSSProperties => ({
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.15)',
    background: isHovered 
      ? (isDanger ? 'rgba(184, 88, 69, 0.08)' : 'rgba(139, 115, 85, 0.08)')
      : 'rgba(255, 255, 255, 0.8)',
    color: isHovered ? (isDanger ? '#b85845' : '#8b7355') : '#8b7355',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
    boxShadow: isHovered 
      ? '0 4px 12px rgba(139, 115, 85, 0.12)'
      : '0 1px 3px rgba(139, 115, 85, 0.08)',
    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)'
  });

  // Tooltip 样式
  const tooltipStyle: CSSProperties = {
    position: 'absolute',
    left: '80px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(45, 45, 45, 0.95)',
    color: '#faf8f5',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    letterSpacing: '0.3px'
  };

  const tooltipArrowStyle: CSSProperties = {
    position: 'absolute',
    left: '-4px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 0,
    height: 0,
    borderTop: '4px solid transparent',
    borderBottom: '4px solid transparent',
    borderRight: '4px solid rgba(45, 45, 45, 0.95)'
  };

  return (
    <>
      <style>
        {`
          @keyframes gentleFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>

      <div style={{ display: 'flex', minHeight: '100vh', background: '#faf8f5' }}>
        {/* 侧边栏 */}
        <div style={sidebarStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={headerDecorStyle} />
            {!collapsed && <h3 style={titleStyle}>{t('pages.workspace.title')}</h3>}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              style={toggleButtonStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                e.currentTarget.style.color = '#b85845';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                e.currentTarget.style.color = '#8b7355';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {collapsed ? (
                <ChevronRight size={16} strokeWidth={1.5} />
              ) : (
                <ChevronLeft size={16} strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* 导航列表 */}
          <div style={navigationStyle}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isHovered = hoveredItem === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={getNavItemStyle(isActive, isHovered)}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Icon size={20} strokeWidth={1.5} />
                  {!collapsed && <span style={navLabelStyle}>{t(item.labelKey)}</span>}
                  
                  {/* Tooltip for collapsed state */}
                  {collapsed && isHovered && (
                    <div style={tooltipStyle}>
                      <div style={tooltipArrowStyle} />
                      {t(item.labelKey)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <div style={footerDecorStyle} />
            
            {/* Language Switcher - only show when not collapsed */}
            {!collapsed && (
              <div style={{ 
                width: '100%', 
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <LanguageSwitcher />
              </div>
            )}
            
            <button
              type="button"
              onClick={handleBackHome}
              style={footerButtonStyle(hoveredItem === 'home')}
              onMouseEnter={() => setHoveredItem('home')}
              onMouseLeave={() => setHoveredItem(null)}
              title={collapsed ? t('pages.workspace.backHome') : undefined}
            >
              <Home size={18} strokeWidth={1.5} />
              {collapsed && hoveredItem === 'home' && (
                <div style={tooltipStyle}>
                  <div style={tooltipArrowStyle} />
                  {t('pages.workspace.backHome')}
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={showConfirmModal}
              disabled={isShuttingDown}
              style={footerButtonStyle(hoveredItem === 'power', true)}
              onMouseEnter={() => setHoveredItem('power')}
              onMouseLeave={() => setHoveredItem(null)}
              title={collapsed ? t('pages.workspace.shutdown') : undefined}
            >
              <Power size={18} strokeWidth={1.5} />
              {collapsed && hoveredItem === 'power' && (
                <div style={tooltipStyle}>
                  <div style={tooltipArrowStyle} />
                  {t('pages.workspace.shutdown')}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 主内容区域 */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          overflow: 'hidden'
        }}>
          <div style={{
            flex: 1,
            padding: '0',
            overflow: 'auto',
            height: '100%'
          }}>
            {children}
          </div>
        </div>

        {/* 关闭系统确认对话框 */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Power size={18} strokeWidth={1.5} style={{ color: '#b85845' }} />
              <span style={{ fontSize: '16px', fontWeight: 500, color: '#2d2d2d' }}>{t('pages.workspace.shutdownConfirmTitle')}</span>
            </div>
          }
          open={confirmModalVisible}
          onOk={handleShutdown}
          onCancel={handleCancel}
          okText={t('pages.workspace.shutdownConfirmButton')}
          cancelText={t('common.cancel')}
          okButtonProps={{ 
            danger: true, 
            loading: isShuttingDown,
            style: {
              background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
              border: 'none',
              borderRadius: '6px',
              boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
            }
          }}
          cancelButtonProps={{
            style: {
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              color: '#8b7355'
            }
          }}
          styles={{
            content: {
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)'
            }
          }}
        >
          <div style={{ 
            padding: '16px 0',
            color: 'rgba(45, 45, 45, 0.85)',
            lineHeight: 1.6,
            letterSpacing: '0.3px'
          }}>
            <p style={{ margin: '0 0 8px 0' }}>{t('pages.workspace.shutdownConfirmMessage')}</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(45, 45, 45, 0.65)' }}>
              {t('pages.workspace.shutdownConfirmDetail')}
            </p>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default WorkspaceLayout;
