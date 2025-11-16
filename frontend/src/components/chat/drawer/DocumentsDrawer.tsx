// src/components/chat/drawer/DocumentsDrawer.tsx
import React from 'react';
import { Drawer, List, Empty, Typography } from 'antd';
import { FileOutlined, FileTextOutlined, FileImageOutlined, FilePdfOutlined } from '@ant-design/icons';
import { ConversationDocuments, DocumentFile } from '../../../types/conversation';
import './DocumentsDrawer.css';

const { Text } = Typography;

interface DocumentsDrawerProps {
  visible: boolean;
  conversationId: string;
  documents?: ConversationDocuments;
  onClose: () => void;
  onDocumentClick?: (filename: string) => void;
}

const DocumentsDrawer: React.FC<DocumentsDrawerProps> = ({
  visible,
  documents,
  onClose,
  onDocumentClick
}) => {
  // 根据文件名返回对应的图标
  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop() || '';
    if (['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'log'].includes(ext)) {
      return <FileTextOutlined style={{ fontSize: '20px', color: '#1890ff' }} />;
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
      return <FileImageOutlined style={{ fontSize: '20px', color: '#52c41a' }} />;
    }
    if (ext === 'pdf') {
      return <FilePdfOutlined style={{ fontSize: '20px', color: '#f5222d' }} />;
    }
    return <FileOutlined style={{ fontSize: '20px', color: '#8b7355' }} />;
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleDocumentClick = (filename: string) => {
    if (onDocumentClick) {
      onDocumentClick(filename);
    }
  };

  const totalCount = documents?.total_count || 0;
  const files = documents?.files || [];

  return (
    <Drawer
      title={
        <div className="documents-drawer-title">
          <FileOutlined />
          <span>对话文档</span>
          {totalCount > 0 && (
            <span className="document-count">{totalCount}</span>
          )}
        </div>
      }
      placement="right"
      onClose={onClose}
      open={visible}
      width={400}
      className="documents-drawer"
    >
      {totalCount === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="empty-description">
              暂无文档
            </span>
          }
        />
      ) : (
        <List
          dataSource={files}
          renderItem={(file: DocumentFile) => (
            <List.Item
              className="document-list-item"
              onClick={() => handleDocumentClick(file.filename)}
            >
              <List.Item.Meta
                avatar={getFileIcon(file.filename)}
                title={
                  <Text className="document-title" ellipsis={{ tooltip: file.filename }}>
                    {file.filename}
                  </Text>
                }
                description={
                  <div className="document-meta">
                    <Text type="secondary" className="document-type">
                      {(file.size / 1024).toFixed(2)} KB
                    </Text>
                    <Text type="secondary" className="document-date">
                      {formatDate(file.created_at)}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
};

export default DocumentsDrawer;
