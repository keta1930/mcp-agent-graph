// src/components/chat/message/TaskBlock.tsx
import React, { useState, useEffect } from 'react';
import { Tag } from 'antd';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Loader } from 'lucide-react';
import { TaskBlock as TaskBlockType, StreamingBlock } from '../../../types/conversation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './TaskBlock.css';

interface TaskBlockProps {
  taskBlock: TaskBlockType;
  blocks: StreamingBlock[];
  renderingMode: 'chat' | 'agent' | 'graph_run';
  toolResults?: Record<string, string>;
  conversationId?: string;
}

// Reuse the same components from MessageDisplay for consistency
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
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#2d2d2d' }}>AI思考过程</span>
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
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#2d2d2d' }}>{toolCall.function?.name}</span>
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
            <div style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '12px', fontWeight: 500 }}>参数</div>
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
              <div style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '12px', fontWeight: 500 }}>结果</div>
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

const TaskBlock: React.FC<TaskBlockProps> = ({
  taskBlock,
  blocks,
  renderingMode,
  toolResults = {},
  conversationId
}) => {
  const [expanded, setExpanded] = useState(true);
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);

  // Handle task completion visual feedback
  useEffect(() => {
    if (taskBlock.taskStatus === 'completed' || taskBlock.taskStatus === 'failed') {
      setShowCompletionFeedback(true);
      
      // Auto-collapse after completion (optional)
      const timer = setTimeout(() => {
        setShowCompletionFeedback(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [taskBlock.taskStatus]);

  const getStatusIcon = () => {
    switch (taskBlock.taskStatus) {
      case 'running':
        return <Loader size={16} className="task-status-icon running" />;
      case 'completed':
        return <CheckCircle size={16} className="task-status-icon completed" />;
      case 'failed':
        return <XCircle size={16} className="task-status-icon failed" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (taskBlock.taskStatus) {
      case 'running':
        return '#b85845';
      case 'completed':
        return '#a0826d';
      case 'failed':
        return '#d4574d';
      default:
        return '#9ea19f';
    }
  };

  const getStatusText = () => {
    switch (taskBlock.taskStatus) {
      case 'running':
        return '执行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return '未知';
    }
  };

  return (
    <div 
      className={`task-block-container ${showCompletionFeedback ? 'task-completed-feedback' : ''}`}
      data-task-status={taskBlock.taskStatus}
    >
      <div
        className="task-block-header"
        onClick={() => setExpanded(!expanded)}
        style={{
          borderColor: `rgba(${taskBlock.taskStatus === 'running' ? '184, 88, 69' : taskBlock.taskStatus === 'completed' ? '160, 130, 109' : '212, 87, 77'}, 0.2)`,
          background: showCompletionFeedback 
            ? taskBlock.taskStatus === 'completed' 
              ? 'rgba(160, 130, 109, 0.12)' 
              : 'rgba(212, 87, 77, 0.12)'
            : 'rgba(245, 243, 240, 0.6)'
        }}
      >
        <div className="task-block-header-left">
          <div 
            className={`task-status-indicator ${taskBlock.taskStatus === 'running' ? 'running' : ''}`}
            style={{ background: getStatusColor() }} 
          />
          {getStatusIcon()}
          <span className="task-id">Task {taskBlock.taskId}</span>
          <Tag
            className="task-status-tag"
            style={{
              background: `rgba(${taskBlock.taskStatus === 'running' ? '184, 88, 69' : taskBlock.taskStatus === 'completed' ? '160, 130, 109' : '212, 87, 77'}, 0.08)`,
              color: getStatusColor(),
              border: `1px solid rgba(${taskBlock.taskStatus === 'running' ? '184, 88, 69' : taskBlock.taskStatus === 'completed' ? '160, 130, 109' : '212, 87, 77'}, 0.25)`
            }}
          >
            {getStatusText()}
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
          {blocks.length > 0 ? (
            blocks.map((block) => (
              <div key={block.id} className="task-message-block">
                {/* Reuse existing message block rendering components */}
                {block.type === 'reasoning' && block.content && (
                  <ReasoningDisplay content={block.content} />
                )}
                
                {block.type === 'content' && block.content && (
                  <div style={{
                    color: '#2d2d2d',
                    lineHeight: '1.7',
                    fontSize: '16px',
                    letterSpacing: '0.3px',
                    fontFamily: "Cambria, Georgia, 'Times New Roman', serif, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', serif"
                  }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {block.content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {block.type === 'tool_calls' && block.toolCalls && block.toolCalls.length > 0 && (
                  <div>
                    {block.toolCalls.map((toolCall, index) => (
                      <ToolCallDisplay
                        key={toolCall.id || index}
                        toolCall={toolCall}
                        result={toolCall.id ? toolResults[toolCall.id] : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="task-empty-state">
              {taskBlock.taskStatus === 'running' ? '正在执行...' : taskBlock.content || '无内容'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskBlock;
