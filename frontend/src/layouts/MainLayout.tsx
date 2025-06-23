// src/layouts/MainLayout.tsx
import React, { useState } from 'react';
import { Layout, Menu, Button, Modal, message } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  EditOutlined,
  ApiOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PoweroffOutlined
} from '@ant-design/icons';
import { shutdownSystem } from '../services/systemService';

const { Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const menuItems = [
    {
      key: '/graph-editor',
      icon: <EditOutlined />,
      label: <Link to="/graph-editor">图形编辑器</Link>,
    },
    {
      key: '/model-manager',
      icon: <ApiOutlined />,
      label: <Link to="/model-manager">模型管理</Link>,
    },
    {
      key: '/mcp-manager',
      icon: <SettingOutlined />,
      label: <Link to="/mcp-manager">MCP管理</Link>,
    },
    {
      key: '/graph-runner',
      icon: <PlayCircleOutlined />,
      label: <Link to="/graph-runner">图形运行器</Link>,
    },
  ];

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      const response = await shutdownSystem();
      message.success('服务关闭请求已成功发起');

      // Show information about active sessions if available
      if (response && response.active_sessions) {
        message.info(`${response.active_sessions} 个活动会话将被终止`);
      }

      // Close the modal
      setConfirmModalVisible(false);

      // Show countdown message
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <div className="main-header">
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ borderBottom: '1px solid #f0f0f0', flex: 1 }}
        />
        <Button
          danger
          icon={<PoweroffOutlined />}
          loading={isShuttingDown}
          onClick={showConfirmModal}
          className="shutdown-button"
        >
          关闭系统
        </Button>
      </div>

      <Content style={{ padding: '16px' }}>
        <div className="bg-white min-h-[280px]">
          {children}
        </div>
      </Content>

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

export default MainLayout;