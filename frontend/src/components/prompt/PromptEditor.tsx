import React from 'react';
import { Input } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

const { TextArea } = Input;

interface PromptEditorProps {
  content: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const PromptEditor: React.FC<PromptEditorProps> = ({
  content,
  onChange,
  readOnly = false,
  placeholder = '输入提示词内容...',
}) => {
  // Render markdown content
  const renderMarkdown = () => (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          table({ children, ...props }: any) {
            return (
              <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                <table
                  style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    marginBottom: '16px',
                  }}
                  {...props}
                >
                  {children}
                </table>
              </div>
            );
          },
          th({ children, ...props }: any) {
            return (
              <th
                style={{
                  border: '1px solid #ddd',
                  padding: '8px',
                  background: '#f5f5f5',
                  textAlign: 'left',
                }}
                {...props}
              >
                {children}
              </th>
            );
          },
          td({ children, ...props }: any) {
            return (
              <td
                style={{
                  border: '1px solid #ddd',
                  padding: '8px',
                }}
                {...props}
              >
                {children}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%', minWidth: 0 }}>
      {/* 左侧编辑器 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TextArea
          value={content}
          onChange={(e) => !readOnly && onChange(e.target.value)}
          readOnly={readOnly}
          style={{
            flex: 1,
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            resize: 'none',
            borderColor: 'rgba(139, 115, 85, 0.25)',
            borderRadius: '8px',
            wordBreak: 'break-word',
            overflowWrap: 'break-word'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#b85845';
            e.target.style.boxShadow = '0 0 0 2px rgba(184, 88, 69, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(139, 115, 85, 0.25)';
            e.target.style.boxShadow = 'none';
          }}
          placeholder={placeholder}
        />
      </div>

      {/* 右侧预览 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            borderRadius: '8px',
            boxShadow: 'inset 0 1px 3px rgba(139, 115, 85, 0.08)',
            wordBreak: 'break-word',
            overflowWrap: 'break-word'
          }}
        >
          {renderMarkdown()}
        </div>
      </div>
    </div>
  );
};

export default PromptEditor;
