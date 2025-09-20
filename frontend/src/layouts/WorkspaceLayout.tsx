// src/layouts/WorkspaceLayout.tsx
import React, { useState } from 'react';
import { Layout, Menu, Button, Modal, message } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  EditOutlined,
  ApiOutlined,
  SettingOutlined,
  PoweroffOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { shutdownSystem } from '../services/systemService';

const { Header, Sider, Content } = Layout;

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: '/workspace/graph-editor',
      icon: <EditOutlined />,
      label: <Link to="/workspace/graph-editor">图形编辑器</Link>,
    },
    {
      key: '/workspace/model-manager',
      icon: <ApiOutlined />,
      label: <Link to="/workspace/model-manager">模型管理</Link>,
    },
    {
      key: '/workspace/mcp-manager',
      icon: <SettingOutlined />,
      label: <Link to="/workspace/mcp-manager">MCP管理</Link>,
    },
    {
      key: '/workspace/prompt-manager',
      icon: <FileTextOutlined />,
      label: <Link to="/workspace/prompt-manager">提示词管理</Link>,
    },
  ];

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
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{ background: '#F5F5F5' }}
      >
        <div className="workspace-logo" style={{ 
          textAlign: 'center', 
          padding: '16px 8px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          {collapsed ? (
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              color: '#333',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '32px'
            }}>
              MAG
            </div>
          ) : (
            <h3 style={{ 
              color: '#333', 
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: '600'
            }}>
              MCP Agent Graph
            </h3>
          )}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ 
            background: '#F5F5F5',
            border: 'none'
          }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ 
          padding: '0 16px', 
          background: '#fff', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />
            <h2 style={{ margin: 0, color: '#333' }}>工作台</h2>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              icon={<HomeOutlined />}
              onClick={handleBackHome}
              type="default"
            >
              返回首页
            </Button>
            <Button
              danger
              icon={<PoweroffOutlined />}
              loading={isShuttingDown}
              onClick={showConfirmModal}
            >
              关闭系统
            </Button>
          </div>
        </Header>
        
        <Content style={{ padding: 0, margin: 0 }}>
          {children}
        </Content>
      </Layout>

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
    </Layout>
  );
};

export default WorkspaceLayout;
