// src/components/graph-editor/AddNodeModal.tsx
import React, { useState } from 'react';
import { Modal, Form, Input, Select, Switch, InputNumber, Collapse, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useModelStore } from '../../store/modelStore';
import { useMCPStore } from '../../store/mcpStore';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { SAVE_FORMAT_OPTIONS, CONTEXT_MODE_OPTIONS } from '../../types/graph';

const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const mcpServers = Object.keys(config.mcpServers || {});

  // Available subgraphs - exclude current graph to avoid circular references
  const availableSubgraphs = graphs.filter(
    graphName => !currentGraph || graphName !== currentGraph.name
  );

  // Get available context nodes (nodes with global_output enabled)
  const availableContextNodes = currentGraph?.nodes
    .filter(node => node.global_output)
    .map(node => node.name) || [];

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
        global_output: values.global_output || false,
        context: values.context || [],
        context_mode: values.context_mode || 'all',
        context_n: values.context_n || 1,
        handoffs: values.handoffs || null,
        level: values.level || null,
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

  const handleContextModeChange = (mode: string) => {
    if (mode !== 'latest_n') {
      form.setFieldsValue({ context_n: 1 });
    }
  };

  return (
    <Modal
      title="添加节点"
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      width={600}
      bodyStyle={{ maxHeight: '70vh', overflow: 'auto' }}
    >
      <Form form={form} layout="vertical">
        {/* 基础信息 */}
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
                <QuestionCircleOutlined />
              </Tooltip>
            </span>
          }
        >
          <TextArea 
            placeholder="描述此节点的功能和用途" 
            rows={2}
            showCount
            maxLength={200}
          />
        </Form.Item>

        <Form.Item
          name="is_subgraph"
          label="节点类型"
          valuePropName="checked"
          initialValue={false}
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
                label="子图"
                rules={[{ required: true, message: '请选择一个子图' }]}
              >
                <Select placeholder="选择子图">
                  {availableSubgraphs.map(graph => (
                    <Option key={graph} value={graph}>{graph}</Option>
                  ))}
                </Select>
              </Form.Item>
            ) : (
              <Form.Item
                name="model_name"
                label="模型"
                rules={[{ required: true, message: '请选择一个模型' }]}
              >
                <Select placeholder="选择模型">
                  {models.map(model => (
                    <Option key={model.name} value={model.name}>{model.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            )
          }
        </Form.Item>

        <Form.Item
          name="mcp_servers"
          label="MCP服务器"
          initialValue={[]}
        >
          <Select mode="multiple" placeholder="选择MCP服务器">
            {mcpServers.map(server => (
              <Option key={server} value={server}>{server}</Option>
            ))}
          </Select>
        </Form.Item>

        {/* 节点连接配置 */}
        <div style={{ marginBottom: '16px' }}>
          <h4>节点连接</h4>
          
          <Form.Item
            name="input_nodes"
            label={
              <span>
                输入节点{' '}
                <Tooltip title="选择为此节点提供输入的节点，包括'start'表示接收用户输入">
                  <QuestionCircleOutlined />
                </Tooltip>
              </span>
            }
            initialValue={[]}
          >
            <Select 
              mode="multiple" 
              placeholder="选择输入节点"
              showSearch
              filterOption={(input, option) =>
                option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
              }
            >
              <Option key="start" value="start">
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>🚀 start (用户输入)</span>
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
                输出节点{' '}
                <Tooltip title="选择接收此节点输出的节点，包括'end'表示输出到最终结果">
                  <QuestionCircleOutlined />
                </Tooltip>
              </span>
            }
            initialValue={[]}
          >
            <Select 
              mode="multiple" 
              placeholder="选择输出节点"
              showSearch
              filterOption={(input, option) =>
                option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
              }
            >
              <Option key="end" value="end">
                <span style={{ color: '#f5222d', fontWeight: 'bold' }}>🏁 end (最终结果)</span>
              </Option>
              {getAvailableNodes().map(nodeName => (
                <Option key={nodeName} value={nodeName}>{nodeName}</Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        {/* 高级设置 */}
        <Collapse 
          ghost 
          onChange={(keys) => setShowAdvanced(keys.length > 0)}
        >
          <Panel header="高级设置" key="advanced">
            {/* 执行控制 */}
            <div style={{ marginBottom: '16px' }}>
              <h4>执行控制</h4>
              
              <Form.Item
                name="level"
                label={
                  <span>
                    执行层级{' '}
                    <Tooltip title="数字越小越先执行，用于控制节点执行顺序">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </span>
                }
              >
                <InputNumber 
                  placeholder="执行优先级（可选）" 
                  style={{ width: '100%' }}
                  min={0}
                />
              </Form.Item>

              <Form.Item
                name="handoffs"
                label={
                  <span>
                    循环次数{' '}
                    <Tooltip title="节点可以重复执行的次数，用于循环流程">
                      <QuestionCircleOutlined />
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
            </div>

            {/* 输出管理 */}
            <div style={{ marginBottom: '16px' }}>
              <h4>输出管理</h4>
              
              <Form.Item
                name="output_enabled"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch 
                  checkedChildren="启用输出" 
                  unCheckedChildren="禁用输出" 
                />
              </Form.Item>

              <Form.Item
                name="global_output"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch 
                  checkedChildren="全局输出" 
                  unCheckedChildren="局部输出"
                />
              </Form.Item>

              <Form.Item
                name="save"
                label={
                  <span>
                    保存格式{' '}
                    <Tooltip title="输出内容保存到文件的格式">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </span>
                }
              >
                <Select placeholder="选择文件格式（可选）" allowClear>
                  {SAVE_FORMAT_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            {/* 上下文管理 */}
            <div>
              <h4>上下文管理</h4>
              
              <Form.Item
                name="context"
                label={
                  <span>
                    引用节点{' '}
                    <Tooltip title="选择需要引用输出的全局节点">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </span>
                }
                initialValue={[]}
              >
                <Select 
                  mode="multiple" 
                  placeholder="选择要引用的节点"
                  disabled={availableContextNodes.length === 0}
                >
                  {availableContextNodes.map(nodeName => (
                    <Option key={nodeName} value={nodeName}>{nodeName}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.context !== currentValues.context
                }
              >
                {({ getFieldValue }) => {
                  const selectedContext = getFieldValue('context') || [];
                  return selectedContext.length > 0 ? (
                    <>
                      <Form.Item
                        name="context_mode"
                        label="获取模式"
                        initialValue="all"
                      >
                        <Select onChange={handleContextModeChange}>
                          {CONTEXT_MODE_OPTIONS.map(option => (
                            <Option key={option.value} value={option.value}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => 
                          prevValues.context_mode !== currentValues.context_mode
                        }
                      >
                        {({ getFieldValue }) => 
                          getFieldValue('context_mode') === 'latest_n' ? (
                            <Form.Item
                              name="context_n"
                              label="获取数量"
                              initialValue={1}
                            >
                              <InputNumber 
                                min={1} 
                                max={10}
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                          ) : null
                        }
                      </Form.Item>
                    </>
                  ) : null;
                }}
              </Form.Item>
            </div>
          </Panel>
        </Collapse>
      </Form>
    </Modal>
  );
};

export default AddNodeModal;