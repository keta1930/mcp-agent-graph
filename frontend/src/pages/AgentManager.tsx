import React, { useState } from 'react';
import { Layout, Button, Input, Tag, Spin, Space, Modal, Form, Typography } from 'antd';
import { Plus, RefreshCw, Bot, Search as SearchIcon, Upload } from 'lucide-react';
import { AgentConfig } from '../services/agentService';
import { useT } from '../i18n/hooks';
import { useAgentManager } from '../hooks/useAgentManager';
import AgentCategoryPanel from '../components/agent-manager/AgentCategoryPanel';
import AgentForm from '../components/agent-manager/AgentForm';
import AgentDetail from '../components/agent-manager/AgentDetail';
import { HEADER_STYLES, BUTTON_STYLES, INPUT_STYLES, MODAL_STYLES } from '../constants/agentManagerStyles';

const { Header, Content } = Layout;
const { Title } = Typography;

/**
 * Agent Manager 页面
 * 管理 AI Agents 的创建、编辑、删除和查看
 */
const AgentManager: React.FC = () => {
  const t = useT();
  const [form] = Form.useForm();

  // 使用自定义 Hook 管理数据和业务逻辑
  const {
    loading,
    searchText,
    filteredGroups,
    models,
    systemTools,
    mcpServers,
    categories,
    setSearchText,
    loadAgents,
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    fetchAgentDetail,
  } = useAgentManager();

  // Modal 状态
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  /**
   * 显示创建 Modal
   */
  const showCreateModal = () => {
    setEditingAgent(null);
    form.resetFields();
    setModalVisible(true);
  };

  /**
   * 显示编辑 Modal
   */
  const showEditModal = async (agentName: string) => {
    const agentData = await fetchAgentDetail(agentName);
    if (agentData) {
      setEditingAgent(agentName);
      form.setFieldsValue(agentData.agent_config);
      setModalVisible(true);
    }
  };

  /**
   * 显示详情 Modal
   */
  const showDetailModal = async (agentName: string) => {
    const agentData = await fetchAgentDetail(agentName);
    if (agentData) {
      setSelectedAgent(agentData);
      setDetailModalVisible(true);
    }
  };

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const agentConfig: AgentConfig = {
        name: values.name,
        card: values.card,
        model: values.model,
        instruction: values.instruction || '',
        max_actions: values.max_actions || 50,
        mcp: values.mcp || [],
        system_tools: values.system_tools || [],
        category: values.category,
        tags: values.tags || []
      };

      const success = editingAgent
        ? await handleUpdateAgent(editingAgent, agentConfig)
        : await handleCreateAgent(agentConfig);

      if (success) {
        setModalVisible(false);
      }
    } catch (error: any) {
      console.error('Form validation error:', error);
    }
  };

  /**
   * 处理文件导入
   */
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.jsonl,.xlsx,.xls,.parquet';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 验证文件格式
      const ext = file.name.toLowerCase().split('.').pop();
      const supportedFormats = ['json', 'jsonl', 'xlsx', 'xls', 'parquet'];
      if (!supportedFormats.includes(ext || '')) {
        Modal.error({
          title: t('pages.agentManager.import.invalidFormat'),
          content: t('pages.agentManager.import.supportedFormats'),
        });
        return;
      }

      setImporting(true);
      try {
        const { importAgents } = await import('../services/agentService');
        await importAgents(file);
        Modal.success({
          title: t('pages.agentManager.import.success'),
          content: t('pages.agentManager.import.reportDownloaded'),
        });
        // 刷新列表
        loadAgents();
      } catch (error: any) {
        Modal.error({
          title: t('pages.agentManager.import.failed'),
          content: error.response?.data?.detail || error.message || t('pages.agentManager.import.unknownError'),
        });
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const totalAgentsCount = filteredGroups.reduce((sum, group) => sum + group.agents.length, 0);

  return (
    <Layout style={{ height: '100vh', background: '#faf8f5', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Header style={HEADER_STYLES.container}>
        <div style={HEADER_STYLES.decorativeLine} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Space size="large">
            <Bot size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={HEADER_STYLES.title}>
              {t('pages.agentManager.title')}
            </Title>
            <Tag style={{
              background: 'rgba(184, 88, 69, 0.08)',
              color: '#b85845',
              border: '1px solid rgba(184, 88, 69, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {t('pages.agentManager.agentsCount', { count: totalAgentsCount })}
            </Tag>
            <Tag style={{
              background: 'rgba(139, 115, 85, 0.08)',
              color: '#8b7355',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {t('pages.agentManager.categoriesCount', { count: filteredGroups.length })}
            </Tag>
          </Space>

          <Space size={12}>
            <Input
              placeholder={t('pages.agentManager.searchPlaceholder')}
              allowClear
              prefix={<SearchIcon size={16} strokeWidth={1.5} style={{ color: '#8b7355', marginRight: '4px' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ ...INPUT_STYLES.base, width: 280 }}
              onFocus={(e) => Object.assign(e.target.style, INPUT_STYLES.focus)}
              onBlur={(e) => Object.assign(e.target.style, INPUT_STYLES.blur)}
            />
            <Button
              icon={<Upload size={16} strokeWidth={1.5} />}
              onClick={handleImport}
              loading={importing}
              style={BUTTON_STYLES.secondary}
            >
              {t('pages.agentManager.import.button')}
            </Button>
            <Button
              icon={<RefreshCw size={16} strokeWidth={1.5} />}
              onClick={loadAgents}
              loading={loading}
              style={BUTTON_STYLES.secondary}
            >
              {t('pages.agentManager.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} strokeWidth={1.5} />}
              onClick={showCreateModal}
              style={BUTTON_STYLES.primary}
            >
              {t('pages.agentManager.createAgent')}
            </Button>
          </Space>
        </div>
      </Header>

      {/* Content */}
      <Content style={{ flex: 1, padding: '48px 64px', overflow: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin size="large" tip={t('common.loading')} />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div style={{
            textAlign: 'center',
            marginTop: '120px',
            color: 'rgba(45, 45, 45, 0.45)',
            fontSize: '14px'
          }}>
            {searchText ? t('pages.agentManager.noMatchingAgents', { search: searchText }) : t('pages.agentManager.noAgents')}
          </div>
        ) : (
          <AgentCategoryPanel
            groups={filteredGroups}
            onView={showDetailModal}
            onEdit={showEditModal}
            onDelete={handleDeleteAgent}
          />
        )}
      </Content>

      {/* 创建/编辑 Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bot size={20} strokeWidth={1.5} style={{ color: '#b85845' }} />
            <span style={{
              color: '#2d2d2d',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}>
              {editingAgent ? t('pages.agentManager.editModalTitle', { name: editingAgent }) : t('pages.agentManager.createModalTitle')}
            </span>
          </div>
        }
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={720}
        footer={[
          <Button
            key="cancel"
            onClick={() => setModalVisible(false)}
            style={{
              height: '40px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#8b7355',
              fontWeight: 500,
              fontSize: '14px',
              letterSpacing: '0.3px',
              padding: '0 24px'
            }}
          >
            {t('common.cancel')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmit}
            style={{
              height: '40px',
              background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 500,
              fontSize: '14px',
              letterSpacing: '0.3px',
              boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              padding: '0 24px'
            }}
          >
            {t('common.confirm')}
          </Button>
        ]}
        styles={MODAL_STYLES}
      >
        <AgentForm
          form={form}
          isEditing={!!editingAgent}
          models={models}
          systemTools={systemTools}
          mcpServers={mcpServers}
          categories={categories}
        />
      </Modal>

      {/* 详情 Modal */}
      <Modal
        title={
          <div style={{
            color: '#2d2d2d',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            {t('pages.agentManager.detailModalTitle', { name: selectedAgent?.name })}
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setDetailModalVisible(false)}
            style={{
              height: '36px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#8b7355',
              fontWeight: 500,
              fontSize: '14px',
              letterSpacing: '0.3px'
            }}
          >
            {t('pages.agentManager.close')}
          </Button>
        ]}
        width={800}
        styles={{
          content: {
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)',
            padding: 0
          },
          header: {
            background: 'rgba(250, 248, 245, 0.6)',
            borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
            padding: '16px 24px'
          },
          body: {
            padding: '24px',
            background: '#fff'
          },
          footer: {
            borderTop: '1px solid rgba(139, 115, 85, 0.15)',
            padding: '12px 16px'
          }
        }}
      >
        <AgentDetail agent={selectedAgent} />
      </Modal>
    </Layout>
  );
};

export default AgentManager;
