// src/components/chat/message/MessageDisplay.tsx
import React, { useState, useEffect } from 'react';
import { Typography, Tag, Space, Tooltip, message } from 'antd';
import './MessageDisplay.css';
import {
  ToolOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CopyOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { Bot, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ConversationMessage, ConversationDetail, EnhancedStreamingState, StreamingBlock } from '../../../types/conversation';
import { getCurrentUserDisplayName } from '../../../config/user';
import AgentXMLRenderer from './AgentXMLRenderer';
import CodeBlockPreview from '../../common/CodeBlockPreview';

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
  isStreaming?: boolean;
  conversationId?: string;
}

const GlassCodeBlock: React.FC<CodeBlockProps> = ({
  language,
  children,
  className,
  isStreaming = false,
  conversationId
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      message.success('代码已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      message.error('复制失败');
    }
  };

  return (
    <div style={{
      margin: '12px 0',
      borderRadius: '6px',
      background: 'rgba(255, 255, 255, 0.85)',
      border: '1px solid rgba(139, 115, 85, 0.15)',
      boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
    }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          cursor: 'pointer',
          background: 'rgba(245, 243, 240, 0.6)',
          borderBottom: expanded ? '1px solid rgba(139, 115, 85, 0.15)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {expanded ? (
            <ChevronDown size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />
          ) : (
            <ChevronRight size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />
          )}
          <span style={{
            color: '#8b7355',
            fontWeight: 500,
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {language || 'text'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CodeBlockPreview
            language={language || 'text'}
            content={children}
            isStreaming={isStreaming}
            conversationId={conversationId}
          />
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            style={{
              padding: '4px',
              borderRadius: '4px',
              color: copied ? '#b85845' : '#8b7355',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: 'transparent'
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.color = '#b85845';
                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.color = '#8b7355';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {copied ? <CheckOutlined style={{ fontSize: '14px' }} /> : <CopyOutlined style={{ fontSize: '14px' }} />}
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{
          maxHeight: '400px',
          overflow: 'auto',
          // 滚动条样式
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139, 115, 85, 0.3) rgba(245, 243, 240, 0.6)'
        }} className="code-block-scrollbar">
          <SyntaxHighlighter
            language={language || 'text'}
            style={oneLight as any}
            PreTag="div"
            customStyle={{
              background: 'transparent',
              margin: 0,
              padding: '14px 16px',
              fontSize: '13px',
              lineHeight: '1.6',
              fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace"
            } as any}
          >
            {children}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
};


// 智能Markdown渲染器
interface SmartMarkdownProps {
  content: string;
  isStreaming?: boolean;
  conversationId?: string;
}

const SmartMarkdown: React.FC<SmartMarkdownProps> = ({
  content,
  isStreaming = false,
  conversationId
}) => {
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
    <div style={{
      fontFamily: "Cambria, Georgia, 'Times New Roman', serif, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif",
      fontSize: 'inherit'
    }}>
      <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, ...codeProps }) {
          const { children: codeChildren, className: codeClassName, ...restProps } = codeProps;
          const match = /language-(\w+)/.exec(codeClassName || '');
          const language = match ? match[1] : '';
          const inline = !match;

          return !inline ? (
            <GlassCodeBlock
              language={language}
              isStreaming={isStreaming}
              conversationId={conversationId}
            >
              {String(codeChildren).replace(/\n$/, '')}
            </GlassCodeBlock>
          ) : (
            <code style={{
              background: 'rgba(139, 115, 85, 0.08)',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '0.9em',
              fontFamily: "'SF Mono', monospace",
              color: '#b85845'
            }} {...restProps}>
              {codeChildren}
            </code>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
};

interface ToolCallDisplayProps {
  toolCall: any;
  result?: string;
}

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolCall, result }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      margin: '12px 0',
      borderRadius: '6px',
      background: 'rgba(255, 255, 255, 0.85)',
      border: '1px solid rgba(160, 130, 109, 0.2)',
      boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ToolOutlined style={{ color: '#a0826d', fontSize: '16px' }} />
          <Text strong style={{ color: '#2d2d2d', fontSize: '14px' }}>{toolCall.function?.name}</Text>
          <Tag style={{
            background: 'rgba(160, 130, 109, 0.08)',
            color: '#a0826d',
            border: '1px solid rgba(160, 130, 109, 0.2)',
            borderRadius: '6px',
            fontWeight: 500,
            padding: '2px 10px',
            fontSize: '12px'
          }}>
            工具调用
          </Tag>
        </div>
        {expanded ? (
          <ChevronDown size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
        ) : (
          <ChevronRight size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
        )}
      </div>

      {expanded && (
        <div style={{
          padding: '0 14px 12px',
          borderTop: '1px solid rgba(139, 115, 85, 0.15)',
          maxHeight: '400px',
          overflow: 'auto',
          // 滚动条样式
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139, 115, 85, 0.3) rgba(245, 243, 240, 0.6)'
        }} className="tool-call-scrollbar">
          <div style={{ marginTop: '12px' }}>
            <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '12px', fontWeight: 500 }}>参数</Text>
            <div style={{ marginTop: '8px' }}>
              <SyntaxHighlighter
                language="json"
                style={oneLight}
                customStyle={{
                  background: 'rgba(245, 243, 240, 0.6)',
                  padding: '10px 12px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid rgba(139, 115, 85, 0.1)'
                }}
              >
                {toolCall.function?.arguments || '{}'}
              </SyntaxHighlighter>
            </div>
          </div>

          {result && (
            <div style={{ marginTop: '12px' }}>
              <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '12px', fontWeight: 500 }}>结果</Text>
              <div style={{
                marginTop: '8px',
                padding: '10px 12px',
                background: 'rgba(245, 243, 240, 0.6)',
                borderRadius: '4px',
                border: '1px solid rgba(139, 115, 85, 0.1)'
              }}>
                <Text style={{ fontSize: '13px', color: '#2d2d2d', fontFamily: "'SF Mono', monospace" }}>{result}</Text>
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
    <div style={{
      margin: '12px 0',
      borderRadius: '6px',
      background: 'rgba(255, 255, 255, 0.85)',
      border: '1px solid rgba(184, 88, 69, 0.2)',
      boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bot size={16} strokeWidth={1.5} style={{ color: '#b85845' }} />
          <Text strong style={{ color: '#2d2d2d', fontSize: '14px' }}>AI思考过程</Text>
          <Tag style={{
            background: 'rgba(184, 88, 69, 0.08)',
            color: '#b85845',
            border: '1px solid rgba(184, 88, 69, 0.25)',
            borderRadius: '6px',
            fontWeight: 500,
            padding: '2px 10px',
            fontSize: '12px'
          }}>
            推理
          </Tag>
        </div>
        {expanded ? (
          <ChevronDown size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
        ) : (
          <ChevronRight size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
        )}
      </div>

      {expanded && (
        <div style={{
          padding: '0 14px 12px',
          borderTop: '1px solid rgba(139, 115, 85, 0.15)',
          maxHeight: '400px',
          overflow: 'auto',
          // 滚动条样式
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139, 115, 85, 0.3) rgba(245, 243, 240, 0.6)'
        }} className="reasoning-scrollbar">
          <div style={{ marginTop: '12px' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, ...codeProps }) {
                  const { children: codeChildren, className: codeClassName, ...restProps } = codeProps;
                  const match = /language-(\w+)/.exec(codeClassName || '');
                  const language = match ? match[1] : '';
                  const inline = !match;

                  return !inline ? (
                    <GlassCodeBlock language={language}>
                      {String(codeChildren).replace(/\n$/, '')}
                    </GlassCodeBlock>
                  ) : (
                    <code style={{
                      background: 'rgba(139, 115, 85, 0.08)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '0.9em',
                      fontFamily: "'SF Mono', monospace",
                      color: '#b85845'
                    }} {...restProps}>
                      {codeChildren}
                    </code>
                  );
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
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
        return '#b85845';
      case 'completed':
        return '#a0826d';
      case 'pending':
        return '#d4a574';
      default:
        return '#9ea19f';
    }
  };

  return (
    <div style={{
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: getStatusColor(),
            animation: status === 'running' ? 'pulse 2s ease-in-out infinite' : 'none'
          }} />
          {getStatusIcon()}
        </div>
        <div>
          <Text strong style={{ color: '#2d2d2d', fontSize: '14px' }}>节点: {nodeName}</Text>
          <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '13px', marginLeft: '6px' }}>(Level {level})</Text>
        </div>
      </div>

      {mcpServers && mcpServers.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Tooltip title={mcpServers.join(', ')}>
            <Tag style={{
              background: 'rgba(160, 130, 109, 0.08)',
              color: '#a0826d',
              border: '1px solid rgba(160, 130, 109, 0.2)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '2px 10px',
              fontSize: '12px'
            }}>
              MCP工具: {mcpServers.length}个
            </Tag>
          </Tooltip>
        </div>
      )}
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
  conversationId?: string; // 新增：对话ID
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showTyping = false,
  toolResults = {},
  nodeInfo,
  reasoningContent,
  isGraphMode = false,
  isFirstMessageInRound = false,
  renderingMode,
  conversationId
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
    <div style={{
      marginBottom: '24px',
      color: '#2d2d2d',
      lineHeight: '1.7',
      fontSize: '16px',
      letterSpacing: '0.3px',
      fontFamily: "Cambria, Georgia, 'Times New Roman', serif, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif"
    }}>
      {/* 呼吸灯指示器 - 改为墨点效果 */}
      {isFirstMessageInRound && renderingMode !== 'graph_run' && (
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
            background: isUser ? '#a0826d' : '#b85845',
            boxShadow: isUser 
              ? '0 0 0 0 rgba(160, 130, 109, 0.4)' 
              : '0 0 0 0 rgba(184, 88, 69, 0.4)',
            animation: 'inkDotPulse 2s ease-in-out infinite'
          }} />
          <span style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'rgba(45, 45, 45, 0.65)',
            letterSpacing: '0.3px'
          }}>
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
        <div style={isUser ? {
          background: 'rgba(212, 196, 176, 0.15)',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          borderRadius: '8px',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          maxHeight: '30rem',
          overflow: 'auto',
          // 滚动条样式
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139, 115, 85, 0.3) rgba(139, 115, 85, 0.08)'
        } : {}} className={isUser ? 'user-message-scrollbar' : ''}>
          <div>
            {/* AI思考过程优先显示 */}
            {effectiveReasoningContent && (
              <ReasoningDisplay content={effectiveReasoningContent} />
            )}

            {/* 主要消息内容 */}
            {message.content && (
              <div style={{
                color: '#2d2d2d',
                lineHeight: '1.7',
                fontSize: '16px',
                letterSpacing: '0.3px',
                fontFamily: "Cambria, Georgia, 'Times New Roman', serif, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif"
              }}>

                <div>
                  {showTyping ? (
                    <div>
                      {/* 流式消息根据渲染模式选择渲染器 */}
                      {!isUser && renderingMode === 'agent' ? (
                        <AgentXMLRenderer
                          content={message.content}
                          generationType="mcp" // Agent模式统一使用mcp类型，具体类型由内容决定
                          isStreaming={true}
                        />
                      ) : (
                        <SmartMarkdown
                          content={message.content}
                          isStreaming={true}
                          conversationId={conversationId}
                        />
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
                          code({ node, ...codeProps }) {
                            const { children: codeChildren, className: codeClassName, ...restProps } = codeProps;
                            const match = /language-(\w+)/.exec(codeClassName || '');
                            const language = match ? match[1] : '';
                            const inline = !match;

                            return !inline ? (
                              <GlassCodeBlock
                                language={language}
                                conversationId={conversationId}
                              >
                                {String(codeChildren).replace(/\n$/, '')}
                              </GlassCodeBlock>
                            ) : (
                              <code style={{
                                background: 'rgba(139, 115, 85, 0.08)',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '0.9em',
                                fontFamily: "'SF Mono', monospace",
                                color: '#b85845'
                              }} {...restProps}>
                                {codeChildren}
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
              <div style={{ marginTop: '12px' }}>
                {message.tool_calls.map((toolCall, index) => (
                  <ToolCallDisplay
                    key={toolCall.id || index}
                    toolCall={toolCall}
                    result={toolCall.id ? toolResults[toolCall.id] : undefined}
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
  conversationId?: string; // 新增：对话ID
}

const StreamingBlockDisplay: React.FC<StreamingBlockDisplayProps> = ({
  block,
  renderingMode,
  toolResults = {},
  conversationId
}) => {
  switch (block.type) {
    case 'reasoning':
      return <ReasoningDisplay content={block.content} />;

    case 'content':
      return (
        <div>
          <div style={{ position: 'relative' }}>
            {renderingMode === 'agent' ? (
              <AgentXMLRenderer
                content={block.content}
                generationType="mcp" // Agent模式统一使用mcp类型
                isStreaming={!block.isComplete}
              />
            ) : (
              <SmartMarkdown
                content={block.content}
                isStreaming={!block.isComplete}
                conversationId={conversationId}
              />
            )}
            {!block.isComplete && (
              <span style={{
                marginLeft: '2px',
                color: '#b85845',
                fontWeight: 'bold',
                animation: 'typingCursor 1s infinite'
              }}>▋</span>
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
              result={toolCall.id ? combinedToolResults[toolCall.id] : undefined}
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
              renderingMode={renderingMode}
            />
          </div>
        )}
      </div>
    </div>;
  }

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
    <div className="message-display" style={{
      // 滚动条样式
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(139, 115, 85, 0.3) transparent'
    }}>
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
                      conversationId={conversation?.conversation_id}
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
                    conversationId={conversation?.conversation_id}
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
                  conversationId={conversation?.conversation_id}
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
              conversationId={conversation?.conversation_id}
            />
          </div>
        )}

        {/* 流式消息显示 - 仅使用增强分块模式 */}
        {enhancedStreamingState && enhancedStreamingState.isStreaming && (
          <div style={{
            marginBottom: '24px',
            color: '#2d2d2d',
            lineHeight: '1.7',
            fontSize: '16px',
            letterSpacing: '0.3px',
            fontFamily: "Cambria, Georgia, 'Times New Roman', serif, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif"
          }}>
            {/* 呼吸灯指示器 - 在流式消息上方左对齐 */}
            {/* Graph执行模式不显示呼吸灯，因为有独立的节点信息显示 */}
            {renderingMode !== 'graph_run' && (
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
            {enhancedStreamingState.blocks.map((block: StreamingBlock) => (
              <div key={block.id} className={`streaming-block ${block.type}-block`}>
                <StreamingBlockDisplay
                  block={block}
                  renderingMode={renderingMode}
                  toolResults={toolResults}
                  conversationId={conversation?.conversation_id}
                />
              </div>
            ))}
          </div>
        )}

        {/* Graph执行的总结信息 */}
        {isGraphExecution && conversation.execution_chain && (
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
              }}>执行总结</Text>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Text style={{
                fontSize: '13px',
                color: 'rgba(45, 45, 45, 0.65)',
                fontWeight: 500,
                marginBottom: '8px',
                display: 'block',
              }}>执行链:</Text>
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
                    }}>Level {index}</Tag>
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
                        }}>{nodeName}</Tag>
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
                }}>最终结果:</Text>
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