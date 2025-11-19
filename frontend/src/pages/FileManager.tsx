import React, { useState, useEffect } from 'react';
import { Layout, Input, Card, Row, Col, Space, Typography, Spin, Empty, Tag, Collapse, App } from 'antd';
import {
  Search as SearchIcon,
  Download,
  Edit,
  FolderOpen,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';

const { Panel } = Collapse;
import conversationFileService from '../services/conversationFileService';
import { ConversationService } from '../services/conversationService';
import FileViewModal from '../components/conversation-file/FileViewModal';
import { ConversationSummary } from '../types/conversation';
import { downloadBlob } from '../utils/fileUtils';
import FileIcon from '../components/conversation-file/FileIcon';
import { useT } from '../i18n/hooks';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface FileItem {
  filename: string;
  conversationId: string;
  conversationTitle: string;
}

interface ConversationGroup {
  conversationId: string;
  conversationTitle: string;
  files: FileItem[];
}

const FileManager: React.FC = () => {
  const t = useT();
  const { message } = App.useApp();
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [groupedConversations, setGroupedConversations] = useState<ConversationGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<ConversationGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ filename: string; conversationId: string } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadAllFiles();
  }, []);

  useEffect(() => {
    // 分组文件
    const grouped = groupFilesByConversation(allFiles);
    setGroupedConversations(grouped);
    setFilteredGroups(grouped);
  }, [allFiles]);

  useEffect(() => {
    // 搜索过滤
    if (!searchText.trim()) {
      setFilteredGroups(groupedConversations);
    } else {
      const keyword = searchText.toLowerCase();
      const filtered = groupedConversations
        .map(group => ({
          ...group,
          files: group.files.filter(file =>
            file.filename.toLowerCase().includes(keyword) ||
            file.conversationTitle.toLowerCase().includes(keyword)
          )
        }))
        .filter(group => group.files.length > 0);
      setFilteredGroups(filtered);
    }
  }, [searchText, groupedConversations]);

  const groupFilesByConversation = (files: FileItem[]): ConversationGroup[] => {
    const groupMap = new Map<string, ConversationGroup>();

    files.forEach(file => {
      if (!groupMap.has(file.conversationId)) {
        groupMap.set(file.conversationId, {
          conversationId: file.conversationId,
          conversationTitle: file.conversationTitle,
          files: []
        });
      }
      groupMap.get(file.conversationId)!.files.push(file);
    });

    return Array.from(groupMap.values());
  };

  const loadAllFiles = async () => {
    setLoading(true);
    try {
      // 1. 获取所有对话
      const conversationsResponse = await ConversationService.getConversations();
      const conversations = conversationsResponse.conversations;

      // 2. 为每个对话获取文件列表
      const filePromises = conversations.map(async (conv: ConversationSummary) => {
        try {
          const filesResponse = await conversationFileService.listFiles(conv._id);
          return filesResponse.files.map((filename) => ({
            filename,
            conversationId: conv._id,
            conversationTitle: conv.title,
          }));
        } catch (error) {
          console.error(`获取对话 ${conv._id} 的文件失败:`, error);
          return [];
        }
      });

      const filesArrays = await Promise.all(filePromises);
      const allFilesFlat = filesArrays.flat();

      setAllFiles(allFilesFlat);
    } catch (error: any) {
      message.error(t('pages.fileManager.loadFailed', { error: error.message }));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleEdit = (file: FileItem) => {
    setSelectedFile({
      filename: file.filename,
      conversationId: file.conversationId,
    });
    setModalVisible(true);
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const blob = await conversationFileService.downloadFile(file.conversationId, file.filename);
      const filename = file.filename.split('/').pop() || file.filename;
      downloadBlob(blob, filename);
      message.success(t('pages.fileManager.downloadSuccess'));
    } catch (error: any) {
      message.error(t('pages.fileManager.downloadFailed', { error: error.message }));
    }
  };

  const handleDownloadAll = async (conversationId: string) => {
    try {
      const blob = await conversationFileService.downloadAllFiles(conversationId);
      downloadBlob(blob, `conversation_${conversationId}_files.zip`);
      message.success(t('pages.fileManager.downloadAllSuccess'));
    } catch (error: any) {
      message.error(t('pages.fileManager.downloadAllFailed', { error: error.message }));
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedFile(null);
  };

  const handleFileSaved = () => {
    // 文件保存后刷新列表
    loadAllFiles();
  };

  const getFileDisplayName = (filename: string) => {
    return filename.split('/').pop() || filename;
  };

  const totalFilesCount = filteredGroups.reduce((sum, group) => sum + group.files.length, 0);

  return (
    <Layout style={{ height: '100vh', background: '#faf8f5', display: 'flex', flexDirection: 'column' }}>
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)'
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Space size="large">
            <FolderOpen size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              {t('pages.fileManager.title')}
            </Title>
            <Tag style={{
              background: 'rgba(184, 88, 69, 0.08)',
              color: '#b85845',
              border: '1px solid rgba(184, 88, 69, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {t('pages.fileManager.filesCount', { count: totalFilesCount })}
            </Tag>
            <Tag style={{
              background: 'rgba(139, 115, 85, 0.08)',
              color: '#8b7355',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {t('pages.fileManager.conversationsCount', { count: filteredGroups.length })}
            </Tag>
          </Space>
          <Input
            placeholder={t('pages.fileManager.searchPlaceholder')}
            allowClear
            prefix={<SearchIcon size={16} strokeWidth={1.5} style={{ color: '#8b7355', marginRight: '4px' }} />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: 320,
              height: '40px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              color: '#2d2d2d',
              letterSpacing: '0.3px'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#b85845';
              e.target.style.boxShadow = '0 0 0 3px rgba(184, 88, 69, 0.08), 0 1px 3px rgba(139, 115, 85, 0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)';
              e.target.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
            }}
          />
        </div>
      </Header>

      <Content style={{ flex: 1, padding: '48px 64px', overflow: 'auto' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <Spin size="large" tip={t('pages.fileManager.loadingFiles')} />
          </div>
        ) : filteredGroups.length === 0 ? (
          <Empty
            description={
              searchText ? t('pages.fileManager.noMatchingFiles', { search: searchText }) : t('pages.fileManager.noFiles')
            }
            style={{ marginTop: '120px', color: 'rgba(45, 45, 45, 0.5)' }}
          />
        ) : (
          <Collapse
            defaultActiveKey={[]}
            expandIconPosition="end"
            style={{
              background: 'transparent',
              border: 'none'
            }}
            expandIcon={({ isActive }) => (
              <ChevronDown
                size={18}
                strokeWidth={2}
                style={{
                  color: '#8b7355',
                  transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease'
                }}
              />
            )}
          >
            {filteredGroups.map((group) => (
              <Panel
                key={group.conversationId}
                header={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                    <MessageSquare size={18} color="#b85845" strokeWidth={1.5} />
                    <Text strong style={{
                      fontSize: '14px',
                      color: '#2d2d2d',
                      fontWeight: 500,
                      letterSpacing: '0.3px',
                      flex: 1
                    }}>
                      {group.conversationTitle}
                    </Text>
                    <Tag style={{
                      background: 'rgba(139, 115, 85, 0.08)',
                      color: '#8b7355',
                      border: '1px solid rgba(139, 115, 85, 0.2)',
                      borderRadius: '6px',
                      fontWeight: 500,
                      fontSize: '12px',
                      margin: 0
                    }}>
                      {group.files.length}
                    </Tag>
                    <Download
                      size={16}
                      strokeWidth={1.5}
                      style={{ color: '#8b7355', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAll(group.conversationId);
                      }}
                    />
                  </div>
                }
                style={{
                  marginBottom: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(139, 115, 85, 0.15)',
                  background: 'rgba(250, 248, 245, 0.6)',
                  overflow: 'hidden'
                }}
              >
                <Row gutter={[12, 12]} style={{ marginTop: '8px' }}>
                  {group.files.map((file) => (
                    <Col key={`${file.conversationId}-${file.filename}`} xs={24} sm={12} md={12} lg={8} xl={6}>
                      <Card
                        hoverable
                        style={{
                          borderRadius: '6px',
                          border: '1px solid rgba(139, 115, 85, 0.15)',
                          boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
                          transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                          background: 'rgba(255, 255, 255, 0.85)',
                          height: '100%'
                        }}
                        styles={{
                          body: { padding: '10px 12px' }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.12)';
                          e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06)';
                          e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flexShrink: 0, width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileIcon filename={file.filename} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              strong
                              style={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#2d2d2d',
                                letterSpacing: '0.3px',
                                marginBottom: file.filename.includes('/') ? '3px' : 0
                              }}
                              title={getFileDisplayName(file.filename)}
                            >
                              {getFileDisplayName(file.filename)}
                            </Text>
                            {file.filename.includes('/') && (
                              <Text
                                type="secondary"
                                style={{
                                  fontSize: '12px',
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  color: 'rgba(45, 45, 45, 0.45)',
                                  fontFamily: 'Monaco, Courier New, monospace',
                                  letterSpacing: '0.1px'
                                }}
                                title={file.filename}
                              >
                                {file.filename}
                              </Text>
                            )}
                          </div>
                          <div style={{ flexShrink: 0, display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <div
                              style={{
                                color: '#8b7355',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(file);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#b85845';
                                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#8b7355';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Edit size={15} strokeWidth={1.5} />
                            </div>
                            <div
                              style={{
                                color: '#8b7355',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#b85845';
                                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#8b7355';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Download size={15} strokeWidth={1.5} />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Panel>
            ))}
          </Collapse>
        )}
      </Content>

      {selectedFile && (
        <FileViewModal
          visible={modalVisible}
          filename={selectedFile.filename}
          conversationId={selectedFile.conversationId}
          onClose={handleModalClose}
          onSave={handleFileSaved}
        />
      )}
    </Layout>
  );
};

export default FileManager;
