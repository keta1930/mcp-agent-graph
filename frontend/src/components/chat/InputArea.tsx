// src/components/chat/InputArea.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button, Select, Switch, Tooltip, Typography } from 'antd';
import { 
  ArrowUpOutlined, 
  ToolOutlined, 
  DownOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useConversationStore } from '../../store/conversationStore';
import { useModelStore } from '../../store/modelStore';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { useMCPStore } from '../../store/mcpStore';
import { ConversationMode, AgentType } from '../../types/conversation';

const { Option } = Select;
const { Text } = Typography;

interface InputAreaProps {
  onSendMessage: (message: string, options?: any) => void;
  disabled?: boolean;
  mode: ConversationMode;
}

const InputArea: React.FC<InputAreaProps> = ({ 
  onSendMessage, 
  disabled = false,
  mode 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedGraph, setSelectedGraph] = useState<string>('');
  const [mcpServerStates, setMcpServerStates] = useState<Record<string, boolean>>({});
  const [showMcpTools, setShowMcpTools] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mcpDropdownRef = useRef<HTMLDivElement>(null);

  const { agentType } = useConversationStore();
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
      initialStates[serverName] = false;
    });
    setMcpServerStates(initialStates);
  }, [availableMcpServers]);

  useEffect(() => {
    // 自动选择第一个可用的模型或图
    if (mode === 'chat' || mode === 'agent') {
      if (!selectedModel && availableModels.length > 0) {
        setSelectedModel(availableModels[0].name);
      }
    } else if (mode === 'graph') {
      if (!selectedGraph && availableGraphs.length > 0) {
        setSelectedGraph(availableGraphs[0]);
      }
    }
  }, [mode, availableModels, availableGraphs, selectedModel, selectedGraph]);

  // 点击外部关闭MCP工具面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mcpDropdownRef.current && !mcpDropdownRef.current.contains(event.target as Node)) {
        setShowMcpTools(false);
      }
    };

    if (showMcpTools) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMcpTools]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const options: any = {};

    switch (mode) {
      case 'chat':
        options.model_name = selectedModel;
        // 获取开启的MCP服务器
        options.mcp_servers = Object.entries(mcpServerStates)
          .filter(([_, enabled]) => enabled)
          .map(([serverName]) => serverName);
        break;
      case 'agent':
        options.model_name = selectedModel;
        options.agent_type = agentType;
        break;
      case 'graph':
        options.graph_name = selectedGraph;
        break;
    }

    onSendMessage(inputValue.trim(), options);
    setInputValue('');
  };

  // 发送Agent模式完成标记
  const handleCompleteCreation = () => {
    onSendMessage('<end>END</end>');
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
    if (!inputValue.trim() || disabled) return false;
    
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

  const enabledMcpCount = Object.values(mcpServerStates).filter(Boolean).length;

  const getInputPlaceholder = () => {
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

  return (
    <div className="input-area">
      <div className="input-container-new">
        {/* 主输入框 */}
        <div className="message-input-wrapper">
          <textarea
            ref={textareaRef}
            className="message-input-new"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getInputPlaceholder()}
            rows={3}
            disabled={disabled}
          />
          
          {/* 左下角MCP工具图标 (仅Chat模式) */}
          {mode === 'chat' && availableMcpServers.length > 0 && (
            <div className="input-bottom-left" ref={mcpDropdownRef}>
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
                    {availableMcpServers.map(serverName => {
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
                            checked={mcpServerStates[serverName] || false}
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

          {/* Agent模式完成创建按钮 */}
          {mode === 'agent' && (
            <div className="input-bottom-left">
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
            </div>
          )}
          
          {/* 右下角控件区域 */}
          <div className="input-bottom-right">
            {/* 模型选择器 (Chat和Agent模式) */}
            {(mode === 'chat' || mode === 'agent') && (
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
                  {availableModels.map(model => (
                    <Option key={model.name} value={model.name}>
                      {model.alias || model.name}
                    </Option>
                  ))}
                </Select>
              </div>
            )}
            
            {/* Graph选择器 (Graph模式) */}
            {mode === 'graph' && (
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
                  {availableGraphs.map(graph => (
                    <Option key={graph} value={graph}>
                      {graph}
                    </Option>
                  ))}
                </Select>
              </div>
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