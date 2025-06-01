// src/components/graph-editor/NodePropertiesPanel.tsx
import React, { useEffect } from 'react';
import { 
  Form, Input, Switch, Select, Button, Card, Typography, Tabs, Tag, 
  Tooltip, InputNumber, Divider, Space 
} from 'antd';
import { 
  DeleteOutlined, WarningOutlined, RobotOutlined, BranchesOutlined,
  QuestionCircleOutlined 
} from '@ant-design/icons';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { useModelStore } from '../../store/modelStore';
import { useMCPStore } from '../../store/mcpStore';
import { SAVE_FORMAT_OPTIONS, CONTEXT_MODE_OPTIONS } from '../../types/graph';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const NodePropertiesPanel: React.FC = () => {
  const [form] = Form.useForm();
  const { currentGraph, selectedNode, updateNode, removeNode, graphs } = useGraphEditorStore();
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

  // Get available context nodes (nodes with global_output enabled, excluding current node)
  const availableContextNodes = currentGraph?.nodes
    .filter(n => n.global_output && n.id !== selectedNode)
    .map(n => n.name) || [];

  // Get available nodes for input/output connections (excluding current node)
  const getAvailableNodes = () => {
    if (!currentGraph || !node) return [];
    
    return currentGraph.nodes
      .filter(n => n.id !== selectedNode)
      .map(n => n.name);
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
        global_output: node.global_output || false,
        context: node.context || [],
        context_mode: node.context_mode || 'all',
        context_n: node.context_n || 1,
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
      console.log(`删除节点: ${node.name}`);
      removeNode(selectedNode);
    }
  };

  const handleContextModeChange = (mode: string) => {
    if (mode !== 'latest_n') {
      updateNode(selectedNode!, { context_n: 1 });
    }
  };

  // If no node is selected, show a prompt
  if (!node) {
    return (
      <Card className="h-full" style={{ height: '75vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text type="secondary">请选择一个节点来编辑属性</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="h-full"
      style={{ height: '75vh', overflow: 'auto' }}
      title={
        <div className="flex items-center">
          {node.is_subgraph ?
            <BranchesOutlined style={{
              color: '#1677ff',
              marginRight: '8px',
              fontSize: '18px'
            }} /> :
            <RobotOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
          }
          <span>{node.name}</span>
          {node.input_nodes?.includes('start') && <Tag color="green" style={{ marginLeft: '8px' }}>Start</Tag>}
          {node.output_nodes?.includes('end') && <Tag color="blue" style={{ marginLeft: '4px' }}>End</Tag>}
          {node.global_output && <Tag color="purple" style={{ marginLeft: '4px' }}>Global</Tag>}

          {/* Only show tooltip when there are disconnected servers */}
          {disconnectedServers.length > 0 && (
            <Tooltip title={`断开的服务器: ${disconnectedServers.join(', ')}`}>
              <WarningOutlined style={{ color: '#faad14', marginLeft: '8px' }} />
            </Tooltip>
          )}
        </div>
      }
      bodyStyle={{ overflow: 'auto', height: 'calc(75vh - 57px)' }}
    >
      <Tabs defaultActiveKey="basic">
        <TabPane tab="基础信息" key="basic">
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
          >
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
                rows={3}
                showCount
                maxLength={200}
              />
            </Form.Item>

            <Form.Item
              name="is_subgraph"
              label="节点类型"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="子图"
                unCheckedChildren="智能体"
              />
            </Form.Item>

            {!node.is_subgraph ? (
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
            ) : (
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
            )}

            <Form.Item
              name="mcp_servers"
              label="MCP服务器"
            >
              <Select
                mode="multiple"
                placeholder="选择MCP服务器"
              >
                {mcpServers.map(server => (
                  <Option
                    key={server.name}
                    value={server.name}
                  >
                    {server.name}
                    {!server.connected && (
                      <Text type="danger" style={{ marginLeft: '8px', fontSize: '12px' }}>
                        (未连接)
                      </Text>
                    )}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Divider />

            <div className="mt-4 space-y-2">
              <h4>节点连接</h4>
              
              <Form.Item
                name="input_nodes"
                label={
                  <span>
                    输入节点{' '}
                    <Tooltip title="选择为此节点提供输入的节点">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </span>
                }
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
                    <Tooltip title="选择接收此节点输出的节点">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </span>
                }
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

            <Divider />

            <div className="mt-4 space-y-2">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item
                  name="output_enabled"
                  valuePropName="checked"
                  style={{ marginBottom: 8 }}
                >
                  <Switch
                    checkedChildren="启用输出"
                    unCheckedChildren="禁用输出"
                  />
                </Form.Item>

                <Form.Item
                  name="global_output"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Switch
                    checkedChildren="全局输出"
                    unCheckedChildren="局部输出"
                  />
                </Form.Item>
              </Space>
            </div>
          </Form>
        </TabPane>

        <TabPane tab="提示词设置" key="prompts">
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
          >
            <Form.Item
              name="system_prompt"
              label="系统提示词"
            >
              <TextArea
                rows={6}
                placeholder="输入系统提示词"
                showCount
              />
            </Form.Item>

            <Form.Item
              name="user_prompt"
              label="用户提示词"
            >
              <TextArea
                rows={6}
                placeholder="输入用户提示词"
                showCount
              />
            </Form.Item>
          </Form>
        </TabPane>

        <TabPane tab="执行控制" key="execution">
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
          >
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
          </Form>
        </TabPane>

        <TabPane tab="上下文管理" key="context">
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
          >
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
                ) : (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: '4px', 
                    textAlign: 'center' 
                  }}>
                    <Text type="secondary">
                      {availableContextNodes.length === 0 
                        ? '当前图中没有全局输出节点' 
                        : '请选择要引用的节点'}
                    </Text>
                  </div>
                );
              }}
            </Form.Item>
          </Form>
        </TabPane>

        <TabPane tab="连接信息" key="connections">
          <div className="p-2">
            <div className="mb-4">
              <Text strong>输入节点:</Text>
              <div className="mt-1">
                {node.input_nodes && node.input_nodes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {node.input_nodes.map(input => (
                      <Tag key={input} color={input === 'start' ? 'green' : 'blue'}>
                        {input}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">无输入节点</Text>
                )}
              </div>
            </div>

            <div>
              <Text strong>输出节点:</Text>
              <div className="mt-1">
                {node.output_nodes && node.output_nodes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {node.output_nodes.map(output => (
                      <Tag key={output} color={output === 'end' ? 'red' : 'orange'}>
                        {output}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">无输出节点</Text>
                )}
              </div>
            </div>
          </div>
        </TabPane>
      </Tabs>

      <div className="mt-4 flex justify-center border-t pt-4">
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={handleDelete}
        >
          删除节点
        </Button>
      </div>
    </Card>
  );
};

export default NodePropertiesPanel;