// src/components/graph-runner/OverviewContent.tsx
import React, { useState } from 'react';
import { Descriptions, Tag, Space, Typography, Progress, Button } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  RightOutlined,
  PlayCircleOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';
import { formatDistanceToNow } from 'date-fns';
import MarkdownRenderer from '../common/MarkdownRenderer';

const { Text } = Typography;

interface OverviewContentProps {
  detail: any;
}

const OverviewContent: React.FC<OverviewContentProps> = ({ detail }) => {
  const { continueConversation, currentConversation, parallelExecution } = useGraphRunnerStore();
  const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({});

  const handleContinue = () => {
    if (currentConversation) {
      continueConversation(currentConversation);
    }
  };

  const toggleContentExpansion = (contentId: string) => {
    setExpandedContent(prev => ({
      ...prev,
      [contentId]: !prev[contentId]
    }));
  };

  const getProgressPercent = () => {
    if (!detail.node_states) return 0;
    const totalNodes = Object.keys(detail.node_states).length;
    const completedNodes = Object.values(detail.node_states).filter((state: any) => {
      const result = state.result || {};
      const hasOutput = result.output && result.output.trim() !== '';
      const hasToolCalls = result.tool_calls && Array.isArray(result.tool_calls) && result.tool_calls.length > 0;
      return hasOutput || hasToolCalls;
    }).length;
    return totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
  };

  const getNodeStats = () => {
    if (!detail.node_states) return { total: 0, completed: 0, pending: 0, error: 0 };
    
    const states = Object.values(detail.node_states);
    const total = states.length;
    
    let completed = 0;
    let error = 0;
    
    states.forEach((state: any) => {
      const result = state.result || {};
      if (result.error) {
        error++;
      } else {
        const hasOutput = result.output && result.output.trim() !== '';
        const hasToolCalls = result.tool_calls && Array.isArray(result.tool_calls) && result.tool_calls.length > 0;
        if (hasOutput || hasToolCalls) {
          completed++;
        }
      }
    });
    
    const pending = total - completed - error;
    return { total, completed, pending, error };
  };

  const CollapsibleContent = ({ 
    content, 
    contentId,
    title
  }: { 
    content: string; 
    contentId: string; 
    title: string;
  }) => {
    const isExpanded = expandedContent[contentId];
    
    return (
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <Text strong>{title}:</Text>
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
            overflow: 'hidden',
            marginBottom: '16px'
          }}>
            <div style={{ padding: 0 }}>
              <MarkdownRenderer
                content={content || '暂无内容'}
                showCopyButton={true}
                showPreview={false}
                style={{ margin: 0, boxShadow: 'none', border: 'none' }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const stats = getNodeStats();

  return (
    <div style={{ padding: '0 0 16px 0' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        
        {/* Status and Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {detail.completed ? (
              <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: '14px', padding: '4px 12px' }}>
                已完成
              </Tag>
            ) : (
              <Tag icon={<ClockCircleOutlined />} color="processing" style={{ fontSize: '14px', padding: '4px 12px' }}>
                进行中
              </Tag>
            )}
            
            {parallelExecution ? (
              <Tag icon={<ThunderboltOutlined />} color="blue">
                并行执行
              </Tag>
            ) : (
              <Tag icon={<RightOutlined />} color="default">
                串行执行
              </Tag>
            )}
          </Space>

          {!detail.completed && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleContinue}
              size="small"
            >
              继续执行
            </Button>
          )}
        </div>

        {/* Progress */}
        <div>
          <div style={{ marginBottom: '8px' }}>
            <Text strong>执行进度</Text>
            <Text type="secondary" style={{ marginLeft: '8px' }}>
              {stats.completed}/{stats.total} 个节点已完成
            </Text>
          </div>
          <Progress 
            percent={getProgressPercent()} 
            status={detail.completed ? 'success' : 'active'}
            strokeColor={detail.completed ? '#52c41a' : '#1890ff'}
            trailColor="#f0f0f0"
          />
          <div style={{ marginTop: '8px' }}>
            <Space>
              <Tag color="success">已完成: {stats.completed}</Tag>
              <Tag color="processing">等待中: {stats.pending}</Tag>
              {stats.error > 0 && <Tag color="error">错误: {stats.error}</Tag>}
            </Space>
          </div>
        </div>

        {/* Basic Information */}
        <Descriptions column={1} size="small" labelStyle={{ fontWeight: 'bold', width: '120px' }}>
          <Descriptions.Item label="图名称">
            {detail.graph_name}
          </Descriptions.Item>
          <Descriptions.Item label="会话ID">
            <Text code copyable={{ text: detail.conversation_id }}>
              {detail.conversation_id}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {detail.start_time ? formatDistanceToNow(new Date(detail.start_time), { addSuffix: true }) : '未知'}
          </Descriptions.Item>
          <Descriptions.Item label="节点总数">
            {Object.keys(detail.node_states || {}).length}
          </Descriptions.Item>
          <Descriptions.Item label="全局输出">
            {Object.keys(detail.global_outputs || {}).length} 个节点
          </Descriptions.Item>
          <Descriptions.Item label="附件">
            {detail.attachments?.length || 0} 个文件
          </Descriptions.Item>
        </Descriptions>

        {/* Input */}
        <CollapsibleContent
          content={detail.input || '暂无输入'}
          contentId="overview-input"
          title="输入"
        />

        {/* Output */}
        {detail.output && (
          <CollapsibleContent
            content={detail.output}
            contentId="overview-output"
            title="输出"
          />
        )}

      </Space>
    </div>
  );
};

export default OverviewContent;