// src/components/chat/ModeSelector.tsx
import React, { useRef, useEffect } from 'react';
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
  const [showGraphSelector, setShowGraphSelector] = React.useState(false);
  const mcpDropdownRef = useRef<HTMLDivElement>(null);
  const graphDropdownRef = useRef<HTMLDivElement>(null);

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
    setShowGraphSelector(false);
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

  // 点击外部关闭MCP工具面板和图选择面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mcpDropdownRef.current && !mcpDropdownRef.current.contains(event.target as Node)) {
        setShowMcpTools(false);
      }
      if (graphDropdownRef.current && !graphDropdownRef.current.contains(event.target as Node)) {
        setShowGraphSelector(false);
      }
    };

    if (showMcpTools || showGraphSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMcpTools, showGraphSelector]);

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

        {/* 简洁的模式选择按钮 */}
        <div className="mode-selector-simple">
          <div className="mode-selector-label">选择对话模式:</div>
          <div className="mode-buttons">
            {modes.map(mode => (
              <button
                key={mode.key}
                className={`mode-button ${currentMode === mode.key ? 'active' : ''}`}
                onClick={() => handleModeChange(mode.key)}
              >
                <span className="mode-button-icon">{mode.icon}</span>
                {mode.title}
              </button>
            ))}
          </div>
        </div>

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
                    <div className="mcp-tools-container" ref={mcpDropdownRef}>
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
                                    <Tooltip title={serverName} placement="top">
                                      <span className="mcp-tool-name">{serverName}</span>
                                    </Tooltip>
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

                  {/* Agent模式的类型切换按钮 */}
                  {currentMode === 'agent' && (
                    <Tooltip title={agentType === 'mcp' ? "切换到Graph生成" : "切换到MCP工具生成"}>
                      <Button
                        type="text"
                        icon={agentType === 'mcp' ? <ToolOutlined /> : <NodeIndexOutlined />}
                        className={`agent-type-toggle ${agentType === 'graph' ? 'active' : ''}`}
                        onClick={() => setAgentType(agentType === 'mcp' ? 'graph' : 'mcp')}
                        size="small"
                      >
                        {agentType === 'mcp' ? 'MCP' : 'Graph'}
                      </Button>
                    </Tooltip>
                  )}

                  {/* Agent Graph模式的MCP工具选择 */}
                  {currentMode === 'agent' && agentType === 'graph' && availableMCPServers.length > 0 && (
                    <div className="mcp-tools-container" ref={mcpDropdownRef}>
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
                                    <Tooltip title={serverName} placement="top">
                                      <span className="mcp-tool-name">{serverName}</span>
                                    </Tooltip>
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

                  {/* Agent Graph模式的图配置选择 */}
                  {currentMode === 'agent' && agentType === 'graph' && (
                    <div className="graph-selector-container" ref={graphDropdownRef}>
                      <Tooltip title={selectedGraph ? `已选择图: ${selectedGraph}` : "选择基础图配置（可选）"}>
                        <Button
                          type="text"
                          icon={<NodeIndexOutlined />}
                          className={`graph-selector-button ${showGraphSelector ? 'active' : ''} ${selectedGraph ? 'has-selected' : ''}`}
                          onClick={() => setShowGraphSelector(!showGraphSelector)}
                          size="small"
                        />
                      </Tooltip>

                      {/* 图选择面板 */}
                      {showGraphSelector && (
                        <div className="graph-selector-panel">
                          <div className="graph-selector-header">
                            <Text strong>基础图配置</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>（可选）</Text>
                          </div>
                          <div className="graph-selector-list">
                            <div className="graph-option-item">
                              <div className="graph-option-info">
                                <span className="graph-option-name">不使用基础配置</span>
                              </div>
                              <Button
                                type={!selectedGraph ? "primary" : "default"}
                                size="small"
                                onClick={() => setSelectedGraph('')}
                              >
                                {!selectedGraph ? '已选择' : '选择'}
                              </Button>
                            </div>
                            {availableGraphs && availableGraphs.length > 0 && availableGraphs.map(graphName => (
                              <div key={graphName} className="graph-option-item">
                                <div className="graph-option-info">
                                  <Tooltip title={graphName} placement="left">
                                    <span className="graph-option-name">{graphName}</span>
                                  </Tooltip>
                                </div>
                                <Button
                                  type={selectedGraph === graphName ? "primary" : "default"}
                                  size="small"
                                  onClick={() => setSelectedGraph(graphName)}
                                >
                                  {selectedGraph === graphName ? '已选择' : '选择'}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
                        placeholder="点击选择AI模型"
                        size="small"
                        bordered={false}
                        className="model-select-dropdown"
                        suffixIcon={<DownOutlined />}
                        showSearch
                        placement="topRight"
                        dropdownStyle={{ minWidth: '220px' }}
                        filterOption={(input, option) =>
                          (option?.children as string)
                            ?.toLowerCase()
                            .indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {availableModels && availableModels.length > 0 && (
                          availableModels.map(model => (
                            <Option key={model.name} value={model.name}>
                              {model.alias || model.name}
                            </Option>
                          ))
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
                        placeholder="点击选择Graph"
                        size="small"
                        bordered={false}
                        className="graph-select-dropdown"
                        suffixIcon={<DownOutlined />}
                        showSearch
                        placement="topRight"
                        dropdownStyle={{ minWidth: '220px' }}
                        filterOption={(input, option) =>
                          (option?.children as string)
                            ?.toLowerCase()
                            .indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {availableGraphs && availableGraphs.length > 0 && (
                          availableGraphs.map(graph => (
                            <Option key={graph} value={graph}>
                              {graph}
                            </Option>
                          ))
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