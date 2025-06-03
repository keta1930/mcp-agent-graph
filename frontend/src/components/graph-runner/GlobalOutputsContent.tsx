// src/components/graph-runner/GlobalOutputsContent.tsx
import React, { useState } from 'react';
import { Collapse, Typography, Tag, Space, Button, Tooltip, Empty } from 'antd';
import {
  MessageOutlined,
  CopyOutlined,
  HistoryOutlined,
  FileTextOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons';
import MarkdownRenderer from '../common/MarkdownRenderer';

const { Panel } = Collapse;
const { Text } = Typography;

interface GlobalOutputsContentProps {
  detail: any;
}

const GlobalOutputsContent: React.FC<GlobalOutputsContentProps> = ({ detail }) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({});

  // 更宽松的数据检查
  const hasGlobalOutputs = detail && 
    detail.global_outputs && 
    typeof detail.global_outputs === 'object' && 
    Object.keys(detail.global_outputs).length > 0;

  if (!hasGlobalOutputs) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <Text type="secondary">暂无全局输出数据</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {detail ? '节点尚未产生全局输出' : '请选择一个会话'}
              </Text>
            </div>
          }
        />
      </div>
    );
  }

  const copyToClipboard = (text: string, itemId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const copyAllOutputs = (outputs: string[], nodeName: string) => {
    const allText = outputs.join('\n\n---\n\n');
    copyToClipboard(allText, `${nodeName}-all`);
  };

  const toggleContentExpansion = (contentId: string) => {
    setExpandedContent(prev => ({
      ...prev,
      [contentId]: !prev[contentId]
    }));
  };

  const CopyButton = ({ text, itemId }: { text: string; itemId: string }) => (
    <Tooltip title={copiedItem === itemId ? '已复制!' : '复制'}>
      <Button
        type="text"
        size="small"
        icon={<CopyOutlined />}
        onClick={() => copyToClipboard(text, itemId)}
        style={{ opacity: 0.7 }}
      />
    </Tooltip>
  );

  const CollapsibleOutput = ({ 
    content, 
    contentId, 
    index 
  }: { 
    content: string; 
    contentId: string; 
    index: number; 
  }) => {
    const isExpanded = expandedContent[contentId];
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Text type="secondary">输出 {index + 1}</Text>
            <CopyButton text={content || ''} itemId={contentId} />
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
                content={content || '空输出'}
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

  const renderNodeOutputs = (nodeName: string, outputs: string[]) => {
    if (!Array.isArray(outputs) || outputs.length === 0) {
      return (
        <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
          <Text type="secondary">该节点暂无输出记录</Text>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <HistoryOutlined />
            <Text strong>共记录 {outputs.length} 条输出</Text>
          </Space>
          {outputs.length > 1 && (
            <Button 
              size="small" 
              icon={<CopyOutlined />}
              onClick={() => copyAllOutputs(outputs, nodeName)}
            >
              复制全部
            </Button>
          )}
        </div>

        <div>
          {outputs.map((output, index) => (
            <CollapsibleOutput
              key={index}
              content={output}
              contentId={`${nodeName}-${index}`}
              index={index}
            />
          ))}
        </div>
      </div>
    );
  };

  const globalOutputEntries = Object.entries(detail.global_outputs);
  const totalOutputs = globalOutputEntries.reduce((sum, [_, outputs]) => sum + (Array.isArray(outputs) ? outputs.length : 0), 0);

  return (
    <div>
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
          {globalOutputEntries.length} 个节点，共 {totalOutputs} 条输出
        </Tag>
      </div>

      <Collapse 
        ghost
        expandIconPosition="end"
        defaultActiveKey={globalOutputEntries.map(([nodeName]) => nodeName)}
      >
        {globalOutputEntries.map(([nodeName, outputs]) => {
          const outputArray = Array.isArray(outputs) ? outputs : [];
          
          return (
            <Panel
              key={nodeName}
              header={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Space>
                    <FileTextOutlined style={{ color: outputArray.length > 0 ? '#52c41a' : '#d9d9d9' }} />
                    <Text strong>{nodeName}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {outputArray.length} 条输出
                  </Text>
                </div>
              }
            >
              {renderNodeOutputs(nodeName, outputArray)}
            </Panel>
          );
        })}
      </Collapse>
    </div>
  );
};

export default GlobalOutputsContent;