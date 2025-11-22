// 工具调用显示组件
import React, { useState, useEffect } from 'react';
import { Typography, Tag } from 'antd';
import { ToolOutlined, LoadingOutlined } from '@ant-design/icons';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useT } from '../../../i18n/hooks';

const { Text } = Typography;

// 自定义语法高亮主题
const customCodeStyle = {
  ...oneLight,
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    background: 'transparent'
  },
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    background: 'transparent'
  }
};

interface ToolCallDisplayProps {
  toolCall: any;
  result?: string;
  conversationId?: string;
  isStreaming?: boolean;
}

/**
 * 工具调用显示组件
 * 展示工具调用的参数和执行结果
 */
const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ 
  toolCall, 
  result, 
  conversationId, 
  isStreaming = false 
}) => {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const paramsRef = React.useRef<HTMLDivElement>(null);

  // 流式输出时自动滚动到底部
  React.useLayoutEffect(() => {
    if (paramsRef.current && isStreaming && expanded) {
      const el = paramsRef.current;
      el.scrollTop = el.scrollHeight - el.clientHeight;
    }
  }, [toolCall?.function?.arguments, isStreaming, expanded]);

  useEffect(() => {
    if (isStreaming) setExpanded(true);
  }, [isStreaming]);

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
            {t('pages.chatSystem.messageDisplay.toolCall')}
          </Tag>
          {isStreaming && !result && <LoadingOutlined style={{ color: '#b85845', fontSize: '14px' }} />}
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
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(139, 115, 85, 0.3) rgba(245, 243, 240, 0.6)'
        }} className="tool-call-scrollbar" ref={paramsRef}>
          <div style={{ marginTop: '12px' }}>
            <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '12px', fontWeight: 500 }}>
              {t('pages.chatSystem.messageDisplay.parameters')}
            </Text>
            <div style={{ marginTop: '8px' }}>
              <SyntaxHighlighter
                language="json"
                style={customCodeStyle}
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
              <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '12px', fontWeight: 500 }}>
                {t('pages.chatSystem.messageDisplay.result')}
              </Text>
              <div style={{
                marginTop: '8px',
                padding: '10px 12px',
                background: 'rgba(245, 243, 240, 0.6)',
                borderRadius: '4px',
                border: '1px solid rgba(139, 115, 85, 0.1)'
              }}>
                <Text style={{ fontSize: '13px', color: '#2d2d2d', fontFamily: "'SF Mono', monospace" }}>
                  {result}
                </Text>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolCallDisplay;
