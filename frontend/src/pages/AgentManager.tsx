import React, { useEffect, useState } from 'react';
import {
  Layout,
  Button,
  Card,
  Row,
  Col,
  message,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Tag,
  Tooltip,
  Spin,
  Descriptions,
  Space,
  Popconfirm,
  AutoComplete,
  Collapse,
  Typography
} from 'antd';
import {
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  Bot,
  ChevronDown,
  Search as SearchIcon,
  Sparkles
} from 'lucide-react';
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgent,
  listCategories,
  AgentConfig,
  AgentListItem,
  AgentCategoryItem
} from '../services/agentService';
import { getModels } from '../services/modelService';
import { listSystemTools } from '../services/systemToolsService';
import { getMCPConfig } from '../services/mcpService';
import { useT } from '../i18n/hooks';

const { TextArea } = Input;
const { Option } = Select;
const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Panel } = Collapse;

interface CategoryGroup {
  category: string;
  agents: AgentListItem[];
}

const AgentManager: React.FC = () => {
  const t = useT();
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');

  // 可选项数据
  const [models, setModels] = useState<string[]>([]);
  const [systemTools, setSystemTools] = useState<string[]>([]);
  const [mcpServers, setMcpServers] = useState<string[]>([]);
  const [categories, setCategories] = useState<AgentCategoryItem[]>([]);

  // 分组后的 agents
  const [groupedAgents, setGroupedAgents] = useState<CategoryGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<CategoryGroup[]>([]);

  // 加载数据
  const loadAgents = async () => {
    setLoading(true);
    try {
      const response = await listAgents();
      setAgents(response.agents || []);
    } catch (error: any) {
      message.error(t('pages.agentManager.loadFailed', { error: error.message || t('errors.serverError') }));
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      // 加载模型列表
      const modelResponse = await getModels();
      setModels(modelResponse.map((m: any) => m.name));

      // 加载系统工具列表
      const toolsResponse = await listSystemTools();
      const allTools = toolsResponse.categories.flatMap((cat: any) => cat.tools.map((t: any) => t.name));
      setSystemTools(allTools);

      // 加载 MCP 服务器列表
      const mcpResponse = await getMCPConfig();
      setMcpServers(Object.keys(mcpResponse.mcpServers || {}));

      // 加载分类列表
      const categoriesResponse = await listCategories();
      setCategories(categoriesResponse.categories || []);
    } catch (error: any) {
      console.error('加载选项失败:', error);
    }
  };

  // 按分类分组
  const groupAgentsByCategory = (agentList: AgentListItem[]): CategoryGroup[] => {
    const groupMap = new Map<string, CategoryGroup>();

    agentList.forEach(agent => {
      const category = agent.category || t('pages.agentManager.noAgents');
      if (!groupMap.has(category)) {
        groupMap.set(category, {
          category,
          agents: []
        });
      }
      groupMap.get(category)!.agents.push(agent);
    });

    return Array.from(groupMap.values()).sort((a, b) => a.category.localeCompare(b.category));
  };

  useEffect(() => {
    loadAgents();
    loadOptions();
  }, []);

  useEffect(() => {
    const grouped = groupAgentsByCategory(agents);
    setGroupedAgents(grouped);
    setFilteredGroups(grouped);
  }, [agents]);

  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredGroups(groupedAgents);
    } else {
      const keyword = searchText.toLowerCase();
      const filtered = groupedAgents
        .map(group => ({
          ...group,
          agents: group.agents.filter(agent =>
            agent.name.toLowerCase().includes(keyword) ||
            agent.category.toLowerCase().includes(keyword) ||
            agent.tags?.some(tag => tag.toLowerCase().includes(keyword))
          )
        }))
        .filter(group => group.agents.length > 0);
      setFilteredGroups(filtered);
    }
  }, [searchText, groupedAgents]);

  // 显示创建 Modal
  const showCreateModal = () => {
    setEditingAgent(null);
    form.resetFields();
    form.setFieldsValue({
      max_actions: 50,
      mcp: [],
      system_tools: [],
      tags: []
    });
    setModalVisible(true);
  };

  // 显示编辑 Modal
  const showEditModal = async (agentName: string) => {
    try {
      const response = await getAgent(agentName);
      const agentData = response.agent;
      setEditingAgent(agentName);
      form.setFieldsValue(agentData.agent_config);
      setModalVisible(true);
    } catch (error: any) {
      message.error(t('pages.agentManager.loadDetailFailed', { error: error.message || t('errors.serverError') }));
    }
  };

  // 显示详情 Modal
  const showDetailModal = async (agentName: string) => {
    try {
      const response = await getAgent(agentName);
      setSelectedAgent(response.agent);
      setDetailModalVisible(true);
    } catch (error: any) {
      message.error(t('pages.agentManager.loadDetailFailed', { error: error.message || t('errors.serverError') }));
    }
  };

  // 提交表单
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

      if (editingAgent) {
        await updateAgent(editingAgent, agentConfig);
        message.success(t('pages.agentManager.updateSuccess', { name: editingAgent }));
      } else {
        await createAgent(agentConfig);
        message.success(t('pages.agentManager.createSuccess', { name: values.name }));
      }

      setModalVisible(false);
      loadAgents();
    } catch (error: any) {
      message.error(t('pages.agentManager.operationFailed', { error: error.message || t('errors.serverError') }));
    }
  };

  // 删除 Agent
  const handleDelete = async (agentName: string) => {
    try {
      await deleteAgent(agentName);
      message.success(t('pages.agentManager.deleteSuccess', { name: agentName }));
      loadAgents();
    } catch (error: any) {
      message.error(t('pages.agentManager.deleteFailed', { error: error.message || t('errors.serverError') }));
    }
  };

  const totalAgentsCount = filteredGroups.reduce((sum, group) => sum + group.agents.length, 0);

  return (
    <Layout style={{ height: '100vh', background: '#faf8f5', display: 'flex', flexDirection: 'column' }}>
      {/* Header with gradient and blur effect */}
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative'
      }}>
        {/* Decorative gradient line */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Space size="large">
            <Bot size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
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
              style={{
                width: 280,
                borderRadius: '8px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                background: 'rgba(255, 255, 255, 0.85)',
                boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                color: '#2d2d2d',
                letterSpacing: '0.3px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#b85845';
                e.target.style.boxShadow = '0 0 0 3px rgba(184, 88, 69, 0.08), 0 1px 3px rgba(139, 115, 85, 0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                e.target.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
              }}
            />
            <Button
              icon={<RefreshCw size={16} strokeWidth={1.5} />}
              onClick={loadAgents}
              loading={loading}
              style={{
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#8b7355',
                fontWeight: 500,
                fontSize: '14px',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 16px'
              }}
            >
              {t('pages.agentManager.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} strokeWidth={1.5} />}
              onClick={showCreateModal}
              style={{
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: 500,
                fontSize: '14px',
                letterSpacing: '0.3px',
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 20px'
              }}
            >
              {t('pages.agentManager.createAgent')}
            </Button>
          </Space>
        </div>
      </Header>

      <Content style={{ flex: 1, padding: '48px 64px', overflow: 'auto' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
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
          <Collapse
            defaultActiveKey={[]}
            expandIconPosition="end"
            style={{
              background: 'transparent',
              border: 'none'
            }}
            expandIcon={({ isActive }) => (
              <ChevronDown
                size={18}
                strokeWidth={2}
                style={{
                  color: '#8b7355',
                  transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease'
                }}
              />
            )}
          >
            {filteredGroups.map((group) => (
              <Panel
                key={group.category}
                header={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                    <Sparkles size={18} color="#b85845" strokeWidth={1.5} />
                    <Text strong style={{
                      fontSize: '15px',
                      color: '#2d2d2d',
                      fontWeight: 500,
                      letterSpacing: '0.5px',
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
                      margin: 0,
                      padding: '2px 10px'
                    }}>
                      {group.agents.length}
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
                <Row gutter={[16, 16]} style={{ marginTop: '12px' }}>
                  {group.agents.map((agent) => (
                    <Col key={agent.name} xs={24} sm={24} md={24} lg={12} xl={8}>
                      <Card
                        hoverable
                        style={{
                          borderRadius: '8px',
                          border: '1px solid rgba(139, 115, 85, 0.15)',
                          boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
                          transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                          background: 'rgba(255, 255, 255, 0.85)',
                          height: '100%'
                        }}
                        styles={{
                          body: { padding: '16px 18px' }
                        }}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {/* Left: Icon */}
                          <div style={{
                            flexShrink: 0,
                            width: '48px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(184, 88, 69, 0.06)',
                            borderRadius: '8px',
                            border: '1px solid rgba(184, 88, 69, 0.1)'
                          }}>
                            <Bot size={28} strokeWidth={1.5} style={{ color: '#b85845' }} />
                          </div>

                          {/* Middle: Agent Info */}
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <Text
                              strong
                              style={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '16px',
                                fontWeight: 600,
                                color: '#2d2d2d',
                                letterSpacing: '0.3px',
                                lineHeight: '1.3'
                              }}
                              title={agent.name}
                            >
                              {agent.name}
                            </Text>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', overflow: 'hidden' }}>
                              <Tag style={{
                                background: 'rgba(139, 115, 85, 0.08)',
                                color: '#8b7355',
                                border: '1px solid rgba(139, 115, 85, 0.2)',
                                borderRadius: '4px',
                                fontWeight: 500,
                                fontSize: '13px',
                                padding: '2px 10px',
                                margin: 0,
                                lineHeight: '1.4'
                              }}>
                                {agent.model}
                              </Tag>
                              {agent.tags && agent.tags.length > 0 && (
                                <>
                                  {agent.tags.slice(0, 2).map((tag, idx) => (
                                    <Tag
                                      key={idx}
                                      style={{
                                        background: 'rgba(184, 88, 69, 0.06)',
                                        color: 'rgba(184, 88, 69, 0.85)',
                                        border: '1px solid rgba(184, 88, 69, 0.15)',
                                        borderRadius: '4px',
                                        fontWeight: 500,
                                        fontSize: '12px',
                                        padding: '2px 8px',
                                        margin: 0,
                                        lineHeight: '1.4'
                                      }}
                                    >
                                      {tag}
                                    </Tag>
                                  ))}
                                  {agent.tags.length > 2 && (
                                    <Tag style={{
                                      background: 'transparent',
                                      color: 'rgba(45, 45, 45, 0.45)',
                                      border: '1px dashed rgba(139, 115, 85, 0.2)',
                                      borderRadius: '4px',
                                      fontWeight: 500,
                                      fontSize: '12px',
                                      padding: '2px 8px',
                                      margin: 0,
                                      lineHeight: '1.4'
                                    }}>
                                      +{agent.tags.length - 2}
                                    </Tag>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: Action Buttons */}
                          <div style={{ flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Tooltip title={t('pages.agentManager.viewDetails')}>
                              <div
                                style={{
                                  color: '#8b7355',
                                  transition: 'all 0.2s ease',
                                  cursor: 'pointer',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '1px solid rgba(139, 115, 85, 0.15)'
                                }}
                                onClick={() => showDetailModal(agent.name)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#b85845';
                                  e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                                  e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.25)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#8b7355';
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                                }}
                              >
                                <Eye size={18} strokeWidth={1.5} />
                              </div>
                            </Tooltip>
                            <Tooltip title={t('common.edit')}>
                              <div
                                style={{
                                  color: '#8b7355',
                                  transition: 'all 0.2s ease',
                                  cursor: 'pointer',
                                  padding: '8px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '1px solid rgba(139, 115, 85, 0.15)'
                                }}
                                onClick={() => showEditModal(agent.name)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#b85845';
                                  e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                                  e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.25)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#8b7355';
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                                }}
                              >
                                <Edit2 size={18} strokeWidth={1.5} />
                              </div>
                            </Tooltip>
                            <Popconfirm
                              title={t('pages.agentManager.deleteConfirm')}
                              onConfirm={() => handleDelete(agent.name)}
                              okText={t('common.confirm')}
                              cancelText={t('common.cancel')}
                              okButtonProps={{
                                style: {
                                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: '#fff',
                                  fontWeight: 500,
                                  boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
                                }
                              }}
                              cancelButtonProps={{
                                style: {
                                  borderRadius: '6px',
                                  border: '1px solid rgba(139, 115, 85, 0.2)',
                                  color: '#8b7355',
                                  fontWeight: 500
                                }
                              }}
                              overlayStyle={{
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(139, 115, 85, 0.2)'
                              }}
                            >
                              <Tooltip title={t('common.delete')}>
                                <div
                                  style={{
                                    color: '#b85845',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(184, 88, 69, 0.15)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#d4574a';
                                    e.currentTarget.style.background = 'rgba(184, 88, 69, 0.12)';
                                    e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#b85845';
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.15)';
                                  }}
                                >
                                  <Trash2 size={18} strokeWidth={1.5} />
                                </div>
                              </Tooltip>
                            </Popconfirm>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Panel>
            ))}
          </Collapse>
        )}
      </Content>

      {/* 创建/编辑 Modal */}
      <Modal
        title={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
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
        styles={{
          content: {
            borderRadius: '10px',
            boxShadow: '0 12px 40px rgba(139, 115, 85, 0.2)',
            padding: 0,
            overflow: 'hidden'
          },
          header: {
            background: 'linear-gradient(to bottom, rgba(250, 248, 245, 0.95), rgba(255, 255, 255, 0.9))',
            borderBottom: '1px solid rgba(139, 115, 85, 0.12)',
            padding: '18px 28px',
            marginBottom: 0
          },
          body: {
            padding: '28px 28px 20px',
            background: '#fff',
            maxHeight: '70vh',
            overflowY: 'auto'
          },
          footer: {
            borderTop: '1px solid rgba(139, 115, 85, 0.12)',
            padding: '16px 28px',
            background: 'rgba(250, 248, 245, 0.3)',
            marginTop: 0
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          style={{
            '.ant-form-item': {
              marginBottom: '20px'
            }
          }}
        >
          {/* 基础信息区块 */}
          <div style={{
            background: 'rgba(250, 248, 245, 0.3)',
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid rgba(139, 115, 85, 0.1)'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#b85845',
              marginBottom: '16px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              {t('pages.agentManager.basicInfo')}
            </div>

            <Form.Item
              label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.agentManager.agentName')}</span>}
              name="name"
              rules={[
                { required: true, message: t('pages.agentManager.agentNameRequired') },
                { pattern: /^[^/\\.]+$/, message: t('pages.agentManager.agentNameInvalid') }
              ]}
              style={{ marginBottom: '16px' }}
            >
              <Input
                placeholder={t('pages.agentManager.agentNamePlaceholder')}
                disabled={!!editingAgent}
                style={{
                  height: '40px',
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  color: '#2d2d2d',
                  boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#b85845';
                  e.target.style.boxShadow = '0 0 0 3px rgba(184, 88, 69, 0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                  e.target.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.agentManager.capability')}</span>}
              name="card"
              rules={[{ required: true, message: t('pages.agentManager.capabilityRequired') }]}
              style={{ marginBottom: '16px' }}
            >
              <TextArea
                rows={3}
                placeholder={t('pages.agentManager.capabilityPlaceholder')}
                style={{
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  color: '#2d2d2d',
                  lineHeight: '1.6',
                  boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#b85845';
                  e.target.style.boxShadow = '0 0 0 3px rgba(184, 88, 69, 0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                  e.target.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06)';
                }}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.agentManager.category')}</span>}
                  name="category"
                  rules={[{ required: true, message: t('pages.agentManager.categoryRequired') }]}
                  tooltip={{
                    title: t('pages.agentManager.categoryTooltip'),
                    overlayStyle: { fontSize: '13px' }
                  }}
                  style={{ marginBottom: '0' }}
                >
                  <AutoComplete
                    placeholder={t('pages.agentManager.categoryPlaceholder')}
                    options={categories.map(cat => ({
                      value: cat.category,
                      label: `${cat.category} (${cat.agent_count}个)`
                    }))}
                    filterOption={(inputValue, option) =>
                      option?.value.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
                    }
                    style={{
                      height: '40px',
                      fontSize: '14px'
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.agentManager.model')}</span>}
                  name="model"
                  rules={[{ required: true, message: t('pages.agentManager.modelRequired') }]}
                  style={{ marginBottom: '0' }}
                >
                  <Select
                    placeholder={t('pages.agentManager.modelPlaceholder')}
                    showSearch
                    style={{ fontSize: '14px' }}
                  >
                    {models.map((model) => (
                      <Option key={model} value={model}>{model}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* 配置信息区块 */}
          <div style={{
            background: 'rgba(250, 248, 245, 0.3)',
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid rgba(139, 115, 85, 0.1)'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#b85845',
              marginBottom: '16px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              {t('pages.agentManager.configuration')}
            </div>

            <Form.Item
              label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.agentManager.instruction')}</span>}
              name="instruction"
              style={{ marginBottom: '16px' }}
            >
              <TextArea
                rows={4}
                placeholder={t('pages.agentManager.instructionPlaceholder')}
                style={{
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '13px',
                  color: '#2d2d2d',
                  lineHeight: '1.6',
                  fontFamily: 'Monaco, Courier New, monospace',
                  boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#b85845';
                  e.target.style.boxShadow = '0 0 0 3px rgba(184, 88, 69, 0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                  e.target.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06)';
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.agentManager.maxActions')}</span>}
              name="max_actions"
              style={{ marginBottom: '0' }}
            >
              <InputNumber
                min={1}
                max={200}
                placeholder="50"
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </Form.Item>
          </div>

          {/* 工具和服务区块 */}
          <div style={{
            background: 'rgba(250, 248, 245, 0.3)',
            padding: '16px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(139, 115, 85, 0.1)'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#b85845',
              marginBottom: '16px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              {t('pages.agentManager.toolsAndServices')}
            </div>

            <Form.Item
              label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.agentManager.systemTools')}</span>}
              name="system_tools"
              style={{ marginBottom: '16px' }}
            >
              <Select
                mode="multiple"
                placeholder={t('pages.agentManager.systemToolsPlaceholder')}
                allowClear
                maxTagCount="responsive"
                style={{ fontSize: '14px' }}
              >
                {systemTools.map((tool) => (
                  <Option key={tool} value={tool}>{tool}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.agentManager.mcpServers')}</span>}
              name="mcp"
              style={{ marginBottom: '16px' }}
            >
              <Select
                mode="multiple"
                placeholder={t('pages.agentManager.mcpServersPlaceholder')}
                allowClear
                maxTagCount="responsive"
                style={{ fontSize: '14px' }}
              >
                {mcpServers.map((server) => (
                  <Option key={server} value={server}>{server}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.agentManager.tags')}</span>}
              name="tags"
              style={{ marginBottom: '0' }}
            >
              <Select
                mode="tags"
                placeholder={t('pages.agentManager.tagsPlaceholder')}
                tokenSeparators={[',']}
                maxTagCount="responsive"
                style={{ fontSize: '14px' }}
              />
            </Form.Item>
          </div>
        </Form>
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
        {selectedAgent && (
          <Descriptions
            bordered
            column={1}
            labelStyle={{
              background: 'rgba(250, 248, 245, 0.6)',
              color: 'rgba(45, 45, 45, 0.85)',
              fontWeight: 500,
              fontSize: '14px',
              padding: '12px 16px',
              borderRight: '1px solid rgba(139, 115, 85, 0.15)'
            }}
            contentStyle={{
              background: '#fff',
              color: '#2d2d2d',
              fontSize: '14px',
              padding: '12px 16px'
            }}
            style={{
              border: '1px solid rgba(139, 115, 85, 0.15)',
              borderRadius: '6px',
              overflow: 'hidden'
            }}
          >
            <Descriptions.Item label={t('pages.agentManager.agentName')}>{selectedAgent.agent_config.name}</Descriptions.Item>
            <Descriptions.Item label={t('pages.agentManager.category')}>
              <Tag style={{
                background: 'rgba(139, 115, 85, 0.08)',
                color: '#8b7355',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                borderRadius: '6px',
                fontWeight: 500,
                fontSize: '12px',
                padding: '4px 12px'
              }}>
                {selectedAgent.agent_config.category}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agentManager.capability')}>
              {selectedAgent.agent_config.card}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agentManager.model')}>
              <Tag style={{
                background: 'rgba(139, 115, 85, 0.08)',
                color: '#8b7355',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                borderRadius: '6px',
                fontWeight: 500,
                fontSize: '12px',
                padding: '4px 12px'
              }}>
                {selectedAgent.agent_config.model}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agentManager.instruction')}>
              <pre style={{
                whiteSpace: 'pre-wrap',
                margin: 0,
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'rgba(45, 45, 45, 0.85)',
                background: 'rgba(250, 248, 245, 0.4)',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid rgba(139, 115, 85, 0.1)'
              }}>
                {selectedAgent.agent_config.instruction || t('pages.agentManager.none')}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agentManager.maxActions')}>
              {selectedAgent.agent_config.max_actions}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agentManager.systemTools')}>
              {selectedAgent.agent_config.system_tools?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedAgent.agent_config.system_tools.map((tool: string) => (
                    <Tag
                      key={tool}
                      style={{
                        background: 'rgba(139, 115, 85, 0.08)',
                        color: '#8b7355',
                        border: '1px solid rgba(139, 115, 85, 0.2)',
                        borderRadius: '6px',
                        fontWeight: 500,
                        fontSize: '12px',
                        padding: '4px 12px',
                        margin: 0
                      }}
                    >
                      {tool}
                    </Tag>
                  ))}
                </div>
              ) : t('pages.agentManager.none')}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agentManager.mcpServers')}>
              {selectedAgent.agent_config.mcp?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedAgent.agent_config.mcp.map((server: string) => (
                    <Tag
                      key={server}
                      style={{
                        background: 'rgba(139, 115, 85, 0.08)',
                        color: '#8b7355',
                        border: '1px solid rgba(139, 115, 85, 0.2)',
                        borderRadius: '6px',
                        fontWeight: 500,
                        fontSize: '12px',
                        padding: '4px 12px',
                        margin: 0
                      }}
                    >
                      {server}
                    </Tag>
                  ))}
                </div>
              ) : t('pages.agentManager.none')}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agentManager.tags')}>
              {selectedAgent.agent_config.tags?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedAgent.agent_config.tags.map((tag: string) => (
                    <Tag
                      key={tag}
                      style={{
                        background: 'rgba(139, 115, 85, 0.08)',
                        color: '#8b7355',
                        border: '1px solid rgba(139, 115, 85, 0.2)',
                        borderRadius: '6px',
                        fontWeight: 500,
                        fontSize: '12px',
                        padding: '4px 12px',
                        margin: 0
                      }}
                    >
                      {tag}
                    </Tag>
                  ))}
                </div>
              ) : t('pages.agentManager.none')}
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agentManager.createdAt')}>
              <span style={{ color: 'rgba(45, 45, 45, 0.65)' }}>
                {new Date(selectedAgent.created_at).toLocaleString()}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.agentManager.updatedAt')}>
              <span style={{ color: 'rgba(45, 45, 45, 0.65)' }}>
                {new Date(selectedAgent.updated_at).toLocaleString()}
              </span>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Layout>
  );
};

export default AgentManager;
