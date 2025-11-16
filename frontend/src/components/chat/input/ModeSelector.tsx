// src/components/chat/input/ModeSelector.tsx
import React from 'react';
import { Button } from 'antd';
import { ArrowUp, Bot, GitBranch } from 'lucide-react';
import { useConversationStore } from '../../../store/conversationStore';
import { useModelStore } from '../../../store/modelStore';
import { useGraphEditorStore } from '../../../store/graphEditorStore';
import { useMCPStore } from '../../../store/mcpStore';
import { ConversationMode } from '../../../types/conversation';
import SystemPromptToggle from '../controls/SystemPromptToggle';
import AgentPicker from '../controls/AgentPicker';
import MCPToolSelector from '../controls/MCPToolSelector';
import SystemToolSelector from '../controls/SystemToolSelector';
import PromptSelector from '../controls/PromptSelector';
import MaxIterationsConfig from '../controls/MaxIterationsConfig';
import ModelSelector from '../controls/ModelSelector';
import GraphSelector from '../controls/GraphSelector';

interface ModeSelectorProps {
  onModeSelect: (mode: ConversationMode) => void;
  onStartConversation: (inputText: string, options?: any) => void;
}

/**
 * 模式选择器组件
 *
 * 用于新建对话时选择模式并配置初始参数。
 * 支持 Agent 和 Graph 两种模式。
 */
