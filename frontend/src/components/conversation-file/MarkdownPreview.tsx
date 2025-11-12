import React, { useState } from 'react';
import { Input, Button, Space } from 'antd';
import { Edit, Eye, Save, Columns2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

const { TextArea } = Input;

interface MarkdownPreviewProps {
  filename: string;
  content: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  isDirty?: boolean;
  readOnly?: boolean;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  filename,
  content,
  onChange,
  onSave,
  isDirty,
  readOnly = false,
}) => {
  const [activeView, setActiveView] = useState<'preview' | 'edit' | 'split'>('preview');

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+S / Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (onSave && isDirty) {
        onSave();
      }
    }
  };

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
    <div>
      {/* 顶部按钮栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <Space size="small">
          <Button
            type={activeView === 'preview' ? 'primary' : 'default'}
            size="small"
            icon={<Eye size={14} />}
            onClick={() => setActiveView('preview')}
            style={{
              borderRadius: '6px',
              height: '32px',
              fontWeight: 500,
              letterSpacing: '0.5px',
              ...(activeView === 'preview' ? {
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                color: '#fff'
              } : {
                border: '1px solid rgba(139, 115, 85, 0.25)',
                color: '#8b7355',
                background: 'transparent'
              })
            }}
          >
            预览
          </Button>
          <Button
            type={activeView === 'edit' ? 'primary' : 'default'}
            size="small"
            icon={<Edit size={14} />}
            onClick={() => setActiveView('edit')}
            style={{
              borderRadius: '6px',
              height: '32px',
              fontWeight: 500,
              letterSpacing: '0.5px',
              ...(activeView === 'edit' ? {
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                color: '#fff'
              } : {
                border: '1px solid rgba(139, 115, 85, 0.25)',
                color: '#8b7355',
                background: 'transparent'
              })
            }}
          >
            编辑
          </Button>
          <Button
            type={activeView === 'split' ? 'primary' : 'default'}
            size="small"
            icon={<Columns2 size={14} />}
            onClick={() => setActiveView('split')}
            style={{
              borderRadius: '6px',
              height: '32px',
              fontWeight: 500,
              letterSpacing: '0.5px',
              ...(activeView === 'split' ? {
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                color: '#fff'
              } : {
                border: '1px solid rgba(139, 115, 85, 0.25)',
                color: '#8b7355',
                background: 'transparent'
              })
            }}
          >
            分屏
          </Button>
        </Space>
        {isDirty && onSave && (
          <Button
            type="primary"
            size="small"
            icon={<Save size={14} />}
            onClick={onSave}
            style={{
              background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
              border: 'none',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(184, 88, 69, 0.25)',
              fontWeight: 500,
              letterSpacing: '0.5px',
              height: '32px'
            }}
          >
            保存
          </Button>
        )}
      </div>

      {/* 内容区域 */}
      {activeView === 'preview' && (
        <div
          style={{
            height: '60vh',
            overflow: 'auto',
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            borderRadius: '8px',
            boxShadow: 'inset 0 1px 3px rgba(139, 115, 85, 0.08)',
          }}
        >
          {renderMarkdown()}
        </div>
      )}

      {activeView === 'edit' && (
        <div>
          <TextArea
            value={content}
            onChange={(e) => !readOnly && onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            style={{
              height: '60vh',
              fontFamily: 'monospace',
              fontSize: '14px',
              resize: 'none',
              borderColor: 'rgba(139, 115, 85, 0.25)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#b85845';
              e.target.style.boxShadow = '0 0 0 2px rgba(184, 88, 69, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(139, 115, 85, 0.25)';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="输入 Markdown 内容..."
          />
          {isDirty && (
            <div style={{ marginTop: '8px', textAlign: 'right' }}>
              <span style={{
                color: '#d4a574',
                fontSize: '12px',
                fontWeight: 500,
                letterSpacing: '0.3px'
              }}>
                未保存的更改 (Ctrl+S 保存)
              </span>
            </div>
          )}
        </div>
      )}

      {activeView === 'split' && (
        <div style={{ display: 'flex', gap: '16px', height: '60vh' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TextArea
              value={content}
              onChange={(e) => !readOnly && onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              readOnly={readOnly}
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: '14px',
                resize: 'none',
                borderColor: 'rgba(139, 115, 85, 0.25)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#b85845';
                e.target.style.boxShadow = '0 0 0 2px rgba(184, 88, 69, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(139, 115, 85, 0.25)';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="输入 Markdown 内容..."
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
                border: '1px solid rgba(139, 115, 85, 0.15)',
                borderRadius: '8px',
                boxShadow: 'inset 0 1px 3px rgba(139, 115, 85, 0.08)',
              }}
            >
              {renderMarkdown()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownPreview;
