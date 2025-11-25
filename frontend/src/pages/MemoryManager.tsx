// src/pages/MemoryManager.tsx
import React, { useState, useEffect } from 'react';
import { Layout, Row, Col, Input, Spin, Card, Typography, Space, Tag, message } from 'antd';
import { Database, Search } from 'lucide-react';
import { MemoryMetadata } from '../types/memory';
import { getMemories } from '../services/memoryService';
import MemoryCard from '../components/memory-manager/MemoryCard';
import MemoryDetailDrawer from '../components/memory-manager/MemoryDetailDrawer';
import ExportModal from '../components/memory-manager/ExportModal';
import ImportModal from '../components/memory-manager/ImportModal';
import { useT } from '../i18n/hooks';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const MemoryManager: React.FC = () => {
  const t = useT();
  const [memories, setMemories] = useState<MemoryMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const [filteredMemories, setFilteredMemories] = useState<MemoryMetadata[]>([]);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState<boolean>(false);
  const [currentOwner, setCurrentOwner] = useState<{ type: string; id: string } | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState<boolean>(false);
  const [importModalVisible, setImportModalVisible] = useState<boolean>(false);

  useEffect(() => {
    fetchMemories();
  }, []);

  useEffect(() => {
    handleSearch(searchText);
  }, [searchText, memories]);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const response = await getMemories();
      if (response.status === 'success') {
        setMemories(response.data);
      } else {
        message.error(t('pages.memoryManager.loadFailed', { error: '' }));
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
      message.error(t('pages.memoryManager.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (keyword: string) => {
    if (!keyword.trim()) {
      setFilteredMemories(memories);
      return;
    }

    const lowerKeyword = keyword.toLowerCase();
    const filtered = memories.filter(
      (memory) =>
        memory.owner_id.toLowerCase().includes(lowerKeyword) ||
        memory.owner_type.toLowerCase().includes(lowerKeyword)
    );
    setFilteredMemories(filtered);
  };

  const handleEditClick = (owner: { type: string; id: string }) => {
    setCurrentOwner(owner);
    setDetailDrawerVisible(true);
  };

  const handleExportClick = (owner: { type: string; id: string }) => {
    setCurrentOwner(owner);
    setExportModalVisible(true);
  };

  const handleImportClick = (owner: { type: string; id: string }) => {
    setCurrentOwner(owner);
    setImportModalVisible(true);
  };

  const handleImportSuccess = () => {
    fetchMemories();
  };

  const totalItems = memories.reduce((sum, m) => sum + m.total_items, 0);

  return (
    <Layout style={{ height: '100vh', background: '#faf8f5', display: 'flex', flexDirection: 'column' }}>
      {/* Header 顶栏 */}
      <Header
        style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
          backdropFilter: 'blur(20px)',
          padding: '0 48px',
          borderBottom: 'none',
          boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
          position: 'relative',
        }}
      >
        {/* 装饰性底部渐变线 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '20%',
            right: '20%',
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          {/* 左侧：图标 + 标题 + 统计标签 */}
          <Space size="large">
            <Database size={28} color="#b85845" strokeWidth={1.5} />
            <Title
              level={4}
              style={{
                margin: 0,
                color: '#2d2d2d',
                fontWeight: 500,
                letterSpacing: '2px',
                fontSize: '18px',
              }}
            >
              {t('pages.memoryManager.title')}
            </Title>
            <Tag
              style={{
                background: 'rgba(184, 88, 69, 0.08)',
                color: '#b85845',
                border: '1px solid rgba(184, 88, 69, 0.25)',
                borderRadius: '6px',
                fontWeight: 500,
                padding: '4px 12px',
                fontSize: '12px',
              }}
            >
              {t('pages.memoryManager.memoriesCount', { count: memories.length })}
            </Tag>
            <Tag
              style={{
                background: 'rgba(139, 115, 85, 0.08)',
                color: '#8b7355',
                border: '1px solid rgba(139, 115, 85, 0.25)',
                borderRadius: '6px',
                fontWeight: 500,
                padding: '4px 12px',
                fontSize: '12px',
              }}
            >
              {t('pages.memoryManager.itemsCount', { count: totalItems })}
            </Tag>
          </Space>

          {/* 右侧：搜索框 */}
          <Input
            placeholder={t('pages.memoryManager.searchPlaceholder')}
            prefix={<Search size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{
              width: 320,
              height: '40px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)',
            }}
          />
        </div>
      </Header>

      {/* Content 内容区 */}
      <Content style={{ flex: 1, padding: '48px 64px', overflow: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '120px 0' }}>
            <Spin size="large" />
          </div>
        ) : filteredMemories.length === 0 ? (
          <Card
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.15)',
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
            }}
          >
            <Database size={48} color="#8b7355" strokeWidth={1.5} style={{ marginBottom: '16px' }} />
            <Text style={{ fontSize: '16px', color: 'rgba(45, 45, 45, 0.65)', display: 'block' }}>
              {searchText ? t('pages.memoryManager.noMatchingMemories') : t('pages.memoryManager.noMemories')}
            </Text>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredMemories.map((memory) => (
              <Col xs={24} sm={12} md={12} lg={8} xl={6} key={`${memory.owner_type}-${memory.owner_id}`}>
                <MemoryCard
                  memory={memory}
                  onEdit={handleEditClick}
                  onExport={handleExportClick}
                  onImport={handleImportClick}
                />
              </Col>
            ))}
          </Row>
        )}
      </Content>

      {/* 记忆详情抽屉 */}
      <MemoryDetailDrawer
        visible={detailDrawerVisible}
        owner={currentOwner}
        onClose={() => setDetailDrawerVisible(false)}
        onRefresh={fetchMemories}
      />

      {/* 导出模态框 */}
      <ExportModal
        visible={exportModalVisible}
        owner={currentOwner}
        onClose={() => setExportModalVisible(false)}
      />

      {/* 导入模态框 */}
      <ImportModal
        visible={importModalVisible}
        owner={currentOwner}
        onClose={() => setImportModalVisible(false)}
        onSuccess={handleImportSuccess}
      />
    </Layout>
  );
};

export default MemoryManager;
