// src/components/chat/drawer/DocumentsDrawer.tsx
import React from 'react';
import { Drawer, List, Empty, Typography, Button, App } from 'antd';
import { FileOutlined, FileTextOutlined, FileImageOutlined, FilePdfOutlined } from '@ant-design/icons';
import { Download } from 'lucide-react';
import { ConversationDocuments, DocumentFile } from '../../../types/conversation';
import { useT } from '../../../i18n/hooks';
import conversationFileService from '../../../services/conversationFileService';
import { downloadBlob } from '../../../utils/fileUtils';
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
  conversationId,
  documents,
  onClose,
  onDocumentClick
}) => {
  const t = useT();
  const { message } = App.useApp();
  
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

    if (diffMins < 1) return t('components.documentsDrawer.justNow');
    if (diffMins < 60) return t('components.documentsDrawer.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('components.documentsDrawer.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('components.documentsDrawer.daysAgo', { count: diffDays });
    
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

  const handleDownloadAll = async () => {
    try {
      const blob = await conversationFileService.downloadAllFiles(conversationId);
      downloadBlob(blob, `conversation_${conversationId}_files.zip`);
      message.success(t('components.documentsDrawer.downloadAllSuccess'));
    } catch (error: any) {
      message.error(t('components.documentsDrawer.downloadAllFailed', { error: error.message }));
    }
  };

  const totalCount = documents?.total_count || 0;
  const files = documents?.files || [];

  return (
    <Drawer
      title={
        <div className="documents-drawer-title">
          <FileOutlined />
          <span>{t('components.documentsDrawer.title')}</span>
          {totalCount > 0 && (
            <>
              <span className="document-count">{totalCount}</span>
              <Button
                type="text"
                size="small"
                icon={<Download size={16} strokeWidth={1.5} />}
                onClick={handleDownloadAll}
                style={{
                  marginLeft: 'auto',
                  color: '#8b7355'
                }}
              />
            </>
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
              {t('components.documentsDrawer.noDocuments')}
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
