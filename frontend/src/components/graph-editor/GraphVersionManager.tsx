// src/components/graph-editor/GraphVersionManager.tsx
import React, { useState, useEffect, CSSProperties } from 'react';
import {
  Modal,
  Button,
  Form,
  Input,
  Spin,
  Empty,
  Space,
  Tag,
  Tooltip,
  message,
  Popconfirm,
  Card,
  ConfigProvider,
  App
} from 'antd';
import {
  Plus,
  History
} from 'lucide-react';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { useT } from '../../i18n/hooks';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';

// Configure dayjs
dayjs.extend(relativeTime);

const { TextArea } = Input;

interface GraphVersionManagerProps {
  visible: boolean;
  onClose: () => void;
  graphName: string;
}

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 图版本管理组件
 */
const GraphVersionManager: React.FC<GraphVersionManagerProps> = ({
  visible,
  onClose,
  graphName
}) => {
  const t = useT();
  const { modal } = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();
  const {
    versions,
    loadingVersions,
    fetchVersions,
    createVersion,
    loadVersion,
    deleteVersion,
    dirty
  } = useGraphEditorStore();

  const [createVersionModalVisible, setCreateVersionModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Set dayjs locale based on current language
  useEffect(() => {
    const currentLang = localStorage.getItem('language') || 'zh';
    dayjs.locale(currentLang === 'zh' ? 'zh-cn' : 'en');
  }, []);

  // Load version list
  useEffect(() => {
    if (visible && graphName) {
      fetchVersions(graphName).catch((error) => {
        messageApi.error(t('components.graphEditor.versionManager.versionListLoadFailed', { error: error.message }));
      });
    }
  }, [visible, graphName, fetchVersions, t, messageApi]);

  // Handle create new version
  const handleCreateVersion = async () => {
    try {
      const values = await form.validateFields();
      await createVersion(graphName, values.commit_message);
      messageApi.success(t('components.graphEditor.versionManager.versionCreated'));
      setCreateVersionModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      if (error.errorFields) {
        // Form validation error
        return;
      }
      messageApi.error(t('components.graphEditor.versionManager.versionCreateFailed', { error: error.message || String(error) }));
    }
  };

  // Handle load version
  const handleLoadVersion = async (versionId: string, commitMessage: string) => {
    // If there are unsaved changes, prompt first
    if (dirty) {
      modal.confirm({
        title: t('components.graphEditor.versionManager.unsavedChanges'),
        content: t('components.graphEditor.versionManager.unsavedChangesMessage'),
        onOk: async () => {
          try {
            await loadVersion(graphName, versionId);
            messageApi.success(t('components.graphEditor.versionManager.versionLoaded', { message: commitMessage }));
            onClose();
          } catch (error: any) {
            messageApi.error(t('components.graphEditor.versionManager.versionLoadFailed', { error: error.message || String(error) }));
          }
        },
        okButtonProps: {
          style: {
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: 'none',
            borderRadius: '6px'
          }
        }
      });
    } else {
      try {
        await loadVersion(graphName, versionId);
        messageApi.success(t('components.graphEditor.versionManager.versionLoaded', { message: commitMessage }));
        onClose();
      } catch (error: any) {
        messageApi.error(t('components.graphEditor.versionManager.versionLoadFailed', { error: error.message || String(error) }));
      }
    }
  };

  // Handle delete version
  const handleDeleteVersion = async (versionId: string) => {
    try {
      await deleteVersion(graphName, versionId);
      messageApi.success(t('components.graphEditor.versionManager.versionDeleted'));
    } catch (error: any) {
      messageApi.error(t('components.graphEditor.versionManager.versionDeleteFailed', { error: error.message || String(error) }));
    }
  };

  // 样式定义
  const createSectionStyle: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(139, 115, 85, 0.15)',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 2px 6px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: '14px',
    color: 'rgba(45, 45, 45, 0.65)',
    flex: 1,
    letterSpacing: '0.3px',
    lineHeight: 1.6
  };

  const historyTitleStyle: CSSProperties = {
    fontSize: '16px',
    fontWeight: 500,
    color: '#2d2d2d',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    letterSpacing: '0.5px'
  };

  const historyCountStyle: CSSProperties = {
    color: 'rgba(45, 45, 45, 0.45)',
    fontSize: '14px',
    fontWeight: 400
  };

  const versionItemStyle: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(139, 115, 85, 0.15)',
    borderRadius: '8px',
    marginBottom: '12px',
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
  };

  const latestVersionItemStyle: CSSProperties = {
    ...versionItemStyle,
    border: '1px solid rgba(184, 88, 69, 0.25)',
    boxShadow: '0 2px 6px rgba(184, 88, 69, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
  };

  const versionHeaderStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  };

  const versionMetaStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    color: 'rgba(45, 45, 45, 0.65)',
    fontSize: '13px',
    flex: 1,
    letterSpacing: '0.3px'
  };

  const versionIdStyle: CSSProperties = {
    fontSize: '12px',
    color: 'rgba(45, 45, 45, 0.45)',
    fontFamily: 'Monaco, Menlo, monospace',
    width: '160px',
    display: 'inline-block'
  };

  const versionMessageStyle: CSSProperties = {
    color: '#2d2d2d',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: 1.6,
    letterSpacing: '0.3px'
  };

  const emptyStyle: CSSProperties = {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'rgba(45, 45, 45, 0.45)'
  };

  const emptyTextStyle: CSSProperties = {
    fontSize: '14px',
    color: 'rgba(45, 45, 45, 0.45)',
    marginTop: '12px',
    letterSpacing: '0.3px'
  };

  const loadingStyle: CSSProperties = {
    textAlign: 'center',
    padding: '60px 20px'
  };

  const tipsStyle: CSSProperties = {
    padding: '16px',
    background: 'rgba(184, 88, 69, 0.06)',
    borderRadius: '6px',
    borderLeft: '3px solid #b85845',
    marginTop: '16px'
  };

  const tipsTitleStyle: CSSProperties = {
    fontWeight: 500,
    color: '#2d2d2d',
    marginBottom: '8px',
    fontSize: '13px',
    letterSpacing: '0.3px'
  };

  const tipsListStyle: CSSProperties = {
    margin: '8px 0 0 20px',
    padding: 0,
    listStyle: 'disc'
  };

  const tipsItemStyle: CSSProperties = {
    color: 'rgba(45, 45, 45, 0.65)',
    fontSize: '12px',
    lineHeight: 1.8,
    letterSpacing: '0.3px'
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#b85845',
          colorPrimaryHover: '#a0826d',
          colorBorder: 'rgba(139, 115, 85, 0.2)',
          colorText: '#2d2d2d',
          borderRadius: 6,
        },
      }}
    >
      {contextHolder}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} strokeWidth={1.5} style={{ color: '#b85845' }} />
            <span style={{ fontSize: '16px', fontWeight: 500, color: '#2d2d2d', letterSpacing: '0.5px' }}>
              {t('components.graphEditor.versionManager.title')}
            </span>
          </div>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        styles={{
          content: {
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)',
            background: 'linear-gradient(to bottom, #faf8f5 0%, #f5f3f0 100%)'
          },
          header: {
            background: 'rgba(255, 255, 255, 0.6)',
            borderBottom: '1px solid rgba(139, 115, 85, 0.1)',
            borderRadius: '8px 8px 0 0',
            padding: '20px 24px'
          },
          body: {
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '24px'
          }
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Create new version section */}
          <div style={createSectionStyle}>
            <div style={sectionTitleStyle}>
              {t('components.graphEditor.versionManager.pageDescription')}
            </div>
            <Button
              type="primary"
              icon={<Plus size={16} strokeWidth={1.5} />}
              onClick={() => setCreateVersionModalVisible(true)}
              style={{
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                borderRadius: '6px',
                height: '36px',
                fontSize: '14px',
                fontWeight: 500,
                letterSpacing: '0.3px',
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                flexShrink: 0
              }}
            >
              {t('components.graphEditor.versionManager.createVersion')}
            </Button>
          </div>

          {/* Version history section */}
          <div>
            <div style={historyTitleStyle}>
              <History size={16} strokeWidth={1.5} style={{ color: '#b85845' }} />
              <span>{t('components.graphEditor.versionManager.versionHistory')}</span>
              <span style={historyCountStyle}>({versions.length} {t('components.graphEditor.versionManager.versions')})</span>
            </div>

            {loadingVersions ? (
              <div style={loadingStyle}>
                <Spin tip={t('components.graphEditor.versionManager.loading')} />
              </div>
            ) : versions.length === 0 ? (
              <div style={emptyStyle}>
                <Empty
                  description={null}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
                <div style={emptyTextStyle}>
                  {t('components.graphEditor.versionManager.noVersions')}
                </div>
              </div>
            ) : (
              <div>
                {versions.map((version, index) => (
                  <Card
                    key={version.version_id}
                    size="small"
                    style={index === 0 ? latestVersionItemStyle : versionItemStyle}
                    styles={{ body: { padding: '16px' } }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {/* 第一行：元数据和操作按钮 */}
                      <div style={versionHeaderStyle}>
                        <div style={versionMetaStyle}>
                          <span style={versionIdStyle}>
                            {version.version_id.substring(0, 16)}...
                          </span>
                          <Tooltip title={dayjs(version.created_at).format('YYYY-MM-DD HH:mm:ss')}>
                            <span style={{ width: '80px', display: 'inline-block' }}>
                              {dayjs(version.created_at).fromNow()}
                            </span>
                          </Tooltip>
                          <span style={{ width: '80px', display: 'inline-block' }}>
                            {formatFileSize(version.size)}
                          </span>
                          {index === 0 && (
                            <Tag style={{
                              background: 'rgba(184, 88, 69, 0.1)',
                              color: '#b85845',
                              border: '1px solid rgba(184, 88, 69, 0.3)',
                              borderRadius: '4px',
                              fontWeight: 500,
                              fontSize: '12px',
                              padding: '2px 10px'
                            }}>
                              {t('components.graphEditor.versionManager.latestVersion')}
                            </Tag>
                          )}
                        </div>
                        <Space>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => handleLoadVersion(version.version_id, version.commit_message)}
                            style={{
                              color: '#8b7355',
                              padding: '4px 8px',
                              borderRadius: '4px'
                            }}
                          >
                            {t('components.graphEditor.versionManager.load')}
                          </Button>
                          <Popconfirm
                            title={t('components.graphEditor.versionManager.deleteConfirm')}
                            description={t('components.graphEditor.versionManager.deleteConfirmDescription')}
                            onConfirm={() => handleDeleteVersion(version.version_id)}
                            okText={t('components.graphEditor.versionManager.deleteConfirmOk')}
                            cancelText={t('components.graphEditor.versionManager.deleteConfirmCancel')}
                            okButtonProps={{
                              danger: true,
                              style: {
                                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                                border: 'none',
                                borderRadius: '6px'
                              }
                            }}
                            cancelButtonProps={{
                              style: {
                                borderRadius: '6px',
                                border: '1px solid rgba(139, 115, 85, 0.2)',
                                color: '#8b7355'
                              }
                            }}
                          >
                            <Button
                              type="link"
                              danger
                              size="small"
                              style={{
                                color: '#b85845',
                                padding: '4px 8px',
                                borderRadius: '4px'
                              }}
                            >
                              {t('components.graphEditor.versionManager.delete')}
                            </Button>
                          </Popconfirm>
                        </Space>
                      </div>

                      {/* 第二行：提交信息 */}
                      <div style={versionMessageStyle}>
                        {version.commit_message}
                      </div>
                    </Space>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Space>
      </Modal>

      {/* Create version dialog */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} strokeWidth={1.5} style={{ color: '#b85845' }} />
            <span style={{ fontSize: '16px', fontWeight: 500, color: '#2d2d2d' }}>{t('components.graphEditor.versionManager.createVersionTitle')}</span>
          </div>
        }
        open={createVersionModalVisible}
        onOk={handleCreateVersion}
        onCancel={() => {
          setCreateVersionModalVisible(false);
          form.resetFields();
        }}
        okText={t('components.graphEditor.versionManager.create')}
        cancelText={t('components.graphEditor.versionManager.cancel')}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: 'none',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
          }
        }}
        cancelButtonProps={{
          style: {
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            color: '#8b7355'
          }
        }}
        styles={{
          content: {
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)'
          }
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="commit_message"
            label={<span style={{ fontWeight: 500, color: '#2d2d2d', fontSize: '14px' }}>{t('components.graphEditor.versionManager.commitMessage')}</span>}
            rules={[
              { required: true, message: t('components.graphEditor.versionManager.commitMessageRequired') },
              { min: 5, message: t('components.graphEditor.versionManager.commitMessageMinLength') },
              { max: 1000, message: t('components.graphEditor.versionManager.commitMessageMaxLength') }
            ]}
          >
            <TextArea
              rows={4}
              placeholder={t('components.graphEditor.versionManager.commitMessagePlaceholder')}
              showCount
              maxLength={1000}
              style={{
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                fontSize: '14px',
                letterSpacing: '0.3px'
              }}
            />
          </Form.Item>

          <div style={tipsStyle}>
            <div style={tipsTitleStyle}>{t('components.graphEditor.versionManager.tips')}</div>
            <ul style={tipsListStyle}>
              <li style={tipsItemStyle}>{t('components.graphEditor.versionManager.tip1')}</li>
              <li style={tipsItemStyle}>{t('components.graphEditor.versionManager.tip2')}</li>
              <li style={tipsItemStyle}>{t('components.graphEditor.versionManager.tip3')}</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </ConfigProvider>
  );
};

export default GraphVersionManager;
