// src/components/chat/input/ModeSelector.tsx
import React from 'react';
import { Button, Dropdown } from 'antd';
import { ArrowUp, Bot, GitBranch, FolderKanban, RefreshCw } from 'lucide-react';
import { useConversationStore } from '../../../store/conversationStore';
import { useModelStore } from '../../../store/modelStore';
import { useGraphEditorStore } from '../../../store/graphEditorStore';
import { useMCPStore } from '../../../store/mcpStore';
import { ConversationMode } from '../../../types/conversation';
import { ProjectListItem } from '../../../types/project';
import { projectService } from '../../../services/projectService';
import SystemPromptToggle from '../controls/SystemPromptToggle';
import AgentPicker from '../controls/AgentPicker';
import MCPToolSelector from '../controls/MCPToolSelector';
import SystemToolSelector from '../controls/SystemToolSelector';
import PromptSelector from '../controls/PromptSelector';
import MaxIterationsConfig from '../controls/MaxIterationsConfig';
import ModelSelector from '../controls/ModelSelector';
import GraphSelector from '../controls/GraphSelector';
import FileUploadButton from '../controls/FileUploadButton';
import { useT } from '../../../i18n/hooks';

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
  const t = useT();
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
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [clearFilesTrigger, setClearFilesTrigger] = React.useState<number>(0);
  const [addFilesTrigger, setAddFilesTrigger] = React.useState<{ files: File[]; timestamp: number } | undefined>();
  const [isDragging, setIsDragging] = React.useState(false);
  const inputContainerRef = React.useRef<HTMLDivElement>(null);
  const [projects, setProjects] = React.useState<ProjectListItem[]>([]);
  const [projectsLoading, setProjectsLoading] = React.useState(false);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = React.useState<string | null>(null);

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

  const loadProjects = React.useCallback(async () => {
    setProjectsLoading(true);
    try {
      const response = await projectService.listProjects();
      setProjects(response.projects || []);
    } catch (error) {
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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
    setSelectedFiles([]);
    setClearFilesTrigger(prev => prev + 1);
    setSelectedProjectId(null);
    setSelectedProjectName(null);
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

      if (selectedFiles.length > 0) {
        options.files = selectedFiles;
      }

      if (selectedProjectId) {
        options.project_id = selectedProjectId;
      }
    } else if (currentMode === 'graph') {
      options.graph_name = selectedGraph;
    }

    onStartConversation(content, options);
    setSelectedFiles([]);
    setClearFilesTrigger(prev => prev + 1);
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
      title: t('pages.chatSystem.modeSelector.agentMode'),
      description: t('pages.chatSystem.modeSelector.agentModeDesc'),
      icon: Bot
    },
    {
      key: 'graph' as ConversationMode,
      title: t('pages.chatSystem.modeSelector.graphMode'),
      description: t('pages.chatSystem.modeSelector.graphModeDesc'),
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

  const handleProjectMenuClick = (key: string) => {
    if (key === 'none') {
      setSelectedProjectId(null);
      setSelectedProjectName(null);
      return;
    }
    const project = projects.find((item) => item.project_id === key);
    if (project) {
      setSelectedProjectId(project.project_id);
      setSelectedProjectName(project.name);
    }
  };

  const getInputPlaceholder = () => {
    if (isSystemPromptMode) {
      return t('pages.chatSystem.modeSelector.systemPromptPlaceholder');
    }

    if (currentMode === 'agent') {
      return t('pages.chatSystem.modeSelector.agentPlaceholder');
    }
    return t('pages.chatSystem.modeSelector.graphPlaceholder');
  };

  const projectMenuItems = [
    { key: 'none', label: t('pages.chatSystem.modeSelector.projectNone') },
    ...projects.map((project) => ({
      key: project.project_id,
      label: project.name,
    }))
  ];

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentMode === 'agent') {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === inputContainerRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (currentMode !== 'agent') return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setAddFilesTrigger({ files: droppedFiles, timestamp: Date.now() });
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      background: '#faf8f5'
    }}
      data-tour="chat-mode-selector"
    >
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
          <div
            ref={inputContainerRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              background: isDragging
                ? 'rgba(184, 88, 69, 0.08)'
                : 'rgba(255, 255, 255, 0.7)',
              border: isDragging
                ? '2px dashed rgba(184, 88, 69, 0.5)'
                : '1px solid rgba(139, 115, 85, 0.15)',
              borderRadius: '6px',
              padding: '20px',
              boxShadow: isDragging
                ? '0 2px 8px rgba(184, 88, 69, 0.15), 0 0 0 3px rgba(184, 88, 69, 0.1)'
                : '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
              transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
            }}
          >
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
                      <FileUploadButton
                        onFilesChange={setSelectedFiles}
                        clearTrigger={clearFilesTrigger}
                        addFilesTrigger={addFilesTrigger}
                      />
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
                      <Dropdown
                        menu={{
                          items: projectMenuItems,
                          onClick: ({ key }) => handleProjectMenuClick(key),
                        }}
                        trigger={['click']}
                      >
                        <Button
                          size="small"
                          className="project-selector-button"
                          icon={<FolderKanban size={14} strokeWidth={1.5} />}
                          onClick={(event) => event.preventDefault()}
                        >
                          <span className="project-selector-text">
                            {projectsLoading
                              ? t('pages.chatSystem.modeSelector.projectLoading')
                              : selectedProjectName || t('pages.chatSystem.modeSelector.projectPlaceholder')}
                          </span>
                        </Button>
                      </Dropdown>
                      <Button
                        size="small"
                        className="project-refresh-button"
                        icon={<RefreshCw size={14} strokeWidth={1.6} />}
                        onClick={loadProjects}
                        title={t('pages.chatSystem.modeSelector.projectRefresh')}
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
