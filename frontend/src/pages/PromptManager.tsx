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
  Divider,
  Pagination
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
  FilterOutlined
} from '@ant-design/icons';
import { promptService } from '../services/promptService';
import { PromptInfo, PromptDetail, PromptCreate, PromptUpdate } from '../types/prompt';

const { Content } = Layout;
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
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [categories, setCategories] = useState<CategoryStats>({});
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [createForm] = Form.useForm();
  const [importForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // 提交状态
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    filterPrompts();
  }, [prompts, searchText, selectedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedCategory]);

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

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredPrompts.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size && size !== pageSize) {
      setPageSize(size);
    }
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
    setIsCreating(true);
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
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdatePrompt = async (values: PromptUpdate) => {
    if (!selectedPrompt) return;

    setIsUpdating(true);
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
    } finally {
      setIsUpdating(false);
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

    setIsImporting(true);
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
    } finally {
      setIsImporting(false);
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
    <>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      padding: '24px'
    }}>
      {/* 页面标题和工具栏 */}
      <div style={{ marginBottom: '24px', flexShrink: 0 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
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
                创建
              </Button>
              <Select
                placeholder="筛选分类"
                value={selectedCategory || undefined}
                onChange={(value) => setSelectedCategory(value || '')}
                style={{ width: 150 }}
                suffixIcon={<FilterOutlined />}
                allowClear
              >
                <Option value="">全部 ({prompts.length})</Option>
                {Object.entries(categories).map(([category, count]) => (
                  <Option key={category} value={category}>
                    {category} ({count})
                  </Option>
                ))}
              </Select>
              <Button icon={<UploadOutlined />} onClick={() => setShowImportModal(true)}>
                导入
              </Button>
              {selectedPrompts.length > 0 && (
                <>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleExportPrompts}
                  >
                    导出
                  </Button>
                  <Popconfirm
                    title={`确定要删除选中的 ${selectedPrompts.length} 个提示词吗？`}
                    onConfirm={handleBatchDelete}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* 主内容区域 */}
      <div style={{
        display: 'flex',
        gap: '24px',
        flex: 1,
        minHeight: 0,
        marginBottom: '16px',
        overflow: 'hidden'
      }}>
        {/* 提示词列表 */}
        <div style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <Spin spinning={loading}>
            {filteredPrompts.length === 0 ? (
              <Empty description="暂无提示词" style={{ marginTop: '40px' }} />
            ) : (
              <Row gutter={[16, 16]}>
                {getCurrentPageData().map((prompt) => (
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
        </div>

        {/* 右侧详情面板 */}
        {selectedPrompt && (
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong style={{ fontSize: '16px' }}>
                    {selectedPrompt.name}
                  </Text>
                  {selectedPrompt.category && (
                    <Tag color="blue" size="small" style={{ marginLeft: '8px' }}>
                      {selectedPrompt.category}
                    </Tag>
                  )}
                </div>
                <Button
                  type="primary"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={openEditModal}
                >
                  编辑
                </Button>
              </div>
            }
            style={{ width: '400px' }}
            bodyStyle={{
              maxHeight: '60vh',
              overflow: 'auto',
              padding: '16px',
              backgroundColor: '#fafafa'
            }}
          >
            <Spin spinning={detailLoading}>
              <Paragraph style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#333'
              }}>
                {selectedPrompt.content}
              </Paragraph>
            </Spin>
          </Card>
        )}
      </div>

      {/* 固定在底部的分页组件 */}
      {filteredPrompts.length > 0 && (
        <div style={{
          borderTop: '1px solid #f0f0f0',
          paddingTop: '16px',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Pagination
            current={currentPage}
            total={filteredPrompts.length}
            pageSize={pageSize}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
            }
            pageSizeOptions={['6', '12']}
            onChange={handlePageChange}
          />
        </div>
      )}
    </div>

      {/* 🔥 修复后的创建提示词模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextOutlined />
            创建提示词
          </div>
        }
        open={showCreateModal}
        onCancel={() => {
          if (!isCreating) {
            createForm.resetFields();
            setShowCreateModal(false);
          }
        }}
        width="min(90vw, 800px)"
        style={{
          maxHeight: '90vh',
          top: '5vh'
        }}
        bodyStyle={{
          height: 'calc(85vh - 120px)',
          padding: 0,
          overflow: 'hidden'
        }}
        footer={null}
        destroyOnClose
        maskClosable={!isCreating}
      >
        <Form
          form={createForm}
          onFinish={handleCreatePrompt}
          layout="vertical"
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* 基础信息区域 - 固定高度 */}
          <div style={{
            padding: '24px 24px 0',
            flexShrink: 0
          }}>
            <Form.Item
              label="提示词名称"
              name="name"
              rules={[
                { required: true, message: '请输入提示词名称' },
                { max: 100, message: '名称长度不能超过100个字符' }
              ]}
            >
              <Input placeholder="输入提示词名称" disabled={isCreating} />
            </Form.Item>

            <Form.Item
              label="分类"
              name="category"
              rules={[
                { required: true, message: '请输入分类' },
                { pattern: /^[a-zA-Z0-9_-]+$/, message: '分类只能包含英文字母、数字、连字符和下划线' }
              ]}
            >
              <Input placeholder="输入分类名称（如：system, chat, analysis）" disabled={isCreating} />
            </Form.Item>
          </div>

          {/* 内容编辑区域 - 占据剩余空间，完全解耦 */}
          <div style={{
            flex: 1,
            padding: '0 24px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            <Form.Item
              label="内容"
              name="content"
              rules={[{ required: true, message: '请输入提示词内容' }]}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                marginBottom: 0
              }}
            >
              <TextArea
                placeholder="输入提示词内容..."
                style={{
                  flex: 1,
                  resize: 'none',
                  minHeight: '200px',
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
                disabled={isCreating}
              />
            </Form.Item>
          </div>

          {/* 按钮区域 - 固定在底部 */}
          <div style={{
            padding: '16px 24px 24px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            flexShrink: 0
          }}>
            <Button
              onClick={() => {
                createForm.resetFields();
                setShowCreateModal(false);
              }}
              disabled={isCreating}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isCreating}
            >
              创建
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 🔥 修复后的编辑提示词模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EditOutlined />
            编辑提示词
          </div>
        }
        open={showEditModal}
        onCancel={() => {
          if (!isUpdating) {
            editForm.resetFields();
            setShowEditModal(false);
          }
        }}
        width="min(90vw, 800px)"
        style={{
          maxHeight: '90vh',
          top: '5vh'
        }}
        bodyStyle={{
          height: 'calc(85vh - 120px)',
          padding: 0,
          overflow: 'hidden'
        }}
        footer={null}
        destroyOnClose
        maskClosable={!isUpdating}
      >
        <Form
          form={editForm}
          onFinish={handleUpdatePrompt}
          layout="vertical"
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* 基础信息区域 - 固定高度 */}
          <div style={{
            padding: '24px 24px 0',
            flexShrink: 0
          }}>
            <Form.Item
              label="分类"
              name="category"
              rules={[
                { pattern: /^[a-zA-Z0-9_-]*$/, message: '分类只能包含英文字母、数字、连字符和下划线' }
              ]}
            >
              <Input placeholder="输入分类名称（如：system, chat, analysis）" disabled={isUpdating} />
            </Form.Item>
          </div>

          {/* 内容编辑区域 - 占据剩余空间，完全解耦 */}
          <div style={{
            flex: 1,
            padding: '0 24px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            <Form.Item
              label="内容"
              name="content"
              rules={[{ required: true, message: '请输入提示词内容' }]}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                marginBottom: 0
              }}
            >
              <TextArea
                placeholder="输入提示词内容..."
                style={{
                  flex: 1,
                  resize: 'none',
                  minHeight: '300px',
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
                disabled={isUpdating}
              />
            </Form.Item>
          </div>

          {/* 按钮区域 - 固定在底部 */}
          <div style={{
            padding: '16px 24px 24px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            flexShrink: 0
          }}>
            <Button
              onClick={() => {
                editForm.resetFields();
                setShowEditModal(false);
              }}
              disabled={isUpdating}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isUpdating}
            >
              保存
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 🔥 修复后的导入提示词模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadOutlined />
            导入提示词
          </div>
        }
        open={showImportModal}
        onCancel={() => {
          if (!isImporting) {
            importForm.resetFields();
            setShowImportModal(false);
          }
        }}
        width="min(90vw, 600px)"
        style={{
          maxHeight: '80vh',
          top: '10vh'
        }}
        bodyStyle={{
          maxHeight: 'calc(70vh - 120px)',
          overflow: 'auto'
        }}
        footer={null}
        destroyOnClose
        maskClosable={!isImporting}
      >
        <Form
          form={importForm}
          layout="vertical"
          onFinish={handleImportPrompt}
          style={{ padding: '8px 0' }}
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
              disabled={isImporting}
            >
              <Button icon={<UploadOutlined />} disabled={isImporting}>
                选择Markdown文件
              </Button>
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
            <Input placeholder="输入提示词名称" disabled={isImporting} />
          </Form.Item>

          <Form.Item
            label="分类"
            name="category"
            rules={[
              { required: true, message: '请输入分类' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '分类只能包含英文字母、数字、连字符和下划线' }
            ]}
          >
            <Input placeholder="输入分类名称（如：system, chat, analysis）" disabled={isImporting} />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: '24px' }}>
            <Space>
              <Button
                onClick={() => {
                  importForm.resetFields();
                  setShowImportModal(false);
                }}
                disabled={isImporting}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isImporting}
              >
                导入
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default PromptManager;