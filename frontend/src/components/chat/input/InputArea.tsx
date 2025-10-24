// src/components/chat/input/InputArea.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button, Tooltip } from 'antd';
import './InputArea.css';
import {
  ArrowUpOutlined,
  CheckOutlined
} from '@ant-design/icons';
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

interface InputAreaProps {
  onSendMessage: (message: string, options?: any) => void;
  disabled?: boolean;
  mode: ConversationMode;
  inheritedConfig?: {
    selectedModel?: string;
    selectedGraph?: string;
    systemPrompt?: string;
    selectedMCPServers?: string[];
  };
}

const InputArea: React.FC<InputAreaProps> = ({
  onSendMessage,
  disabled = false,
  mode,
  inheritedConfig = {}
}) => {
  const [inputValue, setInputValue] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(inheritedConfig.systemPrompt || '');
  const [isSystemPromptMode, setIsSystemPromptMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(inheritedConfig.selectedModel || '');
  const [selectedGraph, setSelectedGraph] = useState<string>(inheritedConfig.selectedGraph || '');
  const [mcpServerStates, setMcpServerStates] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { agentType, setAgentType } = useConversationStore();
  const { models: availableModels } = useModelStore();
  const { graphs: availableGraphs } = useGraphEditorStore();
  const { config: mcpConfig, status: mcpStatus } = useMCPStore();

  // 获取所有MCP服务器（不论连接状态）
  const availableMcpServers = React.useMemo(() => {
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

  // 初始化MCP服务器状态
  useEffect(() => {
    const initialStates: Record<string, boolean> = {};
    availableMcpServers.forEach(serverName => {
      // 如果有继承的配置，则使用继承的配置
      if (inheritedConfig.selectedMCPServers?.includes(serverName)) {
        initialStates[serverName] = true;
      } else {
        initialStates[serverName] = false;
      }
    });
    setMcpServerStates(initialStates);
  }, [availableMcpServers, inheritedConfig.selectedMCPServers]);

  // 监听配置变化，更新本地状态（仅在初始化时应用一次）
  useEffect(() => {
    if (inheritedConfig.selectedModel && !selectedModel) {
      setSelectedModel(inheritedConfig.selectedModel);
    }
    if (inheritedConfig.selectedGraph && !selectedGraph) {
      setSelectedGraph(inheritedConfig.selectedGraph);
    }
    if (inheritedConfig.systemPrompt !== undefined && systemPrompt === '') {
      setSystemPrompt(inheritedConfig.systemPrompt);
    }
  }, [inheritedConfig, selectedModel, selectedGraph, systemPrompt]);

  useEffect(() => {
    // 自动选择第一个可用的模型或图（如果没有继承的配置）
    if (mode === 'chat' || mode === 'agent') {
      if (!selectedModel && !inheritedConfig.selectedModel && availableModels.length > 0) {
        setSelectedModel(availableModels[0].name);
      }
    } else if (mode === 'graph') {
      if (!selectedGraph && !inheritedConfig.selectedGraph && availableGraphs.length > 0) {
        setSelectedGraph(availableGraphs[0]);
      }
    }
  }, [mode, availableModels, availableGraphs, selectedModel, selectedGraph, inheritedConfig]);

  /**
   * 处理提示词选择
   * 根据当前模式和系统提示词模式状态，将提示词内容设置到正确的状态中
   */
  const handlePromptSelect = (content: string) => {
    // Chat 模式下需要根据系统提示词模式决定设置到哪个状态
    if (mode === 'chat') {
      if (isSystemPromptMode) {
        setSystemPrompt(content);
      } else {
        setInputValue(content);
      }
    } else {
      // 其他模式直接设置到输入值
      setInputValue(content);
    }
  };

  const handleSend = () => {
    const currentInput = isSystemPromptMode ? systemPrompt : inputValue;
    if (!currentInput.trim()) return;

    const options: any = {};

    switch (mode) {
      case 'chat':
        options.model_name = selectedModel;
        // 获取开启的MCP服务器
        options.mcp_servers = Object.entries(mcpServerStates)
          .filter(([_, enabled]) => enabled)
          .map(([serverName]) => serverName);
        // 添加系统提示词（如果设置了）
        if (systemPrompt.trim()) {
          options.system_prompt = systemPrompt.trim();
        }
        // 用户消息
        options.user_prompt = isSystemPromptMode ? undefined : inputValue.trim();
        break;
      case 'agent':
        options.model_name = selectedModel;
        options.agent_type = agentType;
        break;
      case 'graph':
        options.graph_name = selectedGraph;
        break;
    }

    // 发送消息
    if (isSystemPromptMode) {
      // 系统提示词模式：只更新系统提示词，不发送消息
      setIsSystemPromptMode(false);
      return;
    }

    onSendMessage(currentInput.trim(), options);
    setInputValue('');
  };

  // 发送Agent模式完成标记
  const handleCompleteCreation = () => {
    setInputValue('<end>END</end>');
    // 聚焦到输入框
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // 切换系统提示词模式
  const handleToggleSystemPrompt = () => {
    setIsSystemPromptMode(!isSystemPromptMode);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // 切换MCP服务器状态
  const toggleMcpServer = (serverName: string, enabled: boolean) => {
    setMcpServerStates(prev => ({
      ...prev,
      [serverName]: enabled
    }));
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

    // 系统提示词模式下总是可以"发送"（实际是保存）
    if (isSystemPromptMode) return true;

    switch (mode) {
      case 'chat':
      case 'agent':
        return !!selectedModel;
      case 'graph':
        return !!selectedGraph;
      default:
        return false;
    }
  };

  const getInputPlaceholder = () => {
    if (isSystemPromptMode) {
      return '输入系统提示词... (Ctrl+Enter保存)';
    }

    switch (mode) {
      case 'chat':
        return '输入您想说的话... (Ctrl+Enter发送)';
      case 'agent':
        return agentType === 'mcp'
          ? '描述您希望AI生成的MCP工具功能... (Ctrl+Enter发送)'
          : '描述您希望AI生成的Graph工作流... (Ctrl+Enter发送)';
      case 'graph':
        return '输入要传递给Graph的内容... (Ctrl+Enter发送)';
      default:
        return '输入消息...';
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
    <div className="input-area">
      <div className="input-container-new">
        {/* 主输入框 */}
        <div className="message-input-wrapper">
          <textarea
            ref={textareaRef}
            className="message-input-new"
            value={getCurrentInputValue()}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={getInputPlaceholder()}
            rows={3}
            disabled={disabled}
          />

          {/* 左下角控件 */}
          <div className="input-bottom-left">
            {/* Chat模式的系统提示词切换按钮 */}
            {mode === 'chat' && (
              <SystemPromptToggle
                isSystemPromptMode={isSystemPromptMode}
                onToggle={handleToggleSystemPrompt}
                size="small"
              />
            )}

            {/* Chat模式的MCP工具选择器 */}
            {mode === 'chat' && (
              <MCPToolSelector
                availableMCPServers={availableMcpServers}
                selectedMCPServers={mcpServerStates}
                onToggleMCPServer={toggleMcpServer}
                getServerConnectionStatus={getServerConnectionStatus}
                size="small"
              />
            )}

            {/* Chat模式的提示词选择器 */}
            {mode === 'chat' && (
              <PromptSelector
                onSelectPrompt={handlePromptSelect}
                size="small"
              />
            )}

            {/* Agent模式的类型切换按钮 */}
            {mode === 'agent' && (
              <AgentTypeToggle
                agentType={agentType}
                onToggle={setAgentType}
                size="small"
              />
            )}

            {/* Agent模式完成创建按钮 */}
            {mode === 'agent' && (
              <Tooltip title="完成创建">
                <Button
                  type="text"
                  icon={<CheckOutlined />}
                  className="complete-creation-button"
                  onClick={handleCompleteCreation}
                  size="small"
                >
                  完成创建
                </Button>
              </Tooltip>
            )}
          </div>

          {/* 右下角控件区域 */}
          <div className="input-bottom-right">
            {/* 模型选择器 (Chat和Agent模式) */}
            {(mode === 'chat' || mode === 'agent') && (
              <ModelSelector
                value={selectedModel}
                onChange={setSelectedModel}
                availableModels={availableModels}
              />
            )}

            {/* Graph选择器 (Graph模式) */}
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
              icon={<ArrowUpOutlined />}
              onClick={handleSend}
              disabled={!canSend()}
              className="send-button-new"
              size="small"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputArea;