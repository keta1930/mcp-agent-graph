// src/pages/AgentManager.tsx
import React, { useEffect, useState } from 'react';
import {
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
  Empty,
  Spin,
  Descriptions,
  Space,
  Popconfirm,
  AutoComplete
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  RobotOutlined
} from '@ant-design/icons';
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

const { TextArea } = Input;
const { Option } = Select;

const AgentManager: React.FC = () => {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [form] = Form.useForm();

  // 可选项数据
  const [models, setModels] = useState<string[]>([]);
  const [systemTools, setSystemTools] = useState<string[]>([]);
  const [mcpServers, setMcpServers] = useState<string[]>([]);
  const [categories, setCategories] = useState<AgentCategoryItem[]>([]);

  // 加载数据
  const loadAgents = async () => {
    setLoading(true);
    try {
      const response = await listAgents();
      setAgents(response.agents || []);
    } catch (error: any) {
      message.error('加载 Agent 列表失败: ' + (error.message || '未知错误'));
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
      setSystemTools(toolsResponse.tools.map((t: any) => t.name));

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

  useEffect(() => {
    loadAgents();
    loadOptions();
  }, []);

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
      message.error('加载 Agent 详情失败: ' + (error.message || '未知错误'));
    }
  };

  // 显示详情 Modal
  const showDetailModal = async (agentName: string) => {
    try {
      const response = await getAgent(agentName);
      setSelectedAgent(response.agent);
      setDetailModalVisible(true);
    } catch (error: any) {
      message.error('加载 Agent 详情失败: ' + (error.message || '未知错误'));
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
        message.success(`Agent "${editingAgent}" 更新成功`);
      } else {
        await createAgent(agentConfig);
        message.success(`Agent "${values.name}" 创建成功`);
      }

      setModalVisible(false);
      loadAgents();
    } catch (error: any) {
      message.error('操作失败: ' + (error.message || '未知错误'));
    }
  };

  // 删除 Agent
  const handleDelete = async (agentName: string) => {
    try {
      await deleteAgent(agentName);
      message.success(`Agent "${agentName}" 删除成功`);
      loadAgents();
    } catch (error: any) {
      message.error('删除失败: ' + (error.message || '未知错误'));
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题和操作按钮 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
          <RobotOutlined /> Agent 管理
        </h2>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadAgents}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showCreateModal}
          >
            创建 Agent
          </Button>
        </Space>
      </div>

      {/* Agent 列表 */}
      {loading && agents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : agents.length === 0 ? (
        <Empty
          description="暂无 Agent"
          style={{ marginTop: '50px' }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal}>
            创建第一个 Agent
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {agents.map((agent) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={agent.name}>
              <Card
                hoverable
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RobotOutlined />
                    <span>{agent.name}</span>
                  </div>
                }
                extra={
                  <Tag color="blue">{agent.category}</Tag>
                }
                actions={[
                  <Tooltip title="查看详情">
                    <EyeOutlined onClick={() => showDetailModal(agent.name)} />
                  </Tooltip>,
                  <Tooltip title="编辑">
                    <EditOutlined onClick={() => showEditModal(agent.name)} />
                  </Tooltip>,
                  <Popconfirm
                    title="确定删除此 Agent？"
                    onConfirm={() => handleDelete(agent.name)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Tooltip title="删除">
                      <DeleteOutlined style={{ color: '#ff4d4f' }} />
                    </Tooltip>
                  </Popconfirm>
                ]}
              >
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>模型</div>
                  <Tag>{agent.model}</Tag>
                </div>
                {agent.tags && agent.tags.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>标签</div>
                    <div>
                      {agent.tags.map((tag, idx) => (
                        <Tag key={idx} style={{ marginBottom: '4px' }}>{tag}</Tag>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#999' }}>
                  创建于: {new Date(agent.created_at).toLocaleDateString()}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 创建/编辑 Modal */}
      <Modal
        title={editingAgent ? `编辑 Agent: ${editingAgent}` : '创建 Agent'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="Agent 名称"
            name="name"
            rules={[
              { required: true, message: '请输入 Agent 名称' },
              { pattern: /^[^/\\.]+$/, message: '名称不能包含 / \\ . 字符' }
            ]}
          >
            <Input placeholder="例如: code_reviewer" disabled={!!editingAgent} />
          </Form.Item>

          <Form.Item
            label="能力描述（Card）"
            name="card"
            rules={[{ required: true, message: '请输入 Agent 能力描述' }]}
          >
            <TextArea
              rows={3}
              placeholder="详细说明该 Agent 的能力和适用场景"
            />
          </Form.Item>

          <Form.Item
            label="分类"
            name="category"
            rules={[{ required: true, message: '请输入或选择分类' }]}
            tooltip="可以从现有分类中选择，也可以输入新的分类名称"
          >
            <AutoComplete
              placeholder="输入或选择分类（如: coding, analysis, writing等）"
              options={categories.map(cat => ({
                value: cat.category,
                label: `${cat.category} (${cat.agent_count}个Agent)`
              }))}
              filterOption={(inputValue, option) =>
                option?.value.toLowerCase().indexOf(inputValue.toLowerCase()) !== -1
              }
            />
          </Form.Item>

          <Form.Item
            label="模型"
            name="model"
            rules={[{ required: true, message: '请选择模型' }]}
          >
            <Select placeholder="选择模型" showSearch>
              {models.map((model) => (
                <Option key={model} value={model}>{model}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="系统提示词（Instruction）"
            name="instruction"
          >
            <TextArea
              rows={4}
              placeholder="可选：Agent 的系统提示词"
            />
          </Form.Item>

          <Form.Item
            label="最大工具调用次数"
            name="max_actions"
          >
            <InputNumber min={1} max={200} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="系统工具"
            name="system_tools"
          >
            <Select
              mode="multiple"
              placeholder="选择系统工具"
              allowClear
            >
              {systemTools.map((tool) => (
                <Option key={tool} value={tool}>{tool}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="MCP 服务器"
            name="mcp"
          >
            <Select
              mode="multiple"
              placeholder="选择 MCP 服务器"
              allowClear
            >
              {mcpServers.map((server) => (
                <Option key={server} value={server}>{server}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="标签"
            name="tags"
          >
            <Select
              mode="tags"
              placeholder="输入标签后按回车添加"
              tokenSeparators={[',']}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情 Modal */}
      <Modal
        title={`Agent 详情: ${selectedAgent?.name}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedAgent && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="名称">{selectedAgent.agent_config.name}</Descriptions.Item>
            <Descriptions.Item label="分类">
              <Tag color="blue">{selectedAgent.agent_config.category}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="能力描述">
              {selectedAgent.agent_config.card}
            </Descriptions.Item>
            <Descriptions.Item label="模型">
              <Tag>{selectedAgent.agent_config.model}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="系统提示词">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {selectedAgent.agent_config.instruction || '（无）'}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="最大工具调用次数">
              {selectedAgent.agent_config.max_actions}
            </Descriptions.Item>
            <Descriptions.Item label="系统工具">
              {selectedAgent.agent_config.system_tools?.length > 0 ? (
                selectedAgent.agent_config.system_tools.map((tool: string) => (
                  <Tag key={tool}>{tool}</Tag>
                ))
              ) : '（无）'}
            </Descriptions.Item>
            <Descriptions.Item label="MCP 服务器">
              {selectedAgent.agent_config.mcp?.length > 0 ? (
                selectedAgent.agent_config.mcp.map((server: string) => (
                  <Tag key={server}>{server}</Tag>
                ))
              ) : '（无）'}
            </Descriptions.Item>
            <Descriptions.Item label="标签">
              {selectedAgent.agent_config.tags?.length > 0 ? (
                selectedAgent.agent_config.tags.map((tag: string) => (
                  <Tag key={tag}>{tag}</Tag>
                ))
              ) : '（无）'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedAgent.created_at).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {new Date(selectedAgent.updated_at).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AgentManager;
