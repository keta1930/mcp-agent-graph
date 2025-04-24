// src/components/graph-editor/NodePropertiesPanel.tsx
import React, { useEffect } from 'react';
import { Form, Input, Switch, Select, Button, Card, Typography, Tabs, Tag, Tooltip } from 'antd';
import { DeleteOutlined, WarningOutlined, RobotOutlined, BranchesOutlined } from '@ant-design/icons';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { useModelStore } from '../../store/modelStore';
import { useMCPStore } from '../../store/mcpStore';

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
        is_subgraph: node.is_subgraph,
        model_name: node.model_name,
        subgraph_name: node.subgraph_name,
        mcp_servers: node.mcp_servers,
        system_prompt: node.system_prompt,
        user_prompt: node.user_prompt,
        is_start: node.is_start,
        is_end: node.is_end,
        output_enabled: node.output_enabled
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
    if (selectedNode) {
      removeNode(selectedNode);
    }
  };

  // If no node is selected, show a prompt
  if (!node) {
    return (
      <Card className="h-full" style={{ height: '75vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text type="secondary">Please select a node to edit properties</Text>
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
            <BranchesOutlined style={{ color: '#1677ff', marginRight: '8px' }} /> :
            <RobotOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
          }
          <span>{node.name}</span>
          {node.is_start && <Tag color="green" style={{ marginLeft: '8px' }}>Start</Tag>}
          {node.is_end && <Tag color="blue" style={{ marginLeft: '4px' }}>End</Tag>}

          {/* Only show tooltip when there are disconnected servers */}
          {disconnectedServers.length > 0 && (
            <Tooltip title={`Disconnected servers: ${disconnectedServers.join(', ')}`}>
              <WarningOutlined style={{ color: '#faad14', marginLeft: '8px' }} />
            </Tooltip>
          )}
        </div>
      }
      bodyStyle={{ overflow: 'auto', height: 'calc(75vh - 57px)' }}
    >
      <Tabs defaultActiveKey="basic">
        <TabPane tab="Basic Info" key="basic">
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
          >
            <Form.Item
              name="name"
              label="Node Name"
              rules={[
                { required: true, message: 'Please enter node name' },
                {
                  validator: (_, value) => {
                    if (value && (/[/\\.]/.test(value))) {
                      return Promise.reject('Name cannot contain special characters (/, \\, .)');
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input placeholder="Enter node name" />
            </Form.Item>

            <Form.Item
              name="is_subgraph"
              label="Node Type"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="Subgraph"
                unCheckedChildren="Agent"
              />
            </Form.Item>

            {!node.is_subgraph ? (
              <Form.Item
                name="model_name"
                label="Model"
                rules={[{ required: true, message: 'Please select a model' }]}
              >
                <Select placeholder="Select model">
                  {models.map(model => (
                    <Option key={model.name} value={model.name}>{model.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            ) : (
              <Form.Item
                name="subgraph_name"
                label="Subgraph"
                rules={[{ required: true, message: 'Please select a subgraph' }]}
              >
                <Select placeholder="Select subgraph">
                  {availableSubgraphs.map(graph => (
                    <Option key={graph} value={graph}>{graph}</Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Form.Item
              name="mcp_servers"
              label="MCP Servers"
            >
              <Select
                mode="multiple"
                placeholder="Select MCP servers"
              >
                {mcpServers.map(server => (
                  <Option
                    key={server.name}
                    value={server.name}
                  >
                    {server.name}
                    {!server.connected && (
                      <Text type="danger" style={{ marginLeft: '8px', fontSize: '12px' }}>
                        (Not connected)
                      </Text>
                    )}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <div className="mt-4 space-y-2">
              <Form.Item
                name="is_start"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Start Node"
                  unCheckedChildren="Normal Node"
                />
              </Form.Item>

              <Form.Item
                name="is_end"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="End Node"
                  unCheckedChildren="Normal Node"
                />
              </Form.Item>

              <Form.Item
                name="output_enabled"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Output Enabled"
                  unCheckedChildren="Output Disabled"
                />
              </Form.Item>
            </div>
          </Form>
        </TabPane>

        <TabPane tab="Prompt Settings" key="prompts">
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
          >
            <Form.Item
              name="system_prompt"
              label="System Prompt"
            >
              <TextArea
                rows={6}
                placeholder="Enter system prompt"
                showCount
              />
            </Form.Item>

            <Form.Item
              name="user_prompt"
              label="User Prompt"
            >
              <TextArea
                rows={6}
                placeholder="Enter user prompt"
                showCount
              />
            </Form.Item>
          </Form>
        </TabPane>

        <TabPane tab="Connections" key="connections">
          <div className="p-2">
            <div className="mb-4">
              <Text strong>Input Nodes:</Text>
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
                  <Text type="secondary">No input nodes</Text>
                )}
              </div>
            </div>

            <div>
              <Text strong>Output Nodes:</Text>
              <div className="mt-1">
                {node.output_nodes && node.output_nodes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {node.output_nodes.map(output => (
                      <Tag key={output} color={output === 'end' ? 'green' : 'orange'}>
                        {output}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">No output nodes</Text>
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
          Delete Node
        </Button>
      </div>
    </Card>
  );
};

export default NodePropertiesPanel;