// src/components/graph-editor/GraphControls.tsx
import React, { useState } from 'react';
import { Button, Modal, Form, Input, Select, Tooltip, message, Space, Radio } from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  CodeOutlined,
  CopyOutlined,
  CheckOutlined,
  DeleteOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import { useMCPStore } from '../../store/mcpStore';
import ServerStatusIndicator from './ServerStatusIndicator';

const { TextArea } = Input;
const { Option } = Select;

interface GraphControlsProps {
  onAddNode: () => void;
}

const GraphControls: React.FC<GraphControlsProps> = ({ onAddNode }) => {
  const {
    currentGraph,
    saveGraph,
    graphs,
    loadGraph,
    createNewGraph,
    renameGraph,
    dirty,
    generateMCPScript,
    deleteGraph
  } = useGraphEditorStore();

  const { config, status } = useMCPStore();

  const [loading, setLoading] = useState(false);
  const [newGraphModalVisible, setNewGraphModalVisible] = useState(false);
  const [mcpScriptModalVisible, setMcpScriptModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [mcpScript, setMcpScript] = useState("");
  const [parallelScript, setParallelScript] = useState("");
  const [sequentialScript, setSequentialScript] = useState("");
  const [scriptType, setScriptType] = useState<'sequential' | 'parallel'>('sequential');
  const [copied, setCopied] = useState(false);

  const [form] = Form.useForm();

  // Check if all MCP servers used in the current graph are connected
  const checkServerConnections = () => {
    if (!currentGraph || !config.mcpServers) return true;

    // Get all connected servers
    const connectedServers = Object.entries(status)
      .filter(([_, serverStatus]) => serverStatus?.connected)
      .map(([name]) => name);

    // Check if any node uses a server that's not connected
    const hasDisconnectedServer = currentGraph.nodes.some(node => {
      if (!node.mcp_servers || node.mcp_servers.length === 0) return false;
      return node.mcp_servers.some(server => !connectedServers.includes(server));
    });

    return !hasDisconnectedServer;
  };

  const handleSave = async () => {
    if (!currentGraph) return;

    try {
      setLoading(true);
      await saveGraph();
      message.success(`Graph "${currentGraph.name}" saved successfully`);
    } catch (error) {
      message.error(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewGraph = () => {
    form.resetFields();
    setNewGraphModalVisible(true);
  };

  const handleNewGraphSubmit = async () => {
    try {
      const values = await form.validateFields();
      createNewGraph(values.name, values.description);
      setNewGraphModalVisible(false);
      message.success(`Graph "${values.name}" created successfully`);
    } catch (error) {
      // Form validation error
    }
  };

  const handleGraphChange = (graphName: string) => {
    if (dirty) {
      Modal.confirm({
        title: 'Unsaved Changes',
        content: 'The current graph has unsaved changes. Switching will lose these changes. Continue?',
        onOk: () => {
          loadGraph(graphName);
        }
      });
    } else {
      loadGraph(graphName);
    }
  };

  // Added function to handle graph deletion
  const handleDeleteGraph = async () => {
    if (!currentGraph) return;

    try {
      setLoading(true);
      await deleteGraph(currentGraph.name);
      setDeleteModalVisible(false);
      message.success(`Graph "${currentGraph.name}" deleted successfully`);
    } catch (error) {
      message.error(`Delete failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportMCP = async () => {
    if (!currentGraph) return;

    try {
      setLoading(true);

      // Save first if there are unsaved changes
      if (dirty) {
        await saveGraph();
        message.success(`Graph "${currentGraph.name}" automatically saved`);
      }

      const response = await generateMCPScript(currentGraph.name);

      // 保存两种脚本类型
      setSequentialScript(response.sequential_script || response.default_script || response.script);
      setParallelScript(response.parallel_script || "");
      setMcpScript(response.sequential_script || response.default_script || response.script);
      setScriptType('sequential'); // 默认选择串行脚本

      setMcpScriptModalVisible(true);
    } catch (error) {
      message.error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyScript = () => {
    // 根据当前选择的脚本类型复制相应的脚本
    const scriptToCopy = scriptType === 'parallel' ? parallelScript : sequentialScript;

    navigator.clipboard.writeText(scriptToCopy).then(() => {
      setCopied(true);
      message.success('Script copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Server status check
  const allServersConnected = checkServerConnections();

  return (
    <div className="flex justify-between items-center p-4 bg-white border-b">
      <div className="flex items-center gap-2">
        <Select
          placeholder="Select Graph"
          style={{ width: 200 }}
          onChange={handleGraphChange}
          value={currentGraph?.name}
        >
          {graphs.map(name => (
            <Option key={name} value={name}>{name}</Option>
          ))}
        </Select>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateNewGraph}
        >
          New Graph
        </Button>

        {/* Use dedicated status indicator component */}
        <ServerStatusIndicator />
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onAddNode}
          icon={<PlusOutlined />}
          disabled={!currentGraph}
        >
          Add Node
        </Button>

        <Tooltip title={!allServersConnected ? "Graph contains nodes using disconnected servers" : ""}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={loading}
            disabled={!currentGraph || !dirty}
            danger={!allServersConnected}
          >
            Save
          </Button>
        </Tooltip>

        <Button
          icon={<CodeOutlined />}
          onClick={handleExportMCP}
          loading={loading}
          disabled={!currentGraph?.name}
        >
          Export MCP
        </Button>

        {/* Added Delete Graph button */}
        <Button
          icon={<DeleteOutlined />}
          onClick={() => setDeleteModalVisible(true)}
          disabled={!currentGraph?.name}
          danger
        >
          Delete
        </Button>
      </div>

      {/* Create new graph modal */}
      <Modal
        title="Create New Graph"
        open={newGraphModalVisible}
        onOk={handleNewGraphSubmit}
        onCancel={() => setNewGraphModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Graph Name"
            rules={[
              { required: true, message: 'Please enter graph name' },
              { pattern: /^[^./\\]+$/, message: 'Name cannot contain special characters (/, \\, .)' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Added Delete confirmation modal */}
      <Modal
        title="Delete Graph"
        open={deleteModalVisible}
        onOk={handleDeleteGraph}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        {currentGraph && (
          <p>
            Are you sure you want to delete the graph "{currentGraph.name}"? This action cannot be undone.
          </p>
        )}
      </Modal>

      {/* MCP script modal with script type selector */}
      <Modal
        title="MCP Server Script"
        open={mcpScriptModalVisible}
        onCancel={() => setMcpScriptModalVisible(false)}
        width={800}
        footer={[
          <Button key="copy" icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={handleCopyScript}>
            {copied ? 'Copied' : 'Copy Script'}
          </Button>,
          <Button key="close" onClick={() => setMcpScriptModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Radio.Group
            value={scriptType}
            onChange={(e) => {
              setScriptType(e.target.value);
              // 切换当前显示的脚本
              setMcpScript(e.target.value === 'parallel' ? parallelScript : sequentialScript);
            }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="sequential">Sequential Execution</Radio.Button>
            <Radio.Button value="parallel">Parallel Execution</Radio.Button>
          </Radio.Group>
          <Tooltip title={scriptType === 'parallel' ?
            "Parallel execution runs nodes in parallel where possible based on dependency levels" :
            "Sequential execution runs nodes one after another in order of dependencies"}>
            <InfoCircleOutlined style={{ marginLeft: '8px' }} />
          </Tooltip>
        </div>

        <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
          <pre>{mcpScript}</pre>
        </div>
      </Modal>
    </div>
  );
};

export default GraphControls;