// src/components/chat/ModeSelector.tsx
import React from 'react';
import { Card, Select, Button, Space, Typography, Row, Col } from 'antd';
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
  const [promptMode, setPromptMode] = React.useState<'user' | 'system'>('user'); // Chat模式的提示词类型

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
    setPromptMode('user'); // 重置为用户提示词模式
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

  const handleStart = () => {
    const content = currentMode === 'chat' && userPrompt.trim() ? userPrompt.trim() : inputText.trim();
    if (content) {
      // 将选择的配置传递给父组件
      onStartConversation(content, {
        mode: currentMode,
        agentType: currentMode === 'agent' ? agentType : undefined,
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
        return !!selectedModel && !!agentType;
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

        {/* 输入区域 */}
        {currentMode && (
          <div className="input-area">
            <div className="input-container-new">
              <div className="message-input-wrapper">
                <textarea
                  className="message-input-new"
                  value={currentMode === 'chat' ? 
                    (promptMode === 'user' ? userPrompt : systemPrompt) : 
                    inputText}
                  onChange={(e) => {
                    if (currentMode === 'chat') {
                      if (promptMode === 'user') {
                        setUserPrompt(e.target.value);
                      } else {
                        setSystemPrompt(e.target.value);
                      }
                    } else {
                      setInputText(e.target.value);
                    }
                  }}
                  placeholder={
                    currentMode === 'chat' ? 
                      (promptMode === 'user' ? '输入您想说的话...' : '输入系统提示词（可选）...') :
                    currentMode === 'agent' ? 
                      (agentType === 'mcp' ? 
                        '描述您希望AI生成的MCP工具功能...' :
                        '描述您希望AI生成的Graph工作流...') :
                    '输入要传递给Graph的内容...'
                  }
                  rows={4}
                />
                
                {/* 左下角控件 */}
                <div className="input-bottom-left">
                  {/* Chat模式的提示词类型切换 */}
                  {currentMode === 'chat' && (
                    <Button
                      type="text"
                      icon={<SwapOutlined />}
                      onClick={() => setPromptMode(promptMode === 'user' ? 'system' : 'user')}
                      size="small"
                      className="prompt-switch-button"
                    >
                      {promptMode === 'user' ? '用户提示词' : '系统提示词'}
                    </Button>
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
                  
                  {/* Chat模式的MCP工具选择 */}
                  {currentMode === 'chat' && (
                    <Select
                      mode="multiple"
                      value={selectedMCPServers}
                      onChange={setSelectedMCPServers}
                      placeholder="MCP工具"
                      size="small"
                      bordered={false}
                      className="mcp-select-dropdown"
                      style={{ minWidth: 80 }}
                      allowClear
                    >
                      {availableMCPServers.map(serverName => (
                        <Option key={serverName} value={serverName}>
                          {serverName}
                        </Option>
                      ))}
                    </Select>
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