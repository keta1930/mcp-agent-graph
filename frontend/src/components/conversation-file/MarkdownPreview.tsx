import React, { useState } from 'react';
import { Tabs, Input, Button, Space } from 'antd';
import { EditOutlined, EyeOutlined, SaveOutlined } from '@ant-design/icons';
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
  const [activeTab, setActiveTab] = useState<string>('preview');

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

  const tabItems = [
    {
      key: 'preview',
      label: (
        <span>
          <EyeOutlined /> 预览
        </span>
      ),
      children: (
        <div
          style={{
            height: '60vh',
            overflow: 'auto',
            padding: '24px',
            background: '#fff',
            border: '1px solid #f0f0f0',
            borderRadius: '4px',
          }}
        >
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
                    <div style={{ overflowX: 'auto' }}>
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
        </div>
      ),
    },
    {
      key: 'edit',
      label: (
        <span>
          <EditOutlined /> 编辑
        </span>
      ),
      children: (
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
            }}
            placeholder="输入 Markdown 内容..."
          />
          {isDirty && (
            <div style={{ marginTop: '8px', textAlign: 'right' }}>
              <Space>
                <span style={{ color: '#faad14', fontSize: '12px' }}>
                  未保存的更改 (Ctrl+S 保存)
                </span>
                {onSave && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<SaveOutlined />}
                    onClick={onSave}
                  >
                    保存
                  </Button>
                )}
              </Space>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'split',
      label: '分屏',
      children: (
        <div style={{ display: 'flex', gap: '16px', height: '60vh' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
              <EditOutlined /> 编辑
            </div>
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
              }}
              placeholder="输入 Markdown 内容..."
            />
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid #f0f0f0',
              paddingLeft: '16px',
            }}
          >
            <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
              <EyeOutlined /> 预览
            </div>
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '16px',
                background: '#fff',
                border: '1px solid #f0f0f0',
                borderRadius: '4px',
              }}
            >
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
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        tabBarExtraContent={
          isDirty &&
          onSave && (
            <Button type="primary" size="small" icon={<SaveOutlined />} onClick={onSave}>
              保存
            </Button>
          )
        }
      />
    </div>
  );
};

export default MarkdownPreview;
