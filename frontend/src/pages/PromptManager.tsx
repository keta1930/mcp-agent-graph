import React, { useState, useEffect } from 'react';
import { Layout, Button, Input, Space, Typography, Tag, Empty, Spin, App } from 'antd';
import { Plus, Search, Upload as UploadIcon, FileText } from 'lucide-react';
import { promptService } from '../services/promptService';
import { PromptInfo, PromptDetail, PromptCreate, PromptUpdate } from '../types/prompt';
import PromptCategoryPanel from '../components/prompt/PromptCategoryPanel';
import CreatePromptModal from '../components/prompt/CreatePromptModal';
import EditPromptModal from '../components/prompt/EditPromptModal';
import ImportPromptModal from '../components/prompt/ImportPromptModal';
import { useT } from '../i18n/hooks';
import {
  HEADER_STYLES,
  TAG_STYLES,
  BUTTON_STYLES,
  INPUT_STYLES,
} from '../constants/promptManagerStyles';

const { Header, Content } = Layout;
const { Title } = Typography;

interface CategoryStats {
  [key: string]: number;
}

interface PromptGroup {
  category: string;
  prompts: PromptInfo[];
}

/**
 * Prompt 管理页面主组件
 */
const PromptManager: React.FC = () => {
  const t = useT();
  const { message } = App.useApp();

  // 数据状态
  const [prompts, setPrompts] = useState<PromptInfo[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<PromptGroup[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<PromptDetail | null>(null);
  const [categories, setCategories] = useState<CategoryStats>({});

  // UI 状态
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

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

  /**
   * 加载 Prompt 列表
   */
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

  /**
   * 计算分类统计
   */
  const calculateCategories = (promptList: PromptInfo[]) => {
    const stats: CategoryStats = {};
    promptList.forEach((prompt) => {
      const category = prompt.category || t('pages.promptManager.uncategorized');
      stats[category] = (stats[category] || 0) + 1;
    });
    setCategories(stats);
  };

  /**
   * 按分类分组 Prompt
   */
  const groupPromptsByCategory = (promptList: PromptInfo[]): PromptGroup[] => {
    const groupMap = new Map<string, PromptGroup>();

    promptList.forEach((prompt) => {
      const category = prompt.category || t('pages.promptManager.uncategorized');
      if (!groupMap.has(category)) {
        groupMap.set(category, { category, prompts: [] });
      }
      groupMap.get(category)!.prompts.push(prompt);
    });

    return Array.from(groupMap.values());
  };

  /**
   * 过滤 Prompt
   */
  const filterPrompts = () => {
    let filtered = prompts;

    if (searchText) {
      filtered = filtered.filter((prompt) =>
        prompt.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    const grouped = groupPromptsByCategory(filtered);
    setFilteredGroups(grouped);
  };

  /**
   * 加载 Prompt 详情
   */
  const loadPromptDetail = async (name: string) => {
    try {
      const response = await promptService.getPromptContent(name);
      if (response.success && response.data) {
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

  /**
   * 处理编辑 Prompt
   */
  const handleEdit = async (name: string) => {
    const promptDetail = await loadPromptDetail(name);
    if (promptDetail) {
      setEditingPrompt(promptDetail);
      setEditContent(promptDetail.content);
      setShowEditModal(true);
    }
  };

  /**
   * 创建 Prompt
   */
  const handleCreatePrompt = async (values: PromptCreate) => {
    setIsCreating(true);
    try {
      const response = await promptService.createPrompt(values);
      if (response.success) {
        message.success(t('pages.promptManager.createModal.createSuccess'));
        setShowCreateModal(false);
        setCreateContent('');
        loadPrompts();
      } else {
        if (response.error_code === 'PROMPT_ALREADY_EXISTS') {
          message.error(t('pages.promptManager.createModal.nameExists', { name: values.name }));
        } else {
          const errorMsg = response.message || t('pages.promptManager.createModal.createFailed');
          message.error(errorMsg);
        }
        console.error('Create prompt failed:', response);
      }
    } catch (error: any) {
      console.error('Error creating prompt:', error);
      const data = error?.response?.data;
      if (data?.error_code === 'PROMPT_ALREADY_EXISTS') {
        message.error(t('pages.promptManager.createModal.nameExists', { name: values.name }));
      } else {
        let errorMsg = t('pages.promptManager.createModal.createFailed');
        if (data) {
          errorMsg = data.message || data.detail || data.error || errorMsg;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        message.error(errorMsg);
      }
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * 更新 Prompt
   */
  const handleUpdatePrompt = async (values: PromptUpdate) => {
    if (!editingPrompt) return;

    setIsUpdating(true);
    try {
      const response = await promptService.updatePrompt(editingPrompt.name, values);
      if (response.success) {
        message.success(t('pages.promptManager.editModal.updateSuccess'));
        setShowEditModal(false);
        setEditContent('');
        setEditingPrompt(null);
        loadPrompts();
      } else {
        const errorMsg = response.message || t('pages.promptManager.editModal.updateFailed');
        message.error(errorMsg);
        console.error('Update prompt failed:', response);
      }
    } catch (error: any) {
      console.error('Error updating prompt:', error);
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

  /**
   * 删除 Prompt
   */
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



  /**
   * 导入 Prompt
   */
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
        category,
      });
      if (response.success) {
        message.success(t('pages.promptManager.importModal.importSuccess'));
        setShowImportModal(false);
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
        <Header style={HEADER_STYLES.container}>
          <div style={HEADER_STYLES.decorativeLine} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
            <Space size="large">
              <FileText size={28} color="#b85845" strokeWidth={1.5} />
              <Title level={4} style={HEADER_STYLES.title}>
                {t('pages.promptManager.title')}
              </Title>
              <Tag style={TAG_STYLES.primary}>
                {t('pages.promptManager.totalCount', { count: prompts.length })}
              </Tag>
              <Tag style={TAG_STYLES.secondary}>
                {t('pages.promptManager.categoriesCount', { count: Object.keys(categories).length })}
              </Tag>
            </Space>

            <Space>
              <Input
                placeholder={t('pages.promptManager.searchPlaceholder')}
                prefix={<Search size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={INPUT_STYLES.search}
                allowClear
              />
              <Button
                type="primary"
                icon={<Plus size={16} strokeWidth={1.5} />}
                onClick={() => setShowCreateModal(true)}
                style={BUTTON_STYLES.primary}
              >
                {t('pages.promptManager.create')}
              </Button>
              <Button
                icon={<UploadIcon size={16} strokeWidth={1.5} />}
                onClick={() => setShowImportModal(true)}
                style={BUTTON_STYLES.secondary}
              >
                {t('pages.promptManager.import')}
              </Button>
            </Space>
          </div>
        </Header>

        <Content style={{ flex: 1, padding: '48px 64px', overflow: 'auto' }}>
          <Spin spinning={loading}>
            {filteredGroups.length === 0 ? (
              <Empty description={t('pages.promptManager.noPrompts')} style={{ marginTop: '40px' }} />
            ) : (
              <PromptCategoryPanel
                groups={filteredGroups}
                onEdit={handleEdit}
                onDelete={handleDeletePrompt}
              />
            )}
          </Spin>
        </Content>
      </Layout>

      <CreatePromptModal
        open={showCreateModal}
        loading={isCreating}
        content={createContent}
        onContentChange={setCreateContent}
        onSubmit={handleCreatePrompt}
        onCancel={() => {
          setShowCreateModal(false);
          setCreateContent('');
        }}
      />

      <EditPromptModal
        open={showEditModal}
        loading={isUpdating}
        prompt={editingPrompt}
        content={editContent}
        onContentChange={setEditContent}
        onSubmit={handleUpdatePrompt}
        onCancel={() => {
          setShowEditModal(false);
          setEditContent('');
          setEditingPrompt(null);
        }}
      />

      <ImportPromptModal
        open={showImportModal}
        loading={isImporting}
        onSubmit={handleImportPrompt}
        onCancel={() => setShowImportModal(false)}
      />
    </>
  );
};

export default PromptManager;
