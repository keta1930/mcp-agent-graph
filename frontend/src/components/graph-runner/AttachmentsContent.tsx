// src/components/graph-runner/AttachmentsContent.tsx
import React, { useState } from 'react';
import { List, Typography, Space, Button, Tag, Empty, Tooltip, message } from 'antd';
import {
  FileTextOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  CalendarOutlined,
  CopyOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface AttachmentsContentProps {
  detail: any;
}

const AttachmentsContent: React.FC<AttachmentsContentProps> = ({ detail }) => {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  if (!detail || !detail.attachments || detail.attachments.length === 0) {
    return (
      <Empty 
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无附件"
        style={{ padding: '40px 0' }}
      />
    );
  }

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      case 'txt':
      case 'md':
        return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImageOutlined style={{ color: '#52c41a' }} />;
      default:
        return <FileOutlined style={{ color: '#666' }} />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCopyPath = (file: any) => {
    const path = file.path || file.name || '';
    navigator.clipboard.writeText(path);
    setCopiedPath(file.name);
    message.success('路径已复制到剪贴板');
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <List
      dataSource={detail.attachments}
      renderItem={(file: any) => (
        <List.Item
          style={{ padding: '16px 0' }}
          actions={[
            <Tooltip title={copiedPath === file.name ? '已复制!' : '复制路径'}>
              <Button 
                type="text" 
                icon={<CopyOutlined />} 
                size="small"
                onClick={() => handleCopyPath(file)}
                style={{ color: copiedPath === file.name ? '#52c41a' : undefined }}
              >
                {copiedPath === file.name ? '已复制' : '复制路径'}
              </Button>
            </Tooltip>
          ]}
        >
          <List.Item.Meta
            avatar={
              <div style={{ fontSize: '24px' }}>
                {getFileIcon(file.type)}
              </div>
            }
            title={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '14px' }}>{file.name}</Text>
                <Space size="small">
                  <Tag color="blue" size="small">{file.type.toUpperCase()}</Tag>
                  <Tag color="green" size="small">{formatFileSize(file.size)}</Tag>
                </Space>
              </Space>
            }
            description={
              <Space direction="vertical" size="small">
                <Space size="small">
                  <CalendarOutlined style={{ fontSize: '12px' }} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    修改时间: {file.modified}
                  </Text>
                </Space>
                {file.path && (
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: '12px', 
                      fontFamily: 'monospace',
                      wordBreak: 'break-all'
                    }}
                  >
                    路径: {file.path}
                  </Text>
                )}
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );
};

export default AttachmentsContent;