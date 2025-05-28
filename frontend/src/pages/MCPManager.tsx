// src/pages/MCPManager.tsx
import React, { useEffect, useState } from 'react';
import { Button, Row, Col, message, Alert, Empty, Tabs, Card } from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  CodeOutlined,
  AppstoreOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useMCPStore } from '../store/mcpStore';
import MCPServerForm from '../components/mcp-manager/MCPServerForm';
import MCPServerCard from '../components/mcp-manager/MCPServerCard';
import MCPToolsViewer from '../components/mcp-manager/MCPToolsViewer';
import MCPJsonEditor from '../components/mcp-manager/MCPJsonEditor';
import { MCPServerConfig } from '../types/mcp';

const MCPManager: React.FC = () => {
  const {
    config,
    status,
    loading,
    error,
    fetchConfig,
    fetchStatus,
    updateConfig,
    addServer,
    updateServer,
    deleteServer,
    connectServer,
    disconnectServer,
    connectAllServers
  } = useMCPStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [toolsModalVisible, setToolsModalVisible] = useState(false);
  const [selectedServer, setSelectedServer] = useState('');
  const [initialValues, setInitialValues] = useState<MCPServerConfig | undefined>();
  const [modalTitle, setModalTitle] = useState('Add MCP Server');
  const [activeTab, setActiveTab] = useState('visual'); // 'visual' or 'json'

  useEffect(() => {
    // Load initial data
    fetchConfig();
    fetchStatus();

    // Set up polling for status
    const interval = setInterval(() => {
      fetchStatus();
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [fetchConfig, fetchStatus]);

  const showAddModal = () => {
    setSelectedServer('');
    setInitialValues(undefined);
    setModalTitle('Add MCP Server');
    setModalVisible(true);
  };

  const showEditModal = (serverName: string) => {
    setSelectedServer(serverName);
    setInitialValues(config.mcpServers[serverName]);
    setModalTitle(`Edit MCP Server: ${serverName}`);
    setModalVisible(true);
  };

  const showToolsModal = (serverName: string) => {
    setSelectedServer(serverName);
    setToolsModalVisible(true);
  };

  const handleFormSubmit = async (serverName: string, serverConfig: MCPServerConfig) => {
    try {
      if (selectedServer) {
        // Edit existing server
        await updateServer(selectedServer, serverConfig);
        message.success(`Server "${selectedServer}" updated successfully`);
      } else {
        // Add new server
        if (config.mcpServers[serverName]) {
          message.error(`Server "${serverName}" already exists`);
          return;
        }
        await addServer(serverName, serverConfig);
        message.success(`Server "${serverName}" added successfully`);
      }
      setModalVisible(false);
    } catch (err) {
      message.error('Operation failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteServer = async (serverName: string) => {
    try {
      await deleteServer(serverName);
      message.success(`Server "${serverName}" deleted successfully`);
    } catch (err) {
      message.error('Delete failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConnect = async (serverName: string) => {
    try {
      await connectServer(serverName);
      message.success(`Connected to server "${serverName}"`);
    } catch (err) {
      message.error('Connection failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDisconnect = async (serverName: string) => {
    try {
      await disconnectServer(serverName);
      message.success(`Disconnected from server "${serverName}"`);
    } catch (err) {
      message.error('Disconnect failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Handle batch connect operation for all servers
  const handleConnectAll = async () => {
    try {
      message.loading('Connecting to all servers...', 0);
      const results = await connectAllServers();
      message.destroy();

      if (results.success.length > 0 && results.failed.length === 0) {
        message.success(`Successfully connected to all ${results.success.length} servers`);
      } else if (results.success.length > 0 && results.failed.length > 0) {
        message.warning(`Connected to ${results.success.length} servers, failed to connect to ${results.failed.length} servers`);
      } else if (results.success.length === 0 && results.failed.length > 0) {
        message.error(`Failed to connect to all ${results.failed.length} servers`);
      } else {
        message.info('No servers to connect');
      }
    } catch (err) {
      message.destroy();
      message.error('Batch connection failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRefresh = () => {
    fetchConfig();
    fetchStatus();
    message.info('Refreshing MCP status...');
  };

  const handleSaveJson = async (newConfig: any) => {
    try {
      await updateConfig(newConfig);
      message.success('Configuration saved successfully');
      fetchStatus();
    } catch (err) {
      message.error('Failed to save configuration: ' + (err instanceof Error ? err.message : String(err)));
      throw err;
    }
  };

  const serverNames = Object.keys(config.mcpServers || {});

  const tabItems = [
    {
      key: 'visual',
      label: (
        <span>
          <AppstoreOutlined />
          Visual Editor
        </span>
      ),
      children: (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="space-x-2">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={showAddModal}
              >
                Add Server
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                ghost
                icon={<PlayCircleOutlined />}
                onClick={handleConnectAll}
                loading={loading}
                disabled={serverNames.length === 0}
              >
                Connect All
              </Button>
            </div>
          </div>

          {serverNames.length === 0 ? (
            <Empty description="No MCP servers configured" />
          ) : (
            <Row gutter={[16, 16]}>
              {serverNames.map(serverName => (
                <Col xs={24} lg={24} xl={12} key={serverName}>
                  <MCPServerCard
                    serverName={serverName}
                    config={config.mcpServers[serverName]}
                    status={status[serverName]}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onEdit={showEditModal}
                    onDelete={handleDeleteServer}
                    onViewTools={showToolsModal}
                    loading={loading}
                  />
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'json',
      label: (
        <span>
          <CodeOutlined />
          JSON Editor
        </span>
      ),
      children: (
        <MCPJsonEditor
          config={config}
          onSave={handleSaveJson}
          loading={loading}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">MCP Manager</h1>
        <p className="text-gray-500">
          Manage MCP server configuration and connections
        </p>
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}

      <Card>
        <Tabs
          defaultActiveKey="visual"
          items={tabItems}
          onChange={setActiveTab}
        />
      </Card>

      <MCPServerForm
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleFormSubmit}
        initialName={selectedServer}
        initialValues={initialValues}
        title={modalTitle}
      />

      <MCPToolsViewer
        visible={toolsModalVisible}
        onClose={() => setToolsModalVisible(false)}
        serverName={selectedServer}
      />
    </div>
  );
};

export default MCPManager;