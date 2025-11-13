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
  Popconfirm,
  Collapse
} from 'antd';
import { Plus, Search, Upload as UploadIcon, Download, Trash2, Edit, FileText, ChevronDown } from 'lucide-react';
import { promptService } from '../services/promptService';
import { PromptInfo, PromptDetail, PromptCreate, PromptUpdate } from '../types/prompt';
import PromptEditor from '../components/prompt/PromptEditor';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface CategoryStats {
  [key: string]: number;
}

interface PromptGroup {
  category: string;
  prompts: PromptInfo[];
}

const PromptManager: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptInfo[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<PromptGroup[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categories, setCategories] = useState<CategoryStats>({});
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [createForm] = Form.useForm();
  const [importForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 编辑器内容状态
  const [createContent, setCreateContent] = useState('');
  const [editContent, setEditContent] = useState('');

  // 提交状态
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    filterPrompts();
  }, [prompts, searchText]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const response = await promptService.listPrompts();
      if (response.success && response.data) {
        setPrompts(response.data.prompts);
        calculateCategories(response.data.prompts);
        const grouped = groupPromptsByCategory(response.data.prompts);
        setFilteredGroups(grouped);
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

  const groupPromptsByCategory = (promptList: PromptInfo[]): PromptGroup[] => {
    const groupMap = new Map<string, PromptGroup>();

    promptList.forEach(prompt => {
      const category = prompt.category || '未分类';
      if (!groupMap.has(category)) {
        groupMap.set(category, {
          category,
          prompts: []
        });
      }
      groupMap.get(category)!.prompts.push(prompt);
    });

    return Array.from(groupMap.values());
  };

  const filterPrompts = () => {
    let filtered = prompts;

    if (searchText) {
      filtered = filtered.filter(prompt =>
        prompt.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // 更新分组数据
    const grouped = groupPromptsByCategory(filtered);
    setFilteredGroups(grouped);
  };

  const loadPromptDetail = async (name: string) => {
    try {
      const response = await promptService.getPromptContent(name);
      if (response.success && response.data) {
        setEditingPrompt(response.data);
        return response.data;
      } else {
        message.error(response.message || '获取提示词内容失败');
        return null;
      }
    } catch (error) {
      message.error('获取提示词内容失败');
      console.error('Error loading prompt detail:', error);
      return null;
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
        setCreateContent('');
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
    if (!editingPrompt) return;

    setIsUpdating(true);
    try {
      const response = await promptService.updatePrompt(editingPrompt.name, values);
      if (response.success) {
        message.success('更新提示词成功');
        setShowEditModal(false);
        editForm.resetFields();
        setEditContent('');
        setEditingPrompt(null);
        loadPrompts();
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
        if (editingPrompt?.name === name) {
          setEditingPrompt(null);
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
        setEditingPrompt(null);
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

  return (
    <>
    <Layout style={{ height: '100vh', background: '#faf8f5', display: 'flex', flexDirection: 'column' }}>
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative'
      }}>
        {/* 装饰性底部渐变线 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)'
        }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          {/* 左侧：图标、标题、统计标签 */}
          <Space size="large">
            <FileText size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              提示词管理
            </Title>
            <Tag style={{
              background: 'rgba(184, 88, 69, 0.08)',
              color: '#b85845',
              border: '1px solid rgba(184, 88, 69, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '13px',
              padding: '4px 12px'
            }}>
              总数: {prompts.length}
            </Tag>
            <Tag style={{
              background: 'rgba(139, 115, 85, 0.08)',
              color: '#8b7355',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '13px',
              padding: '4px 12px'
            }}>
              分类: {Object.keys(categories).length}
            </Tag>
          </Space>
          
          {/* 右侧：搜索框和操作按钮 */}
          <Space>
            <Input
              placeholder="搜索提示词..."
              prefix={<Search size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: 240,
                height: '40px',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                background: 'rgba(255, 255, 255, 0.85)',
                boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                color: '#2d2d2d',
                letterSpacing: '0.3px',
                transition: 'all 0.3s ease'
              }}
              allowClear
            />
            <Button
              type="primary"
              icon={<Plus size={16} strokeWidth={1.5} />}
              onClick={() => setShowCreateModal(true)}
              style={{
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                letterSpacing: '0.3px',
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
              }}
            >
              创建
            </Button>
            <Button icon={<UploadIcon size={16} strokeWidth={1.5} />} onClick={() => setShowImportModal(true)} style={{ color: '#8b7355', background: 'transparent', borderRadius: '6px', transition: 'all 0.2s ease' }}>
              导入
            </Button>
            {selectedPrompts.length > 0 && (
              <>
                <Button
                  icon={<Download size={16} strokeWidth={1.5} />}
                  onClick={handleExportPrompts}
                  style={{ color: '#8b7355', background: 'transparent', borderRadius: '6px' }}
                >
                  导出
                </Button>
                <Popconfirm
                  title={`确定要删除选中的 ${selectedPrompts.length} 个提示词吗？`}
                  onConfirm={handleBatchDelete}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<Trash2 size={16} strokeWidth={1.5} />} style={{ background: 'transparent', borderRadius: '6px' }}>
                    删除
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        </div>
      </Header>

      <Content style={{ flex: 1, padding: '48px 64px', overflow: 'auto' }}>
        <Spin spinning={loading}>
          {filteredGroups.length === 0 ? (
            <Empty description="暂无提示词" style={{ marginTop: '40px' }} />
          ) : (
            <Collapse
              defaultActiveKey={filteredGroups.map(group => group.category)}
              expandIconPosition="end"
              expandIcon={({ isActive }) => (
                <ChevronDown
                  size={18}
                  strokeWidth={1.5}
                  style={{
                    color: '#8b7355',
                    transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
                  }}
                />
              )}
              style={{
                background: 'transparent',
                border: 'none'
              }}
            >
              {filteredGroups.map((group) => (
                <Collapse.Panel
                  key={group.category}
                  header={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: '32px' }}>
                      <Text strong style={{
                        fontSize: '14px',
                        color: '#2d2d2d',
                        fontWeight: 500,
                        letterSpacing: '0.3px'
                      }}>
                        {group.category}
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
                        {group.prompts.length}
                      </Tag>
                    </div>
                  }
                  style={{
                    marginBottom: '16px',
                    background: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(139, 115, 85, 0.15)',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  <Row gutter={[12, 12]}>
                    {group.prompts.map((prompt) => (
                  <Col key={prompt.name} xs={24} sm={12} md={12} lg={8} xl={6}>
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
                      styles={{ body: { padding: '10px 12px' } }}
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
                              marginBottom: '3px'
                            }}
                            title={prompt.name}
                          >
                            {prompt.name}
                          </Text>
                          <Text
                            type="secondary"
                            style={{
                              fontSize: '12px',
                              display: 'block',
                              color: 'rgba(45, 45, 45, 0.45)',
                              letterSpacing: '0.1px'
                            }}
                          >
                            {prompt.modified_time}
                          </Text>
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
                            onClick={async (e) => {
                              e.stopPropagation();
                              const promptDetail = await loadPromptDetail(prompt.name);
                              if (promptDetail) {
                                setEditContent(promptDetail.content);
                                editForm.setFieldsValue({
                                  content: promptDetail.content,
                                  category: promptDetail.category
                                });
                                setShowEditModal(true);
                              }
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
                          <Popconfirm
                            title="确定要删除这个提示词吗？"
                            onConfirm={(e) => {
                              e?.stopPropagation();
                              handleDeletePrompt(prompt.name);
                            }}
                            okText="确定"
                            cancelText="取消"
                          >
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
                              onClick={(e) => e.stopPropagation()}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#b85845';
                                e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#8b7355';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Trash2 size={15} strokeWidth={1.5} />
                            </div>
                          </Popconfirm>
                        </div>
                      </div>
                    </Card>
                  </Col>
                    ))}
                  </Row>
                </Collapse.Panel>
              ))}
            </Collapse>
          )}
        </Spin>
      </Content>
    </Layout>

      {/* 🔥 修复后的创建提示词模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
            创建提示词
          </div>
        }
        open={showCreateModal}
        onCancel={() => {
          if (!isCreating) {
            createForm.resetFields();
            setCreateContent('');
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

          {/* 内容编辑区域 - 占据剩余空间，使用分屏编辑器 */}
          <div style={{
            flex: 1,
            padding: '0 24px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            <div style={{ marginBottom: '8px', color: 'rgba(0, 0, 0, 0.85)', fontSize: '14px' }}>
              内容
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <PromptEditor
                content={createContent}
                onChange={(value) => {
                  setCreateContent(value);
                  createForm.setFieldsValue({ content: value });
                }}
                readOnly={isCreating}
                placeholder="输入提示词内容..."
              />
            </div>
            <Form.Item
              name="content"
              rules={[{ required: true, message: '请输入提示词内容' }]}
              style={{ display: 'none' }}
            >
              <Input />
            </Form.Item>
          </div>

          {/* 按钮区域 - 固定在底部 */}
          <div style={{
            padding: '16px 24px 24px',
            borderTop: '1px solid rgba(139, 115, 85, 0.15)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            flexShrink: 0
          }}>
            <Button
              onClick={() => {
                createForm.resetFields();
                setCreateContent('');
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
              style={{
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                letterSpacing: '0.3px',
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
              }}
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
            <Edit size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
            编辑提示词
          </div>
        }
        open={showEditModal}
        onCancel={() => {
          if (!isUpdating) {
            editForm.resetFields();
            setEditContent('');
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
              label="提示词名称"
              style={{ marginBottom: '16px' }}
            >
              <Input value={editingPrompt?.name} disabled style={{ color: 'rgba(0, 0, 0, 0.65)' }} />
            </Form.Item>
            
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

          {/* 内容编辑区域 - 占据剩余空间，使用分屏编辑器 */}
          <div style={{
            flex: 1,
            padding: '0 24px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}>
            <div style={{ marginBottom: '8px', color: 'rgba(0, 0, 0, 0.85)', fontSize: '14px' }}>
              内容
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <PromptEditor
                content={editContent}
                onChange={(value) => {
                  setEditContent(value);
                  editForm.setFieldsValue({ content: value });
                }}
                readOnly={isUpdating}
                placeholder="输入提示词内容..."
              />
            </div>
            <Form.Item
              name="content"
              rules={[{ required: true, message: '请输入提示词内容' }]}
              style={{ display: 'none' }}
            >
              <Input />
            </Form.Item>
          </div>

          {/* 按钮区域 - 固定在底部 */}
          <div style={{
            padding: '16px 24px 24px',
            borderTop: '1px solid rgba(139, 115, 85, 0.15)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            flexShrink: 0
          }}>
            <Button
              onClick={() => {
                editForm.resetFields();
                setEditContent('');
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
              style={{
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                letterSpacing: '0.3px',
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
              }}
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
            <UploadIcon size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
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
              <Button icon={<UploadIcon size={16} strokeWidth={1.5} />} disabled={isImporting}>
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
                style={{
                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
                }}
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