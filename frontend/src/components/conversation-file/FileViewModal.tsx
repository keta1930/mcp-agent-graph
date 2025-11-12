import React, { useState, useEffect } from 'react';
import { Modal, Button, Space, Typography, message, Spin } from 'antd';
import {
  Save,
  Download,
  Trash2,
  History,
  FileText,
} from 'lucide-react';
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
  const [activeView, setActiveView] = useState<'editor' | 'history'>('editor');

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

  return (
    <Modal
      title={
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%'
        }}>
          <Space size="middle">
            <FileText size={20} style={{ color: '#b85845' }} />
            <Text strong style={{ fontSize: '16px', letterSpacing: '1px' }}>{filename}</Text>
            {isDirty && <Text style={{ color: '#d4a574', fontSize: '16px' }}>●</Text>}
          </Space>
          <Space size="small">
            <Button
              type={activeView === 'editor' ? 'primary' : 'default'}
              size="small"
              icon={<FileText size={14} />}
              onClick={() => setActiveView('editor')}
              style={{
                borderRadius: '6px',
                height: '32px',
                fontWeight: 500,
                letterSpacing: '0.5px',
                ...(activeView === 'editor' ? {
                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                  border: 'none',
                  color: '#fff'
                } : {
                  border: '1px solid rgba(139, 115, 85, 0.25)',
                  color: '#8b7355',
                  background: 'transparent'
                })
              }}
            >
              编辑器
            </Button>
            <Button
              type={activeView === 'history' ? 'primary' : 'default'}
              size="small"
              icon={<History size={14} />}
              onClick={() => setActiveView('history')}
              style={{
                borderRadius: '6px',
                height: '32px',
                fontWeight: 500,
                letterSpacing: '0.5px',
                ...(activeView === 'history' ? {
                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                  border: 'none',
                  color: '#fff'
                } : {
                  border: '1px solid rgba(139, 115, 85, 0.25)',
                  color: '#8b7355',
                  background: 'transparent'
                })
              }}
            >
              版本历史
            </Button>
          </Space>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      width="92%"
      style={{
        top: 20,
        paddingBottom: 0
      }}
      styles={{
        header: {
          background: 'transparent',
          borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
          padding: '24px 32px'
        },
        body: {
          padding: 0,
          background: 'rgba(250, 248, 245, 0.3)',
          overflow: 'hidden'
        },
        footer: {
          borderTop: '1px solid rgba(139, 115, 85, 0.15)',
          padding: '20px 32px',
          background: 'rgba(250, 248, 245, 0.5)'
        }
      }}
      footer={
        <Space size="middle">
          <Button
            onClick={handleClose}
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              color: '#8b7355',
              fontWeight: 500,
              letterSpacing: '0.5px'
            }}
          >
            关闭
          </Button>
          <Button
            icon={<Download size={16} />}
            onClick={handleDownload}
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              color: '#8b7355',
              fontWeight: 500,
              letterSpacing: '0.5px'
            }}
          >
            下载
          </Button>
          <Button
            icon={<Trash2 size={16} />}
            danger
            onClick={handleDelete}
            style={{
              borderRadius: '6px',
              fontWeight: 500,
              letterSpacing: '0.5px'
            }}
          >
            删除
          </Button>
          <Button
            type="primary"
            icon={<Save size={16} />}
            onClick={handleSave}
            disabled={!isDirty}
            loading={saving}
            style={{
              background: isDirty ? 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)' : undefined,
              border: 'none',
              borderRadius: '6px',
              boxShadow: isDirty ? '0 2px 8px rgba(184, 88, 69, 0.25)' : undefined,
              fontWeight: 500,
              letterSpacing: '0.5px'
            }}
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
          <div style={{
            marginBottom: '24px',
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 248, 245, 0.85) 100%)',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            borderRadius: '8px',
            boxShadow: '0 1px 4px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.7)'
          }}>
            <Space split={<span style={{ color: 'rgba(139, 115, 85, 0.3)', margin: '0 12px' }}>|</span>}>
              <Text type="secondary" style={{
                fontSize: '13px',
                color: 'rgba(45, 45, 45, 0.75)',
                letterSpacing: '0.3px'
              }}>
                <strong style={{ fontWeight: 600, color: '#8b7355' }}>路径:</strong> {fileDetail.filename}
              </Text>
              <Text type="secondary" style={{
                fontSize: '13px',
                color: 'rgba(45, 45, 45, 0.75)',
                letterSpacing: '0.3px'
              }}>
                <strong style={{ fontWeight: 600, color: '#8b7355' }}>描述:</strong> {fileDetail.summary}
              </Text>
              <Text type="secondary" style={{
                fontSize: '13px',
                color: 'rgba(45, 45, 45, 0.75)',
                letterSpacing: '0.3px'
              }}>
                <strong style={{ fontWeight: 600, color: '#8b7355' }}>版本:</strong> {fileDetail.versions.length}
              </Text>
            </Space>
          </div>
          {activeView === 'editor' ? (
            isMarkdownFile(filename || '') ? (
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
            )
          ) : (
            <div style={{ height: '60vh' }}>
              <FileVersionHistory
                filename={filename || ''}
                conversationId={conversationId}
                versions={fileDetail.versions}
                currentContent={content}
              />
            </div>
          )}
        </>
      ) : null}
    </Modal>
  );
};

export default FileViewModal;
