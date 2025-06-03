// src/components/graph-runner/ResultsPanel.tsx
import React, { useEffect } from 'react';
import { Card, Tabs, Empty, Button, Space, Typography, Tag } from 'antd';
import {
  FileSearchOutlined,
  NodeIndexOutlined,
  GlobalOutlined,
  PaperClipOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useGraphRunnerStore } from '../../store/graphRunnerStore';
import NodeResultsContent from './NodeResultsContent';
import GlobalOutputsContent from './GlobalOutputsContent';
import AttachmentsContent from './AttachmentsContent';
import OverviewContent from './OverviewContent';

const { Title, Text } = Typography;

const ResultsPanel: React.FC = () => {
  const { 
    currentConversation, 
    conversationDetails, 
    refreshConversation,
    refreshing
  } = useGraphRunnerStore();

  const detail = currentConversation ? conversationDetails[currentConversation] : null;

  // 添加调试日志
  useEffect(() => {
    if (detail) {
      console.log('=== ResultsPanel Debug ===');
      console.log('当前会话详情:', detail);
      console.log('节点状态:', detail.node_states);
      console.log('全局输出:', detail.global_outputs);
    }
  }, [detail]);

  const handleRefresh = () => {
    if (currentConversation) {
      refreshConversation(currentConversation);
    }
  };

  if (!detail) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        height: '60vh',
        textAlign: 'center'
      }}>
        <FileSearchOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
        <Title level={4} style={{ color: '#8c8c8c' }}>未选择会话</Title>
        <Text type="secondary">选择或开始一个会话来查看结果</Text>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'overview',
      label: (
        <Space>
          <EyeOutlined />
          概览
        </Space>
      ),
      children: <OverviewContent detail={detail} />
    },
    {
      key: 'nodes',
      label: (
        <Space>
          <NodeIndexOutlined />
          节点结果
          {detail.node_states && (
            <Tag size="small" color="blue">
              {Object.keys(detail.node_states).length}
            </Tag>
          )}
        </Space>
      ),
      children: <NodeResultsContent detail={detail} />
    },
    {
      key: 'global',
      label: (
        <Space>
          <GlobalOutlined />
          全局输出
          {detail.global_outputs && (
            <Tag size="small" color="green">
              {Object.keys(detail.global_outputs).length}
            </Tag>
          )}
        </Space>
      ),
      children: <GlobalOutputsContent detail={detail} />
    },
    {
      key: 'attachments',
      label: (
        <Space>
          <PaperClipOutlined />
          附件
          {detail.attachments && detail.attachments.length > 0 && (
            <Tag size="small" color="orange">
              {detail.attachments.length}
            </Tag>
          )}
        </Space>
      ),
      children: <AttachmentsContent detail={detail} />
    }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <FileSearchOutlined style={{ color: '#1890ff' }} />
              <span>会话结果</span>
              {detail.completed ? (
                <Tag icon={<CheckCircleOutlined />} color="success">已完成</Tag>
              ) : (
                <Tag icon={<ClockCircleOutlined />} color="processing">进行中</Tag>
              )}
            </Space>
            
            <Button
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={handleRefresh}
              size="small"
            >
              刷新
            </Button>
          </div>
        }
        style={{ 
          minHeight: '70vh',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px'
        }}
        styles={{
          body: { padding: 0 }
        }}
      >
        <Tabs
          items={tabItems}
          defaultActiveKey="overview"
          style={{ 
            padding: '0 24px 24px 24px'
          }}
          tabBarStyle={{
            marginBottom: '24px',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0'
          }}
        />
      </Card>
    </div>
  );
};

export default ResultsPanel;