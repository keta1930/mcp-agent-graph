// src/components/graph-editor/AddNodeModal.tsx
import React, { useState } from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, Tooltip, Card, Row, Col, Space, Typography } from 'antd';
import { 
  QuestionCircleOutlined, 
  RobotOutlined, 
  BranchesOutlined,
  ApiOutlined,
  GlobalOutlined,
  SaveOutlined,
  ReloadOutlined,
  LinkOutlined,
  ThunderboltOutlined,
  StarOutlined,
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

  // Note: context nodes feature has been removed in the new version

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


  // 精致的卡片样式
  const getCardStyle = (gradient: string) => ({
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03), 0 1px 4px rgba(0, 0, 0, 0.08)',
    background: `linear-gradient(135deg, ${gradient})`,
    transition: 'all 0.3s ease',
    overflow: 'hidden'
  });

  const getCardHeadStyle = (color: string) => ({
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
    fontSize: '15px',
    fontWeight: '600',
    color: color,
    padding: '16px 24px',
    minHeight: '56px'
  });

  return (
    <Modal
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          fontSize: '18px', 
          fontWeight: '700',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          <StarOutlined style={{ marginRight: '12px', color: '#667eea' }} />
          创建新节点
        </div>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      width={950}
      bodyStyle={{ 
        padding: '32px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minHeight: '500px'
      }}
      okText={
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <ThunderboltOutlined style={{ marginRight: '6px' }} />
          确认添加
        </span>
      }
      cancelText="取消"
      okButtonProps={{
        size: 'large',
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          height: '40px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
        }
      }}
      cancelButtonProps={{
        size: 'large',
        style: {
          borderRadius: '8px',
          height: '40px',
          fontWeight: '600'
        }
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: '8px' }}>
        {/* 第一行卡片 - 等高对齐 */}
        <Row gutter={32} style={{ marginBottom: '24px', display: 'flex', alignItems: 'stretch' }}>
          {/* 左栏 - 节点基础信息 */}
          <Col span={12} style={{ display: 'flex' }}>
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <RobotOutlined style={{ marginRight: '8px', fontSize: '16px' }} />
                  节点基础信息
                </div>
              }
              size="small" 
              style={{
                ...getCardStyle('#ffffff 0%, #f8fafc 100%'),
                flex: '1',
                display: 'flex',
                flexDirection: 'column'
              }}
              headStyle={getCardHeadStyle('#1f2937')}
              bodyStyle={{ 
                padding: '24px', 
                background: 'rgba(255, 255, 255, 0.8)',
                flex: '1'
              }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Form.Item
                  name="name"
                  label={<Text strong style={{ color: '#374151', fontSize: '14px' }}>节点名称</Text>}
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
                  style={{ marginBottom: '0' }}
                >
                  <Input 
                    placeholder="✨ 为你的节点起个好名字" 
                    style={{
                      borderRadius: '8px',
                      border: '2px solid rgba(0, 0, 0, 0.06)',
                      padding: '8px 12px',
                      fontSize: '14px',
                      transition: 'all 0.3s ease'
                    }}
                  />
                </Form.Item>

                <Form.Item
                  name="description"
                  label={
                    <span style={{ color: '#374151', fontSize: '14px', fontWeight: '600' }}>
                      节点描述{' '}
                      <Tooltip title="用于帮助AI选择合适的工具和执行策略">
                        <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
                      </Tooltip>
                    </span>
                  }
                  style={{ marginBottom: '0' }}
                >
                  <TextArea 
                    placeholder="📝 描述节点的功能和用途，让AI更好地理解..." 
                    rows={3}
                    showCount
                    maxLength={200}
                    style={{
                      borderRadius: '8px',
                      border: '2px solid rgba(0, 0, 0, 0.06)',
                      fontSize: '14px',
                      resize: 'none'
                    }}
                  />
                </Form.Item>

                <div style={{ 
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', 
                  padding: '16px', 
                  borderRadius: '10px',
                  border: '1px solid rgba(0, 0, 0, 0.04)'
                }}>
                  <Form.Item
                    name="is_subgraph"
                    label={<Text strong style={{ color: '#374151', fontSize: '14px' }}>节点类型</Text>}
                    valuePropName="checked"
                    initialValue={false}
                    style={{ marginBottom: '16px' }}
                  >
                    <Switch
                      checkedChildren={<span>🌐 子图</span>}
                      unCheckedChildren={<span>🤖 智能体</span>}
                      onChange={handleTypeChange}
                      style={{ borderRadius: '16px' }}
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
                          label={<Text strong style={{ color: '#374151', fontSize: '14px' }}>选择子图</Text>}
                          rules={[{ required: true, message: '请选择一个子图' }]}
                          style={{ marginBottom: '0' }}
                        >
                          <Select 
                            placeholder="🌐 选择一个子图"
                            style={{ borderRadius: '8px' }}
                            suffixIcon={<BranchesOutlined style={{ color: '#1677ff' }} />}
                          >
                            {availableSubgraphs.map(graph => (
                              <Option key={graph} value={graph}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <BranchesOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
                                  {graph}
                                </div>
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      ) : (
                        <Form.Item
                          name="model_name"
                          label={<Text strong style={{ color: '#374151', fontSize: '14px' }}>选择模型</Text>}
                          rules={[{ required: true, message: '请选择一个模型' }]}
                          style={{ marginBottom: '0' }}
                        >
                          <Select 
                            placeholder="🤖 选择AI模型"
                            style={{ borderRadius: '8px' }}
                            suffixIcon={<RobotOutlined style={{ color: '#52c41a' }} />}
                          >
                            {models.map(model => (
                              <Option key={model.name} value={model.name}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <RobotOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
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

          {/* 右栏 - 服务器与输出控制 */}
          <Col span={12} style={{ display: 'flex' }}>
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ApiOutlined style={{ marginRight: '8px', fontSize: '16px' }} />
                  服务器与输出控制
                </div>
              }
              size="small" 
              style={{
                ...getCardStyle('#ddd6fe 0%, #c084fc 5%, #ffffff 100%'),
                flex: '1',
                display: 'flex',
                flexDirection: 'column'
              }}
              headStyle={getCardHeadStyle('#7c3aed')}
              bodyStyle={{ 
                padding: '20px', 
                background: 'rgba(255, 255, 255, 0.9)',
                flex: '1'
              }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Form.Item
                  name="mcp_servers"
                  label={<Text strong style={{ color: '#374151', fontSize: '14px' }}>🔧 MCP服务器</Text>}
                  initialValue={[]}
                  style={{ marginBottom: '0' }}
                >
                  <Select 
                    mode="multiple" 
                    placeholder="⚡ 选择服务器工具"
                    style={{ borderRadius: '8px' }}
                  >
                    {mcpServers.map(server => (
                      <Option key={server} value={server}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <ApiOutlined style={{ marginRight: '8px', color: '#f59e0b' }} />
                          {server}
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="output_enabled"
                  label={
                    <span style={{ color: '#374151', fontSize: '14px', fontWeight: '600' }}>
                      💡 启用输出{' '}
                      <Tooltip title="是否输出节点回复内容">
                        <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
                      </Tooltip>
                    </span>
                  }
                  valuePropName="checked"
                  initialValue={true}
                  style={{ marginBottom: '16px' }}
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  name="save"
                  label={
                    <span style={{ color: '#374151', fontSize: '14px', fontWeight: '600' }}>
                      💾 保存格式{' '}
                      <Tooltip title="输出内容保存到文件的格式">
                        <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
                      </Tooltip>
                    </span>
                  }
                  style={{ marginBottom: '0' }}
                >
                  <Select 
                    placeholder="📄 选择文件格式（可选）" 
                    allowClear
                    style={{ borderRadius: '8px' }}
                    suffixIcon={<SaveOutlined style={{ color: '#059669' }} />}
                  >
                    {SAVE_FORMAT_OPTIONS.map(option => (
                      <Option key={option.value} value={option.value}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <SaveOutlined style={{ marginRight: '8px', color: '#059669' }} />
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

        {/* 第二行卡片 - 等高对齐 */}
        <Row gutter={32} style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* 左栏 - 节点连接配置 */}
          <Col span={12} style={{ display: 'flex' }}>
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <LinkOutlined style={{ marginRight: '8px', fontSize: '16px' }} />
                  节点连接配置
                </div>
              }
              size="small"
              style={{
                ...getCardStyle('#fef3c7 0%, #fbbf24 5%, #ffffff 100%'),
                flex: '1',
                display: 'flex',
                flexDirection: 'column'
              }}
              headStyle={getCardHeadStyle('#d97706')}
              bodyStyle={{ 
                padding: '24px', 
                background: 'rgba(255, 255, 255, 0.9)',
                flex: '1'
              }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Form.Item
                  name="input_nodes"
                  label={
                    <span style={{ color: '#374151', fontSize: '14px', fontWeight: '600' }}>
                      ⬇️ 输入节点{' '}
                      <Tooltip title="选择为此节点提供输入的节点，包括'start'表示接收用户输入">
                        <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
                      </Tooltip>
                    </span>
                  }
                  initialValue={[]}
                  style={{ marginBottom: '0' }}
                >
                  <Select 
                    mode="multiple" 
                    placeholder="🔗 选择输入来源"
                    showSearch
                    style={{ borderRadius: '8px' }}
                    filterOption={(input, option) =>
                      option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                    }
                  >
                    <Option key="start" value="start">
                      <span style={{ color: '#059669', fontWeight: 'bold' }}>
                        🚀 start <Text type="secondary">(用户输入)</Text>
                      </span>
                    </Option>
                    {getAvailableNodes().map(nodeName => (
                      <Option key={nodeName} value={nodeName}>
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                          🔗 {nodeName}
                        </span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="output_nodes"
                  label={
                    <span style={{ color: '#374151', fontSize: '14px', fontWeight: '600' }}>
                      ⬆️ 输出节点{' '}
                      <Tooltip title="选择接收此节点输出的节点，包括'end'表示输出到最终结果">
                        <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
                      </Tooltip>
                    </span>
                  }
                  initialValue={[]}
                  style={{ marginBottom: '0' }}
                >
                  <Select 
                    mode="multiple" 
                    placeholder="📤 选择输出目标"
                    showSearch
                    style={{ borderRadius: '8px' }}
                    filterOption={(input, option) =>
                      option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                    }
                  >
                    <Option key="end" value="end">
                      <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                        🏁 end <Text type="secondary">(最终结果)</Text>
                      </span>
                    </Option>
                    {getAvailableNodes().map(nodeName => (
                      <Option key={nodeName} value={nodeName}>
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                          📤 {nodeName}
                        </span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Space>
            </Card>
          </Col>

          {/* 右栏 - 执行控制与上下文 */}
          <Col span={12} style={{ display: 'flex' }}>
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <SettingOutlined style={{ marginRight: '8px', fontSize: '16px' }} />
                  执行控制与上下文
                </div>
              }
              size="small"
              style={{
                ...getCardStyle('#fecaca 0%, #f87171 5%, #ffffff 100%'),
                flex: '1',
                display: 'flex',
                flexDirection: 'column'
              }}
              headStyle={getCardHeadStyle('#dc2626')}
              bodyStyle={{ 
                padding: '20px', 
                background: 'rgba(255, 255, 255, 0.9)',
                flex: '1'
              }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Form.Item
                  name="handoffs"
                  label={
                    <span style={{ color: '#374151', fontSize: '14px', fontWeight: '600' }}>
                      🔄 循环次数{' '}
                      <Tooltip title="节点可以重复执行的次数，用于循环流程">
                        <QuestionCircleOutlined style={{ color: '#9ca3af' }} />
                      </Tooltip>
                    </span>
                  }
                  style={{ marginBottom: '0' }}
                >
                  <InputNumber 
                    placeholder="🔄 循环执行次数（可选）" 
                    style={{ 
                      width: '100%',
                      borderRadius: '8px',
                      border: '2px solid rgba(0, 0, 0, 0.06)'
                    }}
                    min={1}
                  />
                </Form.Item>

              </Space>
            </Card>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default AddNodeModal;