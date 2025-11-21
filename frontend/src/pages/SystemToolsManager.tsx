// src/pages/SystemToolsManager.tsx
import React, { useEffect, useState } from 'react';
import {
  Layout,
  message,
  Empty,
  Spin,
  Space,
  Typography,
  Input,
  Tag
} from 'antd';
import { Wrench, Search } from 'lucide-react';
import {
  listSystemTools,
  getSystemToolDetail,
  SystemToolSchema,
  ToolCategory
} from '../services/systemToolsService';
import { useTranslation } from '../i18n/hooks';
import {
  CategorySection,
  ToolDetailModal,
  CategoryReadmeModal
} from '../components/system-tools';
import { TAG_STYLES, COLORS } from '../constants/systemToolsStyles';

const { Header, Content } = Layout;
const { Title } = Typography;

/**
 * 系统工具管理器页面
 * 展示和管理系统中所有可用的工具
 */
const SystemToolsManager: React.FC = () => {
  const { t } = useTranslation();
  
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState<SystemToolSchema | null>(null);
  const [searchText, setSearchText] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [readmeModalVisible, setReadmeModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  /**
   * 加载系统工具列表
   */
  const loadTools = async () => {
    setLoading(true);
    try {
      const response = await listSystemTools();
      setCategories(response.categories || []);
      setFilteredCategories(response.categories || []);
    } catch (error: any) {
      message.error(t('pages.systemToolsManager.loadFailed', { error: error.message || t('errors.unknown') }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  /**
   * 初始化所有分类为折叠状态
   */
  useEffect(() => {
    if (categories.length > 0) {
      setCollapsedCategories(new Set(categories.map(cat => cat.category)));
    }
  }, [categories]);

  /**
   * 搜索过滤
   */
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredCategories(categories);
      return;
    }

    const searchValue = value.toLowerCase();
    const filtered = categories.map((category) => {
      // 如果类别名称匹配，显示该类别下所有工具
      if (category.category.toLowerCase().includes(searchValue)) {
        return category;
      }
      // 否则按工具名称和描述过滤
      const filteredTools = category.tools.filter((tool) =>
        tool.name.toLowerCase().includes(searchValue) ||
        tool.schema.function.description.toLowerCase().includes(searchValue)
      );
      return {
        ...category,
        tools: filteredTools,
        tool_count: filteredTools.length
      };
    }).filter((category) => category.tools.length > 0);

    setFilteredCategories(filtered);
  };

  /**
   * 切换分类折叠状态
   */
  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  /**
   * 显示工具详情
   */
  const showToolDetail = async (toolName: string) => {
    try {
      const response = await getSystemToolDetail(toolName);
      if (response.success) {
        setSelectedTool({
          name: response.name,
          schema: response.schema
        });
        setDetailModalVisible(true);
      }
    } catch (error: any) {
      message.error(t('pages.systemToolsManager.loadDetailFailed', { error: error.message || t('errors.unknown') }));
    }
  };

  /**
   * 显示类别说明
   */
  const showCategoryReadme = (category: string) => {
    setSelectedCategory(category);
    setReadmeModalVisible(true);
  };

  const totalTools = categories.reduce((sum, cat) => sum + cat.tool_count, 0);

  return (
    <Layout style={{ height: '100vh', background: COLORS.background, display: 'flex', flexDirection: 'column' }}>
      {/* Header 顶栏 */}
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: `0 2px 8px ${COLORS.shadow}`,
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
          {/* 左侧：图标 + 标题 + 统计标签 */}
          <Space size="large">
            <Wrench size={28} color={COLORS.primary} strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: COLORS.text,
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              {t('pages.systemToolsManager.title')}
            </Title>
            <Tag style={TAG_STYLES.primary}>
              {t('pages.systemToolsManager.toolsCount', { count: totalTools })}
            </Tag>
            <Tag style={TAG_STYLES.secondary}>
              {t('pages.systemToolsManager.categoriesCount', { count: categories.length })}
            </Tag>
          </Space>

          {/* 右侧：搜索框 */}
          <Input
            placeholder={t('pages.systemToolsManager.searchPlaceholder')}
            prefix={<Search size={16} strokeWidth={1.5} style={{ color: COLORS.secondary }} />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{
              width: 320,
              height: '40px',
              borderRadius: '8px',
              border: `1px solid ${COLORS.border}`,
              background: COLORS.white,
              boxShadow: `0 1px 3px ${COLORS.shadow}`
            }}
          />
        </div>
      </Header>

      {/* Content 内容区 */}
      <Content style={{
        flex: 1,
        padding: '32px 48px',
        overflow: 'auto'
      }}>
        {/* 工具列表 */}
        {loading && categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <Empty
            description={searchText ? t('pages.systemToolsManager.noSearchResults') : t('pages.systemToolsManager.noTools')}
            style={{ marginTop: '80px' }}
          />
        ) : (
          <>
            {filteredCategories.map((category) => (
              <CategorySection
                key={category.category}
                category={category}
                isCollapsed={collapsedCategories.has(category.category)}
                onToggleCollapse={toggleCategoryCollapse}
                onViewReadme={showCategoryReadme}
                onViewToolDetail={showToolDetail}
              />
            ))}
          </>
        )}
      </Content>

      {/* 类别说明 Modal */}
      <CategoryReadmeModal
        visible={readmeModalVisible}
        category={selectedCategory}
        onClose={() => setReadmeModalVisible(false)}
      />

      {/* 详情 Modal */}
      <ToolDetailModal
        visible={detailModalVisible}
        tool={selectedTool}
        onClose={() => setDetailModalVisible(false)}
      />

      {/* 自定义滚动条样式 */}
      <style>{`
        /* Modal 滚动条样式 */
        .ant-modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .ant-modal-body::-webkit-scrollbar-track {
          background: rgba(245, 243, 240, 0.3);
          border-radius: 4px;
        }

        .ant-modal-body::-webkit-scrollbar-thumb {
          background: rgba(139, 115, 85, 0.3);
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .ant-modal-body::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 115, 85, 0.5);
        }

        /* Schema 区域滚动条样式 */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(245, 243, 240, 0.5);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(184, 88, 69, 0.3);
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(184, 88, 69, 0.5);
        }

        /* Firefox 滚动条样式 */
        .ant-modal-body {
          scrollbar-width: thin;
          scrollbar-color: rgba(139, 115, 85, 0.3) rgba(245, 243, 240, 0.3);
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(184, 88, 69, 0.3) rgba(245, 243, 240, 0.5);
        }
      `}</style>
    </Layout>
  );
};

export default SystemToolsManager;
