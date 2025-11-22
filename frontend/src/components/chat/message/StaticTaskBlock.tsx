// src/components/chat/message/StaticTaskBlock.tsx
import React, { useState } from 'react';
import { Tag, Typography } from 'antd';
import { ChevronDown, ChevronRight, CheckCircle, Bot } from 'lucide-react';
import { ToolOutlined } from '@ant-design/icons';
import { TaskData } from '../../../types/conversation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './TaskBlock.css';

const { Text } = Typography;

interface StaticTaskBlockProps {
  taskData: TaskData;
  toolCallId: string;
  toolResults?: Record<string, string>;
  conversationId?: string;
}

// 复用 TaskBlock 的组件
const ReasoningDisplay: React.FC<{ content: string }> = ({ content }) => {
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
          overflow: 'auto'
        }}>
          <div style={{ marginTop: '12px' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

const ToolCallDisplay: React.FC<{ toolCall: any; result?: string }> = ({ toolCall, result }) => {
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
          overflow: 'auto'
        }}>
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
                border: '1px solid rgba(139, 115, 85, 0.1)',
                fontSize: '13px',
                color: '#2d2d2d',
                fontFamily: "'SF Mono', monospace"
              }}>
                {result}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StaticTaskBlock: React.FC<StaticTaskBlockProps> = ({
  taskData,
  toolCallId,
  toolResults = {},
  conversationId
}) => {
  const [expanded, setExpanded] = useState(false);

  // 找到对应的 round
  const currentRound = taskData.rounds.find(r => r.tool_call_id === toolCallId);
  
  if (!currentRound) {
    return null;
  }

  // 构建工具结果映射（从 round 的 messages 中）
  const roundToolResults: Record<string, string> = { ...toolResults };
  currentRound.messages.forEach(msg => {
    if (msg.role === 'tool' && msg.tool_call_id) {
      roundToolResults[msg.tool_call_id] = msg.content || '';
    }
  });

  return (
    <div 
      className="task-block-container"
      data-task-status="completed"
      style={{ marginTop: '12px' }}
    >
      <div
        className="task-block-header"
        onClick={() => setExpanded(!expanded)}
        style={{
          borderColor: 'rgba(160, 130, 109, 0.2)',
          background: 'rgba(245, 243, 240, 0.6)'
        }}
      >
        <div className="task-block-header-left">
          <div 
            className="task-status-indicator"
            style={{ background: '#a0826d' }} 
          />
          <CheckCircle size={16} className="task-status-icon completed" />
          <span className="task-id">Task {taskData.task_id}</span>
          <Tag
            className="task-status-tag"
            style={{
              background: 'rgba(160, 130, 109, 0.08)',
              color: '#a0826d',
              border: '1px solid rgba(160, 130, 109, 0.25)'
            }}
          >
            已完成
          </Tag>
          <Tag style={{
            background: 'rgba(184, 88, 69, 0.08)',
            color: '#b85845',
            border: '1px solid rgba(184, 88, 69, 0.2)',
            borderRadius: '6px',
            fontWeight: 500,
            padding: '2px 10px',
            fontSize: '12px'
          }}>
            {taskData.agent_name}
          </Tag>
        </div>
        <div className="task-block-header-right">
          {expanded ? (
            <ChevronDown size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
          ) : (
            <ChevronRight size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
          )}
        </div>
      </div>

      {expanded && (
        <div className="task-block-content">
          {currentRound.messages.map((message, msgIndex) => {
            // 跳过 system 和 tool 消息
            if (message.role === 'system' || message.role === 'tool') {
              return null;
            }

            return (
              <div key={msgIndex} className="task-message-block">
                {/* Reasoning content */}
                {(message as any).reasoning_content && (
                  <ReasoningDisplay content={(message as any).reasoning_content} />
                )}
                
                {/* Main content */}
                {message.content && (
                  <div style={{
                    color: '#2d2d2d',
                    lineHeight: '1.7',
                    fontSize: '16px',
                    letterSpacing: '0.3px',
                    fontFamily: "Cambria, Georgia, 'Times New Roman', serif, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif"
                  }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* Tool calls */}
                {message.tool_calls && message.tool_calls.length > 0 && (
                  <div>
                    {message.tool_calls.map((toolCall, index) => (
                      <ToolCallDisplay
                        key={toolCall.id || index}
                        toolCall={toolCall}
                        result={toolCall.id ? roundToolResults[toolCall.id] : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StaticTaskBlock;
