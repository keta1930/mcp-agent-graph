// src/components/chat/message/MessageDisplay.tsx
import React from 'react';
import { Typography, Tag, Space } from 'antd';
import './MessageDisplay.css';
import { ConversationDetail, EnhancedStreamingState, StreamingBlock, TaskBlock as TaskBlockType } from '../../../types/conversation';
import TaskBlock from './TaskBlock';
import MessageItem from './MessageItem';
import NodeExecutionInfo from './NodeExecutionInfo';
import StreamingBlockDisplay from './StreamingBlockDisplay';
import { buildToolResultsMap, buildTaskRoundDataMap } from './messageUtils';
import { useT } from '../../../i18n/hooks';

const { Text, Paragraph } = Typography;

interface MessageDisplayProps {
  conversation: ConversationDetail;
  enhancedStreamingState?: EnhancedStreamingState;
  pendingUserMessage?: string | null;
  currentMode?: string;
  agentType?: string;
}

/**
 * 消息显示主组件
 * 负责渲染对话历史和流式消息
 */
const MessageDisplay: React.FC<MessageDisplayProps> = React.memo(({
  conversation,
  enhancedStreamingState,
  pendingUserMessage,
  currentMode,
  agentType
}) => {
  const t = useT();

  // 根据前端当前模式确定渲染模式
  const getRenderingMode = (): 'agent' | 'graph' => {
    if (currentMode === 'agent') {
      return 'agent';
    } else if (currentMode === 'graph') {
      return 'graph';
    }

    if (conversation.type === 'agent') {
      return 'agent';
    } else if (conversation.type === 'graph') {
      return 'graph';
    }

    return 'agent';
  };

  const renderingMode = getRenderingMode();

  // 容错处理：确保conversation存在
  if (!conversation) {
    return (
      <div className="message-display">
        <div className="messages-container">
          {pendingUserMessage && (
            <div className="pending-user-message">
              <MessageItem
                message={{
                  role: 'user',
                  content: pendingUserMessage
                }}
                isFirstMessageInRound={true}
                renderingMode={renderingMode}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const isGraphExecution = renderingMode === 'graph';
  const toolResults = buildToolResultsMap(conversation.rounds || []);
  const taskRoundDataMap = buildTaskRoundDataMap(conversation.tasks);

  // 调试日志
  if (conversation.tasks && conversation.tasks.length > 0) {
    console.log('📋 Tasks 数据:', conversation.tasks);
    console.log('🔗 Task Round 数据映射:', taskRoundDataMap);
  }

  // 渲染Graph执行模式的round
  const renderGraphRound = (round: any, roundIndex: number) => {
    const nodeInfo = {
      nodeName: round.node_name || `节点${roundIndex + 1}`,
      level: round.level || 0,
      outputEnabled: round.output_enabled,
      mcpServers: round.mcp_servers,
      status: 'completed' as const
    };

    const isStartNode = nodeInfo.nodeName === 'start';
    const userMessages = round.messages?.filter((msg: any) => msg.role === 'user') || [];
    const nonUserMessages = round.messages?.filter((msg: any) => msg.role !== 'user') || [];

    return (
      <div key={roundIndex} className="node-round">
        {isStartNode && userMessages.length > 0 ? (
          userMessages.map((message: any, msgIndex: number) => (
            <MessageItem
              key={`${roundIndex}-user-${msgIndex}`}
              message={message}
              toolResults={toolResults}
              taskRoundDataMap={taskRoundDataMap}
              nodeInfo={nodeInfo}
              isGraphMode={true}
              renderingMode={renderingMode}
              conversationId={conversation?.conversation_id}
            />
          ))
        ) : (
          <NodeExecutionInfo {...nodeInfo} />
        )}

        {nonUserMessages.map((message: any, msgIndex: number) => (
          <MessageItem
            key={`${roundIndex}-${msgIndex}`}
            message={message}
            toolResults={toolResults}
            taskRoundDataMap={taskRoundDataMap}
            nodeInfo={undefined}
            isGraphMode={true}
            renderingMode={renderingMode}
            conversationId={conversation?.conversation_id}
          />
        ))}
      </div>
    );
  };

  // 渲染Chat/Agent模式的round
  const renderChatRound = (round: any, roundIndex: number) => {
    return (
      <div key={roundIndex} className="conversation-round">
        {round.messages?.map((message: any, msgIndex: number) => {
          const isFirstMessageOfRole = round.messages
            ? round.messages.findIndex((msg: any) =>
                msg.role === message.role && msg.role !== 'system' && msg.role !== 'tool'
              ) === msgIndex
            : false;

          return (
            <MessageItem
              key={`${roundIndex}-${msgIndex}`}
              message={message}
              toolResults={toolResults}
              taskRoundDataMap={taskRoundDataMap}
              isFirstMessageInRound={isFirstMessageOfRole}
              renderingMode={renderingMode}
              conversationId={conversation?.conversation_id}
            />
          );
        })}

        {/* Agent 元信息展示 */}
        {renderingMode === 'agent' && (round.agent_name || round.model || round.prompt_tokens !== undefined) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '12px',
            flexWrap: 'wrap'
          }}>
            {round.agent_name && (
              <Tag style={{
                background: 'rgba(184, 88, 69, 0.08)',
                color: '#b85845',
                border: '1px solid rgba(184, 88, 69, 0.2)',
                borderRadius: '6px',
                fontWeight: 500,
                padding: '4px 12px',
                fontSize: '12px',
                margin: 0
              }}>
                Agent: {round.agent_name}
              </Tag>
            )}
            {round.model && (
              <Tag style={{
                background: 'rgba(160, 130, 109, 0.08)',
                color: '#a0826d',
                border: '1px solid rgba(160, 130, 109, 0.2)',
                borderRadius: '6px',
                fontWeight: 500,
                padding: '4px 12px',
                fontSize: '12px',
                margin: 0
              }}>
                Model: {round.model}
              </Tag>
            )}
            {round.prompt_tokens !== undefined && round.completion_tokens !== undefined && (
              <Tag style={{
                background: 'rgba(139, 115, 85, 0.08)',
                color: '#8b7355',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                borderRadius: '6px',
                fontWeight: 500,
                padding: '4px 12px',
                fontSize: '12px',
                margin: 0
              }}>
                Tokens: {round.prompt_tokens} / {round.completion_tokens}
              </Tag>
            )}
          </div>
        )}
      </div>
    );
  };

  // 渲染流式消息
  const renderStreamingMessage = () => {
    if (!enhancedStreamingState || !enhancedStreamingState.isStreaming) {
      return null;
    }

    return (
      <div style={{
        marginBottom: '24px',
        color: '#2d2d2d',
        lineHeight: '1.7',
        fontSize: '16px',
        letterSpacing: '0.3px',
        fontFamily: "Cambria, Georgia, 'Times New Roman', serif, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif"
      }}>
        {/* 呼吸灯指示器 */}
        {renderingMode !== 'graph' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px',
            gap: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#b85845',
              boxShadow: '0 0 0 0 rgba(184, 88, 69, 0.4)',
              animation: 'inkDotPulse 2s ease-in-out infinite'
            }} />
            <span style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'rgba(45, 45, 45, 0.65)',
              letterSpacing: '0.3px'
            }}>
              {renderingMode === 'agent' ? 'Agent' : 'Assistant'}
            </span>
          </div>
        )}

        {/* 分块内容 */}
        {enhancedStreamingState.blocks.map((block: StreamingBlock) => {
          if (block.type === 'task') {
            const taskBlock = block as TaskBlockType;
            const taskBlocks = enhancedStreamingState.blocks.filter(
              (b: StreamingBlock) => b.taskId === taskBlock.taskId && b.type !== 'task'
            );

            return (
              <div key={block.id} className="streaming-block task-block">
                <TaskBlock
                  taskBlock={taskBlock}
                  blocks={taskBlocks}
                  renderingMode={renderingMode}
                  toolResults={toolResults}
                  conversationId={conversation?.conversation_id}
                />
              </div>
            );
          }

          if (block.taskId) {
            return null;
          }

          return (
            <div key={block.id} className={`streaming-block ${block.type}-block`}>
              <StreamingBlockDisplay
                block={block}
                renderingMode={renderingMode}
                toolResults={toolResults}
                conversationId={conversation?.conversation_id}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染Graph执行总结
  const renderGraphSummary = () => {
    if (!isGraphExecution || !conversation.execution_chain) {
      return null;
    }

    return (
      <div style={{
        marginBottom: '24px',
        padding: '20px 24px',
        background: 'rgba(255, 255, 255, 0.85)',
        border: '1px solid rgba(139, 115, 85, 0.15)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      }}>
        <div style={{
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(139, 115, 85, 0.1)',
        }}>
          <Text strong style={{
            fontSize: '16px',
            color: '#2d2d2d',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}>
            {t('pages.chatSystem.messageDisplay.executionSummary')}
          </Text>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Text style={{
            fontSize: '13px',
            color: 'rgba(45, 45, 45, 0.65)',
            fontWeight: 500,
            marginBottom: '8px',
            display: 'block',
          }}>
            {t('pages.chatSystem.messageDisplay.executionChain')}
          </Text>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {conversation.execution_chain.map((level, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                background: 'rgba(245, 243, 240, 0.6)',
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.1)',
              }}>
                <Tag style={{
                  background: 'rgba(160, 130, 109, 0.12)',
                  color: '#a0826d',
                  border: '1px solid rgba(160, 130, 109, 0.25)',
                  borderRadius: '6px',
                  fontWeight: 500,
                  padding: '4px 12px',
                  fontSize: '12px',
                  margin: 0,
                }}>
                  {t('pages.chatSystem.messageDisplay.level')} {index}
                </Tag>
                <Space wrap size={8}>
                  {level.map(nodeName => (
                    <Tag key={nodeName} style={{
                      background: 'rgba(184, 88, 69, 0.08)',
                      color: '#b85845',
                      border: '1px solid rgba(184, 88, 69, 0.2)',
                      borderRadius: '6px',
                      fontWeight: 500,
                      padding: '4px 10px',
                      fontSize: '12px',
                      margin: 0,
                    }}>
                      {nodeName}
                    </Tag>
                  ))}
                </Space>
              </div>
            ))}
          </div>
        </div>

        {conversation.final_result && (
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(139, 115, 85, 0.1)',
          }}>
            <Text style={{
              fontSize: '13px',
              color: 'rgba(45, 45, 45, 0.65)',
              fontWeight: 500,
              marginBottom: '8px',
              display: 'block',
            }}>
              {t('pages.chatSystem.messageDisplay.finalResult')}
            </Text>
            <Paragraph style={{
              margin: 0,
              padding: '12px 14px',
              background: 'rgba(245, 243, 240, 0.6)',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.1)',
              fontSize: '14px',
              color: '#2d2d2d',
              lineHeight: '1.7',
            }}>
              <Text>{conversation.final_result}</Text>
            </Paragraph>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="message-display" style={{
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(139, 115, 85, 0.3) transparent'
    }}>
      <div className="messages-container">
        {/* 渲染历史消息 */}
        {(conversation.rounds || []).map((round, roundIndex) => 
          isGraphExecution ? renderGraphRound(round, roundIndex) : renderChatRound(round, roundIndex)
        )}

        {/* 待发送的用户消息 */}
        {pendingUserMessage && !isGraphExecution && (
          <div className="pending-user-message">
            <MessageItem
              message={{
                role: 'user',
                content: pendingUserMessage
              }}
              taskRoundDataMap={taskRoundDataMap}
              isFirstMessageInRound={true}
              renderingMode={renderingMode}
              conversationId={conversation?.conversation_id}
            />
          </div>
        )}

        {/* 流式消息 */}
        {renderStreamingMessage()}

        {/* Graph执行总结 */}
        {renderGraphSummary()}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 性能优化：自定义比较逻辑
  if (prevProps.conversation?.conversation_id !== nextProps.conversation?.conversation_id) {
    return false;
  }

  const prevStreamingState = prevProps.enhancedStreamingState;
  const nextStreamingState = nextProps.enhancedStreamingState;

  if (prevStreamingState?.isStreaming !== nextStreamingState?.isStreaming) {
    return false;
  }

  if (prevStreamingState?.blocks?.length !== nextStreamingState?.blocks?.length) {
    return false;
  }

  if (prevStreamingState?.blocks && nextStreamingState?.blocks) {
    for (let i = 0; i < prevStreamingState.blocks.length; i++) {
      const prevBlock = prevStreamingState.blocks[i];
      const nextBlock = nextStreamingState.blocks[i];

      const prevToolCalls = prevBlock?.toolCalls || [];
      const nextToolCalls = nextBlock?.toolCalls || [];

      if (prevBlock?.content !== nextBlock?.content ||
          prevBlock?.isComplete !== nextBlock?.isComplete ||
          prevBlock?.id !== nextBlock?.id ||
          prevToolCalls.length !== nextToolCalls.length ||
          JSON.stringify(prevToolCalls) !== JSON.stringify(nextToolCalls)) {
        return false;
      }
    }
  }

  if (prevProps.pendingUserMessage !== nextProps.pendingUserMessage ||
      prevProps.currentMode !== nextProps.currentMode ||
      prevProps.agentType !== nextProps.agentType) {
    return false;
  }

  const prevRounds = prevProps.conversation?.rounds || [];
  const nextRounds = nextProps.conversation?.rounds || [];

  if (prevRounds.length !== nextRounds.length) {
    return false;
  }

  if (prevRounds.length > 0 && nextRounds.length > 0) {
    const prevLastRound = prevRounds[prevRounds.length - 1];
    const nextLastRound = nextRounds[nextRounds.length - 1];

    if (JSON.stringify(prevLastRound) !== JSON.stringify(nextLastRound)) {
      return false;
    }
  }

  return true;
});

export default MessageDisplay;
