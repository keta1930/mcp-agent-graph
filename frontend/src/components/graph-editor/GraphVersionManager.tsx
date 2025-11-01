// src/components/graph-editor/GraphVersionManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Timeline,
  Button,
  Form,
  Input,
  Spin,
  Empty,
  Typography,
  Space,
  Tag,
  Tooltip,
  message,
  Popconfirm,
  Card
} from 'antd';
import {
  BranchesOutlined,
  PlusOutlined,
  HistoryOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  FileOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 配置 dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Title } = Typography;
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
        title={
          <Space>
            <BranchesOutlined />
            <span>版本历史 - {graphName}</span>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>
        ]}
        width={800}
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 创建新版本按钮 */}
          <Card size="small" style={{ background: '#f6f8fa' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">
                为当前图配置创建版本快照，便于追踪变更历史和版本回退
              </Text>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateVersionModalVisible(true)}
                block
              >
                创建新版本
              </Button>
            </Space>
          </Card>

          {/* 版本列表 */}
          <div>
            <Title level={5}>
              <HistoryOutlined /> 版本历史 ({versions.length})
            </Title>

            <Spin spinning={loadingVersions}>
              {versions.length === 0 ? (
                <Empty
                  description="暂无版本历史"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Text type="secondary">
                    点击上方"创建新版本"按钮保存当前配置
                  </Text>
                </Empty>
              ) : (
                <Timeline
                  mode="left"
                  items={versions.map((version, index) => ({
                    color: index === 0 ? 'green' : 'blue',
                    dot: index === 0 ? <ClockCircleOutlined style={{ fontSize: '16px' }} /> : undefined,
                    children: (
                      <Card
                        size="small"
                        style={{ marginBottom: '16px' }}
                        extra={
                          <Space>
                            <Tooltip title="加载此版本">
                              <Button
                                type="link"
                                icon={<DownloadOutlined />}
                                size="small"
                                onClick={() => handleLoadVersion(version.version_id, version.commit_message)}
                              >
                                加载
                              </Button>
                            </Tooltip>
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
                                icon={<DeleteOutlined />}
                                size="small"
                              >
                                删除
                              </Button>
                            </Popconfirm>
                          </Space>
                        }
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {/* 版本标识 */}
                          <div>
                            {index === 0 && (
                              <Tag color="green" style={{ marginRight: 8 }}>
                                最新版本
                              </Tag>
                            )}
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Version ID: {version.version_id.substring(0, 16)}...
                            </Text>
                          </div>

                          {/* 提交信息 */}
                          <div>
                            <MessageOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
                            <Text strong>{version.commit_message}</Text>
                          </div>

                          {/* 元数据 */}
                          <Space size="large">
                            <Tooltip title="创建时间">
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                <ClockCircleOutlined style={{ marginRight: 4 }} />
                                {dayjs(version.created_at).fromNow()} ({dayjs(version.created_at).format('YYYY-MM-DD HH:mm:ss')})
                              </Text>
                            </Tooltip>
                            <Tooltip title="配置文件大小">
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                <FileOutlined style={{ marginRight: 4 }} />
                                {formatFileSize(version.size)}
                              </Text>
                            </Tooltip>
                          </Space>
                        </Space>
                      </Card>
                    )
                  }))}
                />
              )}
            </Spin>
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
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="commit_message"
            label="提交信息"
            rules={[
              { required: true, message: '请输入提交信息' },
              { min: 5, message: '提交信息至少5个字符' },
              { max: 200, message: '提交信息不能超过200个字符' }
            ]}
          >
            <TextArea
              rows={4}
              placeholder="描述本次版本的主要变更内容，例如：添加数据处理节点、优化提示词、修复连接错误等"
              showCount
              maxLength={200}
            />
          </Form.Item>

          <div style={{
            padding: '12px',
            backgroundColor: '#f6f8fa',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#666'
          }}>
            <Text strong>提示：</Text>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
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
