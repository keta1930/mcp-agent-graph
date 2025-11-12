import React, { useState, useEffect } from 'react';
import { Layout, Input, Card, Row, Col, Space, Typography, Spin, message, Empty, Tag } from 'antd';
import {
  SearchOutlined,
  FileOutlined,
  DownloadOutlined,
  EditOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import conversationFileService from '../services/conversationFileService';
import { ConversationService } from '../services/conversationService';
import FileViewModal from '../components/conversation-file/FileViewModal';
import { ConversationSummary } from '../types/conversation';
import { downloadBlob } from '../utils/fileUtils';
import FileIcon from '../components/conversation-file/FileIcon';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

interface FileItem {
  filename: string;
  conversationId: string;
  conversationTitle: string;
}

const FileManager: React.FC = () => {
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ filename: string; conversationId: string } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadAllFiles();
  }, []);

  useEffect(() => {
    // 搜索过滤
    if (!searchText.trim()) {
      setFilteredFiles(allFiles);
    } else {
      const keyword = searchText.toLowerCase();
      setFilteredFiles(
        allFiles.filter(
          (file) =>
            file.filename.toLowerCase().includes(keyword) ||
            file.conversationTitle.toLowerCase().includes(keyword)
        )
      );
    }
  }, [searchText, allFiles]);

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
      setFilteredFiles(allFilesFlat);
    } catch (error: any) {
      message.error('加载文件列表失败: ' + error.message);
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
      message.success('文件下载成功');
    } catch (error: any) {
      message.error('下载文件失败: ' + error.message);
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

  return (
    <Layout style={{ height: '100vh', background: '#f0f2f5' }}>
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <FolderOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              文件管理器
            </Title>
            <Tag color="blue">{filteredFiles.length} 个文件</Tag>
          </Space>
          <Search
            placeholder="搜索文件名或对话标题..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            style={{ width: 400 }}
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </Header>

      <Content style={{ padding: '24px', overflow: 'auto' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <Spin size="large" tip="加载文件中..." />
          </div>
        ) : filteredFiles.length === 0 ? (
          <Empty
            description={
              searchText ? `未找到匹配 "${searchText}" 的文件` : '暂无文件'
            }
            style={{ marginTop: '100px' }}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {filteredFiles.map((file) => (
              <Col key={`${file.conversationId}-${file.filename}`} xs={24} sm={12} md={8} lg={6} xl={4.8}>
                <Card
                  hoverable
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: '16px' }}
                  actions={[
                    <EditOutlined key="edit" onClick={() => handleEdit(file)} />,
                    <DownloadOutlined key="download" onClick={() => handleDownload(file)} />,
                  ]}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                      <FileIcon filename={file.filename} />
                    </div>
                    <Text
                      strong
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={getFileDisplayName(file.filename)}
                    >
                      {getFileDisplayName(file.filename)}
                    </Text>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: '12px',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={file.conversationTitle}
                    >
                      <FileOutlined /> {file.conversationTitle}
                    </Text>
                    {file.filename.includes('/') && (
                      <Text
                        type="secondary"
                        style={{
                          fontSize: '11px',
                          display: 'block',
                          marginTop: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={file.filename}
                      >
                        路径: {file.filename}
                      </Text>
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
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
