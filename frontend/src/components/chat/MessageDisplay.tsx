// src/components/chat/MessageDisplay.tsx
import React, { useState, useEffect } from 'react';
import { Typography, Tag, Button, Space, Tooltip, message } from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  ToolOutlined,
  DownOutlined,
  RightOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CopyOutlined,
  CheckOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ConversationMessage, ConversationDetail, EnhancedStreamingState, StreamingBlock } from '../../types/conversation';
import { getCurrentUserDisplayName } from '../../config/user';
import AgentXMLRenderer from './AgentXMLRenderer';

const { Text, Paragraph } = Typography;

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 20,
  onComplete
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return <span>{displayedText}</span>;
};

// 代码块复制功能组件
interface CodeBlockProps {
  language?: string;
  children: string;
  className?: string;
}

const GlassCodeBlock: React.FC<CodeBlockProps> = ({ language, children, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      message.success('代码已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      message.error('复制失败');
    }
  };

  return (
    <div className="glass-code-block">
      <div className="code-header">
        <span className="code-language">{language || 'text'}</span>
        <Button
          type="text"
          size="small"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopy}
          className="copy-button"
        />
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={tomorrow as any}
        PreTag="div"
        customStyle={{
          background: 'transparent',
          margin: 0,
          padding: '12px 16px',
          fontSize: '13px',
          lineHeight: '1.5'
        } as any}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};


// 智能Markdown渲染器
interface SmartMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

