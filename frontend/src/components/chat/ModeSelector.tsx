// src/components/chat/ModeSelector.tsx
import React from 'react';
import { Card, Select, Button, Space, Typography, Row, Col } from 'antd';
import { 
  MessageOutlined, 
  RobotOutlined, 
  ShareAltOutlined,
  ToolOutlined,
  NodeIndexOutlined
} from '@ant-design/icons';
import { useConversationStore } from '../../store/conversationStore';
import { useModelStore } from '../../store/modelStore';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { useMCPStore } from '../../store/mcpStore';
import { ConversationMode, AgentType } from '../../types/conversation';

const { Title, Text } = Typography;
const { Option } = Select;

interface ModeSelectorProps {
  onModeSelect: (mode: ConversationMode) => void;
  onStartConversation: (inputText: string, options?: any) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ 
  onModeSelect, 
  onStartConversation 
}) => {
  const { 
    currentMode, 
    agentType, 
    setCurrentMode, 
    setAgentType 
  } = useConversationStore();

  const { models: availableModels, fetchModels } = useModelStore();
  const { graphs: availableGraphs, fetchGraphs } = useGraphEditorStore();
  const { config: mcpConfig, status: mcpStatus, fetchConfig: fetchMCPConfig, fetchStatus: fetchMCPStatus } = useMCPStore();

  // 获取可用的MCP服务器
  const availableMCPServers = React.useMemo(() => {
    return Object.keys(mcpConfig.mcpServers || {}).filter(serverName => {
      const server = mcpConfig.mcpServers[serverName];
      const status = mcpStatus[serverName];
      return !server.disabled && status?.connected;
    });
  }, [mcpConfig, mcpStatus]);

  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const [selectedGraph, setSelectedGraph] = React.useState<string>('');
  const [selectedMCPServers, setSelectedMCPServers] = React.useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = React.useState('');
  const [userPrompt, setUserPrompt] = React.useState('');
  const [inputText, setInputText] = React.useState('');

  const handleModeChange = (mode: ConversationMode) => {
    setCurrentMode(mode);
    onModeSelect(mode);
    // 重置选择状态
    setSelectedModel('');
    setSelectedGraph('');
    setSelectedMCPServers([]);
    setSystemPrompt('');
    setUserPrompt('');
    setInputText('');
  };

  // 组件挂载时加载数据
  React.useEffect(() => {
    fetchModels();
    fetchGraphs();
    fetchMCPConfig();
    fetchMCPStatus();
  }, [fetchModels, fetchGraphs, fetchMCPConfig, fetchMCPStatus]);

  const handleStart = () => {
    const content = currentMode === 'chat' && userPrompt.trim() ? userPrompt.trim() : inputText.trim();
    if (content) {
      // 将选择的配置传递给父组件
      onStartConversation(content, {
        mode: currentMode,
        selectedModel,
        selectedGraph,
        selectedMCPServers,
        systemPrompt: systemPrompt.trim() || undefined,
        userPrompt: userPrompt.trim() || undefined
      });
    }
  };

  const canStart = () => {
    const content = currentMode === 'chat' ? userPrompt.trim() : inputText.trim();
    if (!content) return false;
    
    switch (currentMode) {
      case 'chat':
        return !!selectedModel;
      case 'agent':
        return !!selectedModel;
      case 'graph':
        return !!selectedGraph;
      default:
        return false;
    }
  };

  const modes = [
    {
      key: 'chat' as ConversationMode,
      title: 'Chat模式',
      description: '与AI进行自然对话，支持工具调用',
      icon: <MessageOutlined />,
      color: '#1890ff'
    },
    {
      key: 'agent' as ConversationMode,
      title: 'Agent模式', 
      description: 'AI生成MCP工具或Graph配置',
      icon: <RobotOutlined />,
      color: '#722ed1'
    },
    {
      key: 'graph' as ConversationMode,
      title: 'Graph模式',
      description: '执行现有的Graph工作流',
      icon: <ShareAltOutlined />,
      color: '#13c2c2'
    }
  ];

  return (
    <div className="mode-selector-container">
      <div className="mode-selector-content">
        <div className="welcome-header">
          <Title level={2}>选择对话模式</Title>
          <Text type="secondary">
            选择一种模式开始您的AI对话体验
          </Text>
        </div>

        {/* 模式选择卡片 */}
        <Row gutter={[24, 24]} className="mode-cards">
          {modes.map(mode => (
            <Col span={8} key={mode.key}>
              <Card
                hoverable
                className={`mode-card ${currentMode === mode.key ? 'selected' : ''}`}
                onClick={() => handleModeChange(mode.key)}
                styles={{ body: { padding: '24px' } }}
              >
                <div className="mode-card-content">
                  <div 
                    className="mode-icon"
                    style={{ color: mode.color }}
                  >
                    {mode.icon}
                  </div>
                  <Title level={4}>{mode.title}</Title>
                  <Text type="secondary">{mode.description}</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 配置区域 */}
        {currentMode && (
          <Card className="mode-config-card">
            <div className="mode-config-header">
              <Title level={4}>配置选项</Title>
            </div>

            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Chat模式和Agent模式的模型选择 */}
              {(currentMode === 'chat' || currentMode === 'agent') && (
                <div className="config-section">
                  <Text strong>选择模型:</Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="请选择模型"
                    value={selectedModel}
                    onChange={setSelectedModel}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string)
                        ?.toLowerCase()
                        .indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {availableModels && availableModels.length > 0 ? (
                      availableModels.map(model => (
                        <Option key={model.name} value={model.name}>
                          {model.alias || model.name}
                        </Option>
                      ))
                    ) : (
                      <Option value="" disabled>
                        暂无可用模型
                      </Option>
                    )}
                  </Select>
                </div>
              )}

              {/* Agent模式不再显示类型选择，由系统根据生成类型确定 */}

              {/* Graph模式的图选择 */}
              {currentMode === 'graph' && (
                <div className="config-section">
                  <Text strong>选择Graph:</Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="请选择要执行的Graph"
                    value={selectedGraph}
                    onChange={setSelectedGraph}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as string)
                        ?.toLowerCase()
                        .indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {availableGraphs && availableGraphs.length > 0 ? (
                      availableGraphs.map(graph => (
                        <Option key={graph} value={graph}>
                          {graph}
                        </Option>
                      ))
                    ) : (
                      <Option value="" disabled>
                        暂无可用图配置
                      </Option>
                    )}
                  </Select>
                </div>
              )}

              {/* Chat模式的MCP工具选择 */}
              {currentMode === 'chat' && (
                <div className="config-section">
                  <Text strong>选择MCP工具:</Text>
                  <Select
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="请选择MCP工具（可多选）"
                    mode="multiple"
                    value={selectedMCPServers}
                    onChange={setSelectedMCPServers}
                    allowClear
                  >
                    {availableMCPServers.map(serverName => (
                      <Option key={serverName} value={serverName}>
                        {serverName}
                      </Option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Chat模式的系统提示词 */}
              {currentMode === 'chat' && (
                <div className="config-section">
                  <Text strong>系统提示词:</Text>
                  <div className="input-container">
                    <textarea
                      className="mode-input"
                      placeholder="输入系统提示词（可选）..."
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* 输入区域 */}
              <div className="config-section">
                <Text strong>
                  {currentMode === 'chat' ? '用户提示词:' :
                   currentMode === 'agent' ? '描述需求:' :
                   '输入内容:'}
                </Text>
                <div className="input-container">
                  <textarea
                    className="mode-input"
                    placeholder={
                      currentMode === 'chat' ? '输入您想说的话...' :
                      currentMode === 'agent' ? 
                        agentType === 'mcp' ? 
                          '描述您希望AI生成的MCP工具功能...' :
                          '描述您希望AI生成的Graph工作流...' :
                      '输入要传递给Graph的内容...'
                    }
                    value={currentMode === 'chat' ? userPrompt : inputText}
                    onChange={(e) => currentMode === 'chat' ? setUserPrompt(e.target.value) : setInputText(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              {/* 开始按钮 */}
              <div className="start-button-container">
                <Button
                  type="primary"
                  size="large"
                  disabled={!canStart()}
                  onClick={handleStart}
                  className="start-button"
                >
                  开始{currentMode === 'chat' ? '对话' : 
                         currentMode === 'agent' ? '生成' : '执行'}
                </Button>
              </div>
            </Space>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ModeSelector;