// src/pages/ChatSystem.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { message, Button, Dropdown, Menu, Tooltip } from 'antd';
import { CompressOutlined, DownOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import ConversationSidebar from '../components/chat/ConversationSidebar';
import ModeSelector from '../components/chat/ModeSelector';
import MessageDisplay from '../components/chat/MessageDisplay';
import InputArea from '../components/chat/InputArea';
import CompactConfigModal from '../components/chat/CompactConfigModal';
import GlobalNotification from '../components/common/GlobalNotification';
import { useConversationStore } from '../store/conversationStore';
import { useSSEConnection } from '../hooks/useSSEConnection';
import { useModelStore } from '../store/modelStore';
import { useGlobalNotification } from '../hooks/useGlobalNotification';
import { ConversationService, generateMongoId } from '../services/conversationService';
import { ConversationMode, ConversationDetail } from '../types/conversation';
import { getCurrentUserId } from '../config/user';
import '../styles/chat-system.css';

const ChatSystem: React.FC = () => {
  const { conversationId: urlConversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  // 用于处理正在进行的对话，避免全局状态泄露
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  // 临时对话数据，用于新建对话时的数据管理
  const [temporaryConversation, setTemporaryConversation] = useState<ConversationDetail | null>(null);
  // 当前选择的图名称（用于Graph模式）
  const [selectedGraphName, setSelectedGraphName] = useState<string>('');
  // 从新建对话界面迁移的配置
  const [inheritedConfig, setInheritedConfig] = useState<{
    selectedModel?: string;
    selectedGraph?: string;
    systemPrompt?: string;
    selectedMCPServers?: string[];
  }>({});
  // 压缩相关状态
  const [compactConfigVisible, setCompactConfigVisible] = useState(false);
  const [selectedCompactType, setSelectedCompactType] = useState<'brutal' | 'precise'>('precise');
  // 使用Set来跟踪正在压缩的对话ID，这样每个对话都有独立的压缩状态
  const [compactingConversations, setCompactingConversations] = useState<Set<string>>(new Set());

  const {
    currentConversation,
    currentMode,
    agentType,
    sidebarCollapsed,
    loadConversationDetail,
    clearCurrentConversation,
    setCurrentMode,
    silentUpdateConversations
  } = useConversationStore();

  const {
    streamingState,
    enhancedStreamingState,
    startConnection,
    closeConnection
  } = useSSEConnection();

  const { models: availableModels } = useModelStore();

  // 全局通知管理
  const {
    notifications,
    removeNotification,
    success: showSuccessNotification,
    info: showInfoNotification
  } = useGlobalNotification();

  // 处理URL参数变化 - 简化逻辑，避免破坏现有状态管理
  useEffect(() => {
    // 仅在初始加载时处理URL参数，避免运行时的竞态条件
    if (urlConversationId && urlConversationId !== activeConversationId) {
      // 使用现有的handleConversationSelect逻辑，但延迟执行避免初始化问题
      const timer = setTimeout(() => {
        setActiveConversationId(urlConversationId);
        loadConversationDetail(urlConversationId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [urlConversationId]); // 移除activeConversationId依赖，避免循环

  // 获取当前显示的对话（优先临时对话，其次当前对话）
  const getDisplayConversation = useCallback((): ConversationDetail | null => {
    if (temporaryConversation && temporaryConversation.conversation_id === activeConversationId) {
      return temporaryConversation;
    }
    return currentConversation;
  }, [temporaryConversation, currentConversation, activeConversationId]);

  // 创建临时对话数据结构
  const createTemporaryConversation = useCallback((conversationId: string, title: string, mode: ConversationMode, agentType?: string): ConversationDetail => {
    // 根据模式确定generation_type
    let generationType: string;
    if (mode === 'chat') {
      generationType = 'chat';
    } else if (mode === 'agent') {
      generationType = agentType === 'graph' ? 'graph' : 'mcp';
    } else if (mode === 'graph') {
      generationType = 'graph_run';
    } else {
      generationType = 'chat';
    }

    return {
      conversation_id: conversationId,
      title,
      rounds: [],
      generation_type: generationType as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }, []);

  // 处理对话选择
  const handleConversationSelect = useCallback(async (conversationId: string) => {
    if (conversationId === activeConversationId) return;

    // 停止当前的SSE连接
    closeConnection();

    // 清除待发送消息状态和临时对话
    setPendingUserMessage(null);
    setTemporaryConversation(null);
    setSelectedGraphName('');
    setInheritedConfig({}); // 清除继承的配置，切换到现有对话时不应保留新建对话的配置

    // 先设置新的活跃对话ID并加载新对话，不清除当前对话以避免闪烁
    setActiveConversationId(conversationId);

    // 更新URL
    navigate(`/chat/${conversationId}`, { replace: true });

    await loadConversationDetail(conversationId);

    // 需要等待对话加载完成后根据对话类型设置模式
    // 这个逻辑应该在对话加载完成后的useEffect中处理
  }, [activeConversationId, closeConnection, loadConversationDetail, navigate]);

  // 处理新建对话
  const handleNewConversation = useCallback(() => {
    // 停止当前的SSE连接
    closeConnection();

    // 清除待发送消息状态和临时对话
    setPendingUserMessage(null);
    setTemporaryConversation(null);
    setSelectedGraphName('');
    setInheritedConfig({}); // 清除继承的配置

    // 清除当前对话
    clearCurrentConversation();
    setActiveConversationId(undefined);

    // 更新URL到基础聊天页面
    navigate('/chat', { replace: true });

    // 重置为默认模式
    setCurrentMode('chat');
  }, [closeConnection, clearCurrentConversation, setCurrentMode, navigate]);

  // 当对话加载完成后，根据对话类型设置正确的模式和agentType（不可变）
  useEffect(() => {
    if (currentConversation && !temporaryConversation) {
      // 根据对话的generation_type设置模式，Agent模式的类型不可变
      switch (currentConversation.generation_type) {
        case 'chat':
          setCurrentMode('chat');
          break;
        case 'mcp':
          setCurrentMode('agent');
          // Agent模式的类型根据对话确定，不可更改
          useConversationStore.getState().setAgentType('mcp');
          break;
        case 'graph':
          setCurrentMode('agent');
          // Agent模式的类型根据对话确定，不可更改
          useConversationStore.getState().setAgentType('graph');
          break;
        case 'graph_run':
          setCurrentMode('graph');
          break;
        default:
          // 默认情况，新对话时设置默认的agentType
          if (currentMode === 'agent' && !agentType) {
            useConversationStore.getState().setAgentType('mcp');
          }
          break;
      }

      // 对话加载完成后，平滑滚动到底部
      setTimeout(() => {
        const messageDisplay = document.querySelector('.message-display');
        if (messageDisplay) {
          messageDisplay.scrollTo({
            top: (messageDisplay as HTMLElement).scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [currentConversation, setCurrentMode, currentMode, agentType, temporaryConversation]);

  // 处理模式选择
  const handleModeSelect = useCallback((mode: ConversationMode) => {
    setCurrentMode(mode);
    // 清除当前对话和临时对话，准备开始新对话
    clearCurrentConversation();
    setTemporaryConversation(null);
    setSelectedGraphName('');
    setInheritedConfig({}); // 清除继承的配置
    setActiveConversationId(undefined);
    // 清除待发送消息状态
    setPendingUserMessage(null);
  }, [setCurrentMode, clearCurrentConversation]);

  // 开始新对话
  const handleStartConversation = useCallback(async (inputText: string, options: any = {}) => {
    try {
      // 立即生成对话ID和确定模式
      const conversationId = generateMongoId();
      const conversationMode = options.mode || currentMode;
      const conversationAgentType = options.agentType || (conversationMode === 'agent' ? agentType : undefined);
      const isGraphMode = conversationMode === 'graph';

      // 记录选择的Graph名称
      if (isGraphMode && options.selectedGraph) {
        setSelectedGraphName(options.selectedGraph);
      }

      // 保存从新建对话界面继承的配置
      setInheritedConfig({
        selectedModel: options.selectedModel,
        selectedGraph: options.selectedGraph,
        systemPrompt: options.systemPrompt,
        selectedMCPServers: options.selectedMCPServers || []
      });

      // 立即设置活跃对话ID，界面立即切换到对话模式
      setActiveConversationId(conversationId);

      // 更新URL
      navigate(`/chat/${conversationId}`, { replace: true });

      // 创建临时对话数据结构
      const tempConversation = createTemporaryConversation(
        conversationId,
        '新对话',
        conversationMode,
        conversationAgentType
      );
      setTemporaryConversation(tempConversation);

      // 只设置待发送的用户消息，不创建临时对话
      // 这样可以避免重复显示用户消息
      setPendingUserMessage(inputText);

      // 用于保存实际的对话ID（Graph模式时由后端生成）
      let actualConversationId = conversationId;

      // 异步启动SSE连接（不等待完成）
      startConnection(inputText, {
        // Graph模式新对话时不传递conversationId，让后端创建新的
        conversationId: isGraphMode ? undefined : conversationId,
        mode: conversationMode,
        agentType: conversationAgentType,
        model_name: options.selectedModel || 'gpt-4',
        graph_name: options.selectedGraph,
        mcp_servers: options.selectedMCPServers || [],
        system_prompt: options.systemPrompt,
        user_prompt: options.userPrompt,
        onConversationCreated: (backendConversationId: string) => {
          // Graph模式时更新实际的对话ID和标题
          if (isGraphMode) {
            actualConversationId = backendConversationId;
            // 异步更新状态，避免在渲染期间调用setState
            setTimeout(() => {
              setActiveConversationId(backendConversationId);
              // 更新URL到新的对话ID
              navigate(`/chat/${backendConversationId}`, { replace: true });
              // 更新临时对话的ID和标题
              setTemporaryConversation(prev => prev ? {
                ...prev,
                conversation_id: backendConversationId,
                title: backendConversationId // 使用conversation_id作为标题
              } : null);
            }, 0);
          }
        },
        onComplete: async () => {
          // 异步执行状态更新，避免在渲染期间调用setState
          setTimeout(async () => {
            // 重新加载对话详情以获取最新内容，确保消息不会消失
            await loadConversationDetail(actualConversationId);
            // 清除待发送消息状态和临时对话
            setPendingUserMessage(null);
            setTemporaryConversation(null);
            // 静默更新对话列表以显示新对话
            silentUpdateConversations();
            message.success('对话完成');
          }, 0);
        },
        onError: (error) => {
          // 异步执行状态更新，避免在渲染期间调用setState
          setTimeout(() => {
            // 清除待发送消息状态和临时对话
            setPendingUserMessage(null);
            setTemporaryConversation(null);
            message.error(`连接错误: ${error}`);
          }, 0);
        },
        onAgentCompletion: (completionData: any) => {
          // 处理Agent模式的完成事件
          if (completionData.tool_name) {
            showSuccessNotification(
              `MCP工具生成完成`,
              `工具 "${completionData.tool_name}" 已成功创建并注册到系统`,
              5000
            );
          } else if (completionData.graph_name) {
            showSuccessNotification(
              `Graph配置生成完成`,
              `图配置 "${completionData.graph_name}" 已成功创建并保存`,
              5000
            );
          }
        },
        onAgentIncomplete: (incompleteData: any) => {
          // 处理Agent模式的未完成事件
          showInfoNotification(
            `生成未完成`,
            incompleteData.message,
            4000
          );
        }
      }).catch(error => {
        console.error('启动SSE连接失败:', error);
        setPendingUserMessage(null);
        setTemporaryConversation(null);
        message.error('启动对话失败');
      });

    } catch (error) {
      console.error('启动对话失败:', error);
      // 异步执行状态更新，避免在渲染期间调用setState
      setTimeout(() => {
        message.error('启动对话失败');
        setPendingUserMessage(null);
        setTemporaryConversation(null);
      }, 0);
    }
  }, [currentMode, agentType, startConnection, loadConversationDetail, silentUpdateConversations, createTemporaryConversation, showSuccessNotification, showInfoNotification, navigate]);

  // 发送消息
  const handleSendMessage = useCallback(async (messageText: string, options: any = {}) => {
    if (!activeConversationId) {
      // 如果没有活跃对话，开始新对话
      await handleStartConversation(messageText, options);
      return;
    }

    try {
      // 设置待发送的用户消息（局部状态，不影响其他对话）
      setPendingUserMessage(messageText);

      await startConnection(messageText, {
        mode: currentMode,
        agentType: currentMode === 'agent' ? agentType : undefined,
        conversationId: activeConversationId,
        ...options,
        onComplete: async () => {
          // 异步执行状态更新，避免在渲染期间调用setState
          setTimeout(async () => {
            // 重新加载对话详情以获取最新内容，确保消息不会消失
            await loadConversationDetail(activeConversationId);
            // 清除待发送消息状态和临时对话
            setPendingUserMessage(null);
            setTemporaryConversation(null);
            // 注意：不清除 inheritedConfig，保持配置在对话界面中可用
            // 静默更新对话列表以反映最新状态
            silentUpdateConversations();
          }, 0);
        },
        onError: (error) => {
          // 异步执行状态更新，避免在渲染期间调用setState
          setTimeout(() => {
            message.error(`发送失败: ${error}`);
            // 清除待发送消息状态
            setPendingUserMessage(null);
            // 出错时保持当前状态，不重新加载对话以避免打断用户体验
          }, 0);
        },
        onAgentCompletion: (completionData: any) => {
          // 处理Agent模式的完成事件
          if (completionData.tool_name) {
            showSuccessNotification(
              `MCP工具生成完成`,
              `工具 "${completionData.tool_name}" 已成功创建并注册到系统`,
              5000
            );
          } else if (completionData.graph_name) {
            showSuccessNotification(
              `Graph配置生成完成`,
              `图配置 "${completionData.graph_name}" 已成功创建并保存`,
              5000
            );
          }
        },
        onAgentIncomplete: (incompleteData: any) => {
          // 处理Agent模式的未完成事件
          showInfoNotification(
            `生成未完成`,
            incompleteData.message,
            4000
          );
        }
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      // 异步执行状态更新，避免在渲染期间调用setState
      setTimeout(() => {
        message.error('发送消息失败');
        // 清除待发送消息状态
        setPendingUserMessage(null);
      }, 0);
    }
  }, [activeConversationId, currentMode, startConnection, handleStartConversation, loadConversationDetail, silentUpdateConversations, showSuccessNotification, showInfoNotification]);

  // 处理压缩类型选择
  const handleCompactTypeSelect = useCallback((compactType: 'brutal' | 'precise') => {
    const displayConversation = getDisplayConversation();
    if (!activeConversationId || !displayConversation) {
      message.error('没有选中的对话');
      return;
    }

    if (displayConversation.generation_type !== 'chat') {
      message.error('只有Chat模式的对话支持压缩');
      return;
    }

    setSelectedCompactType(compactType);
    setCompactConfigVisible(true);
  }, [activeConversationId, getDisplayConversation]);

  // 执行对话压缩
  const handleCompactConfirm = useCallback(async (config: { modelName: string; compactType: 'brutal' | 'precise'; threshold: number }) => {
    const displayConversation = getDisplayConversation();
    if (!activeConversationId || !displayConversation) {
      message.error('没有选中的对话');
      return;
    }

    setCompactConfigVisible(false);

    // 将当前对话ID添加到压缩中的对话集合
    setCompactingConversations(prev => new Set(prev).add(activeConversationId));

    try {
      const result = await ConversationService.compactConversation(
        activeConversationId,
        config.modelName,
        config.compactType,
        config.threshold,
        getCurrentUserId()
      );

      if (result.status === 'success') {
        // 显示全局玻璃拟态通知
        showSuccessNotification(
          `"${displayConversation.title}" 压缩完成`,
          undefined, // 不显示详细信息
          4000
        );
        // 重新加载对话详情以获取压缩后的内容
        await loadConversationDetail(activeConversationId);
        // 清除临时对话
        setTemporaryConversation(null);
      } else {
        message.error(result.message || '压缩失败');
      }
    } catch (error) {
      console.error('压缩对话失败:', error);
      message.error('压缩对话失败');
    } finally {
      // 从压缩中的对话集合中移除当前对话ID
      setCompactingConversations(prev => {
        const newSet = new Set(prev);
        newSet.delete(activeConversationId);
        return newSet;
      });
    }
  }, [activeConversationId, getDisplayConversation, loadConversationDetail]);

  // 获取主对话区域的样式
  const getMainAreaStyle = () => {
    return 'main-conversation-area';
  };

  // 获取当前显示的对话
  const displayConversation = getDisplayConversation();

  // 获取显示标题
  const getDisplayTitle = () => {
    if (displayConversation?.title) {
      return displayConversation.title;
    }
    if (pendingUserMessage) {
      return '新对话';
    }
    return '';
  };

  return (
    <div className="chat-system-page">
      <div className="chat-system-layout">
        {/* 左侧边栏 */}
        <ConversationSidebar
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          activeConversationId={activeConversationId}
        />

        {/* 主对话区域 */}
        <div className={getMainAreaStyle()}>
          {!displayConversation && !pendingUserMessage ? (
            /* 无对话且无待发送消息时显示模式选择器 */
            <ModeSelector
              onModeSelect={handleModeSelect}
              onStartConversation={handleStartConversation}
            />
          ) : (
            /* 有对话时显示消息和输入区域 */
            <>
              {/* 对话头部 */}
              <div className="conversation-header-bar">
                <div className="conversation-title-display">
                  {getDisplayTitle()}
                  {/* Graph模式显示选择的图名称 */}
                  {currentMode === 'graph' && selectedGraphName && (
                    <span className="graph-name-indicator">
                      {' - '}
                      <span style={{ color: '#1890ff', fontWeight: 'normal' }}>
                        {selectedGraphName}
                      </span>
                    </span>
                  )}
                </div>
                <div className="conversation-actions">
                  {/* Chat模式的压缩按钮 */}
                  {displayConversation?.generation_type === 'chat' && (() => {
                    const isCurrentConversationCompacting = activeConversationId ? compactingConversations.has(activeConversationId) : false;
                    // 调试信息（可选，生产环境可移除）
                    // console.log('Compact button state:', { activeConversationId, isCurrentConversationCompacting, compactingConversations: Array.from(compactingConversations) });
                    return (
                      <Dropdown
                        overlay={
                          <Menu onClick={({ key }) => handleCompactTypeSelect(key as 'brutal' | 'precise')}>
                            <Menu.Item key="precise">
                              <div>
                                <div>精确压缩</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  AI总结工具内容，保留完整对话结构
                                </div>
                              </div>
                            </Menu.Item>
                            <Menu.Item key="brutal">
                              <div>
                                <div>暴力压缩</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  每轮只保留用户和最终AI回复
                                </div>
                              </div>
                            </Menu.Item>
                          </Menu>
                        }
                        trigger={['click']}
                        placement="bottomRight"
                        disabled={isCurrentConversationCompacting}
                      >
                        <Tooltip title={isCurrentConversationCompacting ? "正在压缩中..." : "压缩对话内容"}>
                          <Button
                            type="text"
                            icon={<CompressOutlined />}
                            size="small"
                            className="compact-button"
                            loading={isCurrentConversationCompacting}
                            disabled={isCurrentConversationCompacting}
                          >
                            {isCurrentConversationCompacting ? '压缩中' : '压缩'} <DownOutlined />
                          </Button>
                        </Tooltip>
                      </Dropdown>
                    );
                  })()}
                </div>
              </div>

              {/* 消息显示区域 */}
              <MessageDisplay
                key={displayConversation?._id || displayConversation?.conversation_id || 'new'}
                conversation={displayConversation || {
                  conversation_id: activeConversationId || '',
                  title: '新对话',
                  rounds: [],
                  generation_type: currentMode === 'chat' ? 'chat' : currentMode === 'agent' ? (agentType === 'graph' ? 'graph' : 'mcp') : 'graph_run',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }}
                enhancedStreamingState={enhancedStreamingState}
                pendingUserMessage={pendingUserMessage}
                currentMode={currentMode}
                agentType={agentType}
              />

              {/* 输入区域 */}
              <InputArea
                onSendMessage={handleSendMessage}
                disabled={streamingState.isStreaming || (activeConversationId ? compactingConversations.has(activeConversationId) : false)}
                mode={currentMode}
                inheritedConfig={inheritedConfig}
              />
            </>
          )}
        </div>

        {/* 压缩配置对话框 */}
        <CompactConfigModal
          visible={compactConfigVisible}
          compactType={selectedCompactType}
          onConfirm={handleCompactConfirm}
          onCancel={() => setCompactConfigVisible(false)}
        />

        {/* 全局通知 */}
        <GlobalNotification
          notifications={notifications}
          onRemove={removeNotification}
        />

      </div>
    </div>
  );
};

export default ChatSystem;