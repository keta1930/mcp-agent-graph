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

// Mermaid 图表组件 - 真正的渲染版本
const MermaidChart: React.FC<{ chart: string }> = ({ chart }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      try {
        setLoading(true);
        setError('');

        // 动态导入mermaid，避免SSR问题
        const { default: mermaid } = await import('mermaid');

        // 配置mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true
          }
        });

        // 生成唯一ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 验证语法并渲染
        const isValid = await mermaid.parse(chart);
        
        if (!isValid) {
          throw new Error('Invalid mermaid syntax');
        }

        // 渲染SVG
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        
        if (isMounted) {
          setSvg(renderedSvg);
          setLoading(false);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to render chart');
          setLoading(false);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (loading) {
    return (
      <div style={{ 
        margin: '16px 0',
        padding: '32px',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        backgroundColor: '#fafafa',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
          <PartitionOutlined style={{ color: '#1677ff', marginRight: '8px' }} />
          <Text type="secondary">正在渲染 Mermaid 图表...</Text>
        </div>
        <div style={{ 
          width: '24px', 
          height: '24px', 
          border: '2px solid #f3f3f3',
          borderTop: '2px solid #1677ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        margin: '16px 0',
        padding: '16px',
        border: '1px solid #ff4d4f',
        borderRadius: '6px',
        backgroundColor: '#fff2f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <PartitionOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
          <Text type="danger">Mermaid 渲染失败</Text>
        </div>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {error}
        </Text>
        <details style={{ marginTop: '8px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#666' }}>查看原始代码</summary>
          <pre style={{ 
            marginTop: '8px',
            padding: '8px',
            background: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '11px',
            overflow: 'auto'
          }}>
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div style={{ 
      margin: '16px 0',
      padding: '16px',
      border: '1px solid #d9d9d9',
      borderRadius: '6px',
      backgroundColor: '#fafafa'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <PartitionOutlined style={{ color: '#1677ff', marginRight: '8px' }} />
        <Text type="secondary" style={{ fontSize: '12px' }}>Mermaid图表</Text>
      </div>
      
      <div 
        ref={elementRef}
        style={{
          backgroundColor: 'white',
          borderRadius: '4px',
          padding: '16px',
          textAlign: 'center',
          overflow: 'auto'
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      
      {/* 添加旋转动画的CSS */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

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
              
              // 处理 mermaid 图表
              if (!inline && language === 'mermaid') {
                return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
              }
              
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