const ModeSelector: React.FC<ModeSelectorProps> = ({
  onModeSelect,
  onStartConversation
}) => {
  const { currentMode, setCurrentMode } = useConversationStore();
  const { models: availableModels, fetchModels } = useModelStore();
  const { graphs: availableGraphs, fetchGraphs } = useGraphEditorStore();
  const { config: mcpConfig, status: mcpStatus, fetchConfig: fetchMCPConfig, fetchStatus: fetchMCPStatus } = useMCPStore();

  const [inputValue, setInputValue] = React.useState('');
  const [systemPrompt, setSystemPrompt] = React.useState('');
  const [isSystemPromptMode, setIsSystemPromptMode] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const [selectedGraph, setSelectedGraph] = React.useState<string>('');
  const [selectedAgent, setSelectedAgent] = React.useState<string | null>(null);
  const [selectedMCPServers, setSelectedMCPServers] = React.useState<Record<string, boolean>>({});
  const [selectedSystemTools, setSelectedSystemTools] = React.useState<string[]>([]);
  const [maxIterations, setMaxIterations] = React.useState<number | null>(null);

  const availableMCPServers = React.useMemo(() => {
    return Object.keys(mcpConfig.mcpServers || {}).filter(serverName => {
      const server = mcpConfig.mcpServers[serverName];
      return !server.disabled;
    });
  }, [mcpConfig]);

  const getServerConnectionStatus = React.useCallback((serverName: string) => {
    const status = mcpStatus[serverName];
    return status?.connected || false;
  }, [mcpStatus]);

  React.useEffect(() => {
    fetchModels();
    fetchGraphs();
    fetchMCPConfig();
    fetchMCPStatus();
  }, [fetchModels, fetchGraphs, fetchMCPConfig, fetchMCPStatus]);

  React.useEffect(() => {
    const initialStates: Record<string, boolean> = {};
    availableMCPServers.forEach(serverName => {
      initialStates[serverName] = false;
    });
    setSelectedMCPServers(initialStates);
  }, [availableMCPServers]);

  const handleModeChange = (mode: ConversationMode) => {
    setCurrentMode(mode);
    onModeSelect(mode);
    setSelectedModel('');
    setSelectedGraph('');
    setSelectedAgent(null);
    setSelectedMCPServers({});
    setSelectedSystemTools([]);
    setMaxIterations(null);
    setSystemPrompt('');
    setInputValue('');
    setIsSystemPromptMode(false);
  };

  const toggleMcpServer = (serverName: string, enabled: boolean) => {
    setSelectedMCPServers(prev => ({
      ...prev,
      [serverName]: enabled
    }));
  };

  const handlePromptSelect = (content: string) => {
    if (isSystemPromptMode) {
      setSystemPrompt(content);
    } else {
      setInputValue(content);
    }
  };

  const handleStart = () => {
    const content = inputValue.trim();
    if (!content) return;

    const options: any = {
      mode: currentMode
    };

    if (currentMode === 'agent') {
      if (selectedAgent) {
        options.agent_name = selectedAgent;
      }

      if (selectedModel) {
        options.model_name = selectedModel;
      }

      if (systemPrompt.trim()) {
        options.system_prompt = systemPrompt.trim();
      }

      const enabledMCPServers = Object.entries(selectedMCPServers)
        .filter(([_, enabled]) => enabled)
        .map(([serverName]) => serverName);
      if (enabledMCPServers.length > 0) {
        options.mcp_servers = enabledMCPServers;
      }

      if (selectedSystemTools.length > 0) {
        options.system_tools = selectedSystemTools;
      }

      if (maxIterations !== null) {
        options.max_iterations = maxIterations;
      }
    } else if (currentMode === 'graph') {
      options.graph_name = selectedGraph;
    }

    onStartConversation(content, options);
  };

  const canStart = () => {
    const content = inputValue.trim();
    if (!content) return false;

    switch (currentMode) {
      case 'agent':
        return !!selectedAgent || !!selectedModel;
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

  const modes = [
    {
      key: 'agent' as ConversationMode,
      title: 'Agent',
      description: 'AI 助手对话',
      icon: Bot
    },
    {
      key: 'graph' as ConversationMode,
      title: 'Graph',
      description: '执行流程',
      icon: GitBranch
    }
  ];

  const getCurrentInputValue = () => {
    return isSystemPromptMode ? systemPrompt : inputValue;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isSystemPromptMode) {
      setSystemPrompt(e.target.value);
    } else {
      setInputValue(e.target.value);
    }
  };

  const getInputPlaceholder = () => {
    if (isSystemPromptMode) {
      return '输入系统提示词（可选）... (Ctrl+Enter发送)';
    }

    if (currentMode === 'agent') {
      return '输入您的问题或请求... (Ctrl+Enter发送)';
    }
    return '输入要传递给Graph的内容... (Ctrl+Enter发送)';
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      background: '#faf8f5'
    }}>
      <div style={{
        maxWidth: '900px',
        width: '100%'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '28px'
        }}>
          {modes.map(mode => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.key;
            return (
              <div
                key={mode.key}
                onClick={() => handleModeChange(mode.key)}
                style={{
                  padding: '16px 14px',
                  borderRadius: '6px',
                  background: isActive
                    ? 'rgba(255, 255, 255, 0.85)'
                    : 'rgba(255, 255, 255, 0.5)',
                  border: isActive
                    ? '1px solid rgba(139, 115, 85, 0.25)'
                    : '1px solid rgba(139, 115, 85, 0.1)',
                  boxShadow: isActive
                    ? '0 2px 6px rgba(139, 115, 85, 0.08)'
                    : '0 1px 2px rgba(139, 115, 85, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
                    e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(139, 115, 85, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                    e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.1)';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(139, 115, 85, 0.04)';
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    style={{
                      color: isActive ? '#8b7355' : 'rgba(139, 115, 85, 0.5)',
                      transition: 'color 0.2s ease'
                    }}
                  />
                  <div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? '#2d2d2d' : 'rgba(45, 45, 45, 0.75)',
                      marginBottom: '3px',
                      letterSpacing: '0.3px',
                      transition: 'color 0.2s ease'
                    }}>
                      {mode.title}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(45, 45, 45, 0.45)',
                      letterSpacing: '0.2px'
                    }}>
                      {mode.description}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {currentMode && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            borderRadius: '6px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'relative'
              }}>
                <textarea
                  value={getCurrentInputValue()}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={getInputPlaceholder()}
                  rows={4}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    padding: '0 0 36px 0',
                    fontSize: '14px',
                    lineHeight: '1.7',
                    color: '#2d2d2d',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
                    minHeight: '100px',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    letterSpacing: '0.2px'
                  }}
                />

                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {currentMode === 'agent' && (
                    <>
                      <SystemPromptToggle
                        isSystemPromptMode={isSystemPromptMode}
                        onToggle={() => setIsSystemPromptMode(!isSystemPromptMode)}
                        size="small"
                      />
                      <AgentPicker
                        selectedAgent={selectedAgent}
                        onAgentChange={setSelectedAgent}
                        size="small"
                      />
                      <MCPToolSelector
                        availableMCPServers={availableMCPServers}
                        selectedMCPServers={selectedMCPServers}
                        onToggleMCPServer={toggleMcpServer}
                        getServerConnectionStatus={getServerConnectionStatus}
                        size="small"
                      />
                      <SystemToolSelector
                        selectedTools={selectedSystemTools}
                        onToolsChange={setSelectedSystemTools}
                        size="small"
                      />
                      <PromptSelector
                        onSelectPrompt={handlePromptSelect}
                        size="small"
                      />
                    </>
                  )}
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {currentMode === 'agent' && (
                    <>
                      <MaxIterationsConfig
                        value={maxIterations}
                        onChange={setMaxIterations}
                        size="small"
                      />
                      <ModelSelector
                        value={selectedModel}
                        onChange={setSelectedModel}
                        availableModels={availableModels}
                      />
                    </>
                  )}

                  {currentMode === 'graph' && (
                    <GraphSelector
                      value={selectedGraph}
                      onChange={setSelectedGraph}
                      availableGraphs={availableGraphs}
                    />
                  )}

                  <Button
                    type="primary"
                    shape="circle"
                    icon={<ArrowUp size={14} strokeWidth={2} />}
                    onClick={handleStart}
                    disabled={!canStart()}
                    size="small"
                    style={{
                      width: '30px',
                      height: '30px',
                      minWidth: '30px',
                      borderRadius: '50%',
                      background: canStart() ? '#8b7355' : 'rgba(139, 115, 85, 0.25)',
                      border: 'none',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: canStart() ? 'pointer' : 'not-allowed',
                      boxShadow: canStart() ? '0 1px 3px rgba(139, 115, 85, 0.2)' : 'none',
                      padding: 0,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (canStart()) {
                        e.currentTarget.style.background = '#a0826d';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(139, 115, 85, 0.25)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canStart()) {
                        e.currentTarget.style.background = '#8b7355';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.2)';
                      }
                    }}
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
