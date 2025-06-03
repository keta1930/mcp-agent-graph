// src/components/graph-runner/NodeResultsContent.tsx
import React, { useState } from 'react';
import { Collapse, Typography, Tag, Space, Button, Tooltip, Empty } from 'antd';
import {
  RocketOutlined,
  MessageOutlined,
  ToolOutlined,
  CopyOutlined,
  UserOutlined,
  RobotOutlined,
  ExceptionOutlined,
  DownOutlined,
  UpOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import MarkdownRenderer from '../common/MarkdownRenderer';

const { Panel } = Collapse;
const { Text } = Typography;

interface NodeResultsContentProps {
  detail: any;
}

const NodeResultsContent: React.FC<NodeResultsContentProps> = ({ detail }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({});

  // 更宽松的数据检查
  const hasNodeStates = detail && 
    detail.node_states && 
    typeof detail.node_states === 'object' && 
    Object.keys(detail.node_states).length > 0;

  if (!hasNodeStates) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Text type="secondary">暂无节点执行数据</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {detail ? '数据加载中或节点尚未执行' : '请选择一个会话'}
              </Text>
            </div>
          }
        />
      </div>
    );
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleContentExpansion = (contentId: string) => {
    setExpandedContent(prev => ({
      ...prev,
      [contentId]: !prev[contentId]
    }));
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Tooltip title={copiedField === field ? '已复制!' : '复制'}>
      <Button
        type="text"
        size="small"
        icon={<CopyOutlined />}
        onClick={() => copyToClipboard(text, field)}
        style={{ opacity: 0.7 }}
      />
    </Tooltip>
  );

  const CollapsibleContent = ({ 
    content, 
    contentId,
    icon,
    title,
    copyText
  }: { 
    content: string; 
    contentId: string;
    icon: React.ReactNode;
    title: string;
    copyText: string;
  }) => {
    const isExpanded = expandedContent[contentId];
    
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {icon}
            <Text strong>{title}</Text>
            <CopyButton text={copyText} field={contentId + '-copy'} />
          </div>
          <Button
            type="text"
            size="small"
            icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
            onClick={() => toggleContentExpansion(contentId)}
          >
            {isExpanded ? '收起' : '展开'}
          </Button>
        </div>
        
        {isExpanded && (
          <div style={{ 
            border: '1px solid #e8e8e8',
            borderRadius: '6px',
            overflow: 'hidden'
          }}>
            <div style={{ padding: 0 }}>
              <MarkdownRenderer
                content={content || '暂无内容'}
                showCopyButton={false}
                showPreview={false}
                style={{ margin: 0, boxShadow: 'none', border: 'none' }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // 优化的JSON显示组件
  const JsonDisplay = ({ data, title, defaultExpanded = false }: { data: any; title: string; defaultExpanded?: boolean }) => {
    const [copied, setCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    
    const handleCopy = () => {
      const jsonString = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const toggleExpansion = () => {
      setIsExpanded(!isExpanded);
    };

    // 智能格式化JSON，处理嵌套的JSON字符串
    const formatJsonForDisplay = (obj: any): any => {
      if (typeof obj === 'string') {
        try {
          const parsed = JSON.parse(obj);
          return parsed;
        } catch {
          return obj;
        }
      }
      
      if (Array.isArray(obj)) {
        return obj.map(formatJsonForDisplay);
      }
      
      if (obj && typeof obj === 'object') {
        const formatted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          formatted[key] = formatJsonForDisplay(value);
        }
        return formatted;
      }
      
      return obj;
    };

    const formattedData = formatJsonForDisplay(data);
    const jsonString = JSON.stringify(formattedData, null, 2);

    return (
      <div style={{ 
        background: '#f8f9fa',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '16px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 16px',
          background: '#f0f2f5',
          borderBottom: '1px solid #e8e8e8',
          cursor: 'pointer'
        }}
        onClick={toggleExpansion}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ToolOutlined style={{ marginRight: '8px', color: '#fa8c16' }} />
            <Text strong style={{ fontSize: '14px' }}>{title}</Text>
            <Space style={{ marginLeft: '12px' }}>
              {data.tool_name && <Tag color="orange">{data.tool_name}</Tag>}
              {data.server_name && <Tag color="blue">{data.server_name}</Tag>}
            </Space>
          </div>
          <Space>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              style={{ opacity: copied ? 1 : 0.7 }}
              title={copied ? '已复制!' : '复制JSON'}
            >
              {copied ? '已复制' : '复制'}
            </Button>
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpansion();
              }}
            >
              {isExpanded ? '收起' : '展开'}
            </Button>
          </Space>
        </div>
        
        {isExpanded && (
          <div style={{ 
            maxHeight: '400px', 
            overflow: 'auto',
            position: 'relative'
          }}>
            <SyntaxHighlighter
              language="json"
              style={tomorrow}
              customStyle={{
                margin: 0,
                fontSize: '12px',
                lineHeight: '1.4',
                background: 'transparent',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'break-word'
              }}
              wrapLongLines={true}
              showLineNumbers={false}
              codeTagProps={{
                style: {
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word'
                }
              }}
              PreTag={({ children, ...props }) => (
                <pre 
                  {...props} 
                  style={{
                    ...props.style,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                    overflowX: 'hidden'
                  }}
                >
                  {children}
                </pre>
              )}
            >
              {jsonString}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    );
  };

  const renderNodeContent = (nodeName: string, nodeState: any) => {
    const messages = nodeState?.messages || [];
    const result = nodeState?.result || {};
    
    return (
      <div style={{ padding: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          
          {/* System Prompt */}
          {messages.length > 0 && messages.find((m: any) => m.role === 'system') && (
            <CollapsibleContent
              content={messages.find((m: any) => m.role === 'system')?.content || '无系统提示词'}
              contentId={`${nodeName}-system-content`}
              icon={<RobotOutlined style={{ marginRight: '8px', color: '#722ed1' }} />}
              title="系统提示词"
              copyText={messages.find((m: any) => m.role === 'system')?.content || ''}
            />
          )}

          {/* User Prompt */}
          {messages.length > 0 && messages.find((m: any) => m.role === 'user') && (
            <CollapsibleContent
              content={messages.find((m: any) => m.role === 'user')?.content || '无用户提示词'}
              contentId={`${nodeName}-user-content`}
              icon={<UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />}
              title="用户提示词"
              copyText={messages.find((m: any) => m.role === 'user')?.content || ''}
            />
          )}

          {/* Output */}
          {(result.output || result.output === '') && (
            <CollapsibleContent
              content={result.output || '暂无输出'}
              contentId={`${nodeName}-output-content`}
              icon={<MessageOutlined style={{ marginRight: '8px', color: '#52c41a' }} />}
              title="输出"
              copyText={result.output || ''}
            />
          )}

          {/* Tool Calls - 简化为单层结构 */}
          {result.tool_calls && Array.isArray(result.tool_calls) && result.tool_calls.length > 0 && (
            <div>
              {result.tool_calls.map((tool: any, idx: number) => (
                <JsonDisplay 
                  key={idx}
                  data={tool} 
                  title={`工具调用 ${idx + 1}`}
                  defaultExpanded={false}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {result.error && (
            <CollapsibleContent
              content={result.error}
              contentId={`${nodeName}-error-content`}
              icon={<ExceptionOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />}
              title="错误"
              copyText={result.error}
            />
          )}

        </Space>
      </div>
    );
  };

  // 判断节点是否完成：有输出或有工具调用
  const isNodeCompleted = (nodeState: any) => {
    const result = nodeState?.result || {};
    const hasOutput = result.output && result.output.trim() !== '';
    const hasToolCalls = result.tool_calls && Array.isArray(result.tool_calls) && result.tool_calls.length > 0;
    return hasOutput || hasToolCalls;
  };

  const nodeEntries = Object.entries(detail.node_states);

  return (
    <div>
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
          共 {nodeEntries.length} 个节点
        </Tag>
      </div>

      <Collapse 
        ghost
        expandIconPosition="end"
        defaultActiveKey={nodeEntries.map(([nodeName]) => nodeName)}
      >
        {nodeEntries.map(([nodeName, nodeState]) => {
          const result = (nodeState as any)?.result || {};
          const isCompleted = isNodeCompleted(nodeState);
          const hasError = !!result.error;
          
          return (
            <Panel
              key={nodeName}
              header={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Space>
                    <RocketOutlined style={{ color: hasError ? '#ff4d4f' : isCompleted ? '#52c41a' : '#d9d9d9' }} />
                    <Text strong>{nodeName}</Text>
                  </Space>
                  <Space>
                    {isCompleted && !hasError && <Tag color="success" size="small">已完成</Tag>}
                    {hasError && <Tag color="error" size="small">错误</Tag>}
                    {!isCompleted && !hasError && <Tag color="processing" size="small">等待中</Tag>}
                  </Space>
                </div>
              }
            >
              {renderNodeContent(nodeName, nodeState)}
            </Panel>
          );
        })}
      </Collapse>
    </div>
  );
};

export default NodeResultsContent;