// src/pages/ChatSystem.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { message, Button, Dropdown, Menu, Tooltip } from 'antd';
import { CompressOutlined, DownOutlined } from '@ant-design/icons';
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
import { ConversationService } from '../services/conversationService';
import { ConversationMode } from '../types/conversation';
import { getCurrentUserId } from '../config/user';
import '../styles/chat-system.css';

const ChatSystem: React.FC = () => {
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  // 用于处理正在进行的对话，避免全局状态泄露
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  // 压缩相关状态
  const [compactConfigVisible, setCompactConfigVisible] = useState(false);
  const [selectedCompactType, setSelectedCompactType] = useState<'brutal' | 'precise'>('precise');
  // 使用Set来跟踪正在压缩的对话ID，这样每个对话都有独立的压缩状态
  const [compactingConversations, setCompactingConversations] = useState<Set<string>>(new Set());
  // 用于强制重新渲染MessageDisplay组件当用户名更新时
  const [userNameUpdateTrigger, setUserNameUpdateTrigger] = useState(0);
  
  const {
    currentConversation,
    currentMode,
    agentType,
    sidebarCollapsed,
    loadConversationDetail,
    clearCurrentConversation,
    setCurrentMode,
    updateCurrentConversationTemporarily
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

  // 处理对话选择
  const handleConversationSelect = useCallback(async (conversationId: string) => {
    if (conversationId === activeConversationId) return;
    
    // 停止当前的SSE连接
    closeConnection();
    
    // 清除待发送消息状态
    setPendingUserMessage(null);
    
    // 清除当前对话
    clearCurrentConversation();
    
    // 加载新对话
    setActiveConversationId(conversationId);
    await loadConversationDetail(conversationId);
    
    // 需要等待对话加载完成后根据对话类型设置模式
    // 这个逻辑应该在对话加载完成后的useEffect中处理
  }, [activeConversationId, closeConnection, clearCurrentConversation, loadConversationDetail]);

  // 当对话加载完成后，根据对话类型设置正确的模式和agentType（不可变）
  useEffect(() => {
    if (currentConversation) {
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
    }
  }, [currentConversation, setCurrentMode, currentMode, agentType]);

  // 处理模式选择
  const handleModeSelect = useCallback((mode: ConversationMode) => {
    setCurrentMode(mode);
    // 清除当前对话，准备开始新对话
    clearCurrentConversation();
    setActiveConversationId(undefined);
    // 清除待发送消息状态
    setPendingUserMessage(null);
  }, [setCurrentMode, clearCurrentConversation]);

  // 开始新对话
  const handleStartConversation = useCallback(async (inputText: string, options: any = {}) => {
    try {
      const conversationId = await startConnection(inputText, {
        mode: options.mode || currentMode,
        agentType: currentMode === 'agent' ? agentType : undefined,
        model_name: options.selectedModel || 'gpt-4',
        graph_name: options.selectedGraph,
        mcp_servers: options.selectedMCPServers || [],
        system_prompt: options.systemPrompt,
        user_prompt: options.userPrompt,
        onComplete: () => {
          // 对话完成后重新加载对话列表
          message.success('对话完成');
        },
        onError: (error) => {
          message.error(`连接错误: ${error}`);
        }
      });
      
      setActiveConversationId(conversationId);
    } catch (error) {
      console.error('启动对话失败:', error);
      message.error('启动对话失败');
    }
  }, [currentMode, agentType, startConnection]);

  // 发送消息
  const handleSendMessage = useCallback(async (messageText: string, options: any = {}) => {
    if (!activeConversationId) {
      // 如果没有活跃对话，开始新对话
      await handleStartConversation(messageText);
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
        onComplete: () => {
          // 清除待发送消息状态
          setPendingUserMessage(null);
          // 消息发送完成，重新加载对话详情以获取最新数据
          if (activeConversationId) {
            loadConversationDetail(activeConversationId);
          }
        },
        onError: (error) => {
          message.error(`发送失败: ${error}`);
          // 清除待发送消息状态
          setPendingUserMessage(null);
          // 出错时也重新加载对话以恢复正确状态
          if (activeConversationId) {
            loadConversationDetail(activeConversationId);
          }
        }
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败');
      // 清除待发送消息状态
      setPendingUserMessage(null);
    }
  }, [activeConversationId, currentMode, startConnection, handleStartConversation, loadConversationDetail]);

  // 处理压缩类型选择
  const handleCompactTypeSelect = useCallback((compactType: 'brutal' | 'precise') => {
    if (!activeConversationId || !currentConversation) {
      message.error('没有选中的对话');
      return;
    }

    if (currentConversation.generation_type !== 'chat') {
      message.error('只有Chat模式的对话支持压缩');
      return;
    }

    setSelectedCompactType(compactType);
    setCompactConfigVisible(true);
  }, [activeConversationId, currentConversation]);

  // 执行对话压缩
  const handleCompactConfirm = useCallback(async (config: { modelName: string; compactType: 'brutal' | 'precise'; threshold: number }) => {
    if (!activeConversationId || !currentConversation) {
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
          `"${currentConversation.title}" 压缩完成`,
          undefined, // 不显示详细信息
          4000
        );
        // 重新加载对话详情以获取压缩后的内容
        await loadConversationDetail(activeConversationId);
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
  }, [activeConversationId, currentConversation, loadConversationDetail]);

  // 获取主对话区域的样式
  const getMainAreaStyle = () => {
    return 'main-conversation-area';
  };

  // 处理用户名更新
  const handleUserNameUpdate = useCallback(() => {
    setUserNameUpdateTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="chat-system-page">
      <div className="chat-system-layout">
        {/* 左侧边栏 */}
        <ConversationSidebar
          onConversationSelect={handleConversationSelect}
          activeConversationId={activeConversationId}
          onUserNameUpdate={handleUserNameUpdate}
        />

        {/* 主对话区域 */}
        <div className={getMainAreaStyle()}>
          {!currentConversation ? (
            /* 无对话时显示模式选择器 */
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
                  {currentConversation.title}
                </div>
                <div className="conversation-actions">
                  {/* Chat模式的压缩按钮 */}
                  {currentConversation.generation_type === 'chat' && (() => {
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
                key={userNameUpdateTrigger} 
                conversation={currentConversation}
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
