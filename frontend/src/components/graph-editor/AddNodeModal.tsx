// src/components/graph-editor/AddNodeModal.tsx
import React, { useState } from 'react';
import { Modal, Form, Input, Select, Radio, InputNumber, Button, Row, Col, Tag } from 'antd';
import { Plus } from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { useMCPStore } from '../../store/mcpStore';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { useAgentStore } from '../../store/agentStore';
import { listSystemTools, ToolCategory } from '../../services/systemToolsService';
import { promptService } from '../../services/promptService';
import { useT } from '../../i18n/hooks';
import SystemToolTreeSelector from '../common/SystemToolTreeSelector';
import MCPSelector from '../common/MCPSelector';

const { Option } = Select;
const { TextArea } = Input;

interface AddNodeModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (nodeData: any) => void;
}

const AddNodeModal: React.FC<AddNodeModalProps> = ({ visible, onClose, onAdd }) => {
  const t = useT();
  const [form] = Form.useForm();
  const { models } = useModelStore();
  const { config } = useMCPStore();
  const { graphs, currentGraph } = useGraphEditorStore();
  const { agents, fetchAgents } = useAgentStore();
  
  const [systemToolCategories, setSystemToolCategories] = useState<ToolCategory[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [registeredPrompts, setRegisteredPrompts] = useState<string[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  const mcpServers = Object.keys(config.mcpServers || {});

  const availableSubgraphs = graphs.filter(
    graphName => !currentGraph || graphName !== currentGraph.name
  );

  React.useEffect(() => {
    if (visible) {
      fetchAgents();
      loadSystemTools();
      loadPrompts();
      form.resetFields();
    }
  }, [visible, fetchAgents]);

  const loadSystemTools = async () => {
    setLoadingTools(true);
    try {
      const response = await listSystemTools();
      setSystemToolCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to load system tools:', error);
    } finally {
      setLoadingTools(false);
    }
  };

  const loadPrompts = async () => {
    setLoadingPrompts(true);
    try {
      const response = await promptService.listPrompts();
      if (response.success && response.data) {
        const promptNames = response.data.prompts.map(p => p.name);
        setRegisteredPrompts(promptNames);
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setLoadingPrompts(false);
    }
  };


  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (!values.model_name && !values.agent_name && values.node_type !== 'subgraph') {
        form.setFields([
          {
            name: 'model_name',
            errors: [t('components.graphEditor.addNodeModal.modelOrAgentRequired')]
          },
          {
            name: 'agent_name',
            errors: [t('components.graphEditor.addNodeModal.modelOrAgentRequired')]
          }
        ]);
        return;
      }

      const nodeData = {
        ...values,
        is_subgraph: values.node_type === 'subgraph',
        description: values.description || "",
        agent_name: values.agent_name || undefined,
        model_name: values.model_name || undefined,
        system_tools: values.system_tools || [],
        max_iterations: values.max_iterations || undefined,
        handoffs: values.handoffs || null,
        system_prompt: values.system_prompt || "",
        user_prompt: values.user_prompt || "",
        output_enabled: values.output_enabled === 'enabled',
      };

      onAdd(nodeData);
      form.resetFields();
      onClose();
    } catch (error) {
      // Form validation error
    }
  };

  const handleTypeChange = (value: string) => {
    if (value === 'subgraph') {
      form.setFieldsValue({ model_name: undefined, agent_name: undefined });
    } else {
      form.setFieldsValue({ subgraph_name: undefined });
    }
  };

  // 统一的输入框样式
  const inputStyle = {
    height: '40px',
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.2)',
    background: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px',
    color: '#2d2d2d',
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    transition: 'all 0.3s ease'
  };

  const textAreaStyle = {
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.2)',
    background: 'rgba(255, 255, 255, 0.9)',
    fontSize: '13px',
    color: '#2d2d2d',
    lineHeight: '1.6',
    fontFamily: 'Monaco, Courier New, monospace',
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
    transition: 'all 0.3s ease'
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#b85845';
    e.target.style.boxShadow = '0 0 0 3px rgba(184, 88, 69, 0.08)';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)';
    e.target.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
  };

  const labelStyle = { 
    color: 'rgba(45, 45, 45, 0.85)', 
    fontWeight: 500, 
    fontSize: '14px' 
  };

  const sectionTitleStyle = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#b85845',
    marginBottom: '16px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const
  };

  const sectionStyle = {
    background: 'rgba(250, 248, 245, 0.3)',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid rgba(139, 115, 85, 0.1)'
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Plus size={20} strokeWidth={1.5} style={{ color: '#b85845' }} />
          <span style={{
            color: '#2d2d2d',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            {t('components.graphEditor.addNodeModal.title')}
          </span>
        </div>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      width={800}
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
      footer={[
        <Button
          key="cancel"
          onClick={onClose}
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
          {t('components.graphEditor.addNodeModal.addNode')}
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        {/* 基础信息 */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            {t('components.graphEditor.addNodeModal.basicInfo')}
          </div>

          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.addNodeModal.nodeName')}</span>}
            name="name"
            rules={[
              { required: true, message: t('components.graphEditor.addNodeModal.nodeNameRequired') },
              {
                validator: (_, value) => {
                  if (value && (/[/\\.]/.test(value))) {
                    return Promise.reject(t('components.graphEditor.addNodeModal.nodeNameInvalid'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
            style={{ marginBottom: '16px' }}
          >
            <Input
              placeholder={t('components.graphEditor.addNodeModal.nodeNamePlaceholder')}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Form.Item>

          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.addNodeModal.nodeDescription')}</span>}
            name="description"
            tooltip={{
              title: t('components.graphEditor.addNodeModal.nodeDescriptionTooltip'),
              overlayStyle: { fontSize: '13px' }
            }}
            style={{ marginBottom: '16px' }}
          >
            <TextArea
              placeholder={t('components.graphEditor.addNodeModal.nodeDescriptionPlaceholder')}
              rows={3}
              showCount
              maxLength={200}
              style={{ ...textAreaStyle, fontSize: '14px' }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Form.Item>

          {/* 节点类型选择 - 使用Radio */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.5)',
            padding: '16px',
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.1)'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <Form.Item
                name="node_type"
                initialValue="agent"
                noStyle
              >
                <Radio.Group onChange={(e) => handleTypeChange(e.target.value)} style={{ display: 'none' }}>
                  <Radio value="agent">{t('components.graphEditor.addNodeModal.agent')}</Radio>
                  <Radio value="subgraph">{t('components.graphEditor.addNodeModal.subgraph')}</Radio>
                </Radio.Group>
              </Form.Item>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={labelStyle}>{t('components.graphEditor.addNodeModal.nodeType')}</span>
                <Radio.Group
                  onChange={(e) => {
                    handleTypeChange(e.target.value);
                    form.setFieldValue('node_type', e.target.value);
                  }}
                  defaultValue="agent"
                  style={{ marginLeft: '16px' }}
                >
                  <Radio value="agent">{t('components.graphEditor.addNodeModal.agent')}</Radio>
                  <Radio value="subgraph">{t('components.graphEditor.addNodeModal.subgraph')}</Radio>
                </Radio.Group>
              </div>
            </div>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.node_type !== currentValues.node_type}
            >
              {({ getFieldValue }) =>
                getFieldValue('node_type') === 'subgraph' ? (
                  <Form.Item
                    name="subgraph_name"
                    label={<span style={labelStyle}>{t('components.graphEditor.addNodeModal.selectSubgraph')}</span>}
                    rules={[{ required: true, message: t('components.graphEditor.addNodeModal.selectSubgraphRequired') }]}
                    style={{ marginBottom: '0' }}
                  >
                    <Select
                      placeholder={t('components.graphEditor.addNodeModal.selectSubgraphPlaceholder')}
                      showSearch
                      style={{ fontSize: '14px' }}
                    >
                      {availableSubgraphs.map(graph => (
                        <Option key={graph} value={graph}>{graph}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                ) : (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label={<span style={labelStyle}>{t('components.graphEditor.addNodeModal.agentName')}</span>}
                        name="agent_name"
                        tooltip={{
                          title: t('components.graphEditor.addNodeModal.agentNameTooltip'),
                          overlayStyle: { fontSize: '13px' }
                        }}
                        style={{ marginBottom: '0' }}
                      >
                        <Select
                          placeholder={t('components.graphEditor.addNodeModal.agentNamePlaceholder')}
                          allowClear
                          showSearch
                          style={{ fontSize: '14px' }}
                        >
                          {agents.map(agent => (
                            <Option key={agent.name} value={agent.name}>{agent.name}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="model_name"
                        label={<span style={labelStyle}>{t('components.graphEditor.addNodeModal.selectModel')}</span>}
                        style={{ marginBottom: '0' }}
                      >
                        <Select
                          placeholder={t('components.graphEditor.addNodeModal.selectModelPlaceholder')}
                          allowClear
                          showSearch
                          style={{ fontSize: '14px' }}
                        >
                          {models.map(model => (
                            <Option key={model.name} value={model.name}>{model.name}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                )
              }
            </Form.Item>
          </div>
        </div>

        {/* 配置信息 */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            {t('components.graphEditor.addNodeModal.configuration')}
          </div>

          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.addNodeModal.systemPrompt')}</span>}
            name="system_prompt"
            tooltip={{
              title: t('components.graphEditor.addNodeModal.systemPromptTooltip'),
              overlayStyle: { fontSize: '13px' }
            }}
            style={{ marginBottom: '8px' }}
          >
            <TextArea
              rows={4}
              placeholder={t('components.graphEditor.addNodeModal.systemPromptPlaceholder')}
              style={textAreaStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Form.Item>

          {/* 已注册提示词选择 */}
          <Form.Item
            label={<span style={{ ...labelStyle, fontSize: '13px', color: 'rgba(45, 45, 45, 0.65)' }}>
              {t('components.graphEditor.addNodeModal.selectRegisteredPrompt')}
            </span>}
            name="system_prompt_ref"
            style={{ marginBottom: '16px' }}
          >
            <Select
              placeholder={t('components.graphEditor.addNodeModal.selectRegisteredPromptPlaceholder')}
              allowClear
              showSearch
              loading={loadingPrompts}
              style={{ fontSize: '13px' }}
              onChange={(value) => {
                if (value) {
                  form.setFieldsValue({ system_prompt: `{@${value}}` });
                }
              }}
            >
              {registeredPrompts.map(prompt => (
                <Option key={prompt} value={prompt}>@{prompt}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.addNodeModal.userPrompt')}</span>}
            name="user_prompt"
            tooltip={{
              title: t('components.graphEditor.addNodeModal.userPromptTooltip'),
              overlayStyle: { fontSize: '13px' }
            }}
            style={{ marginBottom: '8px' }}
          >
            <TextArea
              rows={4}
              placeholder={t('components.graphEditor.addNodeModal.userPromptPlaceholder')}
              style={textAreaStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Form.Item>

          {/* 已注册提示词选择 */}
          <Form.Item
            label={<span style={{ ...labelStyle, fontSize: '13px', color: 'rgba(45, 45, 45, 0.65)' }}>
              {t('components.graphEditor.addNodeModal.selectRegisteredPrompt')}
            </span>}
            name="user_prompt_ref"
            style={{ marginBottom: '16px' }}
          >
            <Select
              placeholder={t('components.graphEditor.addNodeModal.selectRegisteredPromptPlaceholder')}
              allowClear
              showSearch
              loading={loadingPrompts}
              style={{ fontSize: '13px' }}
              onChange={(value) => {
                if (value) {
                  form.setFieldsValue({ user_prompt: `{@${value}}` });
                }
              }}
            >
              {registeredPrompts.map(prompt => (
                <Option key={prompt} value={prompt}>@{prompt}</Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={<span style={labelStyle}>{t('components.graphEditor.addNodeModal.loopCount')}</span>}
                name="handoffs"
                tooltip={{
                  title: t('components.graphEditor.addNodeModal.loopCountTooltip'),
                  overlayStyle: { fontSize: '13px' }
                }}
                style={{ marginBottom: '0' }}
              >
                <InputNumber
                  min={1}
                  placeholder={t('components.graphEditor.addNodeModal.loopCountPlaceholder')}
                  style={{ width: '100%', height: '40px', borderRadius: '6px', fontSize: '14px' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={<span style={labelStyle}>{t('components.graphEditor.addNodeModal.maxToolCalls')}</span>}
                name="max_iterations"
                tooltip={{
                  title: t('components.graphEditor.addNodeModal.maxToolCallsTooltip'),
                  overlayStyle: { fontSize: '13px' }
                }}
                style={{ marginBottom: '0' }}
              >
                <InputNumber
                  min={1}
                  max={200}
                  placeholder="50"
                  style={{ width: '100%', height: '40px', borderRadius: '6px', fontSize: '14px' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* 工具和服务 */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            {t('components.graphEditor.addNodeModal.toolsAndServices')}
          </div>

          {/* 系统工具选择 - 使用公共树形选择器组件 */}
          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.addNodeModal.systemTools')}</span>}
            name="system_tools"
            initialValue={[]}
            style={{ marginBottom: '16px' }}
          >
            <SystemToolTreeSelector
              categories={systemToolCategories}
              loading={loadingTools}
              placeholder={t('components.graphEditor.addNodeModal.systemToolsPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.addNodeModal.mcpServers')}</span>}
            name="mcp_servers"
            initialValue={[]}
            style={{ marginBottom: '16px' }}
          >
            <MCPSelector
              mcpServers={mcpServers}
              placeholder={t('components.graphEditor.addNodeModal.mcpServersPlaceholder')}
            />
          </Form.Item>

          <div style={{ marginBottom: '0' }}>
            <Form.Item
              name="output_enabled"
              initialValue="enabled"
              noStyle
            >
              <Radio.Group style={{ display: 'none' }}>
                <Radio value="enabled">{t('components.graphEditor.addNodeModal.enabled')}</Radio>
                <Radio value="disabled">{t('components.graphEditor.addNodeModal.disabled')}</Radio>
              </Radio.Group>
            </Form.Item>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={labelStyle}>{t('components.graphEditor.addNodeModal.enableOutput')}</span>
              <Radio.Group
                onChange={(e) => form.setFieldValue('output_enabled', e.target.value)}
                defaultValue="enabled"
                style={{ marginLeft: '16px' }}
              >
                <Radio value="enabled">{t('components.graphEditor.addNodeModal.enabled')}</Radio>
                <Radio value="disabled">{t('components.graphEditor.addNodeModal.disabled')}</Radio>
              </Radio.Group>
            </div>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default AddNodeModal;
