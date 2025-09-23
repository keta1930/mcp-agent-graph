// src/components/graph-editor/AddNodeModal.tsx
import React, { useState } from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, Tooltip, Card, Row, Col, Space, Typography } from 'antd';
import {
  QuestionCircleOutlined,
  PlusOutlined,
  DatabaseOutlined,
  NodeIndexOutlined,
  FunctionOutlined,
  CodeOutlined,
  CloudOutlined,
  LinkOutlined,
  ExperimentOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useModelStore } from '../../store/modelStore';
import { useMCPStore } from '../../store/mcpStore';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { SAVE_FORMAT_OPTIONS } from '../../types/graph';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface AddNodeModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (nodeData: any) => void;
}

const AddNodeModal: React.FC<AddNodeModalProps> = ({ visible, onClose, onAdd }) => {
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
    borderRadius: '8px',
    border: `1px solid ${borderColor}`,
    boxShadow: 'none',
    background: '#fff',
    transition: 'all 0.2s ease'
  });

  const getCardHeadStyle = (color: string, bgColor: string) => ({
    background: bgColor,
    borderBottom: '1px solid #e5e7eb',
    fontSize: '14px',
    fontWeight: '600',
    color: color,
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
          color: '#1f2937'
        }}>
          <PlusOutlined style={{ marginRight: '8px', color: '#4f46e5' }} />
          添加新节点
        </div>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      width={900}
      bodyStyle={{
        padding: '24px',
        background: '#fafafa'
      }}
      okText="添加节点"
      cancelText="取消"
      okButtonProps={{
        style: {
          background: '#4f46e5',
          borderColor: '#4f46e5',
          borderRadius: '6px',
          fontWeight: '500'
        }
      }}
      cancelButtonProps={{
        style: {
          borderRadius: '6px',
          fontWeight: '500'
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
                  <NodeIndexOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#4f46e5' }} />
                  节点信息
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
                  label="节点名称"
                  rules={[
                    { required: true, message: '请输入节点名称' },
                    {
                      validator: (_, value) => {
                        if (value && (/[/\\.]/.test(value))) {
                          return Promise.reject('名称不能包含特殊字符 (/, \\, .)');
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <Input placeholder="输入节点名称" />
                </Form.Item>

                <Form.Item
                  name="description"
                  label={
                    <span>
                      节点描述{' '}
                      <Tooltip title="用于帮助AI选择合适的工具和执行策略">
                        <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
                      </Tooltip>
                    </span>
                  }
                >
                  <TextArea
                    placeholder="描述节点的功能和用途"
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
                    label="节点类型"
                    valuePropName="checked"
                    initialValue={false}
                    style={{ marginBottom: '16px' }}
                  >
                    <Switch
                      checkedChildren="子图"
                      unCheckedChildren="智能体"
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
                          label="选择子图"
                          rules={[{ required: true, message: '请选择一个子图' }]}
                          style={{ marginBottom: '0' }}
                        >
                          <Select
                            placeholder="选择一个子图"
                            suffixIcon={<CodeOutlined style={{ color: '#4f46e5' }} />}
                          >
                            {availableSubgraphs.map(graph => (
                              <Option key={graph} value={graph}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <CodeOutlined style={{ marginRight: '8px', color: '#4f46e5' }} />
                                  {graph}
                                </div>
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      ) : (
                        <Form.Item
                          name="model_name"
                          label="选择模型"
                          rules={[{ required: true, message: '请选择一个模型' }]}
                          style={{ marginBottom: '0' }}
                        >
                          <Select
                            placeholder="选择AI模型"
                            suffixIcon={<FunctionOutlined style={{ color: '#059669' }} />}
                          >
                            {models.map(model => (
                              <Option key={model.name} value={model.name}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <FunctionOutlined style={{ marginRight: '8px', color: '#059669' }} />
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
                  <CloudOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#dc2626' }} />
                  工具与输出
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
                  label="MCP服务器"
                  initialValue={[]}
                >
                  <Select
                    mode="multiple"
                    placeholder="选择服务器工具"
                  >
                    {mcpServers.map(server => (
                      <Option key={server} value={server}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <CloudOutlined style={{ marginRight: '8px', color: '#f59e0b' }} />
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
                      启用输出{' '}
                      <Tooltip title="是否输出节点回复内容">
                        <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
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
                      保存格式{' '}
                      <Tooltip title="输出内容保存到文件的格式">
                        <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
                      </Tooltip>
                    </span>
                  }
                >
                  <Select
                    placeholder="选择文件格式（可选）"
                    allowClear
                    suffixIcon={<DatabaseOutlined style={{ color: '#059669' }} />}
                  >
                    {SAVE_FORMAT_OPTIONS.map(option => (
                      <Option key={option.value} value={option.value}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <DatabaseOutlined style={{ marginRight: '8px', color: '#059669' }} />
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
                  <LinkOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#f59e0b' }} />
                  节点连接
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
                      输入节点{' '}
                      <Tooltip title="选择为此节点提供输入的节点，包括'start'表示接收用户输入">
                        <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
                      </Tooltip>
                    </span>
                  }
                  initialValue={[]}
                >
                  <Select
                    mode="multiple"
                    placeholder="选择输入来源"
                    showSearch
                    filterOption={(input, option) =>
                      option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                    }
                  >
                    <Option key="start" value="start">
                      <span style={{ color: '#059669', fontWeight: 'bold' }}>
                        start <Text type="secondary">(用户输入)</Text>
                      </span>
                    </Option>
                    {getAvailableNodes().map(nodeName => (
                      <Option key={nodeName} value={nodeName}>
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                          <NodeIndexOutlined style={{ marginRight: '8px', color: '#6b7280' }} />
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
                      输出节点{' '}
                      <Tooltip title="选择接收此节点输出的节点，包括'end'表示输出到最终结果">
                        <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
                      </Tooltip>
                    </span>
                  }
                  initialValue={[]}
                >
                  <Select
                    mode="multiple"
                    placeholder="选择输出目标"
                    showSearch
                    filterOption={(input, option) =>
                      option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                    }
                  >
                    <Option key="end" value="end">
                      <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                        end <Text type="secondary">(最终结果)</Text>
                      </span>
                    </Option>
                    {getAvailableNodes().map(nodeName => (
                      <Option key={nodeName} value={nodeName}>
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                          <NodeIndexOutlined style={{ marginRight: '8px', color: '#6b7280' }} />
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
                  <SettingOutlined style={{ marginRight: '8px', fontSize: '14px', color: '#7c3aed' }} />
                  执行控制
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
                    循环次数{' '}
                    <Tooltip title="节点可以重复执行的次数，用于循环流程">
                      <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
                    </Tooltip>
                  </span>
                }
              >
                <InputNumber
                  placeholder="循环执行次数（可选）"
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