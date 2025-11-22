// AI推理过程显示组件
import React, { useState } from 'react';
import { Typography, Tag } from 'antd';
import { Bot, ChevronDown, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GlassCodeBlock from './GlassCodeBlock';
import { useT } from '../../../i18n/hooks';

const { Text } = Typography;

interface ReasoningDisplayProps {
  content: string;
}

/**
 * AI推理过程显示组件
 * 展示AI的思考过程和推理内容
 */
const ReasoningDisplay: React.FC<ReasoningDisplayProps> = ({ content }) => {
  const t = useT();
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
          <Text strong style={{ color: '#2d2d2d', fontSize: '14px' }}>
            {t('pages.chatSystem.messageDisplay.aiThinking')}
          </Text>
          <Tag style={{
            background: 'rgba(184, 88, 69, 0.08)',
            color: '#b85845',
            border: '1px solid rgba(184, 88, 69, 0.25)',
            borderRadius: '6px',
            fontWeight: 500,
            padding: '2px 10px',
            fontSize: '12px'
          }}>
            {t('pages.chatSystem.messageDisplay.reasoning')}
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

export default ReasoningDisplay;
