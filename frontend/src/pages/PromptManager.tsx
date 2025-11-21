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
  Modal,
  Form,
  Upload,
  Popconfirm,
  Collapse,
  App
} from 'antd';
import { Plus, Search, Upload as UploadIcon, Download, Trash2, Edit, FileText, ChevronDown, BookOpen } from 'lucide-react';
import { promptService } from '../services/promptService';
import { PromptInfo, PromptDetail, PromptCreate, PromptUpdate } from '../types/prompt';
import PromptEditor from '../components/prompt/PromptEditor';
import { useT } from '../i18n/hooks';

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
  const t = useT();
  const { message } = App.useApp();
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
        message.error(response.message || t('pages.promptManager.loadFailed'));
      }
    } catch (error) {
      message.error(t('pages.promptManager.loadFailed'));
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCategories = (promptList: PromptInfo[]) => {
    const stats: CategoryStats = {};
    promptList.forEach(prompt => {
      const category = prompt.category || t('pages.promptManager.uncategorized');
      stats[category] = (stats[category] || 0) + 1;
    });
    setCategories(stats);
  };

  const groupPromptsByCategory = (promptList: PromptInfo[]): PromptGroup[] => {
    const groupMap = new Map<string, PromptGroup>();

    promptList.forEach(prompt => {
      const category = prompt.category || t('pages.promptManager.uncategorized');
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
      console.log('API Response:', response);
      if (response.success && response.data) {
        console.log('Prompt data:', response.data);
        setEditingPrompt(response.data);
        return response.data;
      } else {
        message.error(response.message || t('pages.promptManager.loadDetailFailed'));
        return null;
      }
    } catch (error) {
      message.error(t('pages.promptManager.loadDetailFailed'));
      console.error('Error loading prompt detail:', error);
      return null;
    }
  };

  const handleCreatePrompt = async (values: PromptCreate) => {
    setIsCreating(true);
    try {
      const response = await promptService.createPrompt(values);
      if (response.success) {
        message.success(t('pages.promptManager.createModal.createSuccess'));
        setShowCreateModal(false);
        createForm.resetFields();
        setCreateContent('');
        loadPrompts();
      } else {
        // 显示后端返回的错误信息
        const errorMsg = response.message || t('pages.promptManager.createModal.createFailed');
        message.error(errorMsg);
        console.error('Create prompt failed:', response);
      }
    } catch (error: any) {
      // 捕获网络错误或其他异常
      console.error('Error creating prompt:', error);
      
      // 尝试从不同位置提取错误信息
      let errorMsg = t('pages.promptManager.createModal.createFailed');
      
      if (error?.response?.data) {
        const data = error.response.data;
        errorMsg = data.message || data.detail || data.error || errorMsg;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      message.error(errorMsg);
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
        message.success(t('pages.promptManager.editModal.updateSuccess'));
        setShowEditModal(false);
        editForm.resetFields();
        setEditContent('');
        setEditingPrompt(null);
        loadPrompts();
      } else {
        // 显示后端返回的错误信息
        const errorMsg = response.message || t('pages.promptManager.editModal.updateFailed');
        message.error(errorMsg);
        console.error('Update prompt failed:', response);
      }
    } catch (error: any) {
      // 捕获网络错误或其他异常
      console.error('Error updating prompt:', error);
      
      // 尝试从不同位置提取错误信息
      let errorMsg = t('pages.promptManager.editModal.updateFailed');
      
      if (error?.response?.data) {
        const data = error.response.data;
        errorMsg = data.message || data.detail || data.error || errorMsg;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      message.error(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePrompt = async (name: string) => {
    try {
      const response = await promptService.deletePrompt(name);
      if (response.success) {
        message.success(t('pages.promptManager.deleteSuccess'));
        loadPrompts();
        if (editingPrompt?.name === name) {
          setEditingPrompt(null);
        }
      } else {
        message.error(response.message || t('pages.promptManager.deleteFailed'));
      }
    } catch (error) {
      message.error(t('pages.promptManager.deleteFailed'));
      console.error('Error deleting prompt:', error);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedPrompts.length === 0) {
      message.warning(t('pages.promptManager.selectDeleteWarning'));
      return;
    }

    try {
      const response = await promptService.batchDeletePrompts({ names: selectedPrompts });
      if (response.success) {
        message.success(t('pages.promptManager.batchDeleteSuccess', { count: selectedPrompts.length }));
        setSelectedPrompts([]);
        loadPrompts();
        setEditingPrompt(null);
      } else {
        message.error(response.message || t('pages.promptManager.batchDeleteFailed'));
      }
    } catch (error) {
      message.error(t('pages.promptManager.batchDeleteFailed'));
      console.error('Error batch deleting prompts:', error);
    }
  };

  const handleExportPrompts = async () => {
    if (selectedPrompts.length === 0) {
      message.warning(t('pages.promptManager.selectPromptWarning'));
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
      message.success(t('pages.promptManager.exportSuccess'));
    } catch (error) {
      message.error(t('pages.promptManager.exportFailed'));
      console.error('Error exporting prompts:', error);
    }
  };

  const handleImportPrompt = async (values: any) => {
    const { file, name, category } = values;
    if (!file || file.length === 0) {
      message.error(t('pages.promptManager.importModal.selectFileError'));
      return;
    }

    setIsImporting(true);
    try {
      const response = await promptService.importPromptByFile(file[0].originFileObj, {
        name,
        category
      });
      if (response.success) {
        message.success(t('pages.promptManager.importModal.importSuccess'));
        setShowImportModal(false);
        importForm.resetFields();
        loadPrompts();
      } else {
        message.error(response.message || t('pages.promptManager.importModal.importFailed'));
      }
    } catch (error) {
      message.error(t('pages.promptManager.importModal.importFailed'));
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
              {t('pages.promptManager.title')}
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
              {t('pages.promptManager.totalCount', { count: prompts.length })}
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
              {t('pages.promptManager.categoriesCount', { count: Object.keys(categories).length })}
            </Tag>
          </Space>
          
          {/* 右侧：搜索框和操作按钮 */}
          <Space>
            <Input
              placeholder={t('pages.promptManager.searchPlaceholder')}
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
              {t('pages.promptManager.create')}
            </Button>
            <Button icon={<UploadIcon size={16} strokeWidth={1.5} />} onClick={() => setShowImportModal(true)} style={{ color: '#8b7355', background: 'transparent', borderRadius: '6px', transition: 'all 0.2s ease' }}>
              {t('pages.promptManager.import')}
            </Button>
            {selectedPrompts.length > 0 && (
              <>
                <Button
                  icon={<Download size={16} strokeWidth={1.5} />}
                  onClick={handleExportPrompts}
                  style={{ color: '#8b7355', background: 'transparent', borderRadius: '6px' }}
                >
                  {t('pages.promptManager.export')}
                </Button>
                <Popconfirm
                  title={t('pages.promptManager.batchDeleteConfirm', { count: selectedPrompts.length })}
                  onConfirm={handleBatchDelete}
                  okText={t('pages.promptManager.deleteConfirmOk')}
                  cancelText={t('pages.promptManager.deleteConfirmCancel')}
                >
                  <Button danger icon={<Trash2 size={16} strokeWidth={1.5} />} style={{ background: 'transparent', borderRadius: '6px' }}>
                    {t('pages.promptManager.delete')}
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
            <Empty description={t('pages.promptManager.noPrompts')} style={{ marginTop: '40px' }} />
          ) : (
            <Collapse
              defaultActiveKey={[]}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                      <BookOpen size={18} color="#b85845" strokeWidth={1.5} />
                      <Text strong style={{
                        fontSize: '14px',
                        color: '#2d2d2d',
                        fontWeight: 500,
                        letterSpacing: '0.3px',
                        flex: 1
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
                    borderRadius: '8px',
                    border: '1px solid rgba(139, 115, 85, 0.15)',
                    background: 'rgba(250, 248, 245, 0.6)',
                    overflow: 'hidden'
                  }}
                >
                  <Row gutter={[12, 12]} style={{ marginTop: '8px' }}>
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
                                console.log('Loaded prompt detail:', promptDetail);
                                // 先设置 editingPrompt 状态
                                setEditingPrompt(promptDetail);
                                // 设置编辑器内容
                                setEditContent(promptDetail.content);
                                // 设置表单字段值 - 确保 category 有值
                                editForm.setFieldsValue({
                                  category: promptDetail.category || '',
                                  content: promptDetail.content
                                });
                                // 最后打开 Modal
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
                            title={t('pages.promptManager.deleteConfirmTitle')}
                            onConfirm={(e) => {
                              e?.stopPropagation();
                              handleDeletePrompt(prompt.name);
                            }}
                            okText={t('pages.promptManager.deleteConfirmOk')}
                            cancelText={t('pages.promptManager.deleteConfirmCancel')}
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
            {t('pages.promptManager.createModal.title')}
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
        styles={{
          body: {
            height: 'calc(85vh - 120px)',
            padding: 0,
            overflow: 'hidden'
          }
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
              label={t('pages.promptManager.createModal.name')}
              name="name"
              rules={[
                { required: true, message: t('pages.promptManager.createModal.nameRequired') },
                { max: 100, message: t('pages.promptManager.createModal.nameMaxLength') }
              ]}
            >
              <Input placeholder={t('pages.promptManager.createModal.namePlaceholder')} disabled={isCreating} />
            </Form.Item>

            <Form.Item
              label={t('pages.promptManager.createModal.category')}
              name="category"
              rules={[
                { required: true, message: t('pages.promptManager.createModal.categoryRequired') },
                { pattern: /^[a-zA-Z0-9_-]+$/, message: t('pages.promptManager.createModal.categoryPattern') }
              ]}
            >
              <Input placeholder={t('pages.promptManager.createModal.categoryPlaceholder')} disabled={isCreating} />
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
              {t('pages.promptManager.createModal.content')}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <PromptEditor
                content={createContent}
                onChange={(value) => {
                  setCreateContent(value);
                  createForm.setFieldsValue({ content: value });
                }}
                readOnly={isCreating}
                placeholder={t('pages.promptManager.createModal.contentPlaceholder')}
              />
            </div>
            <Form.Item
              name="content"
              rules={[{ required: true, message: t('pages.promptManager.createModal.contentRequired') }]}
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
              {t('pages.promptManager.createModal.cancel')}
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
              {t('pages.promptManager.createModal.create')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 🔥 修复后的编辑提示词模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
            {t('pages.promptManager.editModal.title')}
          </div>
        }
        open={showEditModal}
        onCancel={() => {
          if (!isUpdating) {
            editForm.resetFields();
            setEditContent('');
            setEditingPrompt(null);
            setShowEditModal(false);
          }
        }}
        width="min(90vw, 800px)"
        style={{
          maxHeight: '90vh',
          top: '5vh'
        }}
        styles={{
          body: {
            height: 'calc(85vh - 120px)',
            padding: 0,
            overflow: 'hidden'
          }
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
              label={t('pages.promptManager.editModal.name')}
              style={{ marginBottom: '16px' }}
            >
              <Input value={editingPrompt?.name} disabled style={{ color: 'rgba(0, 0, 0, 0.65)' }} />
            </Form.Item>
            
            <Form.Item
              label={t('pages.promptManager.editModal.category')}
              name="category"
              rules={[
                { pattern: /^[a-zA-Z0-9_-]*$/, message: t('pages.promptManager.editModal.categoryPattern') }
              ]}
            >
              <Input placeholder={t('pages.promptManager.editModal.categoryPlaceholder')} disabled={isUpdating} />
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
              {t('pages.promptManager.editModal.content')}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <PromptEditor
                content={editContent}
                onChange={(value) => {
                  setEditContent(value);
                  editForm.setFieldsValue({ content: value });
                }}
                readOnly={isUpdating}
                placeholder={t('pages.promptManager.editModal.contentPlaceholder')}
              />
            </div>
            <Form.Item
              name="content"
              rules={[{ required: true, message: t('pages.promptManager.editModal.contentRequired') }]}
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
              {t('pages.promptManager.editModal.cancel')}
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
              {t('pages.promptManager.editModal.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 🔥 修复后的导入提示词模态框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadIcon size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
            {t('pages.promptManager.importModal.title')}
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
        styles={{
          body: {
            maxHeight: 'calc(70vh - 120px)',
            overflow: 'auto'
          }
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
            label={t('pages.promptManager.importModal.selectFile')}
            name="file"
            valuePropName="fileList"
            getValueFromEvent={(e) => e?.fileList}
            rules={[{ required: true, message: t('pages.promptManager.importModal.selectFileRequired') }]}
          >
            <Upload
              beforeUpload={() => false}
              accept=".md,.txt"
              maxCount={1}
              disabled={isImporting}
            >
              <Button icon={<UploadIcon size={16} strokeWidth={1.5} />} disabled={isImporting}>
                {t('pages.promptManager.importModal.selectButton')}
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item
            label={t('pages.promptManager.importModal.name')}
            name="name"
            rules={[
              { required: true, message: t('pages.promptManager.importModal.nameRequired') },
              { max: 100, message: t('pages.promptManager.importModal.nameMaxLength') }
            ]}
          >
            <Input placeholder={t('pages.promptManager.importModal.namePlaceholder')} disabled={isImporting} />
          </Form.Item>

          <Form.Item
            label={t('pages.promptManager.importModal.category')}
            name="category"
            rules={[
              { required: true, message: t('pages.promptManager.importModal.categoryRequired') },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: t('pages.promptManager.importModal.categoryPattern') }
            ]}
          >
            <Input placeholder={t('pages.promptManager.importModal.categoryPlaceholder')} disabled={isImporting} />
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
                {t('pages.promptManager.importModal.cancel')}
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
                {t('pages.promptManager.importModal.import')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default PromptManager;