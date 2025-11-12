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

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const NodePropertiesPanel: React.FC = () => {
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
      console.log(`删除节点: ${node.name}`);
      removeNode(selectedNode);
      // 删除后关闭模态框
      selectNode(null);
    }
  };


  // 如果没有选中节点，返回空（在模态框模式下不应该出现这种情况）
  if (!node) {
    return null;
  }

  const availableNodesForPrompt = getAvailableNodesForPrompt();

  return (
    <div style={{ padding: '24px' }}>
      {/* 节点标题区域 */}
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
                }}>起始节点</Tag>
              )}
              {node.output_nodes?.includes('end') && (
                <Tag style={{
                  background: 'rgba(184, 88, 69, 0.08)',
                  color: '#b85845',
                  border: '1px solid rgba(184, 88, 69, 0.25)',
                  borderRadius: '6px'
                }}>结束节点</Tag>
              )}
              {node.level !== undefined && node.level !== null && (
                <Tag style={{
                  background: 'rgba(212, 165, 116, 0.08)',
                  color: '#d4a574',
                  border: '1px solid rgba(212, 165, 116, 0.25)',
                  borderRadius: '6px'
                }}>执行层级: {node.level}</Tag>
              )}
              {node.handoffs && node.handoffs > 1 && (
                <Tag style={{
                  background: 'rgba(139, 115, 85, 0.08)',
                  color: '#8b7355',
                  border: '1px solid rgba(139, 115, 85, 0.25)',
                  borderRadius: '6px'
                }}>循环执行: {node.handoffs}次</Tag>
              )}
              {node.save && (
                <Tag style={{
                  background: 'rgba(160, 130, 109, 0.08)',
                  color: '#a0826d',
                  border: '1px solid rgba(160, 130, 109, 0.25)',
                  borderRadius: '6px'
                }}>保存格式: {node.save}</Tag>
              )}
            </div>
          </div>
        </div>

        {/* 断开连接警告 */}
        {disconnectedServers.length > 0 && (
          <Tooltip title={`断开的服务器: ${disconnectedServers.join(', ')}`}>
            <AlertTriangle size={20} strokeWidth={1.5} style={{ color: '#d4a574' }} />
          </Tooltip>
        )}
      </div>

      {/* 标签页内容 */}
      <Tabs defaultActiveKey="basic" size="large">
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
              <Input placeholder="输入节点名称" size="large" />
            </Form.Item>

            <Form.Item
              name="description"
              label={
                <span>
                  节点描述{' '}
                  <Tooltip title="用于帮助AI选择合适的工具和执行策略">
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <TextArea
                placeholder="描述此节点的功能和用途"
                rows={3}
                showCount
                maxLength={200}
                size="large"
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
                size="default"
              />
            </Form.Item>

            {!node.is_subgraph ? (
              <Form.Item
                name="model_name"
                label="模型"
                rules={[{ required: true, message: '请选择一个模型' }]}
              >
                <Select placeholder="选择模型" size="large">
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
                <Select placeholder="选择子图" size="large">
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
                        (未连接)
                      </Text>
                    )}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Divider />

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>节点连接</h3>
              
              <Form.Item
                name="input_nodes"
                label={
                  <span>
                    输入节点{' '}
                    <Tooltip title="选择为此节点提供输入的节点">
                      <HelpCircle size={14} strokeWidth={1.5} />
                    </Tooltip>
                  </span>
                }
              >
                <Select
                  mode="multiple"
                  placeholder="选择输入节点"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                  }
                >
                  <Option key="start" value="start">
                    <span style={{ color: '#a0826d', fontWeight: 'bold' }}>🚀 start (用户输入)</span>
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
                      <HelpCircle size={14} strokeWidth={1.5} />
                    </Tooltip>
                  </span>
                }
              >
                <Select 
                  mode="multiple" 
                  placeholder="选择输出节点"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                  }
                >
                  <Option key="end" value="end">
                    <span style={{ color: '#b85845', fontWeight: 'bold' }}>🏁 end (最终结果)</span>
                  </Option>
                  {getAvailableNodes().map(nodeName => (
                    <Option key={nodeName} value={nodeName}>{nodeName}</Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <Divider />

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '16px' }}>输出设置</h3>
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Form.Item
                  name="output_enabled"
                  valuePropName="checked"
                  style={{ marginBottom: 0 }}
                >
                  <Switch
                    checkedChildren="启用输出"
                    unCheckedChildren="禁用输出"
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
              label={
                <span>
                  系统提示词{' '}
                  <Tooltip title="输入 { 可以快速插入节点引用，如 {node_name}">
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <SmartPromptEditor
                placeholder="输入系统提示词，可以用 {node_name} 引用其他节点的输出"
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
                  用户提示词{' '}
                  <Tooltip title="输入 { 可以快速插入节点引用，如 {node_name}">
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <SmartPromptEditor
                placeholder="输入用户提示词，可以用 {node_name} 引用其他节点的输出"
                rows={8}
                availableNodes={availableNodesForPrompt}
                currentNodeName={node?.name}
                size="large"
              />
            </Form.Item>

            {/* 添加提示信息 */}
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f6f8fa', 
              borderRadius: '6px',
              fontSize: '12px',
              color: '#666',
              marginTop: '16px'
            }}>
              <strong>💡 引用语法说明：</strong>
              <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                <li>输入 <code>{`{{`}</code> 可以快速选择要引用的节点</li>
                <li>使用 <code>{`{{start}}`}</code> 引用用户输入</li>
                <li>使用 <code>{`{{node_name}}`}</code> 引用其他节点的输出</li>
                <li>使用 <code>{`{{@prompt_name}}`}</code> 引用已注册的提示词模板</li>
                <li>支持联合引用：<code>{`{{node1:3|node2:2}}`}</code> 获取多节点交错输出</li>
              </ul>
            </div>
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
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <InputNumber
                placeholder="执行优先级（可选）"
                style={{ width: '100%' }}
                size="large"
                min={0}
              />
            </Form.Item>

            <Form.Item
              name="handoffs"
              label={
                <span>
                  循环次数{' '}
                  <Tooltip title="节点可以重复执行的次数，用于循环流程">
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <InputNumber
                placeholder="循环执行次数（可选）"
                style={{ width: '100%' }}
                size="large"
                min={1}
              />
            </Form.Item>

            <Form.Item
              name="save"
              label={
                <span>
                  保存格式{' '}
                  <Tooltip title="输出内容保存到文件的格式">
                    <HelpCircle size={14} strokeWidth={1.5} />
                  </Tooltip>
                </span>
              }
            >
              <Select placeholder="选择文件格式（可选）" allowClear size="large">
                {SAVE_FORMAT_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </TabPane>


        <TabPane tab="连接信息" key="connections">
          <div style={{ padding: '8px' }}>
            <div style={{ marginBottom: '24px' }}>
              <Text strong style={{ fontSize: '16px', color: '#2d2d2d' }}>输入节点:</Text>
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
                  <Text type="secondary" style={{ fontSize: '14px' }}>无输入节点</Text>
                )}
              </div>
            </div>

            <div>
              <Text strong style={{ fontSize: '16px', color: '#2d2d2d' }}>输出节点:</Text>
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
                  <Text type="secondary" style={{ fontSize: '14px' }}>无输出节点</Text>
                )}
              </div>
            </div>
          </div>
        </TabPane>
      </Tabs>

      {/* 底部操作按钮 */}
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
          删除节点
        </Button>
      </div>
    </div>
  );
};

export default NodePropertiesPanel;