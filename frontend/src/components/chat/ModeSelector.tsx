// src/components/chat/ModeSelector.tsx
import React from 'react';
import { Card, Select, Button, Space, Typography, Row, Col, Switch, Tooltip } from 'antd';
import {
  MessageOutlined,
  RobotOutlined,
  ShareAltOutlined,
  ToolOutlined,
  NodeIndexOutlined,
  DownOutlined,
  ArrowUpOutlined,
  SwapOutlined
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

  // 获取所有MCP服务器（不论连接状态）
  const availableMCPServers = React.useMemo(() => {
    return Object.keys(mcpConfig.mcpServers || {}).filter(serverName => {
      const server = mcpConfig.mcpServers[serverName];
      return !server.disabled; // 只过滤掉被禁用的服务器
    });
  }, [mcpConfig]);

  // 获取服务器连接状态
  const getServerConnectionStatus = React.useCallback((serverName: string) => {
    const status = mcpStatus[serverName];
    return status?.connected || false;
  }, [mcpStatus]);

  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const [selectedGraph, setSelectedGraph] = React.useState<string>('');
  const [selectedMCPServers, setSelectedMCPServers] = React.useState<Record<string, boolean>>({});
  const [systemPrompt, setSystemPrompt] = React.useState('');
  const [userPrompt, setUserPrompt] = React.useState('');
  const [inputText, setInputText] = React.useState('');
  const [promptMode, setPromptMode] = React.useState<'user' | 'system'>('user'); // Chat模式的提示词类型
  const [showMcpTools, setShowMcpTools] = React.useState(false);

  const handleModeChange = (mode: ConversationMode) => {
    setCurrentMode(mode);
    onModeSelect(mode);
    // 重置选择状态
    setSelectedModel('');
    setSelectedGraph('');
    setSelectedMCPServers({});
    setSystemPrompt('');
    setUserPrompt('');
    setInputText('');
    setPromptMode('user'); // 重置为用户提示词模式
    setShowMcpTools(false);
    // 设置Agent模式的默认类型
    if (mode === 'agent') {
      setAgentType('mcp');
    }
  };

  // 组件挂载时加载数据
  React.useEffect(() => {
    fetchModels();
    fetchGraphs();
    fetchMCPConfig();
    fetchMCPStatus();
  }, [fetchModels, fetchGraphs, fetchMCPConfig, fetchMCPStatus]);

  // 初始化MCP服务器状态
  React.useEffect(() => {
    const initialStates: Record<string, boolean> = {};
    availableMCPServers.forEach(serverName => {
      initialStates[serverName] = false;
    });
    setSelectedMCPServers(initialStates);
  }, [availableMCPServers]);

  const handleStart = () => {
    const content = currentMode === 'chat' && userPrompt.trim() ? userPrompt.trim() : inputText.trim();
    if (content) {
      // 将选择的配置传递给父组件
      onStartConversation(content, {
        mode: currentMode,
        agentType: currentMode === 'agent' ? agentType : undefined,
        selectedModel,
        selectedGraph,
        selectedMCPServers: Object.entries(selectedMCPServers)
          .filter(([_, enabled]) => enabled)
          .map(([serverName]) => serverName),
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
        return !!selectedModel && !!agentType;
      case 'graph':
        return !!selectedGraph;
      default:
        return false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleStart();
    }
  };

  // 切换MCP服务器状态
  const toggleMcpServer = (serverName: string, enabled: boolean) => {
    setSelectedMCPServers(prev => ({
      ...prev,
      [serverName]: enabled
    }));
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

  const enabledMcpCount = Object.values(selectedMCPServers).filter(Boolean).length;

  const getCurrentInputValue = () => {
    if (currentMode === 'chat') {
      return promptMode === 'user' ? userPrompt : systemPrompt;
    }
    return inputText;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (currentMode === 'chat') {
      if (promptMode === 'user') {
        setUserPrompt(e.target.value);
      } else {
        setSystemPrompt(e.target.value);
      }
    } else {
      setInputText(e.target.value);
    }
  };

  const getInputPlaceholder = () => {
    if (currentMode === 'chat') {
      return promptMode === 'user' ? '输入您想说的话... (Ctrl+Enter发送)' : '输入系统提示词（可选）... (Ctrl+Enter发送)'
    } else if (currentMode === 'agent') {
      return agentType === 'mcp' ?
        '描述您希望AI生成的MCP工具功能... (Ctrl+Enter发送)' :
        '描述您希望AI生成的Graph工作流... (Ctrl+Enter发送)';
    }
    return '输入要传递给Graph的内容... (Ctrl+Enter发送)';
  };

  return (
    <div className="mode-selector-container">
      <div className="mode-selector-content">

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

        {/* 输入区域 - 使用与InputArea一致的样式 */}
        {currentMode && (
          <div className="input-area">
            <div className="input-container-new">
              <div className="message-input-wrapper">
                <textarea
                  className="message-input-new"
                  value={getCurrentInputValue()}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={getInputPlaceholder()}
                  rows={4}
                />

                {/* 左下角控件 */}
                <div className="input-bottom-left">
                  {/* Chat模式的MCP工具图标 */}
                  {currentMode === 'chat' && availableMCPServers.length > 0 && (
                    <div className="mcp-tools-container">
                      <Tooltip title={`MCP工具 (${enabledMcpCount}个已启用)`}>
                        <Button
                          type="text"
                          icon={<ToolOutlined />}
                          className={`mcp-tools-button ${showMcpTools ? 'active' : ''} ${enabledMcpCount > 0 ? 'has-enabled' : ''}`}
                          onClick={() => setShowMcpTools(!showMcpTools)}
                          size="small"
                        />
                      </Tooltip>

                      {/* MCP工具面板 */}
                      {showMcpTools && (
                        <div className="mcp-tools-panel">
                          <div className="mcp-tools-header">
                            <Text strong>MCP工具</Text>
                          </div>
                          <div className="mcp-tools-list">
                            {availableMCPServers.map(serverName => {
                              const isConnected = getServerConnectionStatus(serverName);
                              return (
                                <div key={serverName} className="mcp-tool-item">
                                  <div className="mcp-tool-info">
                                    <div
                                      className={`mcp-connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}
                                      title={isConnected ? '已连接' : '未连接'}
                                    />
                                    <span className="mcp-tool-name">{serverName}</span>
                                  </div>
                                  <Switch
                                    size="small"
                                    checked={selectedMCPServers[serverName] || false}
                                    onChange={(checked) => toggleMcpServer(serverName, checked)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat模式的系统提示词切换按钮 */}
                  {currentMode === 'chat' && (
                    <Tooltip title={promptMode === 'user' ? "切换到系统提示词" : "切换到用户消息"}>
                      <Button
                        type="text"
                        icon={<SwapOutlined />}
                        className={`system-prompt-toggle ${promptMode === 'system' ? 'active' : ''}`}
                        onClick={() => setPromptMode(promptMode === 'user' ? 'system' : 'user')}
                        size="small"
                      >
                        {promptMode === 'system' ? '系统' : '用户'}
                      </Button>
                    </Tooltip>
                  )}

                  {/* Agent模式的类型选择 */}
                  {currentMode === 'agent' && (
                    <Button.Group size="small">
                      <Button
                        type={agentType === 'mcp' ? 'primary' : 'default'}
                        onClick={() => setAgentType('mcp')}
                        icon={<ToolOutlined />}
                      >
                        MCP
                      </Button>
                      <Button
                        type={agentType === 'graph' ? 'primary' : 'default'}
                        onClick={() => setAgentType('graph')}
                        icon={<NodeIndexOutlined />}
                      >
                        Graph
                      </Button>
                    </Button.Group>
                  )}
                </div>

                {/* 右下角控件 */}
                <div className="input-bottom-right">
                  {/* 模型选择器 (Chat和Agent模式) */}
                  {(currentMode === 'chat' || currentMode === 'agent') && (
                    <div className="model-selector-new">
                      <Select
                        value={selectedModel}
                        onChange={setSelectedModel}
                        placeholder="选择模型"
                        size="small"
                        bordered={false}
                        className="model-select-dropdown"
                        suffixIcon={<DownOutlined />}
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

                  {/* Graph选择器 (Graph模式) */}
                  {currentMode === 'graph' && (
                    <div className="graph-selector-new">
                      <Select
                        value={selectedGraph}
                        onChange={setSelectedGraph}
                        placeholder="选择Graph"
                        size="small"
                        bordered={false}
                        className="graph-select-dropdown"
                        suffixIcon={<DownOutlined />}
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

                  {/* 开始按钮 */}
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<ArrowUpOutlined />}
                    onClick={handleStart}
                    disabled={!canStart()}
                    className="send-button-new"
                    size="small"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeSelector;