// src/pages/ChatSystem.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { message, Button, Dropdown, Menu, Tooltip } from 'antd';
import { CompressOutlined, DownOutlined, FileOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import ConversationSidebar from '../components/chat/sidebar/ConversationSidebar';
import ModeSelector from '../components/chat/input/ModeSelector';
import MessageDisplay from '../components/chat/message/MessageDisplay';
import InputArea from '../components/chat/input/InputArea';
import CompactConfigModal from '../components/chat/modal/CompactConfigModal';
import GlobalNotification from '../components/common/GlobalNotification';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { DocumentsDrawer } from '../components/chat/drawer';
import { FileViewModal } from '../components/conversation-file/FileViewModal';
import { useConversationStore } from '../store/conversationStore';
import { useSSEConnection } from '../hooks/useSSEConnection';

import { useGlobalNotification } from '../hooks/useGlobalNotification';
import { ConversationService, generateMongoId } from '../services/conversationService';
import { ConversationMode, ConversationDetail } from '../types/conversation';
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
    selectedAgent?: string | null;
    selectedSystemTools?: string[];
    maxIterations?: number | null;
  }>({});
  // 压缩相关状态
  const [compactConfigVisible, setCompactConfigVisible] = useState(false);
  const [selectedCompactType, setSelectedCompactType] = useState<'brutal' | 'precise'>('precise');
  // 使用Set来跟踪正在压缩的对话ID，这样每个对话都有独立的压缩状态
  const [compactingConversations, setCompactingConversations] = useState<Set<string>>(new Set());
  // Documents 抽屉状态
  const [documentsDrawerVisible, setDocumentsDrawerVisible] = useState(false);
  // 文件查看模态框状态
  const [fileViewModalVisible, setFileViewModalVisible] = useState(false);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);

  const {
    currentConversation,
    currentMode,
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



  // 全局通知管理
  const {
    notifications,
    removeNotification,
    success: showSuccessNotification
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
  const createTemporaryConversation = useCallback((conversationId: string, title: string, mode: ConversationMode): ConversationDetail => {
    // 根据模式确定type
    const conversationType = mode === 'graph' ? 'graph' : 'agent';

    return {
      conversation_id: conversationId,
      title,
      rounds: [],
      type: conversationType
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
    setCurrentMode('agent');
  }, [closeConnection, clearCurrentConversation, setCurrentMode, navigate]);

  // 当对话加载完成后，根据对话类型设置正确的模式（不可变）
  useEffect(() => {
    if (currentConversation && !temporaryConversation) {
      // 根据对话的type设置模式
      if (currentConversation.type === 'graph') {
        setCurrentMode('graph');
      } else if (currentConversation.type === 'agent') {
        setCurrentMode('agent');
      }

      // 从对话详情中恢复输入配置
      setInheritedConfig({
        selectedModel: currentConversation.input_config?.selected_model,
        selectedGraph: currentConversation.input_config?.selected_graph,
        systemPrompt: currentConversation.input_config?.system_prompt,
        selectedMCPServers: currentConversation.input_config?.selected_mcp_servers || [],
        selectedAgent: currentConversation.input_config?.selected_agent,
        selectedSystemTools: currentConversation.input_config?.selected_system_tools || [],
        maxIterations: currentConversation.input_config?.max_iterations
      });

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
  }, [currentConversation, setCurrentMode, temporaryConversation]);

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
      const isGraphMode = conversationMode === 'graph';

      // 记录选择的Graph名称
      if (isGraphMode && options.graph_name) {
        setSelectedGraphName(options.graph_name);
      }

      // 保存从新建对话界面继承的配置，确保所有参数都被保存
      setInheritedConfig({
        selectedModel: options.model_name || options.selectedModel,
        selectedGraph: options.graph_name,
        systemPrompt: options.system_prompt || options.systemPrompt,
        selectedMCPServers: options.mcp_servers || options.selectedMCPServers || [],
        selectedAgent: options.agent_name || null,
        selectedSystemTools: options.system_tools || [],
        maxIterations: options.max_iterations || null
      });

      // 立即设置活跃对话ID，界面立即切换到对话模式
      setActiveConversationId(conversationId);

      // 更新URL
      navigate(`/chat/${conversationId}`, { replace: true });

      // 创建临时对话数据结构
      const tempConversation = createTemporaryConversation(
        conversationId,
        '新对话',
        conversationMode
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
        // Agent 模式参数
        agent_name: options.agent_name,
        model_name: options.model_name || options.selectedModel,
        system_prompt: options.system_prompt || options.systemPrompt,
        mcp_servers: options.mcp_servers || options.selectedMCPServers || [],
        system_tools: options.system_tools || [],
        max_iterations: options.max_iterations,
        user_prompt: options.user_prompt || inputText,
        // Graph 模式参数
        graph_name: options.graph_name,
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
        onTitleUpdate: (titleData: { title?: string; tags?: string[]; conversation_id?: string }) => {
          // 实时更新标题和标签
          setTimeout(() => {
            if (titleData.title) {
              // 更新临时对话的标题
              setTemporaryConversation(prev => prev ? {
                ...prev,
                title: titleData.title!
              } : null);
              
              // 如果有当前对话，也更新它
              if (currentConversation && currentConversation.conversation_id === (titleData.conversation_id || actualConversationId)) {
                useConversationStore.getState().updateCurrentConversationTemporarily({
                  ...currentConversation,
                  title: titleData.title
                });
              }
            }
            
            // 静默更新对话列表以反映标题变化
            silentUpdateConversations();
          }, 0);
        },
        onComplete: async () => {
          // 异步执行状态更新，避免在渲染期间调用setState
          setTimeout(async () => {
            // 保存输入配置到后端
            try {
              const configToSave = {
                selected_model: options.model_name || options.selectedModel,
                selected_graph: options.graph_name,
                system_prompt: options.system_prompt || options.systemPrompt,
                selected_mcp_servers: options.mcp_servers || options.selectedMCPServers || [],
                selected_agent: options.agent_name || null,
                selected_system_tools: options.system_tools || [],
                max_iterations: options.max_iterations || null
              };
              await ConversationService.updateInputConfig(actualConversationId, configToSave);
            } catch (error) {
              console.error('保存输入配置失败:', error);
              // 不影响主流程，只记录错误
            }
            
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
  }, [currentMode, startConnection, loadConversationDetail, silentUpdateConversations, createTemporaryConversation, navigate]);

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
        conversationId: activeConversationId,
        // Agent 模式参数 - 支持配置覆盖和工具扩展
        agent_name: options.agent_name,
        model_name: options.model_name,
        system_prompt: options.system_prompt,
        mcp_servers: options.mcp_servers || [],
        system_tools: options.system_tools || [],
        max_iterations: options.max_iterations,
        user_prompt: messageText,
        // Graph 模式参数
        graph_name: options.graph_name,
        ...options,
        onTitleUpdate: (titleData: { title?: string; tags?: string[]; conversation_id?: string }) => {
          // 实时更新标题和标签
          setTimeout(() => {
            if (titleData.title && currentConversation) {
              // 更新当前对话的标题
              useConversationStore.getState().updateCurrentConversationTemporarily({
                ...currentConversation,
                title: titleData.title
              });
            }
            
            // 静默更新对话列表以反映标题变化
            silentUpdateConversations();
          }, 0);
        },
        onComplete: async () => {
          // 异步执行状态更新，避免在渲染期间调用setState
          setTimeout(async () => {
            // 保存输入配置到后端（如果有配置变更）
            try {
              const configToSave = {
                selected_model: options.model_name,
                selected_graph: options.graph_name,
                system_prompt: options.system_prompt,
                selected_mcp_servers: options.mcp_servers || [],
                selected_agent: options.agent_name || null,
                selected_system_tools: options.system_tools || [],
                max_iterations: options.max_iterations || null
              };
              // 只有当配置不为空时才保存
              if (Object.values(configToSave).some(v => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true))) {
                await ConversationService.updateInputConfig(activeConversationId, configToSave);
              }
            } catch (error) {
              console.error('保存输入配置失败:', error);
              // 不影响主流程，只记录错误
            }
            
            // 重新加载对话详情以获取最新内容，确保消息不会消失
            await loadConversationDetail(activeConversationId);
            // 清除待发送消息状态和临时对话
            setPendingUserMessage(null);
            setTemporaryConversation(null);
            // 保持 inheritedConfig 不变，让配置在整个对话期间持续有效
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
  }, [activeConversationId, currentMode, startConnection, handleStartConversation, loadConversationDetail, silentUpdateConversations]);

  // 处理压缩类型选择
  const handleCompactTypeSelect = useCallback((compactType: 'brutal' | 'precise') => {
    const displayConversation = getDisplayConversation();
    if (!activeConversationId || !displayConversation) {
      message.error('没有选中的对话');
      return;
    }

    // 压缩功能现在支持所有对话类型
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
        config.threshold
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
              <div style={{
                padding: '20px 32px',
                background: 'linear-gradient(to bottom, rgba(250, 248, 245, 0.95), rgba(245, 243, 240, 0.9))',
                borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
                boxShadow: '0 2px 8px rgba(139, 115, 85, 0.06), inset 0 -1px 0 rgba(255, 255, 255, 0.6)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative'
              }}>
                {/* 装饰性纸张纹理 */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '15%',
                  right: '15%',
                  height: '1px',
                  background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.2) 50%, transparent)'
                }} />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#2d2d2d',
                    letterSpacing: '0.5px'
                  }}>
                    {getDisplayTitle()}
                  </span>
                  {/* Graph模式显示选择的图名称 */}
                  {currentMode === 'graph' && selectedGraphName && (
                    <span style={{
                      fontSize: '14px',
                      color: 'rgba(45, 45, 45, 0.65)',
                      fontWeight: 'normal'
                    }}>
                      {' - '}
                      <span style={{ color: '#a0826d' }}>
                        {selectedGraphName}
                      </span>
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Language Switcher */}
                  <LanguageSwitcher />
                  
                  {/* Documents 按钮 */}
                  {displayConversation && (
                    <Tooltip title="查看对话文档">
                      <Button
                        type="text"
                        icon={<FileOutlined />}
                        size="small"
                        onClick={() => setDocumentsDrawerVisible(true)}
                        style={{
                          color: '#8b7355',
                          border: '1px solid rgba(139, 115, 85, 0.2)',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.6)',
                          padding: '4px 12px',
                          fontSize: '13px',
                          fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#a0826d';
                          e.currentTarget.style.borderColor = 'rgba(160, 130, 109, 0.3)';
                          e.currentTarget.style.background = 'rgba(160, 130, 109, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#8b7355';
                          e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                        }}
                      >
                        文档：{displayConversation.documents?.total_count || 0}
                      </Button>
                    </Tooltip>
                  )}
                  
                  {/* 压缩按钮 - 支持所有对话类型 */}
                  {displayConversation && (() => {
                    const isCurrentConversationCompacting = activeConversationId ? compactingConversations.has(activeConversationId) : false;
                    return (
                      <Dropdown
                        overlay={
                          <Menu onClick={({ key }) => handleCompactTypeSelect(key as 'brutal' | 'precise')}>
                            <Menu.Item key="precise">
                              <div>
                                <div>精确压缩</div>
                                <div style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>
                                  AI总结工具内容，保留完整对话结构
                                </div>
                              </div>
                            </Menu.Item>
                            <Menu.Item key="brutal">
                              <div>
                                <div>暴力压缩</div>
                                <div style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>
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
                            loading={isCurrentConversationCompacting}
                            disabled={isCurrentConversationCompacting}
                            style={{
                              color: isCurrentConversationCompacting ? 'rgba(45, 45, 45, 0.45)' : '#8b7355',
                              border: '1px solid rgba(139, 115, 85, 0.2)',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.6)',
                              padding: '4px 12px',
                              fontSize: '13px',
                              fontWeight: 500,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isCurrentConversationCompacting) {
                                e.currentTarget.style.color = '#b85845';
                                e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isCurrentConversationCompacting) {
                                e.currentTarget.style.color = '#8b7355';
                                e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                              }
                            }}
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
                key={displayConversation?.conversation_id || 'new'}
                conversation={displayConversation || {
                  conversation_id: activeConversationId || '',
                  title: '新对话',
                  rounds: [],
                  type: currentMode === 'graph' ? 'graph' : 'agent'
                }}
                enhancedStreamingState={enhancedStreamingState}
                pendingUserMessage={pendingUserMessage}
                currentMode={currentMode}
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

        {/* Documents 抽屉 */}
        {displayConversation && activeConversationId && (
          <DocumentsDrawer
            visible={documentsDrawerVisible}
            conversationId={activeConversationId}
            documents={displayConversation.documents}
            onClose={() => setDocumentsDrawerVisible(false)}
            onDocumentClick={(filename) => {
              setSelectedFilename(filename);
              setFileViewModalVisible(true);
            }}
          />
        )}

        {/* 文件查看模态框 */}
        {activeConversationId && (
          <FileViewModal
            visible={fileViewModalVisible}
            filename={selectedFilename}
            conversationId={activeConversationId}
            onClose={() => {
              setFileViewModalVisible(false);
              setSelectedFilename(null);
            }}
            onSave={() => {
              // 文件保存后重新加载对话详情以更新文档列表
              loadConversationDetail(activeConversationId);
            }}
            onDelete={() => {
              // 文件删除后重新加载对话详情以更新文档列表
              loadConversationDetail(activeConversationId);
            }}
          />
        )}

      </div>
    </div>
  );
};

export default ChatSystem;