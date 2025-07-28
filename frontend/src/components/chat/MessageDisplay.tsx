// src/components/chat/MessageDisplay.tsx
import React, { useState, useEffect } from 'react';
import { Card, Typography, Tag, Collapse, Button, Space, Tooltip } from 'antd';
import { 
  UserOutlined, 
  RobotOutlined, 
  ToolOutlined,
  DownOutlined,
  RightOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ConversationMessage, ConversationDetail, EnhancedStreamingState, StreamingBlock } from '../../types/conversation';
import { getCurrentUserDisplayName } from '../../config/user';
import AgentXMLRenderer from './AgentXMLRenderer';
import mermaid from 'mermaid';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

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

// Mermaid图表组件
interface MermaidChartProps {
  chart: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        // 初始化mermaid
        mermaid.initialize({ 
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });
        
        // 生成唯一ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 渲染图表
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError('');
      } catch (err) {
        console.error('Mermaid渲染错误:', err);
        setError('图表渲染失败');
        setSvg('');
      }
    };

    if (chart.trim()) {
      renderMermaid();
    }
  }, [chart]);

  if (error) {
    return (
      <div className="mermaid-error" style={{ 
        background: '#fff2f0', 
        border: '1px solid #ffccc7', 
        borderRadius: '6px', 
        padding: '12px',
        color: '#cf1322'
      }}>
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-loading" style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: '#666' 
      }}>
        渲染图表中...
      </div>
    );
  }

  return (
    <div 
      className="mermaid-chart" 
      style={{ 
        textAlign: 'center', 
        background: '#fafafa', 
        borderRadius: '6px', 
        padding: '16px',
        overflow: 'auto'
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
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
          <Tag color="blue" size="small">工具调用</Tag>
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
          <Tag color="purple" size="small">推理</Tag>
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
                
                // 处理Mermaid图表
                if (language === 'mermaid') {
                  return <MermaidChart chart={String(children)} />;
                }
                
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow}
                    language={language}
                    PreTag="div"
                    customStyle={{ background: 'transparent' }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
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
            className="breathing-indicator"
            style={{ backgroundColor: getStatusColor() }}
          />
          {getStatusIcon()}
        </div>
        <div className="node-details">
          <Text strong>节点: {nodeName}</Text>
          <Text type="secondary"> (Level {level})</Text>
        </div>
      </div>
      
      <div className="node-meta">
        {outputEnabled && (
          <Tag size="small">输出: {outputEnabled}</Tag>
        )}
        {mcpServers && mcpServers.length > 0 && (
          <Tooltip title={mcpServers.join(', ')}>
            <Tag size="small" color="blue">
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
  generationType?: string;
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  showTyping = false,
  toolResults = {},
  nodeInfo,
  reasoningContent,
  isGraphMode = false,
  isFirstMessageInRound = false,
  generationType
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';
  
  // 优先使用消息自带的reasoning_content，其次使用流式传入的reasoningContent
  const effectiveReasoningContent = message.reasoning_content || reasoningContent;
  
  // 基础过滤：不显示系统消息和工具结果消息
  if (isSystem || isTool) {
    return null;
  }

  // Graph模式下的特殊处理：如果是用户消息且没有节点信息，则不显示
  if (isGraphMode && isUser && !nodeInfo) {
    return null;
  }

  return (
    <div className={`message-item ${isUser ? 'user-message' : 'assistant-message'}`}>
      {/* 呼吸灯指示器 - 在每个round的第一条消息时显示在消息块上方左对齐 */}
      {isFirstMessageInRound && (
        <div className="message-breathing-indicator">
          <div 
            className={`breathing-dot ${isUser ? 'user-indicator' : 'assistant-indicator'}`}
          />
          <span className="breathing-label">
            {isUser ? getCurrentUserDisplayName() : (generationType === 'mcp' || generationType === 'graph' ? 'Agent' : 'Assistant')}
          </span>
        </div>
      )}

      {/* Graph模式的节点信息 */}
      {nodeInfo && (
        <NodeExecutionInfo {...nodeInfo} />
      )}

      {/* Graph模式下用户消息只显示节点信息，不显示消息内容 */}
      {!(isGraphMode && isUser) && (
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
                      {/* 流式消息也需要根据generationType选择渲染器 */}
                      {!isUser && (generationType === 'mcp' || generationType === 'graph') ? (
                        <AgentXMLRenderer 
                          content={message.content} 
                          generationType={generationType as 'mcp' | 'graph'} 
                        />
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              const language = match ? match[1] : '';
                              
                              // 处理Mermaid图表
                              if (language === 'mermaid') {
                                return <MermaidChart chart={String(children)} />;
                              }
                              
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={tomorrow}
                                  language={language}
                                  PreTag="div"
                                  customStyle={{ background: 'rgba(0,0,0,0.1)' }}
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
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
                      )}
                    </div>
                  ) : (
                    // Agent模式的特殊渲染
                    !isUser && (generationType === 'mcp' || generationType === 'graph') ? (
                      (() => {
                        console.log('Using AgentXMLRenderer:', { isUser, generationType, messageContent: message.content });
                        return (
                          <AgentXMLRenderer 
                            content={message.content} 
                            generationType={generationType as 'mcp' | 'graph'} 
                          />
                        );
                      })()
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : '';
                            
                            // 处理Mermaid图表
                            if (language === 'mermaid') {
                              return <MermaidChart chart={String(children)} />;
                            }
                            
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={tomorrow}
                                language={language}
                                PreTag="div"
                                customStyle={{ background: 'rgba(0,0,0,0.1)' }}
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
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
  generationType?: string;
  toolResults?: Record<string, string>;
}

const StreamingBlockDisplay: React.FC<StreamingBlockDisplayProps> = ({ block, generationType, toolResults = {} }) => {
  switch (block.type) {
    case 'reasoning':
      return <ReasoningDisplay content={block.content} />;
      
    case 'content':
      return (
        <div className="streaming-content-block">
          {generationType === 'mcp' || generationType === 'graph' ? (
            <AgentXMLRenderer 
              content={block.content} 
              generationType={generationType as 'mcp' | 'graph'} 
            />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  
                  // 处理Mermaid图表
                  if (language === 'mermaid') {
                    return <MermaidChart chart={String(children)} />;
                  }
                  
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={tomorrow as any}
                      language={language}
                      PreTag="div"
                      customStyle={{ background: 'rgba(0,0,0,0.1)' } as any}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {block.content}
            </ReactMarkdown>
          )}
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

const MessageDisplay: React.FC<MessageDisplayProps> = ({ 
  conversation,
  enhancedStreamingState,
  pendingUserMessage,
  currentMode,
  agentType
}) => {
  // 根据generation_type决定消息显示方式
  const isGraphExecution = conversation.generation_type === 'graph_run';
  
  // 为流式消息推断generationType
  const getEffectiveGenerationType = () => {
    // 如果对话有generation_type，优先使用
    if (conversation.generation_type) {
      return conversation.generation_type;
    }
    
    // 如果是新对话，根据当前模式和agentType推断
    if (currentMode === 'agent') {
      return agentType; // 'mcp' 或 'graph'
    }
    
    // 默认返回当前模式
    return currentMode;
  };
  
  const effectiveGenerationType = getEffectiveGenerationType();
  
  // 构建工具调用结果映射
  const buildToolResultsMap = (rounds: any[]) => {
    const toolResults: Record<string, string> = {};
    
    rounds.forEach(round => {
      if (round.messages) {
        round.messages.forEach((msg: ConversationMessage) => {
          if (msg.role === 'tool' && msg.tool_call_id) {
            toolResults[msg.tool_call_id] = msg.content;
          }
        });
      }
    });
    
    return toolResults;
  };

  const toolResults = buildToolResultsMap(conversation.rounds);

  return (
    <div className="message-display">
      <div className="messages-container">
        {conversation.rounds.map((round, roundIndex) => {
          if (isGraphExecution) {
            // Graph执行模式：每个round是一个节点
            const nodeInfo = {
              nodeName: round.node_name || `节点${roundIndex + 1}`,
              level: round.level || 0,
              outputEnabled: round.output_enabled,
              mcpServers: round.mcp_servers,
              status: 'completed' as const
            };

            return (
              <div key={roundIndex} className="node-round">
                {/* 独立显示节点信息 */}
                <NodeExecutionInfo {...nodeInfo} />
                
                {round.messages?.map((message, msgIndex) => (
                  <MessageItem
                    key={`${roundIndex}-${msgIndex}`}
                    message={message}
                    toolResults={toolResults}
                    nodeInfo={undefined}  // 节点信息已独立显示，不再在消息中显示
                    isGraphMode={true}
                    generationType={conversation.generation_type}
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
                  generationType={conversation.generation_type}
                />
              );
            });
          }
        })}

        {/* 待发送的用户消息显示 */}
        {pendingUserMessage && (
          <div className="pending-user-message">
            <MessageItem
              message={{
                role: 'user',
                content: pendingUserMessage
              }}
              isFirstMessageInRound={true}
              generationType={effectiveGenerationType}
            />
          </div>
        )}

        {/* 流式消息显示 - 仅使用增强分块模式 */}
        {enhancedStreamingState && enhancedStreamingState.isStreaming && (
          <div className="enhanced-streaming-message">
            {/* 呼吸灯指示器 - 在流式消息上方左对齐 */}
            <div className="message-breathing-indicator">
              <div className="breathing-dot assistant-indicator" />
              <span className="breathing-label">
                {effectiveGenerationType === 'mcp' || effectiveGenerationType === 'graph' ? 'Agent' : 'Assistant'}
              </span>
            </div>
            
            {/* 分块内容 */}
            {enhancedStreamingState.blocks.map((block: StreamingBlock) => (
              <div key={block.id} className={`streaming-block ${block.type}-block`}>
                <StreamingBlockDisplay 
                  block={block} 
                  generationType={effectiveGenerationType}
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
};

export default MessageDisplay;