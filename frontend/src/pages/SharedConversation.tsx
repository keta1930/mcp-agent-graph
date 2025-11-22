// src/pages/SharedConversation.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message, Spin, Button, Typography, Empty, Drawer, List } from 'antd';
import { FileOutlined, DownloadOutlined } from '@ant-design/icons';
import { ConversationService } from '../services/conversationService';
import { SharedConversationResponse } from '../types/conversation';
import MessageDisplay from '../components/chat/message/MessageDisplay';
import { useT } from '../i18n/hooks';

const { Title, Text } = Typography;

const SharedConversation: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const t = useT();
  
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<SharedConversationResponse | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    if (!shareId) {
      setError(t('pages.sharedConversation.invalidShareLink'));
      setLoading(false);
      return;
    }

    loadSharedConversation();
    loadSharedFiles();
  }, [shareId]);

  const loadSharedConversation = async () => {
    if (!shareId) return;

    try {
      setLoading(true);
      const data = await ConversationService.getSharedConversation(shareId);
      setConversation(data);
      setError(null);
    } catch (error: any) {
      console.error('加载分享对话失败:', error);
      if (error.response?.status === 404) {
        setError(t('pages.sharedConversation.notFound'));
      } else {
        setError(t('pages.sharedConversation.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSharedFiles = async () => {
    if (!shareId) return;

    try {
      setFilesLoading(true);
      const fileList = await ConversationService.getSharedFiles(shareId);
      setFiles(fileList);
    } catch (error: any) {
      console.error('加载文件列表失败:', error);
      // 文件列表加载失败不影响主要内容显示
    } finally {
      setFilesLoading(false);
    }
  };

  const handleDownloadFile = async (filename: string) => {
    if (!shareId) return;

    try {
      setDownloadingFile(filename);
      const blob = await ConversationService.downloadSharedFile(shareId, filename);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(t('pages.sharedConversation.downloadSuccess'));
    } catch (error: any) {
      console.error('下载文件失败:', error);
      message.error(t('pages.sharedConversation.downloadFailed'));
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!shareId) return;

    try {
      setDownloadingAll(true);
      const blob = await ConversationService.downloadAllSharedFiles(shareId);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversation_${shareId}_files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(t('pages.sharedConversation.downloadAllSuccess'));
    } catch (error: any) {
      console.error('批量下载失败:', error);
      message.error(t('pages.sharedConversation.downloadAllFailed'));
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#faf8f5'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#faf8f5',
        padding: '32px'
      }}>
        <Empty
          description={error || t('pages.sharedConversation.notFound')}
          style={{ marginBottom: '24px' }}
        />
        <Button
          type="primary"
          onClick={() => navigate('/')}
          style={{
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: 'none',
            borderRadius: '6px'
          }}
        >
          {t('pages.sharedConversation.backToHome')}
        </Button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f5',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 头部 */}
      <div style={{
        padding: '24px 48px',
        background: 'linear-gradient(to bottom, rgba(250, 248, 245, 0.95), rgba(245, 243, 240, 0.9))',
        borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <Title level={3} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '0.5px'
            }}>
              {conversation.title}
            </Title>
            <Text style={{
              fontSize: '13px',
              color: 'rgba(45, 45, 45, 0.65)',
              marginTop: '4px',
              display: 'block'
            }}>
              {t('pages.sharedConversation.sharedConversation')}
            </Text>
          </div>
          {files.length > 0 && (
            <Button
              icon={<FileOutlined />}
              onClick={() => setDrawerVisible(true)}
              style={{
                color: '#8b7355',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.6)'
              }}
            >
              {t('pages.sharedConversation.files')} ({files.length})
            </Button>
          )}
        </div>
      </div>

      {/* 主内容区域 */}
      <div style={{
        flex: 1,
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* 对话内容 */}
        <div style={{
          overflow: 'auto',
          borderRadius: '8px',
          border: '1px solid rgba(139, 115, 85, 0.15)',
          boxShadow: '0 2px 8px rgba(139, 115, 85, 0.06)',
          background: 'rgba(255, 255, 255, 0.85)'
        }}>
          <MessageDisplay
            conversation={{
              conversation_id: conversation.conversation_id,
              title: conversation.title,
              rounds: conversation.rounds,
              type: conversation.type,
              tasks: conversation.tasks,
              execution_chain: conversation.execution_chain,
              final_result: conversation.final_result
            }}
            enhancedStreamingState={{
              isStreaming: false,
              blocks: [],
              error: null,
              nodeInfo: null
            }}
            pendingUserMessage={null}
            currentMode={conversation.type}
          />
        </div>
      </div>

      {/* 文件抽屉 */}
      <Drawer
        title={t('pages.sharedConversation.files')}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={320}
        styles={{
          body: { padding: '12px' }
        }}
      >
        {filesLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : files.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('pages.sharedConversation.noFiles')}
          />
        ) : (
          <>
            {files.length > 1 && (
              <Button
                block
                onClick={handleDownloadAll}
                loading={downloadingAll}
                disabled={downloadingAll}
                style={{
                  marginBottom: '16px',
                  color: '#8b7355',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  borderRadius: '6px'
                }}
              >
                {t('pages.sharedConversation.downloadAll')}
              </Button>
            )}
            <List
              dataSource={files}
              renderItem={(filename) => (
                <List.Item
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(139, 115, 85, 0.15)',
                    background: 'rgba(250, 248, 245, 0.6)',
                    marginBottom: '8px'
                  }}
                  extra={
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      loading={downloadingFile === filename}
                      disabled={downloadingFile === filename}
                      onClick={() => handleDownloadFile(filename)}
                      style={{
                        color: '#8b7355'
                      }}
                    />
                  }
                >
                  <List.Item.Meta
                    avatar={<FileOutlined style={{ fontSize: '20px', color: '#8b7355' }} />}
                    title={
                      <Text
                        style={{ fontSize: '14px', color: '#2d2d2d' }}
                        ellipsis={{ tooltip: filename }}
                      >
                        {filename}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default SharedConversation;
