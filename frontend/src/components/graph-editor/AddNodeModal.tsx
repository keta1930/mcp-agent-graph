// src/components/graph-editor/AddNodeModal.tsx
import React, { useState } from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, Tooltip, Card, Row, Col, Space, Typography } from 'antd';
import {
  HelpCircle, Plus, Database, Network, Cpu, Code, Cloud, Link, Flask, Settings
} from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { useMCPStore } from '../../store/mcpStore';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { SAVE_FORMAT_OPTIONS } from '../../types/graph';
import { useT } from '../../i18n/hooks';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

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

  const mcpServers = Object.keys(config.mcpServers || {});

  // Available subgraphs - exclude current graph to avoid circular references
  const availableSubgraphs = graphs.filter(
    graphName => !currentGraph || graphName !== currentGraph.name
  );

  // Get available nodes for input/output connections
  const getAvailableNodes = (excludeSelf: boolean = true, nodeNameToExclude?: string) => {
    const allNodes = currentGraph?.nodes || [];
    const excludeName = nodeNameToExclude || form.getFieldValue('name');

    let availableNodes = allNodes
      .filter(node => !excludeSelf || node.name !== excludeName)
      .map(node => node.name);

    return availableNodes;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Set default values for new fields
      const nodeData = {
        ...values,
        description: values.description || "",
        handoffs: values.handoffs || null,
        save: values.save || null,
        input_nodes: values.input_nodes || [],
        output_nodes: values.output_nodes || [],
      };

      onAdd(nodeData);
      form.resetFields();
      onClose();
    } catch (error) {
      // Form validation error
    }
  };

  const handleTypeChange = (isSubgraph: boolean) => {
    // Reset related fields when switching type
    if (isSubgraph) {
      form.setFieldsValue({ model_name: undefined });
    } else {
      form.setFieldsValue({ subgraph_name: undefined });
    }
  };

  // 简洁现代的卡片样式
  const getCardStyle = (borderColor: string) => ({
    borderRadius: '6px',
    border: `1px solid rgba(139, 115, 85, 0.15)`,
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    background: 'rgba(255, 255, 255, 0.85)',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
  });

  const getCardHeadStyle = (color: string, bgColor: string) => ({
    background: 'rgba(250, 248, 245, 0.6)',
    borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d2d2d',
    padding: '16px 20px',
    minHeight: 'auto'
  });

  return (
    <Modal
      title={
        <div style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '16px',
          fontWeight: '600',
          color: '#2d2d2d'
        }}>
          <Plus size={18} strokeWidth={1.5} style={{ marginRight: '8px', color: '#b85845' }} />
          {t('components.graphEditor.addNodeModal.title')}
        </div>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      width={900}
      bodyStyle={{
        padding: '24px',
        background: '#faf8f5'
      }}
      okText={t('components.graphEditor.addNodeModal.addNode')}
      cancelText={t('common.cancel')}
      okButtonProps={{
        style: {
          background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
          borderColor: 'transparent',
          borderRadius: '6px',
          fontWeight: '500',
          boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }
      }}
      cancelButtonProps={{
        style: {
          borderRadius: '6px',
          fontWeight: '500',
          borderColor: 'rgba(139, 115, 85, 0.2)',
          color: '#8b7355'
        }
      }}
    >
      <Form form={form} layout="vertical">
        {/* 第一行卡片 */}
        <Row gutter={24} style={{ marginBottom: '24px' }}>
          {/* 左栏 - 节点基础信息 */}
          <Col span={12}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Network size={16} strokeWidth={1.5} style={{ marginRight: '8px', color: '#b85845' }} />
                  {t('components.graphEditor.addNodeModal.nodeInfo')}
                </div>
              }
              size="small"
              style={getCardStyle('#e5e7eb')}
              headStyle={getCardHeadStyle('#374151', '#f9fafb')}
              bodyStyle={{ padding: '20px' }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Form.Item
                  name="name"
                  label={t('components.graphEditor.addNodeModal.nodeName')}
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
                >
                  <Input placeholder={t('components.graphEditor.addNodeModal.nodeNamePlaceholder')} />
                </Form.Item>

                <Form.Item
                  name="description"
                  label={
                    <span>
                      {t('components.graphEditor.addNodeModal.nodeDescription')}{' '}
                      <Tooltip title={t('components.graphEditor.addNodeModal.nodeDescriptionTooltip')}>
                        <HelpCircle size={14} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                      </Tooltip>
                    </span>
                  }
                >
                  <TextArea
                    placeholder={t('components.graphEditor.addNodeModal.nodeDescriptionPlaceholder')}
                    rows={3}
                    showCount
                    maxLength={200}
                  />
                </Form.Item>

                <div style={{
                  background: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef'
                }}>
                  <Form.Item
                    name="is_subgraph"
                    label={t('components.graphEditor.addNodeModal.nodeType')}
                    valuePropName="checked"
                    initialValue={false}
                    style={{ marginBottom: '16px' }}
                  >
                    <Switch
                      checkedChildren={t('components.graphEditor.addNodeModal.subgraph')}
                      unCheckedChildren={t('components.graphEditor.addNodeModal.agent')}
                      onChange={handleTypeChange}
                    />
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) => prevValues.is_subgraph !== currentValues.is_subgraph}
                  >
                    {({ getFieldValue }) =>
                      getFieldValue('is_subgraph') ? (
                        <Form.Item
                          name="subgraph_name"
                          label={t('components.graphEditor.addNodeModal.selectSubgraph')}
                          rules={[{ required: true, message: t('components.graphEditor.addNodeModal.selectSubgraphRequired') }]}
                          style={{ marginBottom: '0' }}
                        >
                          <Select
                            placeholder={t('components.graphEditor.addNodeModal.selectSubgraphPlaceholder')}
                            suffixIcon={<Code size={16} strokeWidth={1.5} style={{ color: '#b85845' }} />}
                          >
                            {availableSubgraphs.map(graph => (
                              <Option key={graph} value={graph}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <Code size={14} strokeWidth={1.5} style={{ marginRight: '8px', color: '#b85845' }} />
                                  {graph}
                                </div>
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      ) : (
                        <Form.Item
                          name="model_name"
                          label={t('components.graphEditor.addNodeModal.selectModel')}
                          rules={[{ required: true, message: t('components.graphEditor.addNodeModal.selectModelRequired') }]}
                          style={{ marginBottom: '0' }}
                        >
                          <Select
                            placeholder={t('components.graphEditor.addNodeModal.selectModelPlaceholder')}
                            suffixIcon={<Cpu size={16} strokeWidth={1.5} style={{ color: '#a0826d' }} />}
                          >
                            {models.map(model => (
                              <Option key={model.name} value={model.name}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <Cpu size={14} strokeWidth={1.5} style={{ marginRight: '8px', color: '#a0826d' }} />
                                  {model.name}
                                </div>
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      )
                    }
                  </Form.Item>
                </div>
              </Space>
            </Card>
          </Col>

          {/* 右栏 - 工具与输出控制 */}
          <Col span={12}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Cloud size={16} strokeWidth={1.5} style={{ marginRight: '8px', color: '#b85845' }} />
                  {t('components.graphEditor.addNodeModal.toolsAndOutput')}
                </div>
              }
              size="small"
              style={getCardStyle('#e5e7eb')}
              headStyle={getCardHeadStyle('#374151', '#f9fafb')}
              bodyStyle={{ padding: '20px' }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Form.Item
                  name="mcp_servers"
                  label={t('components.graphEditor.addNodeModal.mcpServers')}
                  initialValue={[]}
                >
                  <Select
                    mode="multiple"
                    placeholder={t('components.graphEditor.addNodeModal.mcpServersPlaceholder')}
                  >
                    {mcpServers.map(server => (
                      <Option key={server} value={server}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Cloud size={14} strokeWidth={1.5} style={{ marginRight: '8px', color: '#d4a574' }} />
                          {server}
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="output_enabled"
                  label={
                    <span>
                      {t('components.graphEditor.addNodeModal.enableOutput')}{' '}
                      <Tooltip title={t('components.graphEditor.addNodeModal.enableOutputTooltip')}>
                        <HelpCircle size={14} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                      </Tooltip>
                    </span>
                  }
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  name="save"
                  label={
                    <span>
                      {t('components.graphEditor.addNodeModal.saveFormat')}{' '}
                      <Tooltip title={t('components.graphEditor.addNodeModal.saveFormatTooltip')}>
                        <HelpCircle size={14} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                      </Tooltip>
                    </span>
                  }
                >
                  <Select
                    placeholder={t('components.graphEditor.addNodeModal.saveFormatPlaceholder')}
                    allowClear
                    suffixIcon={<Database size={16} strokeWidth={1.5} style={{ color: '#a0826d' }} />}
                  >
                    {SAVE_FORMAT_OPTIONS.map(option => (
                      <Option key={option.value} value={option.value}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <Database size={14} strokeWidth={1.5} style={{ marginRight: '8px', color: '#a0826d' }} />
                          {option.label}
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 第二行卡片 */}
        <Row gutter={24}>
          {/* 左栏 - 节点连接配置 */}
          <Col span={12}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Link size={16} strokeWidth={1.5} style={{ marginRight: '8px', color: '#d4a574' }} />
                  {t('components.graphEditor.addNodeModal.nodeConnections')}
                </div>
              }
              size="small"
              style={getCardStyle('#e5e7eb')}
              headStyle={getCardHeadStyle('#374151', '#f9fafb')}
              bodyStyle={{ padding: '20px' }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Form.Item
                  name="input_nodes"
                  label={
                    <span>
                      {t('components.graphEditor.addNodeModal.inputNodes')}{' '}
                      <Tooltip title={t('components.graphEditor.addNodeModal.inputNodesTooltip')}>
                        <HelpCircle size={14} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                      </Tooltip>
                    </span>
                  }
                  initialValue={[]}
                >
                  <Select
                    mode="multiple"
                    placeholder={t('components.graphEditor.addNodeModal.inputNodesPlaceholder')}
                    showSearch
                    filterOption={(input, option) =>
                      option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                    }
                  >
                    <Option key="start" value="start">
                      <span style={{ color: '#059669', fontWeight: 'bold' }}>
                        start <Text type="secondary">({t('components.graphEditor.addNodeModal.userInput')})</Text>
                      </span>
                    </Option>
                    {getAvailableNodes().map(nodeName => (
                      <Option key={nodeName} value={nodeName}>
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                          <Network size={14} strokeWidth={1.5} style={{ marginRight: '8px', color: '#8b7355' }} />
                          {nodeName}
                        </span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="output_nodes"
                  label={
                    <span>
                      {t('components.graphEditor.addNodeModal.outputNodes')}{' '}
                      <Tooltip title={t('components.graphEditor.addNodeModal.outputNodesTooltip')}>
                        <HelpCircle size={14} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                      </Tooltip>
                    </span>
                  }
                  initialValue={[]}
                >
                  <Select
                    mode="multiple"
                    placeholder={t('components.graphEditor.addNodeModal.outputNodesPlaceholder')}
                    showSearch
                    filterOption={(input, option) =>
                      option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                    }
                  >
                    <Option key="end" value="end">
                      <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                        end <Text type="secondary">({t('components.graphEditor.addNodeModal.finalResult')})</Text>
                      </span>
                    </Option>
                    {getAvailableNodes().map(nodeName => (
                      <Option key={nodeName} value={nodeName}>
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                          <Network size={14} strokeWidth={1.5} style={{ marginRight: '8px', color: '#8b7355' }} />
                          {nodeName}
                        </span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Space>
            </Card>
          </Col>

          {/* 右栏 - 执行控制 */}
          <Col span={12}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Settings size={16} strokeWidth={1.5} style={{ marginRight: '8px', color: '#8b7355' }} />
                  {t('components.graphEditor.addNodeModal.executionControl')}
                </div>
              }
              size="small"
              style={getCardStyle('#e5e7eb')}
              headStyle={getCardHeadStyle('#374151', '#f9fafb')}
              bodyStyle={{ padding: '20px' }}
            >
              <Form.Item
                name="handoffs"
                label={
                  <span>
                    {t('components.graphEditor.addNodeModal.loopCount')}{' '}
                    <Tooltip title={t('components.graphEditor.addNodeModal.loopCountTooltip')}>
                      <HelpCircle size={14} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                    </Tooltip>
                  </span>
                }
              >
                <InputNumber
                  placeholder={t('components.graphEditor.addNodeModal.loopCountPlaceholder')}
                  style={{ width: '100%' }}
                  min={1}
                />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default AddNodeModal;