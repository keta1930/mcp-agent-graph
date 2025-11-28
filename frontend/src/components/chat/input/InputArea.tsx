// src/components/chat/input/InputArea.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from 'antd';
import './InputArea.css';
import { ArrowUp } from 'lucide-react';
import { useGraphEditorStore } from '../../../store/graphEditorStore';
import { useModelStore } from '../../../store/modelStore';
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
import { useT } from '../../../i18n/hooks';

interface InputAreaProps {
  onSendMessage: (message: string, options?: any) => void;
  disabled?: boolean;
  mode: ConversationMode;
  inheritedConfig?: {
    selectedModel?: string;
    selectedGraph?: string;
    systemPrompt?: string;
    selectedMCPServers?: string[];
    selectedAgent?: string | null;
    selectedSystemTools?: string[];
    maxIterations?: number | null;
  };
}

/**
 * 输入区域组件
 *
 * 支持 Agent 和 Graph 两种模式的消息输入。
 * 提供多种配置选项，包括模型选择、Agent 选择、工具选择等。
 */
const InputArea: React.FC<InputAreaProps> = ({
  onSendMessage,
  disabled = false,
  mode,
  inheritedConfig = {}
}) => {
  const t = useT();
  const [inputValue, setInputValue] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSystemPromptMode, setIsSystemPromptMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedGraph, setSelectedGraph] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedMCPServers, setSelectedMCPServers] = useState<Record<string, boolean>>({});
  const [selectedSystemTools, setSelectedSystemTools] = useState<string[]>([]);
  const [maxIterations, setMaxIterations] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 标记是否已经初始化过配置
  const [isConfigInitialized, setIsConfigInitialized] = useState(false);

  const { models: availableModels } = useModelStore();
  const { graphs: availableGraphs } = useGraphEditorStore();
  const { config: mcpConfig, status: mcpStatus } = useMCPStore();

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

  // 初始化继承的配置（只在第一次或配置变化时执行）
  useEffect(() => {
    if (!isConfigInitialized || Object.keys(inheritedConfig).length > 0) {
      // 设置模型（如果为 undefined 则清空）
      setSelectedModel(inheritedConfig.selectedModel || '');
      
      // 设置图（如果为 undefined 则清空）
      setSelectedGraph(inheritedConfig.selectedGraph || '');
      
      // 设置系统提示词（如果为 undefined 则清空）
      setSystemPrompt(inheritedConfig.systemPrompt || '');
      
      // 设置 Agent（如果为 undefined 则清空）
      setSelectedAgent(inheritedConfig.selectedAgent !== undefined ? inheritedConfig.selectedAgent : null);
      
      // 设置系统工具（如果为 undefined 或空数组则清空）
      setSelectedSystemTools(inheritedConfig.selectedSystemTools || []);
      
      // 设置最大迭代次数（如果为 undefined 则清空）
      setMaxIterations(inheritedConfig.maxIterations !== undefined ? inheritedConfig.maxIterations : null);
      
      // 设置 MCP 服务器
      const initialStates: Record<string, boolean> = {};
      availableMCPServers.forEach(serverName => {
        initialStates[serverName] = inheritedConfig.selectedMCPServers?.includes(serverName) || false;
      });
      setSelectedMCPServers(initialStates);
      
      setIsConfigInitialized(true);
    }
  }, [inheritedConfig, availableMCPServers, isConfigInitialized]);

  useEffect(() => {
    if (mode === 'agent' && !selectedModel && availableModels.length > 0) {
      setSelectedModel(availableModels[0].name);
    } else if (mode === 'graph' && !selectedGraph && availableGraphs.length > 0) {
      setSelectedGraph(availableGraphs[0]);
    }
  }, [mode, availableModels, availableGraphs, selectedModel, selectedGraph]);

  const handlePromptSelect = (content: string) => {
    if (isSystemPromptMode) {
      setSystemPrompt(content);
    } else {
      setInputValue(content);
    }
  };

  const toggleMcpServer = (serverName: string, enabled: boolean) => {
    setSelectedMCPServers(prev => ({
      ...prev,
      [serverName]: enabled
    }));
  };

  const handleSend = () => {
    const currentInput = isSystemPromptMode ? systemPrompt : inputValue;
    if (!currentInput.trim()) return;

    if (isSystemPromptMode) {
      setIsSystemPromptMode(false);
      return;
    }

    const options: any = {};

    switch (mode) {
      case 'agent':
        options.mode = 'agent';
        options.user_prompt = inputValue.trim();

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

        break;
      case 'graph':
        options.graph_name = selectedGraph;
        break;
    }

    onSendMessage(currentInput.trim(), options);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = () => {
    const currentInput = isSystemPromptMode ? systemPrompt : inputValue;
    if (!currentInput.trim() || disabled) return false;

    if (isSystemPromptMode) return true;

    switch (mode) {
      case 'agent':
        return !!selectedAgent || !!selectedModel;
      case 'graph':
        return !!selectedGraph;
      default:
        return false;
    }
  };

  const getInputPlaceholder = () => {
    if (isSystemPromptMode) {
      return t('pages.chatSystem.inputArea.systemPromptPlaceholder');
    }

    switch (mode) {
      case 'agent':
        if (selectedAgent) {
          return t('pages.chatSystem.inputArea.agentWithNamePlaceholder', { agent: selectedAgent });
        }
        return t('pages.chatSystem.inputArea.agentPlaceholder');
      case 'graph':
        return t('pages.chatSystem.inputArea.graphPlaceholder');
      default:
        return t('pages.chatSystem.inputArea.defaultPlaceholder');
    }
  };

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

  return (
    <div style={{
      background: 'linear-gradient(to top, #f5f3f0 0%, #faf8f5 100%)',
      borderTop: '1px solid rgba(139, 115, 85, 0.1)',
      padding: '20px 32px 24px 32px',
      display: 'flex',
      justifyContent: 'center',
      position: 'relative'
    }}
      data-tour="chat-input-area"
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: '20%',
        right: '20%',
        height: '1px',
        background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.15) 50%, transparent)'
      }} />

      <div style={{
        maxWidth: '850px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{
          position: 'relative',
          background: 'linear-gradient(to bottom, rgba(245, 243, 240, 0.6), rgba(250, 248, 245, 0.4))',
          border: '1px solid rgba(139, 115, 85, 0.12)',
          borderRadius: '10px',
          padding: '14px 16px',
          transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
          boxShadow: 'inset 0 1px 3px rgba(139, 115, 85, 0.08), inset 0 -1px 0 rgba(255, 255, 255, 0.5)'
        }}>
          <textarea
            ref={textareaRef}
            value={getCurrentInputValue()}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={getInputPlaceholder()}
            rows={3}
            disabled={disabled}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: '2px 0 36px 0',
              fontSize: '14px',
              lineHeight: '1.7',
              color: '#2d2d2d',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
              minHeight: '32px',
              maxHeight: '200px',
              overflowY: 'auto',
              letterSpacing: '0.3px'
            }}
          />

          {/* 左下角控件 */}
          <div style={{
            position: 'absolute',
            bottom: '14px',
            left: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {mode === 'agent' && (
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

          {/* 右下角控件区域 */}
          <div style={{
            position: 'absolute',
            bottom: '14px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {mode === 'agent' && (
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

            {mode === 'graph' && (
              <GraphSelector
                value={selectedGraph}
                onChange={setSelectedGraph}
                availableGraphs={availableGraphs}
              />
            )}

            {/* 发送按钮 */}
            <Button
              type="primary"
              shape="circle"
              icon={<ArrowUp size={16} strokeWidth={2} />}
              onClick={handleSend}
              disabled={!canSend()}
              size="small"
              style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                borderRadius: '50%',
                background: canSend()
                  ? 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)'
                  : 'rgba(212, 196, 176, 0.4)',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canSend() ? 'pointer' : 'not-allowed',
                boxShadow: canSend()
                  ? '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                  : 'inset 0 1px 2px rgba(139, 115, 85, 0.1)',
                padding: 0,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (canSend()) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 3px 10px rgba(184, 88, 69, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (canSend()) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputArea;
