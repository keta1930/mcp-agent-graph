// src/components/graph-editor/GraphVersionManager.tsx
import React, { useState, useEffect } from 'react';
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
  Card
} from 'antd';
import {
  PlusOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import './GraphVersionManager.css';

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

  return (
    <>
      {contextHolder}
      <Modal
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        className="version-manager-modal"
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 创建新版本区域 */}
          <div className="version-create-section">
            <div className="section-title">
              为当前图配置创建版本快照，便于追踪变更历史和版本回退
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateVersionModalVisible(true)}
            >
              新版本
            </Button>
          </div>

          {/* 版本历史区域 */}
          <div className="version-history-section">
            <div className="version-history-title">
              <HistoryOutlined />
              <span>版本历史</span>
              <span className="version-history-count">({versions.length})</span>
            </div>

            {loadingVersions ? (
              <div className="version-loading">
                <Spin tip="加载版本列表中..." />
              </div>
            ) : versions.length === 0 ? (
              <div className="version-empty">
                <Empty
                  description={null}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
                <div className="version-empty-text">
                  暂无版本历史，点击上方"创建新版本"按钮保存当前配置
                </div>
              </div>
            ) : (
              <div>
                {versions.map((version, index) => (
                  <Card
                    key={version.version_id}
                    size="small"
                    className={index === 0 ? 'version-item latest' : 'version-item'}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {/* 第一行：元数据和操作按钮 */}
                      <div className="version-item-header">
                        <div className="version-item-meta">
                          <span className="version-item-id">
                            {version.version_id.substring(0, 16)}...
                          </span>
                          <Tooltip title={dayjs(version.created_at).format('YYYY-MM-DD HH:mm:ss')}>
                            <span className="version-item-meta-item">
                              {dayjs(version.created_at).fromNow()}
                            </span>
                          </Tooltip>
                          <span className="version-item-meta-item">
                            {formatFileSize(version.size)}
                          </span>
                          {index === 0 && (
                            <Tag className="latest-tag">最新版本</Tag>
                          )}
                        </div>
                        <Space className="version-item-actions">
                          <Button
                            type="link"
                            size="small"
                            onClick={() => handleLoadVersion(version.version_id, version.commit_message)}
                          >
                            加载
                          </Button>
                          <Popconfirm
                            title="确定要删除此版本吗？"
                            description="此操作不可撤销"
                            onConfirm={() => handleDeleteVersion(version.version_id)}
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              type="link"
                              danger
                              size="small"
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        </Space>
                      </div>

                      {/* 第二行：提交信息 */}
                      <div className="version-item-message">
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
        title="创建新版本"
        open={createVersionModalVisible}
        onOk={handleCreateVersion}
        onCancel={() => {
          setCreateVersionModalVisible(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
        className="create-version-modal"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="commit_message"
            label="提交信息"
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
            />
          </Form.Item>

          <div className="version-create-tips">
            <div className="version-create-tips-title">提示：</div>
            <ul>
              <li>提交信息应清晰描述此版本的主要变更</li>
              <li>版本将保存当前的完整图配置</li>
              <li>如果有未保存的更改，将自动先保存</li>
            </ul>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default GraphVersionManager;
