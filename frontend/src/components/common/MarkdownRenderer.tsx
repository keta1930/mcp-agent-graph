// src/components/common/MarkdownRenderer.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Card, Button, Tooltip, Space, Typography } from 'antd';
import { CopyOutlined, EyeOutlined, FileTextOutlined, PartitionOutlined } from '@ant-design/icons';
import 'katex/dist/katex.min.css';

const { Text } = Typography;


interface MarkdownRendererProps {
  content: string;
  style?: React.CSSProperties;
  className?: string;
  showCopyButton?: boolean;
  showPreview?: boolean;
  title?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  style,
  className,
  showCopyButton = true,
  showPreview = false,
  title = "Markdown内容"
}) => {
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card
      style={style}
      className={className}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <FileTextOutlined style={{ color: '#1677ff' }} />
            <Text>{title}</Text>
          </Space>
          <Space>
            {showPreview && (
              <Button 
                size="small" 
                type={previewMode ? 'primary' : 'default'} 
                icon={<EyeOutlined />} 
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode ? '预览' : '源码'}
              </Button>
            )}
            {showCopyButton && (
              <Tooltip title={copied ? '已复制' : '复制内容'}>
                <Button 
                  size="small" 
                  type="text" 
                  icon={copied ? <EyeOutlined /> : <CopyOutlined />} 
                  onClick={handleCopy} 
                />
              </Tooltip>
            )}
          </Space>
        </div>
      }
      styles={{
        body: { padding: '24px', minHeight: '200px', lineHeight: '1.6' }
      }}
    >
      {previewMode ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              
              
              // 处理其他代码块
              return !inline && match ? (
                <SyntaxHighlighter
                  style={tomorrow}
                  language={language}
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
            a({ href, children }) {
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#1677ff' }}>
                  {children}
                </a>
              );
            }
          }}
        >
          {content || '暂无内容'}
        </ReactMarkdown>
      ) : (
        <pre style={{
          background: '#f8f9fa',
          border: '1px solid #e1e4e8',
          borderRadius: '6px',
          padding: '16px',
          overflow: 'auto',
          fontFamily: 'Monaco, "Courier New", monospace',
          fontSize: '13px',
          lineHeight: '1.5',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {content || '暂无内容'}
        </pre>
      )}
    </Card>
  );
};

export default MarkdownRenderer;