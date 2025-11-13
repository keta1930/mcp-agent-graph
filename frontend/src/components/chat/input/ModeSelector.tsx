// src/components/chat/input/ModeSelector.tsx
import React, { useRef, useEffect } from 'react';
import { Button, Typography, Tooltip } from 'antd';
import {
  ArrowUpOutlined
} from '@ant-design/icons';
import { MessageSquare, Bot, GitBranch, Layers } from 'lucide-react';
import { useConversationStore } from '../../../store/conversationStore';
import { useModelStore } from '../../../store/modelStore';
import { useGraphEditorStore } from '../../../store/graphEditorStore';
import { useMCPStore } from '../../../store/mcpStore';
import { ConversationMode } from '../../../types/conversation';
import MCPToolSelector from '../controls/MCPToolSelector';
import PromptSelector from '../controls/PromptSelector';
import ModelSelector from '../controls/ModelSelector';
import GraphSelector from '../controls/GraphSelector';
import AgentTypeToggle from '../controls/AgentTypeToggle';
import SystemPromptToggle from '../controls/SystemPromptToggle';

const { Text } = Typography;

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
  const [showGraphSelector, setShowGraphSelector] = React.useState(false);
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

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (graphDropdownRef.current && !graphDropdownRef.current.contains(event.target as Node)) {
        setShowGraphSelector(false);
      }
    };

    if (showGraphSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showGraphSelector]);

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

  // 处理提示词选择
  const handlePromptSelect = (content: string) => {
    if (currentMode === 'chat') {
      if (promptMode === 'user') {
        setUserPrompt(content);
      } else {
        setSystemPrompt(content);
      }
    } else {
      setInputText(content);
    }
  };

  const modes = [
    {
      key: 'chat' as ConversationMode,
      title: 'Chat',
      description: '自然对话',
      icon: MessageSquare
    },
    {
      key: 'agent' as ConversationMode,
      title: 'Agent',
      description: '生成工具',
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

        {/* 紧凑的模式选择卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
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

        {/* 宽敞的输入区域 */}
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

                {/* 左下角控件 */}
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {/* Chat模式的系统提示词切换按钮 */}
                  {currentMode === 'chat' && (
                    <SystemPromptToggle
                      isSystemPromptMode={promptMode === 'system'}
                      onToggle={() => setPromptMode(promptMode === 'user' ? 'system' : 'user')}
                      size="small"
                    />
                  )}

                  {/* Chat模式的MCP工具选择器 */}
                  {currentMode === 'chat' && (
                    <MCPToolSelector
                      availableMCPServers={availableMCPServers}
                      selectedMCPServers={selectedMCPServers}
                      onToggleMCPServer={toggleMcpServer}
                      getServerConnectionStatus={getServerConnectionStatus}
                      size="small"
                    />
                  )}

                  {/* Chat模式的提示词选择器 */}
                  {currentMode === 'chat' && (
                    <PromptSelector
                      onSelectPrompt={handlePromptSelect}
                      size="small"
                    />
                  )}

                  {/* Agent模式的类型切换按钮 */}
                  {currentMode === 'agent' && (
                    <AgentTypeToggle
                      agentType={agentType}
                      onToggle={setAgentType}
                      size="small"
                    />
                  )}

                  {/* Agent Graph模式的MCP工具选择 */}
                  {currentMode === 'agent' && agentType === 'graph' && (
                    <MCPToolSelector
                      availableMCPServers={availableMCPServers}
                      selectedMCPServers={selectedMCPServers}
                      onToggleMCPServer={toggleMcpServer}
                      getServerConnectionStatus={getServerConnectionStatus}
                      size="small"
                    />
                  )}

                  {/* Agent Graph模式的图配置选择 */}
                  {currentMode === 'agent' && agentType === 'graph' && (
                    <div style={{ position: 'relative' }} ref={graphDropdownRef}>
                      <Tooltip title={selectedGraph ? `已选择图: ${selectedGraph}` : "选择基础图配置（可选）"}>
                        <div
                          onClick={() => setShowGraphSelector(!showGraphSelector)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            color: selectedGraph ? '#8b7355' : 'rgba(139, 115, 85, 0.65)',
                            border: `1px solid ${selectedGraph ? 'rgba(139, 115, 85, 0.25)' : 'rgba(139, 115, 85, 0.15)'}`,
                            background: selectedGraph ? 'rgba(139, 115, 85, 0.06)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '12px',
                            fontWeight: 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = selectedGraph ? 'rgba(139, 115, 85, 0.06)' : 'transparent';
                          }}
                        >
                          <Layers size={12} strokeWidth={1.5} />
                          {selectedGraph || '基础图'}
                        </div>
                      </Tooltip>

                      {/* 图选择面板 */}
                      {showGraphSelector && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: 0,
                          marginBottom: '8px',
                          minWidth: '280px',
                          maxHeight: '320px',
                          overflowY: 'auto',
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(139, 115, 85, 0.2)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 16px rgba(139, 115, 85, 0.15)',
                          zIndex: 1000
                        }}>
                          <div style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <Text strong style={{ fontSize: '13px', color: '#2d2d2d' }}>基础图配置</Text>
                            <Text style={{ fontSize: '11px', color: 'rgba(45, 45, 45, 0.65)' }}>（可选）</Text>
                          </div>
                          <div style={{ padding: '8px' }}>
                            <div style={{
                              padding: '10px 12px',
                              marginBottom: '6px',
                              borderRadius: '6px',
                              background: !selectedGraph ? 'rgba(184, 88, 69, 0.08)' : 'transparent',
                              border: `1px solid ${!selectedGraph ? 'rgba(184, 88, 69, 0.25)' : 'rgba(139, 115, 85, 0.12)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                            onClick={() => setSelectedGraph('')}
                            onMouseEnter={(e) => {
                              if (selectedGraph) {
                                e.currentTarget.style.background = 'rgba(245, 243, 240, 0.6)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedGraph) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}>
                              <span style={{ fontSize: '13px', color: '#2d2d2d' }}>不使用基础配置</span>
                              {!selectedGraph && (
                                <span style={{
                                  fontSize: '12px',
                                  color: '#b85845',
                                  fontWeight: 500
                                }}>已选择</span>
                              )}
                            </div>
                            {availableGraphs && availableGraphs.length > 0 && availableGraphs.map(graphName => (
                              <div
                                key={graphName}
                                style={{
                                  padding: '10px 12px',
                                  marginBottom: '6px',
                                  borderRadius: '6px',
                                  background: selectedGraph === graphName ? 'rgba(184, 88, 69, 0.08)' : 'transparent',
                                  border: `1px solid ${selectedGraph === graphName ? 'rgba(184, 88, 69, 0.25)' : 'rgba(139, 115, 85, 0.12)'}`,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                                onClick={() => setSelectedGraph(graphName)}
                                onMouseEnter={(e) => {
                                  if (selectedGraph !== graphName) {
                                    e.currentTarget.style.background = 'rgba(245, 243, 240, 0.6)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (selectedGraph !== graphName) {
                                    e.currentTarget.style.background = 'transparent';
                                  }
                                }}
                              >
                                <Tooltip title={graphName} placement="left">
                                  <span style={{
                                    fontSize: '13px',
                                    color: '#2d2d2d',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '180px'
                                  }}>{graphName}</span>
                                </Tooltip>
                                {selectedGraph === graphName && (
                                  <span style={{
                                    fontSize: '12px',
                                    color: '#b85845',
                                    fontWeight: 500
                                  }}>已选择</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 右下角控件 */}
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {/* 模型选择器 (Chat和Agent模式) */}
                  {(currentMode === 'chat' || currentMode === 'agent') && (
                    <ModelSelector
                      value={selectedModel}
                      onChange={setSelectedModel}
                      availableModels={availableModels}
                    />
                  )}

                  {/* Graph选择器 (Graph模式) */}
                  {currentMode === 'graph' && (
                    <GraphSelector
                      value={selectedGraph}
                      onChange={setSelectedGraph}
                      availableGraphs={availableGraphs}
                    />
                  )}

                  {/* 开始按钮 - 平衡设计 */}
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<ArrowUpOutlined />}
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