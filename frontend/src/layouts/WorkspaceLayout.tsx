// src/layouts/WorkspaceLayout.tsx
import React, { useState } from 'react';
import { Button, Modal, message } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  PoweroffOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { shutdownSystem } from '../services/systemService';
import '../styles/workspace.css';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);


  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      const response = await shutdownSystem();
      message.success('服务关闭请求已成功发起');

      if (response && response.active_sessions) {
        message.info(`${response.active_sessions} 个活动会话将被终止`);
      }

      setConfirmModalVisible(false);
      message.loading('系统将在几秒钟内关闭...', 10);
    } catch (error) {
      console.error('关闭服务失败:', error);
      message.error('关闭服务失败');
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 自定义侧边栏 - 完全仿照对话系统 */}
      <div className={`workspace-sidebar ${collapsed ? 'collapsed' : ''}`}>
        {collapsed ? (
          <>
            {/* 折叠状态 */}
            {/* 顶部区域 */}
            <div className="collapsed-header">
              <button
                onClick={() => setCollapsed(false)}
                className="collapsed-nav-item collapsed-expand-button"
                title="展开侧边栏"
              >
                <img src="/starstar.png" alt="展开" style={{ width: 16, height: 16 }} />
                <div className="collapsed-tooltip">展开侧边栏</div>
              </button>
            </div>

            {/* 主导航区域 */}
            <div className="collapsed-navigation">
              {/* 图形编辑器 - 西瓜 */}
              <Link
                to="/workspace/graph-editor"
                className={`collapsed-nav-item ${location.pathname === '/workspace/graph-editor' ? 'active' : ''}`}
                title="图形编辑器"
              >
                <span className="fruit-icon">🍉</span>
                <div className="collapsed-tooltip">图形编辑器</div>
              </Link>

              {/* 模型管理 - 橙子 */}
              <Link
                to="/workspace/model-manager"
                className={`collapsed-nav-item ${location.pathname === '/workspace/model-manager' ? 'active' : ''}`}
                title="模型管理"
              >
                <span className="fruit-icon">🍊</span>
                <div className="collapsed-tooltip">模型管理</div>
              </Link>

              {/* MCP管理 - 樱桃 */}
              <Link
                to="/workspace/mcp-manager"
                className={`collapsed-nav-item ${location.pathname === '/workspace/mcp-manager' ? 'active' : ''}`}
                title="MCP管理"
              >
                <span className="fruit-icon">🍒</span>
                <div className="collapsed-tooltip">MCP管理</div>
              </Link>

              {/* 提示词管理 - 葡萄 */}
              <Link
                to="/workspace/prompt-manager"
                className={`collapsed-nav-item ${location.pathname === '/workspace/prompt-manager' ? 'active' : ''}`}
                title="提示词管理"
              >
                <span className="fruit-icon">🍇</span>
                <div className="collapsed-tooltip">提示词管理</div>
              </Link>
            </div>

            {/* 底部区域 */}
            <div className="collapsed-footer">
              {/* 状态指示器 */}
              <div className="collapsed-status-indicator" title="系统在线"></div>

              {/* 返回首页 */}
              <button
                className="collapsed-nav-item"
                onClick={handleBackHome}
                title="返回首页"
              >
                <HomeOutlined />
                <div className="collapsed-tooltip">返回首页</div>
              </button>

              {/* 关闭系统 */}
              <button
                className="collapsed-nav-item danger"
                onClick={showConfirmModal}
                disabled={isShuttingDown}
                title="关闭系统"
              >
                <PoweroffOutlined />
                <div className="collapsed-tooltip">关闭系统</div>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 展开状态 */}
            {/* 侧边栏头部 */}
            <div className="sidebar-header">
              <div className="header-content">
                <h3 style={{
                  color: '#333',
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  MCP Agent Graph
                </h3>
                <Button
                  type="text"
                  onClick={() => setCollapsed(true)}
                  title="折叠侧边栏"
                  className="sidebar-toggle"
                >
                  <img src="/starstar.png" alt="折叠" style={{ width: 16, height: 16 }} />
                </Button>
              </div>
            </div>

            {/* 导航列表 */}
            <div className="workspace-navigation">
              <Link
                to="/workspace/graph-editor"
                className={`workspace-nav-item ${location.pathname === '/workspace/graph-editor' ? 'active' : ''}`}
              >
                <span className="fruit-icon">🍉</span>
                <span className="nav-label">图形编辑器</span>
              </Link>

              <Link
                to="/workspace/model-manager"
                className={`workspace-nav-item ${location.pathname === '/workspace/model-manager' ? 'active' : ''}`}
              >
                <span className="fruit-icon">🍊</span>
                <span className="nav-label">模型管理</span>
              </Link>

              <Link
                to="/workspace/mcp-manager"
                className={`workspace-nav-item ${location.pathname === '/workspace/mcp-manager' ? 'active' : ''}`}
              >
                <span className="fruit-icon">🍒</span>
                <span className="nav-label">MCP管理</span>
              </Link>

              <Link
                to="/workspace/prompt-manager"
                className={`workspace-nav-item ${location.pathname === '/workspace/prompt-manager' ? 'active' : ''}`}
              >
                <span className="fruit-icon">🍇</span>
                <span className="nav-label">提示词管理</span>
              </Link>
            </div>

            {/* 底部操作区 */}
            <div className="sidebar-footer">
              <div className="footer-actions">
                <Button
                  type="text"
                  icon={<HomeOutlined />}
                  onClick={handleBackHome}
                  title="返回首页"
                />
                <Button
                  type="text"
                  danger
                  icon={<PoweroffOutlined />}
                  loading={isShuttingDown}
                  onClick={showConfirmModal}
                  title="关闭系统"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 主内容区域 */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          padding: '16px',
          overflow: 'auto',
          height: '100%'
        }}>
          {children}
        </div>
      </div>

      {/* 关闭系统确认对话框 */}
      <Modal
        title="确认关闭系统"
        open={confirmModalVisible}
        onOk={handleShutdown}
        onCancel={handleCancel}
        okText="确认关闭"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: isShuttingDown }}
      >
        <p>您确定要关闭服务吗？</p>
        <p>这将终止所有正在运行的进程，服务器将停止响应。</p>
      </Modal>
    </div>
  );
};

export default WorkspaceLayout;