const SmartMarkdown: React.FC<SmartMarkdownProps> = ({ content, isStreaming = false }) => {
  // 解析内容中的代码块状态
  const parseCodeBlocks = (text: string) => {
    const codeBlocks: { type: string; content: string; isComplete: boolean; startIndex: number; endIndex: number }[] = [];
    const lines = text.split('\n');
    let currentBlock: { type: string; content: string; startIndex: number } | null = null;
    let currentLineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const currentPos = currentLineIndex;
      currentLineIndex += line.length + 1; // +1 for newline

      if (line.startsWith('```')) {
        if (currentBlock) {
          // 结束当前代码块
          codeBlocks.push({
            type: currentBlock.type,
            content: currentBlock.content,
            isComplete: true,
            startIndex: currentBlock.startIndex,
            endIndex: currentPos + line.length
          });
          currentBlock = null;
        } else {
          // 开始新代码块
          const type = line.slice(3).trim() || 'text';
          currentBlock = {
            type,
            content: '',
            startIndex: currentPos
          };
        }
      } else if (currentBlock) {
        // 添加到当前代码块
        currentBlock.content += (currentBlock.content ? '\n' : '') + line;
      }
    }

    // 如果有未完成的代码块（流式输出中）
    if (currentBlock) {
      codeBlocks.push({
        type: currentBlock.type,
        content: currentBlock.content,
        isComplete: false,
        startIndex: currentBlock.startIndex,
        endIndex: text.length
      });
    }

    return codeBlocks;
  };


  // 使用常规渲染
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';


          return !inline && match ? (
            <GlassCodeBlock language={language} className={className}>
              {String(children).replace(/\n$/, '')}
            </GlassCodeBlock>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

interface ToolCallDisplayProps {
  toolCall: any;
  result?: string;
}

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolCall, result }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tool-call-container glass-card">
      <div
        className="tool-call-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="tool-call-info">
          <ToolOutlined className="tool-icon" />
          <Text strong>{toolCall.function?.name}</Text>
          <Tag color="blue">工具调用</Tag>
        </div>
        <Button
          type="text"
          size="small"
          icon={expanded ? <DownOutlined /> : <RightOutlined />}
        />
      </div>

      {expanded && (
        <div className="tool-call-details">
          <div className="tool-call-section">
            <Text type="secondary">参数:</Text>
            <div className="tool-call-arguments">
              <SyntaxHighlighter
                language="json"
                style={tomorrow}
                customStyle={{
                  background: 'transparent',
                  padding: '8px',
                  fontSize: '12px'
                }}
              >
                {toolCall.function?.arguments || '{}'}
              </SyntaxHighlighter>
            </div>
          </div>

          {result && (
            <div className="tool-call-section">
              <Text type="secondary">结果:</Text>
              <div className="tool-call-result">
                <Paragraph>
                  <Text code>{result}</Text>
                </Paragraph>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ReasoningDisplayProps {
  content: string;
}

const ReasoningDisplay: React.FC<ReasoningDisplayProps> = ({ content }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="reasoning-container glass-card">
      <div
        className="reasoning-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="reasoning-info">
          <RobotOutlined className="reasoning-icon" />
          <Text strong>AI思考过程</Text>
          <Tag color="purple">推理</Tag>
        </div>
        <Button
          type="text"
          size="small"
          icon={expanded ? <DownOutlined /> : <RightOutlined />}
        />
      </div>

      {expanded && (
        <div className="reasoning-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';


                return !inline && match ? (
                  <GlassCodeBlock language={language} className={className}>
                    {String(children).replace(/\n$/, '')}
                  </GlassCodeBlock>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

interface NodeExecutionInfoProps {
  nodeName: string;
  level: number;
  outputEnabled?: string;
  mcpServers?: string[];
  status: 'running' | 'completed' | 'pending';
}

const NodeExecutionInfo: React.FC<NodeExecutionInfoProps> = ({
  nodeName,
  level,
  outputEnabled,
  mcpServers,
  status
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <LoadingOutlined className="status-icon running" />;
      case 'completed':
        return <CheckCircleOutlined className="status-icon completed" />;
      case 'pending':
        return <PlayCircleOutlined className="status-icon pending" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return '#1890ff';
      case 'completed':
        return '#52c41a';
      case 'pending':
        return '#faad14';
      default:
        return '#d9d9d9';
    }
  };

  return (
    <div className="node-execution-info">
      <div className="node-header">
        <div className="node-status">
          <div
            className={`breathing-indicator ${status}`}
          />
          {getStatusIcon()}
        </div>
        <div className="node-details">
          <Text strong>节点: {nodeName}</Text>
          <Text type="secondary"> (Level {level})</Text>
        </div>
      </div>

      <div className="node-meta">
        {mcpServers && mcpServers.length > 0 && (
          <Tooltip title={mcpServers.join(', ')}>
            <Tag color="blue">
              MCP工具: {mcpServers.length}个
            </Tag>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

interface MessageItemProps {
  message: ConversationMessage;
  showTyping?: boolean;
  toolResults?: Record<string, string>;
  nodeInfo?: {
    nodeName: string;
    level: number;
    outputEnabled?: string;
    mcpServers?: string[];
    status: 'running' | 'completed' | 'pending';
  };
  reasoningContent?: string;
  isGraphMode?: boolean;
  isFirstMessageInRound?: boolean;
  renderingMode: 'chat' | 'agent' | 'graph_run'; // 新增：明确的渲染模式
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showTyping = false,
  toolResults = {},
  nodeInfo,
  reasoningContent,
  isGraphMode = false,
  isFirstMessageInRound = false,
  renderingMode
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';

  // 优先使用消息自带的reasoning_content，其次使用流式传入的reasoningContent
  const effectiveReasoningContent = (message as any).reasoning_content || reasoningContent;

  // 基础过滤：不显示系统消息和工具结果消息
  if (isSystem || isTool) {
    return null;
  }

  // Graph执行模式下的特殊处理：如果是用户消息且没有节点信息，则不显示
  if (renderingMode === 'graph_run' && isUser && !nodeInfo) {
    return null;
  }

  return (
    <div className={`message-item ${isUser ? 'user-message' : 'assistant-message'}`}>
      {/* 呼吸灯指示器 - 在每个round的第一条消息时显示在消息块上方左对齐 */}
      {/* Graph执行模式不显示呼吸灯，因为有独立的节点信息显示 */}
      {isFirstMessageInRound && renderingMode !== 'graph_run' && (
        <div className="message-breathing-indicator">
          <div
            className={`breathing-dot ${isUser ? 'user-indicator' : 'assistant-indicator'}`}
          />
          <span className="breathing-label">
            {isUser ? getCurrentUserDisplayName() : (renderingMode === 'agent' ? 'Agent' : 'Assistant')}
          </span>
        </div>
      )}

      {/* Graph执行模式的节点信息 */}
      {nodeInfo && (
        <NodeExecutionInfo {...nodeInfo} />
      )}

      {/* Graph执行模式下用户消息：只有start节点显示消息内容，其他节点不显示 */}
      {!(renderingMode === 'graph_run' && isUser && nodeInfo?.nodeName !== 'start') && (
        <div className="message-content">
          <div className="message-body">
            {/* AI思考过程优先显示 */}
            {effectiveReasoningContent && (
              <ReasoningDisplay content={effectiveReasoningContent} />
            )}

            {/* 主要消息内容 */}
            {message.content && (
              <div className="message-text">

                <div className="message-content-body">
                  {showTyping ? (
                    <div className="streaming-content">
                      {/* 流式消息根据渲染模式选择渲染器 */}
                      {!isUser && renderingMode === 'agent' ? (
                        <AgentXMLRenderer
                          content={message.content}
                          generationType="mcp" // Agent模式统一使用mcp类型，具体类型由内容决定
                          isStreaming={true}
                        />
                      ) : (
                        <SmartMarkdown content={message.content} isStreaming={true} />
                      )}
                    </div>
                  ) : (
                    // 根据渲染模式选择渲染器
                    !isUser && renderingMode === 'agent' ? (
                      <AgentXMLRenderer
                        content={message.content}
                        generationType="mcp" // Agent模式统一使用mcp类型，具体类型由内容决定
                      />
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';


                            return !inline && match ? (
                              <GlassCodeBlock language={language} className={className}>
                                {String(children).replace(/\n$/, '')}
                              </GlassCodeBlock>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )
                  )}
                </div>
              </div>
            )}

            {/* 工具调用 */}
            {message.tool_calls && message.tool_calls.length > 0 && (
              <div className="tool-calls">
                {message.tool_calls.map((toolCall, index) => (
                  <ToolCallDisplay
                    key={toolCall.id || index}
                    toolCall={toolCall}
                    result={toolResults[toolCall.id]}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 流式块渲染组件
interface StreamingBlockDisplayProps {
  block: StreamingBlock;
  renderingMode: 'chat' | 'agent' | 'graph_run'; // 新增：明确的渲染模式
  toolResults?: Record<string, string>;
}

const StreamingBlockDisplay: React.FC<StreamingBlockDisplayProps> = ({ block, renderingMode, toolResults = {} }) => {
  switch (block.type) {
    case 'reasoning':
      return <ReasoningDisplay content={block.content} />;

    case 'content':
      return (
        <div className="streaming-content-block">
          <div className={`message-content-body ${block.isComplete ? 'completed' : ''}`}>
            {renderingMode === 'agent' ? (
              <AgentXMLRenderer
                content={block.content}
                generationType="mcp" // Agent模式统一使用mcp类型
                isStreaming={!block.isComplete}
              />
            ) : (
              <SmartMarkdown content={block.content} isStreaming={!block.isComplete} />
            )}
          </div>
        </div>
      );

    case 'tool_calls':
      // 从块内容中解析工具结果
      let blockToolResults: Record<string, string> = {};
      try {
        if (block.content) {
          blockToolResults = JSON.parse(block.content);
        }
      } catch {
        // 解析失败时使用空对象
      }

      // 合并外部传入的工具结果和块内部的工具结果
      const combinedToolResults = { ...toolResults, ...blockToolResults };

      return (
        <div className="tool-calls-block">
          {block.toolCalls?.map((toolCall: any, index: number) => (
            <ToolCallDisplay
              key={toolCall.id || index}
              toolCall={toolCall}
              result={combinedToolResults[toolCall.id]}
            />
          ))}
        </div>
      );

    case 'node_start':
      // 渲染节点信息
      if (block.nodeInfo) {
        return (
          <NodeExecutionInfo
            nodeName={block.nodeInfo.nodeName}
            level={block.nodeInfo.level}
            status={block.nodeInfo.status}
          />
        );
      }
      return null;

    default:
      return null;
  }
};

interface MessageDisplayProps {
  conversation: ConversationDetail;
  enhancedStreamingState?: EnhancedStreamingState;
  pendingUserMessage?: string | null;
  currentMode?: string;
  agentType?: string;
}

const MessageDisplay: React.FC<MessageDisplayProps> = React.memo(({
  conversation,
  enhancedStreamingState,
  pendingUserMessage,
  currentMode,
  agentType
}) => {
  // 容错处理：确保conversation存在
  if (!conversation) {
    return <div className="message-display">
      <div className="messages-container">
        {pendingUserMessage && (
          <div className="pending-user-message">
            <MessageItem
              message={{
                role: 'user',
                content: pendingUserMessage
              }}
              isFirstMessageInRound={true}
              renderingMode={getRenderingMode()}
            />
          </div>
        )}
      </div>
    </div>;
  }

  // 根据前端当前模式确定渲染模式，不依赖后端数据
  const getRenderingMode = (): 'chat' | 'agent' | 'graph_run' => {
    // 优先使用当前对话模式
    if (currentMode === 'chat') {
      return 'chat';
    } else if (currentMode === 'agent') {
      return 'agent';
    } else if (currentMode === 'graph') {
      return 'graph_run';
    }

    // 备用：根据后端数据推断（向后兼容）
    if (conversation.generation_type === 'chat') {
      return 'chat';
    } else if (conversation.generation_type === 'mcp' || conversation.generation_type === 'graph') {
      return 'agent';
    } else if (conversation.generation_type === 'graph_run') {
      return 'graph_run';
    }

    // 最终默认值
    return 'chat';
  };

  const renderingMode = getRenderingMode();

  // 根据generation_type决定消息显示方式
  const isGraphExecution = renderingMode === 'graph_run';

  // 构建工具调用结果映射
  const buildToolResultsMap = (rounds: any[]) => {
    const toolResults: Record<string, string> = {};

    if (Array.isArray(rounds)) {
      rounds.forEach(round => {
        if (round && round.messages && Array.isArray(round.messages)) {
          round.messages.forEach((msg: ConversationMessage) => {
            if (msg && msg.role === 'tool' && msg.tool_call_id) {
              toolResults[msg.tool_call_id] = msg.content || '';
            }
          });
        }
      });
    }

    return toolResults;
  };

  const toolResults = buildToolResultsMap(conversation.rounds || []);

  return (
    <div className="message-display">
      <div className="messages-container">
        {(conversation.rounds || []).map((round, roundIndex) => {
          if (isGraphExecution) {
            // Graph执行模式：每个round是一个节点
            const nodeInfo = {
              nodeName: round.node_name || `节点${roundIndex + 1}`,
              level: round.level || 0,
              outputEnabled: round.output_enabled,
              mcpServers: round.mcp_servers,
              status: 'completed' as const
            };

            // 特殊处理start节点：用户消息应该显示在节点信息内部
            const isStartNode = nodeInfo.nodeName === 'start';
            const userMessages = round.messages?.filter(msg => msg.role === 'user') || [];
            const nonUserMessages = round.messages?.filter(msg => msg.role !== 'user') || [];

            return (
              <div key={roundIndex} className="node-round">
                {/* 节点信息显示 */}
                {isStartNode && userMessages.length > 0 ? (
                  // start节点：将用户消息与节点信息结合显示
                  userMessages.map((message, msgIndex) => (
                    <MessageItem
                      key={`${roundIndex}-user-${msgIndex}`}
                      message={message}
                      toolResults={toolResults}
                      nodeInfo={nodeInfo}  // start节点的用户消息显示节点信息
                      isGraphMode={true}
                      renderingMode={renderingMode}
                    />
                  ))
                ) : (
                  // 非start节点或没有用户消息：独立显示节点信息
                  <NodeExecutionInfo {...nodeInfo} />
                )}

                {/* 显示非用户消息（assistant消息等） */}
                {nonUserMessages.map((message, msgIndex) => (
                  <MessageItem
                    key={`${roundIndex}-${msgIndex}`}
                    message={message}
                    toolResults={toolResults}
                    nodeInfo={undefined}  // 节点信息已处理，不再在这里显示
                    isGraphMode={true}
                    renderingMode={renderingMode}
                  />
                ))}
              </div>
            );
          } else {
            // Chat模式和Agent模式：正常的消息显示
            return round.messages?.map((message, msgIndex) => {
              // 判断是否是该角色在这个round中的第一条消息
              const isFirstMessageOfRole = round.messages
                ? round.messages.findIndex((msg: ConversationMessage) =>
                    msg.role === message.role && msg.role !== 'system' && msg.role !== 'tool'
                  ) === msgIndex
                : false;

              return (
                <MessageItem
                  key={`${roundIndex}-${msgIndex}`}
                  message={message}
                  toolResults={toolResults}
                  isFirstMessageInRound={isFirstMessageOfRole}
                  renderingMode={renderingMode}
                />
              );
            });
          }
        })}

        {/* 待发送的用户消息显示 */}
        {/* Graph执行模式下不显示待发送的用户消息，等待start节点来显示 */}
        {pendingUserMessage && !isGraphExecution && (
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

        {/* 流式消息显示 - 仅使用增强分块模式 */}
        {enhancedStreamingState && enhancedStreamingState.isStreaming && (
          <div className="enhanced-streaming-message">
            {/* 呼吸灯指示器 - 在流式消息上方左对齐 */}
            {/* Graph执行模式不显示呼吸灯，因为有独立的节点信息显示 */}
            {renderingMode !== 'graph_run' && (
              <div className="message-breathing-indicator">
                <div className="breathing-dot assistant-indicator" />
                <span className="breathing-label">
                  {renderingMode === 'agent' ? 'Agent' : 'Assistant'}
                </span>
              </div>
            )}

            {/* 分块内容 */}
            {enhancedStreamingState.blocks.map((block: StreamingBlock) => (
              <div key={block.id} className={`streaming-block ${block.type}-block`}>
                <StreamingBlockDisplay
                  block={block}
                  renderingMode={renderingMode}
                  toolResults={toolResults}
                />
              </div>
            ))}
          </div>
        )}

        {/* Graph执行的总结信息 */}
        {isGraphExecution && conversation.execution_chain && (
          <div className="execution-summary glass-card">
            <div className="summary-header">
              <Text strong>执行总结</Text>
            </div>

            <div className="execution-chain">
              <Text type="secondary">执行链:</Text>
              <div className="chain-visualization">
                {conversation.execution_chain.map((level, index) => (
                  <div key={index} className="chain-level">
                    <Tag color="blue">Level {index}</Tag>
                    <Space wrap>
                      {level.map(nodeName => (
                        <Tag key={nodeName}>{nodeName}</Tag>
                      ))}
                    </Space>
                  </div>
                ))}
              </div>
            </div>

            {conversation.final_result && (
              <div className="final-result">
                <Text type="secondary">最终结果:</Text>
                <Paragraph>
                  <Text>{conversation.final_result}</Text>
                </Paragraph>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 如果对话ID不同，需要重新渲染
  if (prevProps.conversation?.conversation_id !== nextProps.conversation?.conversation_id) {
    return false;
  }

  // 如果流式状态发生变化，需要重新渲染
  const prevStreamingState = prevProps.enhancedStreamingState;
  const nextStreamingState = nextProps.enhancedStreamingState;

  if (prevStreamingState?.isStreaming !== nextStreamingState?.isStreaming) {
    return false;
  }

  // 检查流式blocks是否发生变化
  if (prevStreamingState?.blocks?.length !== nextStreamingState?.blocks?.length) {
    return false;
  }

  // 如果有任何流式blocks，检查它们的内容是否发生变化
  if (prevStreamingState?.blocks && nextStreamingState?.blocks) {
    for (let i = 0; i < prevStreamingState.blocks.length; i++) {
      const prevBlock = prevStreamingState.blocks[i];
      const nextBlock = nextStreamingState.blocks[i];

      if (prevBlock?.content !== nextBlock?.content ||
          prevBlock?.isComplete !== nextBlock?.isComplete ||
          prevBlock?.id !== nextBlock?.id) {
        return false;
      }
    }
  }

  // 检查其他关键属性
  if (prevProps.pendingUserMessage !== nextProps.pendingUserMessage ||
      prevProps.currentMode !== nextProps.currentMode ||
      prevProps.agentType !== nextProps.agentType) {
    return false;
  }

  // 简化对话内容比较 - 只比较rounds长度和最后一轮
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

  // 所有检查都通过，不需要重新渲染
  return true;
});

export default MessageDisplay;