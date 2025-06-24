// src/pages/MCPManager.tsx
import React, { useEffect, useState } from 'react';
import { Button, Row, Col, message, Alert, Empty, Tabs, Card, Modal } from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  CodeOutlined,
  AppstoreOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  ToolOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { useMCPStore } from '../store/mcpStore';
import { useModelStore } from '../store/modelStore';
import MCPServerForm from '../components/mcp-manager/MCPServerForm';
import MCPServerCard from '../components/mcp-manager/MCPServerCard';
import MCPToolsViewer from '../components/mcp-manager/MCPToolsViewer';
import MCPJsonEditor from '../components/mcp-manager/MCPJsonEditor';
import MarkdownRenderer from '../components/common/MarkdownRenderer';
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
    connectAllServers,
    fetchGeneratorTemplate,
    generateMCPTool,
    registerMCPTool,
    generatorTemplate,
    getUsedPorts
  } = useMCPStore();

  const { models, fetchModels } = useModelStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [toolsModalVisible, setToolsModalVisible] = useState(false);
  const [selectedServer, setSelectedServer] = useState('');
  const [initialValues, setInitialValues] = useState<MCPServerConfig | undefined>();
  const [modalTitle, setModalTitle] = useState('添加MCP服务器');
  const [activeTab, setActiveTab] = useState('visual');

  // AI生成工具相关状态
  const [aiGeneratorVisible, setAiGeneratorVisible] = useState(false);
  const [aiRequirement, setAiRequirement] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

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

  // 提示词模板显示
  const [templateVisible, setTemplateVisible] = useState(false);

  useEffect(() => {
    // Load initial data
    fetchConfig();
    fetchStatus();
    fetchModels();
  
    // 删除定时器部分，不再自动轮询状态
  }, [fetchConfig, fetchStatus, fetchModels]);

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

  const showAIGenerator = () => {
    setAiGeneratorVisible(true);
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

  const showTemplateModal = async () => {
    if (!generatorTemplate) {
      await fetchGeneratorTemplate();
    }
    setTemplateVisible(true);
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
    } catch (err) {
      message.error('操作失败: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteServer = async (serverName: string) => {
    try {
      await deleteServer(serverName);
      message.success(`服务器 "${serverName}" 删除成功`);
    } catch (err) {
      message.error('删除失败: ' + (err instanceof Error ? err.message : String(err)));
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

  // AI工具生成处理
  const handleAIGenerate = async () => {
    if (!aiRequirement.trim()) {
      message.error('请输入工具需求描述');
      return;
    }
    if (!selectedModel) {
      message.error('请选择模型');
      return;
    }

    try {
      const result = await generateMCPTool(aiRequirement, selectedModel);
      
      if (result.status === 'success') {
        message.success(`AI工具 "${result.tool_name}" 生成成功！`);
        setAiGeneratorVisible(false);
        setAiRequirement('');
        setSelectedModel('');
      } else {
        message.error(result.error || '生成失败');
      }
    } catch (error) {
      message.error('生成工具时出错: ' + (error instanceof Error ? error.message : String(error)));
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

  const tabItems = [
    {
      key: 'visual',
      label: (
        <span>
          <AppstoreOutlined />
          可视化编辑
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
                添加服务器
              </Button>
              <Button
                type="primary"
                ghost
                icon={<RobotOutlined />}
                onClick={showAIGenerator}
              >
                AI生成工具
              </Button>
              <Button
                icon={<ToolOutlined />}
                onClick={showToolRegistration}
              >
                注册工具
              </Button>
              <Button
                icon={<BulbOutlined />}
                onClick={showTemplateModal}
              >
                查看提示词
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type="primary"
                ghost
                icon={<PlayCircleOutlined />}
                onClick={handleConnectAll}
                loading={loading}
                disabled={serverNames.length === 0}
              >
                全部连接
              </Button>
            </div>
          </div>

          {serverNames.length === 0 ? (
            <Empty description="未配置MCP服务器" />
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
          JSON编辑器
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
      {error && (
        <Alert
          message="错误"
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

      {/* AI工具生成模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <RobotOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
            AI生成MCP工具
          </div>
        }
        open={aiGeneratorVisible}
        onCancel={() => setAiGeneratorVisible(false)}
        footer={[
          <Button key="template" icon={<BulbOutlined />} onClick={showTemplateModal}>
            查看提示词模板
          </Button>,
          <Button key="cancel" onClick={() => setAiGeneratorVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleAIGenerate} loading={loading}>
            生成工具
          </Button>,
        ]}
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            选择模型:
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px'
            }}
          >
            <option value="">请选择模型</option>
            {models.map(model => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            工具需求描述:
          </label>
          <textarea
            value={aiRequirement}
            onChange={(e) => setAiRequirement(e.target.value)}
            rows={6}
            placeholder="请详细描述您需要的MCP工具功能，例如：&#10;- 创建一个可以查询天气信息的工具&#10;- 需要支持城市名称查询&#10;- 返回温度、湿度、天气状况等信息"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <p><strong>提示：</strong></p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>请详细描述工具的功能和用途</li>
              <li>说明需要的输入参数和输出格式</li>
              <li>AI将自动生成完整的MCP服务器代码</li>
              <li>生成后工具将自动注册并可立即使用</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* 工具注册模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ToolOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
            注册MCP工具
          </div>
        }
        open={toolRegistrationVisible}
        onCancel={() => setToolRegistrationVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setToolRegistrationVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleToolRegister} loading={loading}>
            注册工具
          </Button>,
        ]}
        width={800}
      >
        {usedPorts.length > 0 && (
          <Alert
            message="端口占用提醒"
            description={`以下端口已被占用: ${usedPorts.join(', ')}。请选择其他端口。`}
            type="warning"
            style={{ marginBottom: '16px' }}
          />
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            工具文件夹名称:
          </label>
          <input
            type="text"
            value={toolFormData.folderName}
            onChange={(e) => setToolFormData(prev => ({ ...prev, folderName: e.target.value }))}
            placeholder="tool_name_server"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            端口号:
          </label>
          <input
            type="number"
            value={toolFormData.port}
            onChange={(e) => setToolFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 8001 }))}
            min={8001}
            max={9099}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            主脚本文件名:
          </label>
          <input
            type="text"
            value={toolFormData.mainScriptName}
            onChange={(e) => setToolFormData(prev => ({ ...prev, mainScriptName: e.target.value }))}
            placeholder="main_server.py"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            主脚本内容:
          </label>
          <textarea
            value={toolFormData.mainScript}
            onChange={(e) => setToolFormData(prev => ({ ...prev, mainScript: e.target.value }))}
            rows={12}
            placeholder="输入完整的FastMCP服务器代码..."
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              fontFamily: 'Monaco, "Courier New", monospace',
              fontSize: '12px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            依赖包:
          </label>
          <input
            type="text"
            value={toolFormData.dependencies}
            onChange={(e) => setToolFormData(prev => ({ ...prev, dependencies: e.target.value }))}
            placeholder="fastmcp requests pandas"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            README内容:
          </label>
          <textarea
            value={toolFormData.readme}
            onChange={(e) => setToolFormData(prev => ({ ...prev, readme: e.target.value }))}
            rows={4}
            placeholder="工具说明文档（可选）"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <p><strong>注意事项：</strong></p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>工具将在指定端口上运行</li>
              <li>确保脚本内容完整且可执行</li>
              <li>系统将自动创建虚拟环境并安装依赖</li>
              <li>注册后工具将自动连接并可立即使用</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* 提示词模板显示模态框 */}
      <Modal
        title="MCP生成提示词模板"
        open={templateVisible}
        onCancel={() => setTemplateVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTemplateVisible(false)}>
            关闭
          </Button>
        ]}
        width={1000}
      >
        <MarkdownRenderer
          content={generatorTemplate}
          title="MCP生成提示词模板"
          showCopyButton={true}
        />
      </Modal>
    </div>
  );
};

export default MCPManager;