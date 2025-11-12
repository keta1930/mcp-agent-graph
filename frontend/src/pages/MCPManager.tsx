// src/pages/MCPManager.tsx
import React, { useEffect, useState } from 'react';
import { Layout, Button, Row, Col, message, Alert, Modal, Input, Tag, Space, Typography, ConfigProvider } from 'antd';
import {
  Plus,
  RefreshCw,
  Code,
  Grid3x3,
  Play,
  Wrench,
  Server
} from 'lucide-react';
import { useMCPStore } from '../store/mcpStore';
import MCPServerForm from '../components/mcp-manager/MCPServerForm';
import MCPServerCard from '../components/mcp-manager/MCPServerCard';
import MCPToolsViewer from '../components/mcp-manager/MCPToolsViewer';
import MCPJsonEditor from '../components/mcp-manager/MCPJsonEditor';
import { MCPServerConfig } from '../types/mcp';
import { getUserInfo } from '../utils/auth';

const { Header, Content } = Layout;
const { Title } = Typography;

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
    connectAllServers,
    registerMCPTool,
    getUsedPorts
  } = useMCPStore();

  // 获取当前用户信息
  const currentUser = getUserInfo();

  const [modalVisible, setModalVisible] = useState(false);
  const [toolsModalVisible, setToolsModalVisible] = useState(false);
  const [selectedServer, setSelectedServer] = useState('');
  const [initialValues, setInitialValues] = useState<MCPServerConfig | undefined>();
  const [modalTitle, setModalTitle] = useState('添加MCP服务器');
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');

  // 工具注册相关状态
  const [toolRegistrationVisible, setToolRegistrationVisible] = useState(false);
  const [toolFormData, setToolFormData] = useState({
    folderName: '',
    port: 8001,
    mainScriptName: 'main_server.py',
    mainScript: '',
    dependencies: '',
    readme: ''
  });

  useEffect(() => {
    // Load initial data
    fetchConfig();
    fetchStatus();
  
    // 删除定时器部分，不再自动轮询状态
  }, [fetchConfig, fetchStatus]);

  const showAddModal = () => {
    setSelectedServer('');
    setInitialValues(undefined);
    setModalTitle('添加MCP服务器');
    setModalVisible(true);
  };

  const showEditModal = (serverName: string) => {
    setSelectedServer(serverName);
    setInitialValues(config.mcpServers[serverName]);
    setModalTitle(`编辑MCP服务器: ${serverName}`);
    setModalVisible(true);
  };

  const showToolsModal = (serverName: string) => {
    setSelectedServer(serverName);
    setToolsModalVisible(true);
  };

  const showToolRegistration = () => {
    const usedPorts = getUsedPorts();
    // 找到下一个可用端口
    let nextPort = 8001;
    while (usedPorts.includes(nextPort) && nextPort <= 9099) {
      nextPort++;
    }
    
    setToolFormData(prev => ({
      ...prev,
      port: nextPort <= 9099 ? nextPort : 8001
    }));
    setToolRegistrationVisible(true);
  };

  const handleFormSubmit = async (serverName: string, serverConfig: MCPServerConfig) => {
    try {
      if (selectedServer) {
        // Edit existing server
        await updateServer(selectedServer, serverConfig);
        message.success(`服务器 "${selectedServer}" 更新成功`);
      } else {
        // Add new server
        if (config.mcpServers[serverName]) {
          message.error(`服务器 "${serverName}" 已存在`);
          return;
        }
        await addServer(serverName, serverConfig);
        message.success(`服务器 "${serverName}" 添加成功`);
      }
      setModalVisible(false);
    } catch (err: any) {
      if (err.isVersionConflict) {
        message.error({
          content: `版本冲突：${err.message}。配置已自动刷新，请重新检查后再保存。`,
          duration: 5
        });
      } else {
        message.error('操作失败: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const handleDeleteServer = async (serverName: string) => {
    try {
      await deleteServer(serverName);
      message.success(`服务器 "${serverName}" 删除成功`);
    } catch (err: any) {
      if (err.isVersionConflict) {
        message.error({
          content: `版本冲突：${err.message}。配置已自动刷新，请重新检查后再操作。`,
          duration: 5
        });
      } else {
        message.error('删除失败: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const handleConnect = async (serverName: string) => {
    try {
      await connectServer(serverName);
      message.success(`已连接到服务器 "${serverName}"`);
    } catch (err) {
      message.error('连接失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDisconnect = async (serverName: string) => {
    try {
      await disconnectServer(serverName);
      message.success(`已从服务器 "${serverName}" 断开连接`);
    } catch (err) {
      message.error('断开连接失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Handle batch connect operation for all servers
  const handleConnectAll = async () => {
    try {
      message.loading('正在连接所有服务器...', 0);
      const results = await connectAllServers();
      message.destroy();

      if (results.success.length > 0 && results.failed.length === 0) {
        message.success(`成功连接所有 ${results.success.length} 个服务器`);
      } else if (results.success.length > 0 && results.failed.length > 0) {
        message.warning(`连接了 ${results.success.length} 个服务器，${results.failed.length} 个服务器连接失败`);
      } else if (results.success.length === 0 && results.failed.length > 0) {
        message.error(`所有 ${results.failed.length} 个服务器连接失败`);
      } else {
        message.info('没有服务器需要连接');
      }
    } catch (err) {
      message.destroy();
      message.error('批量连接失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRefresh = () => {
    fetchConfig();
    fetchStatus();
    message.info('正在刷新MCP状态...');
  };

  const handleSaveJson = async (newConfig: any) => {
    try {
      await updateConfig(newConfig);
      message.success('配置保存成功');
      fetchStatus();
    } catch (err) {
      message.error('保存配置失败: ' + (err instanceof Error ? err.message : String(err)));
      throw err;
    }
  };

  // 工具注册处理
  const handleToolRegister = async () => {
    if (!toolFormData.folderName.trim()) {
      message.error('请输入工具文件夹名称');
      return;
    }
    if (!toolFormData.mainScript.trim()) {
      message.error('请输入主脚本内容');
      return;
    }

    const usedPorts = getUsedPorts();
    if (usedPorts.includes(toolFormData.port)) {
      message.error(`端口 ${toolFormData.port} 已被占用，请选择其他端口`);
      return;
    }

    try {
      const scriptFiles: Record<string, string> = {};
      scriptFiles[toolFormData.mainScriptName] = toolFormData.mainScript;

      await registerMCPTool({
        folder_name: toolFormData.folderName,
        script_files: scriptFiles,
        readme: toolFormData.readme || '# MCP Tool\n\n手动注册的MCP工具',
        dependencies: toolFormData.dependencies || '',
        port: toolFormData.port
      });

      message.success(`工具 "${toolFormData.folderName}" 注册成功！`);
      setToolRegistrationVisible(false);
      setToolFormData({
        folderName: '',
        port: 8001,
        mainScriptName: 'main_server.py',
        mainScript: '',
        dependencies: '',
        readme: ''
      });
    } catch (error) {
      message.error('注册工具时出错: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const serverNames = Object.keys(config.mcpServers || {});
  const usedPorts = getUsedPorts();

  // 统计连接的服务器数量
  const connectedCount = serverNames.filter(name => status[name]?.connected).length;

  return (
    <Layout style={{ minHeight: '100vh', background: '#faf8f5' }}>
      {/* Header 顶栏 */}
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative'
      }}>
        {/* 装饰性底部渐变线 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Space size="large">
            <Server size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              MCP 服务器管理
            </Title>
            <Tag style={{
              background: 'rgba(184, 88, 69, 0.08)',
              color: '#b85845',
              border: '1px solid rgba(184, 88, 69, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {serverNames.length} 个服务器
            </Tag>
            <Tag style={{
              background: 'rgba(139, 195, 74, 0.1)',
              color: '#689f38',
              border: '1px solid rgba(139, 195, 74, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {connectedCount} 已连接
            </Tag>
          </Space>

          {/* 视图切换按钮 */}
          <Button
            onClick={() => setViewMode(viewMode === 'visual' ? 'json' : 'visual')}
            style={{
              height: '36px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#8b7355',
              fontSize: '14px',
              fontWeight: 500,
              letterSpacing: '0.3px',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#b85845';
              e.currentTarget.style.color = '#b85845';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
              e.currentTarget.style.color = '#8b7355';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
            }}
          >
            {viewMode === 'visual' ? (
              <>
                <Code size={16} strokeWidth={1.5} />
                JSON视图
              </>
            ) : (
              <>
                <Grid3x3 size={16} strokeWidth={1.5} />
                列表视图
              </>
            )}
          </Button>
        </div>
      </Header>

      {/* Content 内容区 */}
      <Content style={{
        padding: '32px 48px',
        overflow: 'auto'
      }}>
        {error && (
          <Alert
            message="错误"
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

        {/* 根据视图模式渲染内容 */}
        {viewMode === 'visual' ? (
          <div>
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <Button
                onClick={showAddModal}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  height: '36px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }}
              >
                <Plus size={16} strokeWidth={1.5} />
                添加服务器
              </Button>
              <Button
                onClick={showToolRegistration}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: '#8b7355',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#b85845';
                  e.currentTarget.style.color = '#b85845';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                  e.currentTarget.style.color = '#8b7355';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
                }}
              >
                <Wrench size={16} strokeWidth={1.5} />
                注册工具
              </Button>
              <Button
                onClick={handleRefresh}
                loading={loading}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: '#8b7355',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#b85845';
                  e.currentTarget.style.color = '#b85845';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                  e.currentTarget.style.color = '#8b7355';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
                }}
              >
                <RefreshCw size={16} strokeWidth={1.5} />
                刷新
              </Button>
              <Button
                onClick={handleConnectAll}
                loading={loading}
                disabled={serverNames.length === 0}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: '6px',
                  border: '1px solid #b85845',
                  background: 'transparent',
                  color: '#b85845',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  boxShadow: '0 1px 3px rgba(184, 88, 69, 0.1)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  if (serverNames.length > 0) {
                    e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                    e.currentTarget.style.borderColor = '#b85845';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#b85845';
                }}
              >
                <Play size={16} strokeWidth={1.5} />
                全部连接
              </Button>
            </div>

            {serverNames.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: 'rgba(250, 248, 245, 0.6)',
                borderRadius: '8px',
                border: '1px solid rgba(139, 115, 85, 0.15)'
              }}>
                <Grid3x3 size={48} strokeWidth={1.5} style={{
                  color: 'rgba(139, 115, 85, 0.3)',
                  margin: '0 auto 16px'
                }} />
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(45, 45, 45, 0.65)',
                  marginBottom: '8px'
                }}>
                  未配置MCP服务器
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'rgba(45, 45, 45, 0.45)'
                }}>
                  点击"添加服务器"按钮开始配置
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

      {/* 现有模态框 */}
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

      {/* 工具注册模态框 */}
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#b85845',
            colorPrimaryHover: '#a0826d',
            colorBorder: 'rgba(139, 115, 85, 0.2)',
            colorBorderSecondary: 'rgba(139, 115, 85, 0.15)',
            colorText: '#2d2d2d',
            colorTextPlaceholder: 'rgba(45, 45, 45, 0.35)',
            borderRadius: 6,
            controlHeight: 40,
          },
          components: {
            Input: {
              activeBorderColor: '#b85845',
              hoverBorderColor: 'rgba(184, 88, 69, 0.4)',
              activeShadow: '0 0 0 2px rgba(184, 88, 69, 0.1)',
            },
          },
        }}
      >
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={18} strokeWidth={1.5} style={{ color: '#b85845' }} />
              <span style={{ fontSize: '16px', fontWeight: 500, color: '#2d2d2d' }}>注册MCP工具</span>
            </div>
          }
          open={toolRegistrationVisible}
          onCancel={() => setToolRegistrationVisible(false)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setToolRegistrationVisible(false)}
            style={{
              height: '36px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#8b7355',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            取消
          </Button>,
          <Button
            key="submit"
            onClick={handleToolRegister}
            loading={loading}
            style={{
              height: '36px',
              background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
            }}
          >
            注册工具
          </Button>,
        ]}
        width={800}
        styles={{
          content: {
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)'
          }
        }}
      >
        {usedPorts.length > 0 && (
          <Alert
            message="端口占用提醒"
            description={`以下端口已被占用: ${usedPorts.join(', ')}。请选择其他端口。`}
            type="warning"
            style={{
              marginBottom: '16px',
              borderRadius: '6px',
              border: '1px solid rgba(212, 165, 116, 0.3)',
              background: 'rgba(255, 250, 243, 0.9)'
            }}
          />
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#2d2d2d',
            letterSpacing: '0.3px'
          }}>
            工具文件夹名称
          </label>
          <Input
            value={toolFormData.folderName}
            onChange={(e) => setToolFormData(prev => ({ ...prev, folderName: e.target.value }))}
            placeholder="tool_name_server"
            style={{
              height: '40px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              color: '#2d2d2d',
              letterSpacing: '0.3px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#2d2d2d',
            letterSpacing: '0.3px'
          }}>
            端口号
          </label>
          <Input
            type="number"
            value={toolFormData.port}
            onChange={(e) => setToolFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 8001 }))}
            placeholder="8001-9099"
            min={8001}
            max={9099}
            style={{
              height: '40px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              color: '#2d2d2d',
              letterSpacing: '0.3px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#2d2d2d',
            letterSpacing: '0.3px'
          }}>
            主脚本文件名
          </label>
          <Input
            value={toolFormData.mainScriptName}
            onChange={(e) => setToolFormData(prev => ({ ...prev, mainScriptName: e.target.value }))}
            placeholder="main_server.py"
            style={{
              height: '40px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              color: '#2d2d2d',
              letterSpacing: '0.3px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#2d2d2d',
            letterSpacing: '0.3px'
          }}>
            主脚本内容
          </label>
          <Input.TextArea
            value={toolFormData.mainScript}
            onChange={(e) => setToolFormData(prev => ({ ...prev, mainScript: e.target.value }))}
            rows={12}
            placeholder="输入完整的FastMCP服务器代码..."
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              fontFamily: 'Monaco, "Courier New", monospace',
              fontSize: '13px',
              color: '#2d2d2d',
              letterSpacing: '0.2px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#2d2d2d',
            letterSpacing: '0.3px'
          }}>
            依赖包
          </label>
          <Input
            value={toolFormData.dependencies}
            onChange={(e) => setToolFormData(prev => ({ ...prev, dependencies: e.target.value }))}
            placeholder="fastmcp requests pandas"
            style={{
              height: '40px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              color: '#2d2d2d',
              letterSpacing: '0.3px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#2d2d2d',
            letterSpacing: '0.3px'
          }}>
            README内容
          </label>
          <Input.TextArea
            value={toolFormData.readme}
            onChange={(e) => setToolFormData(prev => ({ ...prev, readme: e.target.value }))}
            rows={4}
            placeholder="工具说明文档（可选）"
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              color: '#2d2d2d',
              letterSpacing: '0.3px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{
          padding: '16px',
          background: 'rgba(250, 248, 245, 0.8)',
          borderRadius: '6px',
          border: '1px solid rgba(139, 115, 85, 0.12)'
        }}>
          <div style={{
            fontSize: '13px',
            color: 'rgba(45, 45, 45, 0.85)',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 500, color: '#2d2d2d' }}>注意事项</p>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(45, 45, 45, 0.75)' }}>
              <li style={{ marginBottom: '4px' }}>工具将在指定端口上运行</li>
              <li style={{ marginBottom: '4px' }}>确保脚本内容完整且可执行</li>
              <li style={{ marginBottom: '4px' }}>系统将自动创建虚拟环境并安装依赖</li>
              <li>注册后工具将自动连接并可立即使用</li>
            </ul>
          </div>
        </div>
      </Modal>
      </ConfigProvider>
      </Content>
    </Layout>
  );
};

export default MCPManager;
