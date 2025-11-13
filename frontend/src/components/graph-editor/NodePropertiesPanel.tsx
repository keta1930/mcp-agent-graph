// src/components/graph-editor/NodePropertiesPanel.tsx
import React, { useEffect, useState } from 'react';
import {
  Form, Input, Switch, Select, Button, Card, Typography, Tabs, Tag,
  Tooltip, InputNumber, Divider, Space
} from 'antd';
import {
  Trash2, AlertTriangle, Bot, GitBranch, HelpCircle
} from 'lucide-react';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { useModelStore } from '../../store/modelStore';
import { useMCPStore } from '../../store/mcpStore';
import { SAVE_FORMAT_OPTIONS } from '../../types/graph';
import SmartPromptEditor from '../common/SmartPromptEditor';
import { useT } from '../../i18n/hooks';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const NodePropertiesPanel: React.FC = () => {
  const t = useT();
  const [form] = Form.useForm();
  const { currentGraph, selectedNode, updateNode, removeNode, graphs, selectNode } = useGraphEditorStore();
  const { models, fetchModels } = useModelStore();
  const { config, status, fetchConfig } = useMCPStore();

  // Get selected node
  const node = currentGraph?.nodes.find(n => n.id === selectedNode);

  // Get all MCP servers and their status
  const mcpServers = Object.keys(config.mcpServers || {}).map(serverName => ({
    name: serverName,
    connected: status[serverName]?.connected || false
  }));

  // Get available subgraphs (exclude current graph to avoid circular references)
  const availableSubgraphs = graphs.filter(
    graphName => !currentGraph || graphName !== currentGraph.name
  );

  // Note: context nodes feature has been removed in the new version

  // Get available nodes for input/output connections (excluding current node)
  const getAvailableNodes = () => {
    if (!currentGraph || !node) return [];
    
    return currentGraph.nodes
      .filter(n => n.id !== selectedNode)
      .map(n => n.name);
  };

  // Get all available nodes for prompt references (including special nodes and current node)
  const getAvailableNodesForPrompt = () => {
    if (!currentGraph) return ['start'];

    // 获取图中的所有节点（包括当前节点）
    const allNodeNames = currentGraph.nodes.map(n => n.name);

    // 添加特殊节点
    const specialNodes = ['start'];

    // 合并并去重
    const allNodes = [...new Set([...specialNodes, ...allNodeNames])];

    return allNodes.sort();
  };

  // Check connection status of selected MCP servers
  const disconnectedServers = node?.mcp_servers?.filter(
    server => {
      const serverStatus = status[server];
      return !serverStatus?.connected;
    }
  ) || [];

  // Get models and MCP server list
  useEffect(() => {
    fetchModels();
    fetchConfig();
  }, [fetchModels, fetchConfig]);

  // Update form when selected node changes
  useEffect(() => {
    if (node) {
      form.setFieldsValue({
        name: node.name,
        description: node.description || "",
        is_subgraph: node.is_subgraph,
        model_name: node.model_name,
        subgraph_name: node.subgraph_name,
        mcp_servers: node.mcp_servers,
        system_prompt: node.system_prompt,
        user_prompt: node.user_prompt,
        input_nodes: node.input_nodes || [],
        output_nodes: node.output_nodes || [],
        output_enabled: node.output_enabled,
        handoffs: node.handoffs,
        level: node.level,
        save: node.save
      });
    } else {
      form.resetFields();
    }
  }, [node, form]);

  // Save node changes
  const handleValuesChange = (changedValues: any) => {
    if (!selectedNode) return;

    // Handle special case: switching from Agent type to Subgraph type
    if ('is_subgraph' in changedValues) {
      const updates = { ...changedValues };

      // If switching to subgraph, clear model; if switching to Agent, clear subgraph name
      if (changedValues.is_subgraph) {
        updates.model_name = undefined;
      } else {
        updates.subgraph_name = undefined;
      }

      updateNode(selectedNode, updates);
      return;
    }

    updateNode(selectedNode, changedValues);
  };

  const handleDelete = () => {
    if (selectedNode && node) {
      console.log(`Delete node: ${node.name}`);
      removeNode(selectedNode);
      // Close modal after deletion
      selectNode(null);
    }
  };


  // If no node is selected, return null (should not happen in modal mode)
  if (!node) {
    return null;
  }

  const availableNodesForPrompt = getAvailableNodesForPrompt();

  return (
    <div style={{ padding: '24px' }}>
      {/* Node title area */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(139, 115, 85, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {node.is_subgraph ?
            <GitBranch
              size={24}
              strokeWidth={1.5}
              style={{
                color: '#b85845',
                marginRight: '12px'
              }}
            /> :
            <Bot size={22} strokeWidth={1.5} style={{ color: '#a0826d', marginRight: '12px' }} />
          }
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px', color: '#2d2d2d' }}>
              {node.name}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {node.input_nodes?.includes('start') && (
                <Tag style={{
                  background: 'rgba(160, 130, 109, 0.08)',
                  color: '#a0826d',
                  border: '1px solid rgba(160, 130, 109, 0.25)',
                  borderRadius: '6px'
                }}>{t('components.graphEditor.nodePropertiesPanel.startNode')}</Tag>
              )}
              {node.output_nodes?.includes('end') && (
                <Tag style={{
                  background: 'rgba(184, 88, 69, 0.08)',
                  color: '#b85845',
                  border: '1px solid rgba(184, 88, 69, 0.25)',
                  borderRadius: '6px'
                }}>{t('components.graphEditor.nodePropertiesPanel.endNode')}</Tag>
              )}
              {node.level !== undefined && node.level !== null && (
                <Tag style={{
                  background: 'rgba(212, 165, 116, 0.08)',
                  color: '#d4a574',
                  border: '1px solid rgba(212, 165, 116, 0.25)',
                  borderRadius: '6px'
                }}>{t('components.graphEditor.nodePropertiesPanel.executionLevel')}: {node.level}</Tag>
              )}
              {node.handoffs && node.handoffs > 1 && (
                <Tag style={{
                  background: 'rgba(139, 115, 85, 0.08)',
                  color: '#8b7355',
                  border: '1px solid rgba(139, 115, 85, 0.25)',
                  borderRadius: '6px'
                }}>{t('components.graphEditor.nodePropertiesPanel.loopExecution')}: {node.handoffs}{t('components.graphEditor.nodePropertiesPanel.times')}</Tag>
              )}
              {node.save && (
                <Tag style={{
                  background: 'rgba(160, 130, 109, 0.08)',
                  color: '#a0826d',
                  border: '1px solid rgba(160, 130, 109, 0.25)',
                  borderRadius: '6px'
                }}>{t('components.graphEditor.nodePropertiesPanel.saveFormat')}: {node.save}</Tag>
              )}
            </div>
          </div>
        </div>

        {/* Disconnected server warning */}
        {disconnectedServers.length > 0 && (
          <Tooltip title={`${t('components.graphEditor.nodePropertiesPanel.disconnectedServers')}: ${disconnectedServers.join(', ')}`}>
            <AlertTriangle size={20} strokeWidth={1.5} style={{ color: '#d4a574' }} />
          </Tooltip>
        )}
      </div>

      {/* Tab content */}
      <Tabs defaultActiveKey="basic" size="large">
        <TabPane tab={t('components.graphEditor.nodePropertiesPanel.basicInfo')} key="basic">
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
          >
            <Form.Item
              name="name"
              label={t('components.graphEditor.nodePropertiesPanel.nodeName')}
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
            >
              <Input placeholder={t('components.graphEditor.nodePropertiesPanel.nodeNamePlaceholder')} size="large" />
            </Form.Item>

            <Form.Item
              name="description"
              label={
                <span>
                  {t('components.graphEditor.nodePropertiesPanel.nodeDescription')}{' '}
                  <Tooltip title={t('components.graphEditor.nodePropertiesPanel.nodeDescriptionTooltip')}>
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <TextArea
                placeholder={t('components.graphEditor.nodePropertiesPanel.nodeDescriptionPlaceholder')}
                rows={3}
                showCount
                maxLength={200}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="is_subgraph"
              label={t('components.graphEditor.nodePropertiesPanel.nodeType')}
              valuePropName="checked"
            >
              <Switch
                checkedChildren={t('components.graphEditor.nodePropertiesPanel.subgraph')}
                unCheckedChildren={t('components.graphEditor.nodePropertiesPanel.agent')}
                size="default"
              />
            </Form.Item>

            {!node.is_subgraph ? (
              <Form.Item
                name="model_name"
                label={t('components.graphEditor.nodePropertiesPanel.model')}
                rules={[{ required: true, message: t('components.graphEditor.nodePropertiesPanel.modelRequired') }]}
              >
                <Select placeholder={t('components.graphEditor.nodePropertiesPanel.modelPlaceholder')} size="large">
                  {models.map(model => (
                    <Option key={model.name} value={model.name}>{model.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            ) : (
              <Form.Item
                name="subgraph_name"
                label={t('components.graphEditor.nodePropertiesPanel.subgraph')}
                rules={[{ required: true, message: t('components.graphEditor.nodePropertiesPanel.subgraphRequired') }]}
              >
                <Select placeholder={t('components.graphEditor.nodePropertiesPanel.subgraphPlaceholder')} size="large">
                  {availableSubgraphs.map(graph => (
                    <Option key={graph} value={graph}>{graph}</Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Form.Item
              name="mcp_servers"
              label={t('components.graphEditor.nodePropertiesPanel.mcpServers')}
            >
              <Select
                mode="multiple"
                placeholder={t('components.graphEditor.nodePropertiesPanel.mcpServersPlaceholder')}
                size="large"
              >
                {mcpServers.map(server => (
                  <Option
                    key={server.name}
                    value={server.name}
                  >
                    {server.name}
                    {!server.connected && (
                      <Text type="danger" style={{ marginLeft: '8px', fontSize: '12px' }}>
                        {t('components.graphEditor.nodePropertiesPanel.notConnected')}
                      </Text>
                    )}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Divider />

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>{t('components.graphEditor.addNodeModal.nodeConnections')}</h3>
              
              <Form.Item
                name="input_nodes"
                label={
                  <span>
                    {t('components.graphEditor.nodePropertiesPanel.inputNodes')}{' '}
                    <Tooltip title={t('components.graphEditor.nodePropertiesPanel.inputNodesTooltip')}>
                      <HelpCircle size={14} strokeWidth={1.5} />
                    </Tooltip>
                  </span>
                }
              >
                <Select
                  mode="multiple"
                  placeholder={t('components.graphEditor.nodePropertiesPanel.inputNodesPlaceholder')}
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                  }
                >
                  <Option key="start" value="start">
                    <span style={{ color: '#a0826d', fontWeight: 'bold' }}>🚀 {t('components.graphEditor.nodePropertiesPanel.start')} ({t('components.graphEditor.nodePropertiesPanel.userInput')})</span>
                  </Option>
                  {getAvailableNodes().map(nodeName => (
                    <Option key={nodeName} value={nodeName}>{nodeName}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="output_nodes"
                label={
                  <span>
                    {t('components.graphEditor.nodePropertiesPanel.outputNodes')}{' '}
                    <Tooltip title={t('components.graphEditor.nodePropertiesPanel.outputNodesTooltip')}>
                      <HelpCircle size={14} strokeWidth={1.5} />
                    </Tooltip>
                  </span>
                }
              >
                <Select 
                  mode="multiple" 
                  placeholder={t('components.graphEditor.nodePropertiesPanel.outputNodesPlaceholder')}
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                  }
                >
                  <Option key="end" value="end">
                    <span style={{ color: '#b85845', fontWeight: 'bold' }}>🏁 {t('components.graphEditor.nodePropertiesPanel.end')} ({t('components.graphEditor.nodePropertiesPanel.finalResult')})</span>
                  </Option>
                  {getAvailableNodes().map(nodeName => (
                    <Option key={nodeName} value={nodeName}>{nodeName}</Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <Divider />

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>{t('components.graphEditor.nodePropertiesPanel.outputSettings')}</h3>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Form.Item
                  name="output_enabled"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Switch
                    checkedChildren={t('components.graphEditor.nodePropertiesPanel.enableOutput')}
                    unCheckedChildren={t('components.graphEditor.nodePropertiesPanel.disableOutput')}
                  />
                </Form.Item>

              </Space>
            </div>
          </Form>
        </TabPane>

        <TabPane tab={t('components.graphEditor.nodePropertiesPanel.promptSettings')} key="prompts">
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
          >
            <Form.Item
              name="system_prompt"
              label={
                <span>
                  {t('components.graphEditor.nodePropertiesPanel.systemPrompt')}{' '}
                  <Tooltip title={t('components.graphEditor.nodePropertiesPanel.systemPromptTooltip')}>
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <SmartPromptEditor
                placeholder={t('components.graphEditor.nodePropertiesPanel.systemPromptPlaceholder')}
                rows={8}
                availableNodes={availableNodesForPrompt}
                currentNodeName={node?.name}
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="user_prompt"
              label={
                <span>
                  {t('components.graphEditor.nodePropertiesPanel.userPrompt')}{' '}
                  <Tooltip title={t('components.graphEditor.nodePropertiesPanel.userPromptTooltip')}>
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <SmartPromptEditor
                placeholder={t('components.graphEditor.nodePropertiesPanel.userPromptPlaceholder')}
                rows={8}
                availableNodes={availableNodesForPrompt}
                currentNodeName={node?.name}
                size="large"
              />
            </Form.Item>

            {/* Add prompt info */}
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f6f8fa', 
              borderRadius: '6px',
              fontSize: '12px',
              color: '#666',
              marginTop: '16px'
            }}>
              <strong>💡 {t('components.graphEditor.nodePropertiesPanel.referenceSyntax')}</strong>
              <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                <li>{t('components.graphEditor.nodePropertiesPanel.referenceSyntaxTip1')}</li>
                <li>{t('components.graphEditor.nodePropertiesPanel.referenceSyntaxTip2')}</li>
                <li>{t('components.graphEditor.nodePropertiesPanel.referenceSyntaxTip3')}</li>
                <li>{t('components.graphEditor.nodePropertiesPanel.referenceSyntaxTip4')}</li>
                <li>{t('components.graphEditor.nodePropertiesPanel.referenceSyntaxTip5')}</li>
              </ul>
            </div>
          </Form>
        </TabPane>

        <TabPane tab={t('components.graphEditor.nodePropertiesPanel.executionControl')} key="execution">
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
          >
            <Form.Item
              name="level"
              label={
                <span>
                  {t('components.graphEditor.nodePropertiesPanel.executionLevel')}{' '}
                  <Tooltip title={t('components.graphEditor.nodePropertiesPanel.executionLevelTooltip')}>
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <InputNumber
                placeholder={t('components.graphEditor.nodePropertiesPanel.executionLevelPlaceholder')}
                style={{ width: '100%' }}
                size="large"
                min={0}
              />
            </Form.Item>

            <Form.Item
              name="handoffs"
              label={
                <span>
                  {t('components.graphEditor.nodePropertiesPanel.loopCount')}{' '}
                  <Tooltip title={t('components.graphEditor.nodePropertiesPanel.loopCountTooltip')}>
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <InputNumber
                placeholder={t('components.graphEditor.nodePropertiesPanel.loopCountPlaceholder')}
                style={{ width: '100%' }}
                size="large"
                min={1}
              />
            </Form.Item>

            <Form.Item
              name="save"
              label={
                <span>
                  {t('components.graphEditor.nodePropertiesPanel.saveFormat')}{' '}
                  <Tooltip title={t('components.graphEditor.nodePropertiesPanel.saveFormatTooltip')}>
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <Select placeholder={t('components.graphEditor.nodePropertiesPanel.saveFormatPlaceholder')} allowClear size="large">
                {SAVE_FORMAT_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </TabPane>


        <TabPane tab={t('components.graphEditor.nodePropertiesPanel.connectionInfo')} key="connections">
          <div style={{ padding: '8px' }}>
            <div style={{ marginBottom: '24px' }}>
              <Text strong style={{ fontSize: '16px', color: '#2d2d2d' }}>{t('components.graphEditor.nodePropertiesPanel.inputNodes')}:</Text>
              <div style={{ marginTop: '12px' }}>
                {node.input_nodes && node.input_nodes.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {node.input_nodes.map(input => (
                      <Tag
                        key={input}
                        style={{
                          fontSize: '14px',
                          padding: '4px 8px',
                          background: input === 'start' ? 'rgba(160, 130, 109, 0.08)' : 'rgba(139, 115, 85, 0.08)',
                          color: input === 'start' ? '#a0826d' : '#8b7355',
                          border: input === 'start' ? '1px solid rgba(160, 130, 109, 0.25)' : '1px solid rgba(139, 115, 85, 0.25)',
                          borderRadius: '6px'
                        }}
                      >
                        {input}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontSize: '14px' }}>{t('components.graphEditor.nodePropertiesPanel.noInputNodes')}</Text>
                )}
              </div>
            </div>

            <div>
              <Text strong style={{ fontSize: '16px', color: '#2d2d2d' }}>{t('components.graphEditor.nodePropertiesPanel.outputNodes')}:</Text>
              <div style={{ marginTop: '12px' }}>
                {node.output_nodes && node.output_nodes.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {node.output_nodes.map(output => (
                      <Tag
                        key={output}
                        style={{
                          fontSize: '14px',
                          padding: '4px 8px',
                          background: output === 'end' ? 'rgba(184, 88, 69, 0.08)' : 'rgba(212, 165, 116, 0.08)',
                          color: output === 'end' ? '#b85845' : '#d4a574',
                          border: output === 'end' ? '1px solid rgba(184, 88, 69, 0.25)' : '1px solid rgba(212, 165, 116, 0.25)',
                          borderRadius: '6px'
                        }}
                      >
                        {output}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontSize: '14px' }}>{t('components.graphEditor.nodePropertiesPanel.noOutputNodes')}</Text>
                )}
              </div>
            </div>
          </div>
        </TabPane>
      </Tabs>

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