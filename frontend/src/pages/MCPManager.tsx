import React, { useEffect, useState } from 'react';
import { Layout, Row, Col, Alert, App } from 'antd';
import { Grid3x3 } from 'lucide-react';
import { useMCPStore } from '../store/mcpStore';
import MCPServerForm from '../components/mcp-manager/MCPServerForm';
import MCPServerCard from '../components/mcp-manager/MCPServerCard';
import MCPToolsViewer from '../components/mcp-manager/MCPToolsViewer';
import MCPJsonEditor from '../components/mcp-manager/MCPJsonEditor';
import MCPManagerHeader from '../components/mcp-manager/MCPManagerHeader';
import { MCPServerConfig } from '../types/mcp';
import { getUserInfo } from '../utils/auth';
import { useT } from '../i18n/hooks';
import { MCP_COLORS, getMCPEmptyStateStyle } from '../constants/mcpManagerStyles';

const { Content } = Layout;

const MCPManager: React.FC = () => {
  const t = useT();
  const { message } = App.useApp();
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

  // 获取当前用户信息
  const currentUser = getUserInfo();

  const [modalVisible, setModalVisible] = useState(false);
  const [toolsModalVisible, setToolsModalVisible] = useState(false);
  const [selectedServer, setSelectedServer] = useState('');
  const [initialValues, setInitialValues] = useState<MCPServerConfig | undefined>();
  const [modalTitle, setModalTitle] = useState('');
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');

  useEffect(() => {
    fetchConfig();
    fetchStatus();
  }, [fetchConfig, fetchStatus]);

  const showAddModal = () => {
    setSelectedServer('');
    setInitialValues(undefined);
    setModalTitle(t('pages.mcpManager.addServerTitle'));
    setModalVisible(true);
  };

  const showEditModal = (serverName: string) => {
    setSelectedServer(serverName);
    setInitialValues(config.mcpServers[serverName]);
    setModalTitle(t('pages.mcpManager.editServerTitle', { name: serverName }));
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
        message.success(t('pages.mcpManager.serverUpdateSuccess', { name: selectedServer }));
      } else {
        // Add new server
        if (config.mcpServers[serverName]) {
          message.error(t('pages.mcpManager.serverExists', { name: serverName }));
          return;
        }
        await addServer(serverName, serverConfig);
        message.success(t('pages.mcpManager.serverAddSuccess', { name: serverName }));
      }
      setModalVisible(false);
    } catch (err: any) {
      if (err.isVersionConflict) {
        message.error({
          content: t('pages.mcpManager.versionConflict', { message: err.message }),
          duration: 5
        });
      } else {
        message.error(t('pages.mcpManager.operationFailed', { error: err instanceof Error ? err.message : String(err) }));
      }
    }
  };

  const handleDeleteServer = async (serverName: string) => {
    try {
      await deleteServer(serverName);
      message.success(t('pages.mcpManager.serverDeleteSuccess', { name: serverName }));
    } catch (err: any) {
      if (err.isVersionConflict) {
        message.error({
          content: t('pages.mcpManager.versionConflict', { message: err.message }),
          duration: 5
        });
      } else {
        message.error(t('pages.mcpManager.deleteFailed', { error: err instanceof Error ? err.message : String(err) }));
      }
    }
  };

  const handleConnect = async (serverName: string) => {
    try {
      await connectServer(serverName);
      message.success(t('pages.mcpManager.connectSuccess', { name: serverName }));
    } catch (err) {
      message.error(t('pages.mcpManager.connectFailed', { error: err instanceof Error ? err.message : String(err) }));
    }
  };

  const handleDisconnect = async (serverName: string) => {
    try {
      await disconnectServer(serverName);
      message.success(t('pages.mcpManager.disconnectSuccess', { name: serverName }));
    } catch (err) {
      message.error(t('pages.mcpManager.disconnectFailed', { error: err instanceof Error ? err.message : String(err) }));
    }
  };

  const handleConnectAll = async () => {
    try {
      message.loading(t('pages.mcpManager.connectAllLoading'), 0);
      const results = await connectAllServers();
      message.destroy();

      if (results.success.length > 0 && results.failed.length === 0) {
        message.success(t('pages.mcpManager.connectAllSuccess', { count: results.success.length }));
      } else if (results.success.length > 0 && results.failed.length > 0) {
        message.warning(t('pages.mcpManager.connectAllPartial', { success: results.success.length, failed: results.failed.length }));
      } else if (results.success.length === 0 && results.failed.length > 0) {
        message.error(t('pages.mcpManager.connectAllFailed', { count: results.failed.length }));
      } else {
        message.info(t('pages.mcpManager.connectAllNone'));
      }
    } catch (err) {
      message.destroy();
      message.error(t('pages.mcpManager.connectAllError', { error: err instanceof Error ? err.message : String(err) }));
    }
  };

  const handleRefresh = () => {
    fetchConfig();
    fetchStatus();
    message.info(t('pages.mcpManager.refreshing'));
  };

  const handleSaveJson = async (newConfig: any) => {
    try {
      await updateConfig(newConfig);
      message.success(t('pages.mcpManager.configSaveSuccess'));
      fetchStatus();
    } catch (err) {
      message.error(t('pages.mcpManager.configSaveFailed', { error: err instanceof Error ? err.message : String(err) }));
      throw err;
    }
  };

  const serverNames = Object.keys(config.mcpServers || {});
  const connectedCount = serverNames.filter(name => status[name]?.connected).length;

  return (
    <Layout style={{ height: '100vh', background: MCP_COLORS.background, display: 'flex', flexDirection: 'column' }}>
      <MCPManagerHeader
        title={t('pages.mcpManager.title')}
        serversCount={serverNames.length}
        connectedCount={connectedCount}
        viewMode={viewMode}
        onViewModeChange={() => setViewMode(viewMode === 'visual' ? 'json' : 'visual')}
        onAddServer={showAddModal}
        onRefresh={handleRefresh}
        onConnectAll={handleConnectAll}
        loading={loading}
        disabled={serverNames.length === 0}
        t={t}
      />

      <Content style={{
        flex: 1,
        padding: '32px 48px',
        overflow: 'auto'
      }}>
        {error && (
          <Alert
            message={t('common.error')}
            description={error}
            type="error"
            showIcon
            style={{
              marginBottom: '16px',
              borderRadius: '6px',
              border: '1px solid rgba(184, 88, 69, 0.3)',
              background: 'rgba(255, 245, 243, 0.9)'
            }}
          />
        )}

        {viewMode === 'visual' ? (
          <div>
            {serverNames.length === 0 ? (
              <div style={getMCPEmptyStateStyle()}>
                <Grid3x3 size={48} strokeWidth={1.5} style={{
                  color: 'rgba(139, 115, 85, 0.3)',
                  margin: '0 auto 16px'
                }} />
                <div style={{
                  fontSize: '14px',
                  color: MCP_COLORS.textSecondary,
                  marginBottom: '8px'
                }}>
                  {t('pages.mcpManager.noServers')}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'rgba(45, 45, 45, 0.45)'
                }}>
                  {t('pages.mcpManager.noServersHint')}
                </div>
              </div>
            ) : (
              <Row gutter={[12, 12]}>
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
                      currentUserId={currentUser?.user_id}
                      currentUserRole={currentUser?.role}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </div>
        ) : (
          <MCPJsonEditor
            config={config}
            onSave={handleSaveJson}
            loading={loading}
          />
        )}

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
      </Content>
    </Layout>
  );
};

export default MCPManager;
