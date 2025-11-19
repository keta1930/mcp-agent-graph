// src/layouts/WorkspaceLayout.tsx
import React, { useState, CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import {
  Bot,
  Network,
  Cpu,
  Wrench,
  Plug,
  MessageSquareText,
  FolderOpen,
  Database,
  Home,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useT } from '../i18n';
import { getCurrentUserDisplayName } from '../config/user';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const currentUserDisplayName = getCurrentUserDisplayName();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
    { path: '/workspace/memory-manager', icon: Database, labelKey: 'pages.workspace.memoryManager' },
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
            <Button
              type="text"
              icon={collapsed ? <ChevronRight size={16} strokeWidth={1.5} /> : <ChevronLeft size={16} strokeWidth={1.5} />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                color: 'rgba(45, 45, 45, 0.65)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            />
          </div>

          {/* 导航列表 */}
          <div style={navigationStyle}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isHovered = hoveredItem === item.path;

              return (
                <Tooltip 
                  key={item.path}
                  title={collapsed ? t(item.labelKey) : ''}
                  placement="right"
                >
                  <Link
                    to={item.path}
                    style={getNavItemStyle(isActive, isHovered)}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Icon size={20} strokeWidth={1.5} />
                    {!collapsed && <span style={navLabelStyle}>{t(item.labelKey)}</span>}
                  </Link>
                </Tooltip>
              );
            })}
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <div style={footerDecorStyle} />
            
            {!collapsed && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'rgba(45, 45, 45, 0.65)',
                  fontSize: '13px',
                  fontWeight: 400,
                  flex: 1,
                }}
              >
                <User size={16} strokeWidth={1.5} />
                <span>{currentUserDisplayName}</span>
              </div>
            )}
            
            <Tooltip title={t('pages.workspace.backHome')}>
              <Button
                type="text"
                icon={<Home size={16} strokeWidth={1.5} />}
                onClick={handleBackHome}
                style={{
                  color: 'rgba(45, 45, 45, 0.65)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              />
            </Tooltip>
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


      </div>
    </>
  );
};

export default WorkspaceLayout;
