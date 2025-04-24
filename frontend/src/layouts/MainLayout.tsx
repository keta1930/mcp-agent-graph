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
      label: <Link to="/graph-editor">Graph Editor</Link>,
    },
    {
      key: '/model-manager',
      icon: <ApiOutlined />,
      label: <Link to="/model-manager">Model Manager</Link>,
    },
    {
      key: '/mcp-manager',
      icon: <SettingOutlined />,
      label: <Link to="/mcp-manager">MCP Manager</Link>,
    },
    {
      key: '/graph-runner',
      icon: <PlayCircleOutlined />,
      label: <Link to="/graph-runner">Graph Runner</Link>,
    },
  ];

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      const response = await shutdownSystem();
      message.success('Service shutdown initiated successfully');

      // Show information about active sessions if available
      if (response && response.active_sessions) {
        message.info(`${response.active_sessions} active sessions will be terminated`);
      }

      // Close the modal
      setConfirmModalVisible(false);

      // Show countdown message
      message.loading('System will shut down in a few moments...', 10);
    } catch (error) {
      console.error('Failed to shut down service:', error);
      message.error('Failed to shut down service');
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
          Shutdown
        </Button>
      </div>

      <Content style={{ padding: '16px' }}>
        <div className="bg-white min-h-[280px]">
          {children}
        </div>
      </Content>

      <Modal
        title="Confirm Shutdown"
        open={confirmModalVisible}
        onOk={handleShutdown}
        onCancel={handleCancel}
        okText="Yes, Shutdown"
        cancelText="Cancel"
        okButtonProps={{ danger: true, loading: isShuttingDown }}
      >
        <p>Are you sure you want to shut down the service?</p>
        <p>This will terminate all running processes and the server will stop responding.</p>
      </Modal>
    </Layout>
  );
};

export default MainLayout;