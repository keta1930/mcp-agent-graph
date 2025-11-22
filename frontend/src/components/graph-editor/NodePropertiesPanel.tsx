// src/components/graph-editor/NodePropertiesPanel.tsx
import React, { useEffect, useState } from 'react';
import {
  Form, Input, Select, Button, Tag,
  InputNumber, Row, Col, Radio
} from 'antd';
import {
  Trash2, PlayCircle, ArrowRight
} from 'lucide-react';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { useModelStore } from '../../store/modelStore';
import { useMCPStore } from '../../store/mcpStore';
import { useAgentStore } from '../../store/agentStore';
import { listSystemTools, ToolCategory } from '../../services/systemToolsService';
import { promptService } from '../../services/promptService';
import { useT } from '../../i18n/hooks';
import SystemToolTreeSelector from '../common/SystemToolTreeSelector';
import MCPSelector from '../common/MCPSelector';

const { TextArea } = Input;
const { Option } = Select;

const NodePropertiesPanel: React.FC = () => {
  const t = useT();
  const [form] = Form.useForm();
  const { currentGraph, selectedNode, updateNode, removeNode, graphs, selectNode } = useGraphEditorStore();
  const { models, fetchModels } = useModelStore();
  const { config, fetchConfig } = useMCPStore();
  const { agents, fetchAgents } = useAgentStore();
  
  const [systemToolCategories, setSystemToolCategories] = useState<ToolCategory[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [registeredPrompts, setRegisteredPrompts] = useState<string[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  // Get selected node
  const node = currentGraph?.nodes.find(n => n.id === selectedNode);

  // Get all MCP servers
  const mcpServers = Object.keys(config.mcpServers || {});

  // Get available subgraphs (exclude current graph to avoid circular references)
  const availableSubgraphs = graphs.filter(
    graphName => !currentGraph || graphName !== currentGraph.name
  );

  // Get available nodes for input/output connections (excluding current node)
  const getAvailableNodes = () => {
    if (!currentGraph || !node) return [];
    
    return currentGraph.nodes
      .filter(n => n.id !== selectedNode)
      .map(n => n.name);
  };

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

  // Get models, MCP server list, agents, and system tools
  useEffect(() => {
    fetchModels();
    fetchConfig();
    fetchAgents();
    loadSystemTools();
    loadPrompts();
  }, [fetchModels, fetchConfig, fetchAgents]);

  // Update form when selected node changes
  useEffect(() => {
    if (node) {
      form.setFieldsValue({
        name: node.name,
        description: node.description || "",
        agent_name: node.agent_name,
        node_type: node.is_subgraph ? 'subgraph' : 'agent',
        model_name: node.model_name,
        subgraph_name: node.subgraph_name,
        mcp_servers: node.mcp_servers || [],
        system_tools: node.system_tools || [],
        system_prompt: node.system_prompt,
        user_prompt: node.user_prompt,
        max_iterations: node.max_iterations,
        input_nodes: node.input_nodes || [],
        output_nodes: node.output_nodes || [],
        output_enabled: node.output_enabled ? 'enabled' : 'disabled',
        handoffs: node.handoffs,
        level: node.level
      });
    } else {
      form.resetFields();
    }
  }, [node, form]);

  // Save node changes
  const handleValuesChange = (changedValues: any) => {
    if (!selectedNode) return;

    const updates = { ...changedValues };

    // Handle node type change
    if ('node_type' in changedValues) {
      updates.is_subgraph = changedValues.node_type === 'subgraph';
      delete updates.node_type;
      
      if (updates.is_subgraph) {
        updates.model_name = undefined;
        updates.agent_name = undefined;
        form.setFieldsValue({ model_name: undefined, agent_name: undefined });
      } else {
        updates.subgraph_name = undefined;
        form.setFieldsValue({ subgraph_name: undefined });
      }
    }

    // Handle output_enabled change
    if ('output_enabled' in changedValues) {
      updates.output_enabled = changedValues.output_enabled === 'enabled';
    }

    updateNode(selectedNode, updates);
  };

  const handleDelete = () => {
    if (selectedNode && node) {
      console.log(`Delete node: ${node.name}`);
      removeNode(selectedNode);
      selectNode(null);
    }
  };

  // If no node is selected, return null
  if (!node) {
    return null;
  }

  // Unified styles matching AddNodeModal
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
    <div style={{ padding: '24px' }}>

      {/* Form content with 3+1 sections */}
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
      >
        {/* Section 1: 基础信息 - Basic Info */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            {t('components.graphEditor.nodePropertiesPanel.basicInfo')}
          </div>

          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.nodeName')}</span>}
            name="name"
            rules={[
              { required: true, message: t('components.graphEditor.nodePropertiesPanel.nodeNameRequired') },
              {
                validator: (_, value) => {
                  if (value && (/[/\\.]/.test(value))) {
                    return Promise.reject(t('components.graphEditor.nodePropertiesPanel.nodeNameInvalid'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
            style={{ marginBottom: '16px' }}
          >
            <Input
              placeholder={t('components.graphEditor.nodePropertiesPanel.nodeNamePlaceholder')}
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Form.Item>

          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.nodeDescription')}</span>}
            name="description"
            tooltip={{
              title: t('components.graphEditor.nodePropertiesPanel.nodeDescriptionTooltip'),
              overlayStyle: { fontSize: '13px' }
            }}
            style={{ marginBottom: '16px' }}
          >
            <TextArea
              placeholder={t('components.graphEditor.nodePropertiesPanel.nodeDescriptionPlaceholder')}
              rows={3}
              showCount
              maxLength={200}
              style={{ ...textAreaStyle, fontSize: '14px' }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Form.Item>

          {/* Node type selection - using Radio */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.5)',
            padding: '16px',
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.1)'
          }}>
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
              <span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.nodeType')}</span>
              <Form.Item
                name="node_type"
                noStyle
              >
                <Radio.Group style={{ marginLeft: '16px' }}>
                  <Radio value="agent">{t('components.graphEditor.nodePropertiesPanel.agent')}</Radio>
                  <Radio value="subgraph">{t('components.graphEditor.nodePropertiesPanel.subgraph')}</Radio>
                </Radio.Group>
              </Form.Item>
            </div>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.node_type !== currentValues.node_type}
            >
              {({ getFieldValue }) =>
                getFieldValue('node_type') === 'subgraph' ? (
                  <Form.Item
                    name="subgraph_name"
                    label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.subgraph')}</span>}
                    rules={[{ required: true, message: t('components.graphEditor.nodePropertiesPanel.subgraphRequired') }]}
                    style={{ marginBottom: '0' }}
                  >
                    <Select
                      placeholder={t('components.graphEditor.nodePropertiesPanel.subgraphPlaceholder')}
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
                        label={<span style={labelStyle}>Agent</span>}
                        name="agent_name"
                        tooltip={{
                          title: t('components.graphEditor.nodePropertiesPanel.agentTooltip'),
                          overlayStyle: { fontSize: '13px' }
                        }}
                        rules={[
                          {
                            validator: (_, value) => {
                              const modelName = form.getFieldValue('model_name');
                              if (!value && !modelName) {
                                return Promise.reject(t('components.graphEditor.addNodeModal.modelOrAgentRequired'));
                              }
                              return Promise.resolve();
                            }
                          }
                        ]}
                        style={{ marginBottom: '0' }}
                      >
                        <Select
                          placeholder={t('components.graphEditor.nodePropertiesPanel.agentPlaceholder')}
                          allowClear
                          showSearch
                          style={{ fontSize: '14px' }}
                          onChange={() => {
                            form.validateFields(['model_name']);
                          }}
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
                        label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.model')}</span>}
                        rules={[
                          {
                            validator: (_, value) => {
                              const agentName = form.getFieldValue('agent_name');
                              if (!value && !agentName) {
                                return Promise.reject(t('components.graphEditor.addNodeModal.modelOrAgentRequired'));
                              }
                              return Promise.resolve();
                            }
                          }
                        ]}
                        style={{ marginBottom: '0' }}
                      >
                        <Select
                          placeholder={t('components.graphEditor.nodePropertiesPanel.modelPlaceholder')}
                          allowClear
                          showSearch
                          style={{ fontSize: '14px' }}
                          onChange={() => {
                            form.validateFields(['agent_name']);
                          }}
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

        {/* Section 2: 配置信息 - Configuration (Prompts + Execution Control) */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            {t('components.graphEditor.addNodeModal.configuration')}
          </div>

          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.systemPrompt')}</span>}
            name="system_prompt"
            tooltip={{
              title: t('components.graphEditor.nodePropertiesPanel.systemPromptTooltip'),
              overlayStyle: { fontSize: '13px' }
            }}
            style={{ marginBottom: '8px' }}
          >
            <TextArea
              rows={4}
              placeholder={t('components.graphEditor.nodePropertiesPanel.systemPromptPlaceholder')}
              style={textAreaStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Form.Item>

          {/* Registered prompts selection */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ ...labelStyle, fontSize: '13px', color: 'rgba(45, 45, 45, 0.65)', marginBottom: '8px' }}>
              {t('components.graphEditor.addNodeModal.selectRegisteredPrompt')}
            </div>
            <Select
              placeholder={t('components.graphEditor.addNodeModal.selectRegisteredPromptPlaceholder')}
              allowClear
              showSearch
              loading={loadingPrompts}
              style={{ fontSize: '13px', width: '100%' }}
              onChange={(value) => {
                if (value) {
                  const newPrompt = `{@${value}}`;
                  form.setFieldsValue({ system_prompt: newPrompt });
                  if (selectedNode) {
                    updateNode(selectedNode, { system_prompt: newPrompt });
                  }
                }
              }}
            >
              {registeredPrompts.map(prompt => (
                <Option key={prompt} value={prompt}>@{prompt}</Option>
              ))}
            </Select>
          </div>

          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.userPrompt')}</span>}
            name="user_prompt"
            tooltip={{
              title: t('components.graphEditor.nodePropertiesPanel.userPromptTooltip'),
              overlayStyle: { fontSize: '13px' }
            }}
            style={{ marginBottom: '8px' }}
          >
            <TextArea
              rows={4}
              placeholder={t('components.graphEditor.nodePropertiesPanel.userPromptPlaceholder')}
              style={textAreaStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Form.Item>

          {/* Registered prompts selection */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ ...labelStyle, fontSize: '13px', color: 'rgba(45, 45, 45, 0.65)', marginBottom: '8px' }}>
              {t('components.graphEditor.addNodeModal.selectRegisteredPrompt')}
            </div>
            <Select
              placeholder={t('components.graphEditor.addNodeModal.selectRegisteredPromptPlaceholder')}
              allowClear
              showSearch
              loading={loadingPrompts}
              style={{ fontSize: '13px', width: '100%' }}
              onChange={(value) => {
                if (value) {
                  const newPrompt = `{@${value}}`;
                  form.setFieldsValue({ user_prompt: newPrompt });
                  if (selectedNode) {
                    updateNode(selectedNode, { user_prompt: newPrompt });
                  }
                }
              }}
            >
              {registeredPrompts.map(prompt => (
                <Option key={prompt} value={prompt}>@{prompt}</Option>
              ))}
            </Select>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.loopCount')}</span>}
                name="handoffs"
                tooltip={{
                  title: t('components.graphEditor.nodePropertiesPanel.loopCountTooltip'),
                  overlayStyle: { fontSize: '13px' }
                }}
                style={{ marginBottom: '0' }}
              >
                <InputNumber
                  min={1}
                  placeholder={t('components.graphEditor.nodePropertiesPanel.loopCountPlaceholder')}
                  style={{ width: '100%', height: '40px', borderRadius: '6px', fontSize: '14px' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.maxIterations')}</span>}
                name="max_iterations"
                tooltip={{
                  title: t('components.graphEditor.nodePropertiesPanel.maxIterationsTooltip'),
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

        {/* Section 3: 工具和服务 - Tools and Services */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            {t('components.graphEditor.addNodeModal.toolsAndServices')}
          </div>

          {/* 系统工具选择 - 使用公共树形选择器组件 */}
          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.systemTools')}</span>}
            name="system_tools"
            style={{ marginBottom: '16px' }}
          >
            <SystemToolTreeSelector
              categories={systemToolCategories}
              loading={loadingTools}
              placeholder={t('components.graphEditor.nodePropertiesPanel.systemToolsPlaceholder')}
            />
          </Form.Item>

          <Form.Item
            label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.mcpServers')}</span>}
            name="mcp_servers"
            style={{ marginBottom: '16px' }}
          >
            <MCPSelector
              mcpServers={mcpServers}
              placeholder={t('components.graphEditor.nodePropertiesPanel.mcpServersPlaceholder')}
            />
          </Form.Item>

          <div style={{ marginBottom: '0', display: 'flex', alignItems: 'center' }}>
            <span style={labelStyle}>{t('components.graphEditor.addNodeModal.enableOutput')}</span>
            <Form.Item
              name="output_enabled"
              noStyle
            >
              <Radio.Group style={{ marginLeft: '16px' }}>
                <Radio value="enabled">{t('components.graphEditor.addNodeModal.enabled')}</Radio>
                <Radio value="disabled">{t('components.graphEditor.addNodeModal.disabled')}</Radio>
              </Radio.Group>
            </Form.Item>
          </div>
        </div>

        {/* Section 4: 连接信息 - Connection Info (NodePropertiesPanel unique) */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            {t('components.graphEditor.nodePropertiesPanel.connectionInfo')}
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="input_nodes"
                label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.inputNodes')}</span>}
                tooltip={{
                  title: t('components.graphEditor.nodePropertiesPanel.inputNodesTooltip'),
                  overlayStyle: { fontSize: '13px' }
                }}
                style={{ marginBottom: '0' }}
              >
                <Select
                  mode="multiple"
                  placeholder={t('components.graphEditor.nodePropertiesPanel.inputNodesPlaceholder')}
                  showSearch
                  maxTagCount="responsive"
                  style={{ fontSize: '14px' }}
                  filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                  }
                  tagRender={(props) => {
                    const { value, closable, onClose } = props;
                    const isStart = value === 'start';
                    return (
                      <Tag
                        closable={closable}
                        onClose={onClose}
                        style={{
                          background: isStart ? 'rgba(160, 130, 109, 0.08)' : 'rgba(139, 115, 85, 0.08)',
                          color: isStart ? '#a0826d' : '#8b7355',
                          border: isStart ? '1px solid rgba(160, 130, 109, 0.2)' : '1px solid rgba(139, 115, 85, 0.2)',
                          borderRadius: '6px',
                          fontWeight: 500,
                          fontSize: '12px',
                          padding: '4px 12px',
                          marginRight: '4px'
                        }}
                      >
                        {isStart && <PlayCircle size={12} strokeWidth={2} style={{ marginRight: '4px' }} />}
                        {value}
                      </Tag>
                    );
                  }}
                >
                  <Option key="start" value="start">
                    <span style={{ color: '#a0826d', fontWeight: 'bold' }}>
                      <PlayCircle size={14} strokeWidth={2} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {t('components.graphEditor.nodePropertiesPanel.start')} ({t('components.graphEditor.nodePropertiesPanel.userInput')})
                    </span>
                  </Option>
                  {getAvailableNodes().map(nodeName => (
                    <Option key={nodeName} value={nodeName}>{nodeName}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="output_nodes"
                label={<span style={labelStyle}>{t('components.graphEditor.nodePropertiesPanel.outputNodes')}</span>}
                tooltip={{
                  title: t('components.graphEditor.nodePropertiesPanel.outputNodesTooltip'),
                  overlayStyle: { fontSize: '13px' }
                }}
                style={{ marginBottom: '0' }}
              >
                <Select 
                  mode="multiple" 
                  placeholder={t('components.graphEditor.nodePropertiesPanel.outputNodesPlaceholder')}
                  showSearch
                  maxTagCount="responsive"
                  style={{ fontSize: '14px' }}
                  filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                  }
                  tagRender={(props) => {
                    const { value, closable, onClose } = props;
                    const isEnd = value === 'end';
                    return (
                      <Tag
                        closable={closable}
                        onClose={onClose}
                        style={{
                          background: isEnd ? 'rgba(184, 88, 69, 0.08)' : 'rgba(212, 165, 116, 0.08)',
                          color: isEnd ? '#b85845' : '#d4a574',
                          border: isEnd ? '1px solid rgba(184, 88, 69, 0.2)' : '1px solid rgba(212, 165, 116, 0.2)',
                          borderRadius: '6px',
                          fontWeight: 500,
                          fontSize: '12px',
                          padding: '4px 12px',
                          marginRight: '4px'
                        }}
                      >
                        {isEnd && <ArrowRight size={12} strokeWidth={2} style={{ marginRight: '4px' }} />}
                        {value}
                      </Tag>
                    );
                  }}
                >
                  <Option key="end" value="end">
                    <span style={{ color: '#b85845', fontWeight: 'bold' }}>
                      <ArrowRight size={14} strokeWidth={2} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {t('components.graphEditor.nodePropertiesPanel.end')} ({t('components.graphEditor.nodePropertiesPanel.finalResult')})
                    </span>
                  </Option>
                  {getAvailableNodes().map(nodeName => (
                    <Option key={nodeName} value={nodeName}>{nodeName}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>
      </Form>

      {/* Bottom action buttons */}
      <div style={{
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(139, 115, 85, 0.15)',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Button
          danger
          icon={<Trash2 size={16} strokeWidth={1.5} />}
          onClick={handleDelete}
          size="large"
        >
          {t('components.graphEditor.nodePropertiesPanel.deleteNode')}
        </Button>
      </div>
    </div>
  );
};

export default NodePropertiesPanel;
