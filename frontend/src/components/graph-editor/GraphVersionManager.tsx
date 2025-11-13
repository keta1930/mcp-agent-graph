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
  ConfigProvider
} from 'antd';
import {
  Plus,
  History
} from 'lucide-react';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

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

  // 加载版本列表
  useEffect(() => {
    if (visible && graphName) {
      fetchVersions(graphName).catch((error) => {
        messageApi.error(`加载版本列表失败: ${error.message}`);
      });
    }
  }, [visible, graphName, fetchVersions]);

  // 处理创建新版本
  const handleCreateVersion = async () => {
    try {
      const values = await form.validateFields();
      await createVersion(graphName, values.commit_message);
      messageApi.success('版本创建成功');
      setCreateVersionModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      messageApi.error(`创建版本失败: ${error.message || String(error)}`);
    }
  };

  // 处理加载版本
  const handleLoadVersion = async (versionId: string, commitMessage: string) => {
    // 如果有未保存的更改，先提示
    if (dirty) {
      Modal.confirm({
        title: '未保存的更改',
        content: '当前图有未保存的更改。加载版本将覆盖这些更改。是否继续？',
        onOk: async () => {
          try {
            await loadVersion(graphName, versionId);
            messageApi.success(`已加载版本: ${commitMessage}`);
            onClose();
          } catch (error: any) {
            messageApi.error(`加载版本失败: ${error.message || String(error)}`);
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
        messageApi.success(`已加载版本: ${commitMessage}`);
        onClose();
      } catch (error: any) {
        messageApi.error(`加载版本失败: ${error.message || String(error)}`);
      }
    }
  };

  // 处理删除版本
  const handleDeleteVersion = async (versionId: string) => {
    try {
      await deleteVersion(graphName, versionId);
      messageApi.success('版本已删除');
    } catch (error: any) {
      messageApi.error(`删除版本失败: ${error.message || String(error)}`);
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
              版本管理
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
          {/* 创建新版本区域 */}
          <div style={createSectionStyle}>
            <div style={sectionTitleStyle}>
              为当前图配置创建版本快照，便于追踪变更历史和版本回退
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
              新版本
            </Button>
          </div>

          {/* 版本历史区域 */}
          <div>
            <div style={historyTitleStyle}>
              <History size={16} strokeWidth={1.5} style={{ color: '#b85845' }} />
              <span>版本历史</span>
              <span style={historyCountStyle}>({versions.length})</span>
            </div>

            {loadingVersions ? (
              <div style={loadingStyle}>
                <Spin tip="加载版本列表中..." />
              </div>
            ) : versions.length === 0 ? (
              <div style={emptyStyle}>
                <Empty
                  description={null}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
                <div style={emptyTextStyle}>
                  暂无版本历史，点击上方"新版本"按钮保存当前配置
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
                              最新版本
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
                            加载
                          </Button>
                          <Popconfirm
                            title="确定要删除此版本吗？"
                            description="此操作不可撤销"
                            onConfirm={() => handleDeleteVersion(version.version_id)}
                            okText="删除"
                            cancelText="取消"
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
                              删除
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

      {/* 创建版本对话框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} strokeWidth={1.5} style={{ color: '#b85845' }} />
            <span style={{ fontSize: '16px', fontWeight: 500, color: '#2d2d2d' }}>创建新版本</span>
          </div>
        }
        open={createVersionModalVisible}
        onOk={handleCreateVersion}
        onCancel={() => {
          setCreateVersionModalVisible(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
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
            label={<span style={{ fontWeight: 500, color: '#2d2d2d', fontSize: '14px' }}>提交信息</span>}
            rules={[
              { required: true, message: '请输入提交信息' },
              { min: 5, message: '提交信息至少5个字符' },
              { max: 1000, message: '提交信息不能超过1000个字符' }
            ]}
          >
            <TextArea
              rows={4}
              placeholder="描述本次版本的主要变更内容，例如：添加数据处理节点、优化提示词、修复连接错误等"
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
            <div style={tipsTitleStyle}>提示：</div>
            <ul style={tipsListStyle}>
              <li style={tipsItemStyle}>提交信息应清晰描述此版本的主要变更</li>
              <li style={tipsItemStyle}>版本将保存当前的完整图配置</li>
              <li style={tipsItemStyle}>如果有未保存的更改，将自动先保存</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </ConfigProvider>
  );
};

export default GraphVersionManager;
