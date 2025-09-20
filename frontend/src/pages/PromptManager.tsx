import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Button,
  Input,
  Space,
  Row,
  Col,
  Typography,
  Tag,
  Empty,
  Spin,
  message,
  Modal,
  Form,
  Upload,
  Select,
  Popconfirm,
  Checkbox,
  Divider
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { promptService } from '../services/promptService';
import { PromptInfo, PromptDetail, PromptCreate, PromptUpdate } from '../types/prompt';

const { Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface CategoryStats {
  [key: string]: number;
}

const PromptManager: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptInfo[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<PromptInfo[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<CategoryStats>({});
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [createForm] = Form.useForm();
  const [importForm] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    filterPrompts();
  }, [prompts, searchText, selectedCategory]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const response = await promptService.listPrompts();
      if (response.success && response.data) {
        setPrompts(response.data.prompts);
        calculateCategories(response.data.prompts);
      } else {
        message.error(response.message || '获取提示词列表失败');
      }
    } catch (error) {
      message.error('获取提示词列表失败');
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCategories = (promptList: PromptInfo[]) => {
    const stats: CategoryStats = {};
    promptList.forEach(prompt => {
      const category = prompt.category || '未分类';
      stats[category] = (stats[category] || 0) + 1;
    });
    setCategories(stats);
  };

  const filterPrompts = () => {
    let filtered = prompts;

    if (searchText) {
      filtered = filtered.filter(prompt =>
        prompt.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (selectedCategory) {
      if (selectedCategory === '未分类') {
        filtered = filtered.filter(prompt => !prompt.category);
      } else {
        filtered = filtered.filter(prompt => prompt.category === selectedCategory);
      }
    }

    setFilteredPrompts(filtered);
  };

  const loadPromptDetail = async (name: string) => {
    setDetailLoading(true);
    try {
      const response = await promptService.getPromptContent(name);
      if (response.success && response.data) {
        setSelectedPrompt(response.data);
      } else {
        message.error(response.message || '获取提示词内容失败');
      }
    } catch (error) {
      message.error('获取提示词内容失败');
      console.error('Error loading prompt detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreatePrompt = async (values: PromptCreate) => {
    try {
      const response = await promptService.createPrompt(values);
      if (response.success) {
        message.success('创建提示词成功');
        setShowCreateModal(false);
        createForm.resetFields();
        loadPrompts();
      } else {
        message.error(response.message || '创建提示词失败');
      }
    } catch (error) {
      message.error('创建提示词失败');
      console.error('Error creating prompt:', error);
    }
  };

  const handleUpdatePrompt = async (values: PromptUpdate) => {
    if (!selectedPrompt) return;

    try {
      const response = await promptService.updatePrompt(selectedPrompt.name, values);
      if (response.success) {
        message.success('更新提示词成功');
        setShowEditModal(false);
        editForm.resetFields();
        loadPrompts();
        loadPromptDetail(selectedPrompt.name);
      } else {
        message.error(response.message || '更新提示词失败');
      }
    } catch (error) {
      message.error('更新提示词失败');
      console.error('Error updating prompt:', error);
    }
  };

  const handleDeletePrompt = async (name: string) => {
    try {
      const response = await promptService.deletePrompt(name);
      if (response.success) {
        message.success('删除提示词成功');
        loadPrompts();
        if (selectedPrompt?.name === name) {
          setSelectedPrompt(null);
        }
      } else {
        message.error(response.message || '删除提示词失败');
      }
    } catch (error) {
      message.error('删除提示词失败');
      console.error('Error deleting prompt:', error);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedPrompts.length === 0) {
      message.warning('请选择要删除的提示词');
      return;
    }

    try {
      const response = await promptService.batchDeletePrompts({ names: selectedPrompts });
      if (response.success) {
        message.success(`成功删除 ${selectedPrompts.length} 个提示词`);
        setSelectedPrompts([]);
        loadPrompts();
        setSelectedPrompt(null);
      } else {
        message.error(response.message || '批量删除失败');
      }
    } catch (error) {
      message.error('批量删除失败');
      console.error('Error batch deleting prompts:', error);
    }
  };

  const handleExportPrompts = async () => {
    if (selectedPrompts.length === 0) {
      message.warning('请选择要导出的提示词');
      return;
    }

    try {
      const blob = await promptService.exportPrompts({ names: selectedPrompts });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prompts_export.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
      console.error('Error exporting prompts:', error);
    }
  };

  const handleImportPrompt = async (values: any) => {
    const { file, name, category } = values;
    if (!file || file.length === 0) {
      message.error('请选择文件');
      return;
    }

    try {
      const response = await promptService.importPromptByFile(file[0].originFileObj, {
        name,
        category
      });
      if (response.success) {
        message.success('导入提示词成功');
        setShowImportModal(false);
        importForm.resetFields();
        loadPrompts();
      } else {
        message.error(response.message || '导入提示词失败');
      }
    } catch (error) {
      message.error('导入提示词失败');
      console.error('Error importing prompt:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openEditModal = () => {
    if (!selectedPrompt) return;
    editForm.setFieldsValue({
      content: selectedPrompt.content,
      category: selectedPrompt.category
    });
    setShowEditModal(true);
  };

  return (
    <div style={{ height: '100vh', background: '#f5f5f5' }}>
      <Layout style={{ height: '100%' }}>
        {/* 侧边栏 - 分类筛选 */}
        <Sider width={220} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
          <div style={{ padding: '16px' }}>
            <Title level={5} style={{ margin: '0 0 16px 0' }}>
              <FolderOutlined /> 分类筛选
            </Title>
            <div>
              <div
                onClick={() => setSelectedCategory('')}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  background: selectedCategory === '' ? '#e6f4ff' : 'transparent',
                  color: selectedCategory === '' ? '#1890ff' : '#333'
                }}
              >
                全部 ({prompts.length})
              </div>
              {Object.entries(categories).map(([category, count]) => (
                <div
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    background: selectedCategory === category ? '#e6f4ff' : 'transparent',
                    color: selectedCategory === category ? '#1890ff' : '#333'
                  }}
                >
                  {category} ({count})
                </div>
              ))}
            </div>
          </div>
        </Sider>

        <Layout>
          {/* 主内容区 */}
          <Content style={{ padding: '16px', overflow: 'hidden' }}>
            <div style={{ marginBottom: '16px' }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Title level={4} style={{ margin: 0 }}>
                    <FileTextOutlined /> 提示词注册中心
                  </Title>
                </Col>
                <Col>
                  <Space>
                    <Input
                      placeholder="搜索提示词..."
                      prefix={<SearchOutlined />}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 240 }}
                      allowClear
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
                      创建提示词
                    </Button>
                    <Button icon={<UploadOutlined />} onClick={() => setShowImportModal(true)}>
                      导入
                    </Button>
                    {selectedPrompts.length > 0 && (
                      <>
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={handleExportPrompts}
                        >
                          导出 ({selectedPrompts.length})
                        </Button>
                        <Popconfirm
                          title={`确定要删除选中的 ${selectedPrompts.length} 个提示词吗？`}
                          onConfirm={handleBatchDelete}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button danger icon={<DeleteOutlined />}>
                            删除 ({selectedPrompts.length})
                          </Button>
                        </Popconfirm>
                      </>
                    )}
                  </Space>
                </Col>
              </Row>
            </div>

            <Layout style={{ background: '#fff', height: 'calc(100% - 80px)' }}>
              {/* 提示词列表 */}
              <Content style={{ padding: '16px', overflow: 'auto' }}>
                <Spin spinning={loading}>
                  {filteredPrompts.length === 0 ? (
                    <Empty description="暂无提示词" />
                  ) : (
                    <Row gutter={[16, 16]}>
                      {filteredPrompts.map((prompt) => (
                        <Col key={prompt.name} span={8}>
                          <Card
                            size="small"
                            hoverable
                            onClick={() => loadPromptDetail(prompt.name)}
                            style={{
                              border: selectedPrompt?.name === prompt.name ? '2px solid #1890ff' : '1px solid #f0f0f0',
                              cursor: 'pointer'
                            }}
                            title={
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text strong ellipsis style={{ flex: 1 }}>
                                  {prompt.name}
                                </Text>
                                <Checkbox
                                  checked={selectedPrompts.includes(prompt.name)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                      setSelectedPrompts([...selectedPrompts, prompt.name]);
                                    } else {
                                      setSelectedPrompts(selectedPrompts.filter(name => name !== prompt.name));
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            }
                            extra={
                              <Space>
                                <Popconfirm
                                  title="确定要删除这个提示词吗？"
                                  onConfirm={(e) => {
                                    e?.stopPropagation();
                                    handleDeletePrompt(prompt.name);
                                  }}
                                  okText="确定"
                                  cancelText="取消"
                                >
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </Popconfirm>
                              </Space>
                            }
                          >
                            <div style={{ marginBottom: '8px' }}>
                              {prompt.category && <Tag color="blue">{prompt.category}</Tag>}
                            </div>
                            <div style={{ color: '#666', fontSize: '12px' }}>
                              <div><ClockCircleOutlined /> {prompt.modified_time}</div>
                              <div>大小: {formatFileSize(prompt.size)}</div>
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Spin>
              </Content>

              {/* 右侧详情面板 */}
              {selectedPrompt && (
                <Sider width={400} style={{ background: '#fff', borderLeft: '1px solid #f0f0f0' }}>
                  <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Title level={5} style={{ margin: 0 }}>提示词详情</Title>
                      <Button type="primary" size="small" icon={<EditOutlined />} onClick={openEditModal}>
                        编辑
                      </Button>
                    </div>

                    <Spin spinning={detailLoading} style={{ flex: 1 }}>
                      {selectedPrompt && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ marginBottom: '16px' }}>
                            <Text strong>{selectedPrompt.name}</Text>
                            {selectedPrompt.category && (
                              <div style={{ marginTop: '8px' }}>
                                <Tag color="blue">{selectedPrompt.category}</Tag>
                              </div>
                            )}
                          </div>

                          <Divider style={{ margin: '12px 0' }} />

                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <Text strong style={{ fontSize: '14px' }}>内容:</Text>
                            <div style={{
                              marginTop: '8px',
                              height: 'calc(100% - 24px)',
                              overflow: 'auto',
                              padding: '12px',
                              background: '#fafafa',
                              border: '1px solid #f0f0f0',
                              borderRadius: '6px'
                            }}>
                              <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                                {selectedPrompt.content}
                              </Paragraph>
                            </div>
                          </div>
                        </div>
                      )}
                    </Spin>
                  </div>
                </Sider>
              )}
            </Layout>
          </Content>
        </Layout>
      </Layout>

      {/* 创建提示词模态框 */}
      <Modal
        title="创建提示词"
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false);
          createForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreatePrompt}
        >
          <Form.Item
            label="提示词名称"
            name="name"
            rules={[
              { required: true, message: '请输入提示词名称' },
              { max: 100, message: '名称长度不能超过100个字符' }
            ]}
          >
            <Input placeholder="输入提示词名称" />
          </Form.Item>
          <Form.Item
            label="分类"
            name="category"
            rules={[
              { required: true, message: '请输入分类' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '分类只能包含英文字母、数字、连字符和下划线' }
            ]}
          >
            <Input placeholder="输入分类名称（如：system, chat, analysis）" />
          </Form.Item>
          <Form.Item
            label="内容"
            name="content"
            rules={[{ required: true, message: '请输入提示词内容' }]}
          >
            <TextArea rows={12} placeholder="输入提示词内容..." />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setShowCreateModal(false);
                createForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑提示词模态框 */}
      <Modal
        title="编辑提示词"
        open={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdatePrompt}
        >
          <Form.Item
            label="分类"
            name="category"
            rules={[
              { pattern: /^[a-zA-Z0-9_-]*$/, message: '分类只能包含英文字母、数字、连字符和下划线' }
            ]}
          >
            <Input placeholder="输入分类名称（如：system, chat, analysis）" />
          </Form.Item>
          <Form.Item
            label="内容"
            name="content"
            rules={[{ required: true, message: '请输入提示词内容' }]}
          >
            <TextArea rows={12} placeholder="输入提示词内容..." />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setShowEditModal(false);
                editForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入提示词模态框 */}
      <Modal
        title="导入提示词"
        open={showImportModal}
        onCancel={() => {
          setShowImportModal(false);
          importForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={importForm}
          layout="vertical"
          onFinish={handleImportPrompt}
        >
          <Form.Item
            label="选择文件"
            name="file"
            valuePropName="fileList"
            getValueFromEvent={(e) => e?.fileList}
            rules={[{ required: true, message: '请选择要导入的Markdown文件' }]}
          >
            <Upload
              beforeUpload={() => false}
              accept=".md,.txt"
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>选择Markdown文件</Button>
            </Upload>
          </Form.Item>
          <Form.Item
            label="提示词名称"
            name="name"
            rules={[
              { required: true, message: '请输入提示词名称' },
              { max: 100, message: '名称长度不能超过100个字符' }
            ]}
          >
            <Input placeholder="输入提示词名称" />
          </Form.Item>
          <Form.Item
            label="分类"
            name="category"
            rules={[
              { required: true, message: '请输入分类' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '分类只能包含英文字母、数字、连字符和下划线' }
            ]}
          >
            <Input placeholder="输入分类名称（如：system, chat, analysis）" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setShowImportModal(false);
                importForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                导入
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PromptManager;