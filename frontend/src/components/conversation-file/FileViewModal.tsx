import React, { useState, useEffect } from 'react';
import { Modal, Button, Space, Typography, message, Spin, Tabs } from 'antd';
import {
  SaveOutlined,
  DownloadOutlined,
  DeleteOutlined,
  HistoryOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import conversationFileService from '../../services/conversationFileService';
import FileEditor from './FileEditor';
import MarkdownPreview from './MarkdownPreview';
import FileVersionHistory from './FileVersionHistory';
import { FileDetail } from '../../types/conversationFile';
import { isMarkdownFile, formatFileSize, downloadBlob } from '../../utils/fileUtils';

const { Text } = Typography;

interface FileViewModalProps {
  visible: boolean;
  filename: string | null;
  conversationId: string;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: () => void;
}

export const FileViewModal: React.FC<FileViewModalProps> = ({
  visible,
  filename,
  conversationId,
  onClose,
  onSave,
  onDelete,
}) => {
  const [fileDetail, setFileDetail] = useState<FileDetail | null>(null);
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && filename) {
      loadFile();
    }
  }, [visible, filename, conversationId]);

  const loadFile = async () => {
    if (!filename) return;
    setLoading(true);
    try {
      const response = await conversationFileService.getFile(conversationId, filename);
      setFileDetail(response.file);
      setContent(response.file.content);
      setOriginalContent(response.file.content);
      setIsDirty(false);
    } catch (error: any) {
      message.error('加载文件失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setIsDirty(value !== originalContent);
  };

  const handleSave = async () => {
    if (!filename) return;
    setSaving(true);
    try {
      await conversationFileService.updateFile(conversationId, filename, {
        content,
        summary: fileDetail?.summary || '',
        log: '从对话中编辑',
      });
      message.success('文件保存成功');
      setOriginalContent(content);
      setIsDirty(false);
      if (onSave) onSave();
      await loadFile();
    } catch (error: any) {
      message.error('保存文件失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!filename) return;
    try {
      const blob = await conversationFileService.downloadFile(conversationId, filename);
      downloadBlob(blob, filename.split('/').pop() || filename);
      message.success('文件下载成功');
    } catch (error: any) {
      message.error('下载文件失败: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!filename) return;
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除文件 "${filename}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await conversationFileService.deleteFile(conversationId, filename);
          message.success('文件删除成功');
          if (onDelete) onDelete();
          handleClose();
        } catch (error: any) {
          message.error('删除文件失败: ' + error.message);
        }
      },
    });
  };

  const handleClose = () => {
    if (isDirty) {
      Modal.confirm({
        title: '未保存的更改',
        content: '文件有未保存的更改，确定要关闭吗？',
        okText: '关闭',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => {
          setIsDirty(false);
          setContent('');
          setOriginalContent('');
          setFileDetail(null);
          onClose();
        },
      });
    } else {
      setContent('');
      setOriginalContent('');
      setFileDetail(null);
      onClose();
    }
  };

  const tabItems = fileDetail
    ? [
        {
          key: 'editor',
          label: (
            <span>
              <FileTextOutlined /> 编辑器
            </span>
          ),
          children: isMarkdownFile(filename || '') ? (
            <MarkdownPreview
              filename={filename || ''}
              content={content}
              onChange={handleContentChange}
              onSave={handleSave}
              isDirty={isDirty}
            />
          ) : (
            <div style={{ height: '60vh' }}>
              <FileEditor
                filename={filename || ''}
                content={content}
                onChange={handleContentChange}
                onSave={handleSave}
                isDirty={isDirty}
                loading={loading}
              />
            </div>
          ),
        },
        {
          key: 'history',
          label: (
            <span>
              <HistoryOutlined /> 版本历史
            </span>
          ),
          children: (
            <div style={{ height: '60vh' }}>
              <FileVersionHistory
                filename={filename || ''}
                conversationId={conversationId}
                versions={fileDetail.versions}
                currentContent={content}
              />
            </div>
          ),
        },
      ]
    : [];

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <Text strong>{filename}</Text>
          {isDirty && <Text type="warning">*</Text>}
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width="90%"
      style={{ top: 20 }}
      footer={
        <Space>
          <Button onClick={handleClose}>关闭</Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            下载
          </Button>
          <Button icon={<DeleteOutlined />} danger onClick={handleDelete}>
            删除
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!isDirty}
            loading={saving}
          >
            保存
          </Button>
        </Space>
      }
    >
      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '60vh',
          }}
        >
          <Spin size="large" tip="加载文件..." />
        </div>
      ) : fileDetail ? (
        <>
          <div style={{ marginBottom: '16px', padding: '8px', background: '#fafafa' }}>
            <Space split="|">
              <Text type="secondary">
                <strong>路径:</strong> {fileDetail.filename}
              </Text>
              <Text type="secondary">
                <strong>描述:</strong> {fileDetail.summary}
              </Text>
              <Text type="secondary">
                <strong>版本:</strong> {fileDetail.versions.length}
              </Text>
            </Space>
          </div>
          <Tabs items={tabItems} />
        </>
      ) : null}
    </Modal>
  );
};

export default FileViewModal;
