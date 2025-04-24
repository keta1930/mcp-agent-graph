// src/pages/GraphEditor.tsx
import React, { useEffect, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { Row, Col, Card, Alert, Spin, Typography, Empty, Button, Tooltip, Tag } from 'antd';
import { PlusOutlined, InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import GraphCanvas from '../components/graph-editor/GraphCanvas';
import NodePropertiesPanel from '../components/graph-editor/NodePropertiesPanel';
import GraphControls from '../components/graph-editor/GraphControls';
import AddNodeModal from '../components/graph-editor/AddNodeModal';
import { useGraphEditorStore } from '../store/graphEditorStore';
import { useMCPStore } from '../store/mcpStore';

const { Title, Text } = Typography;

const GraphEditor: React.FC = () => {
  const { fetchGraphs, addNode, loading, error, currentGraph } = useGraphEditorStore();
  const { fetchConfig, fetchStatus, config, status } = useMCPStore();
  const [addNodeModalVisible, setAddNodeModalVisible] = useState(false);

  // Check if there are any connected MCP servers
  const hasConnectedServers = Object.values(config.mcpServers || {}).some(server => server.connected);

  useEffect(() => {
    fetchGraphs();
    fetchConfig();
    fetchStatus();

    // Set up a timer to periodically refresh status
    const statusInterval = setInterval(() => {
      fetchStatus();
    }, 30000); // Refresh status every 30 seconds

    return () => {
      clearInterval(statusInterval);
    };
  }, [fetchGraphs, fetchConfig, fetchStatus]);

  const handleAddNode = (nodeData: any) => {
    // Preset node position at the center of canvas
    const position = { x: 250, y: 150 };
    addNode({ ...nodeData, position });
    // Close modal after successful addition
    setAddNodeModalVisible(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Title level={2} className="m-0">Graph Editor</Title>
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
          closable
        />
      )}

      <GraphControls onAddNode={() => setAddNodeModalVisible(true)} />

      <Spin spinning={loading} tip="Loading..." delay={300}>
        {!currentGraph ? (
          <Card className="text-center p-8">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No graph configuration"
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddNodeModalVisible(true)}
              >
                Create New Graph
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={16} className="mt-4">
            <Col span={18}>
              <Card
                bodyStyle={{ padding: 0 }}
                className="overflow-hidden"
                style={{ height: '75vh' }}
              >
                <ReactFlowProvider>
                  <GraphCanvas />
                </ReactFlowProvider>
              </Card>
            </Col>
            <Col span={6}>
              <NodePropertiesPanel />
            </Col>
          </Row>
        )}
      </Spin>

      <AddNodeModal
        visible={addNodeModalVisible}
        onClose={() => setAddNodeModalVisible(false)}
        onAdd={handleAddNode}
      />
    </div>
  );
};

export default GraphEditor;