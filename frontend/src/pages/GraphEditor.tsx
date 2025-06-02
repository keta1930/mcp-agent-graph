// src/pages/GraphEditor.tsx
import React, { useEffect, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { Card, Alert, Spin, Typography, Empty, Button, Tooltip, Space, Modal } from 'antd';
import { 
  PlusOutlined, InfoCircleOutlined, WarningOutlined
} from '@ant-design/icons';
import GraphCanvas from '../components/graph-editor/GraphCanvas';
import NodePropertiesPanel from '../components/graph-editor/NodePropertiesPanel';
import GraphControls from '../components/graph-editor/GraphControls';
import AddNodeModal from '../components/graph-editor/AddNodeModal';
import { useGraphEditorStore } from '../store/graphEditorStore';
import { useMCPStore } from '../store/mcpStore';

const { Text } = Typography;

const GraphEditor: React.FC = () => {
  const { 
    fetchGraphs, 
    addNode, 
    loading, 
    error, 
    currentGraph,
    selectedNode,
    selectNode
  } = useGraphEditorStore();
  const { fetchConfig, fetchStatus, config, status } = useMCPStore();
  const [addNodeModalVisible, setAddNodeModalVisible] = useState(false);

  // 检查是否有连接的MCP服务器
  const hasConnectedServers = Object.values(status || {}).some(serverStatus => 
    serverStatus?.connected
  );

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
    // Preset node position at the center of canvas with some randomization
    const baseX = 250;
    const baseY = 150;
    const randomOffset = () => (Math.random() - 0.5) * 100;
    
    const position = { 
      x: baseX + randomOffset(), 
      y: baseY + randomOffset() 
    };
    
    addNode({ ...nodeData, position });
    setAddNodeModalVisible(false);
  };

  // 关闭节点属性模态框
  const handleCloseNodeProperties = () => {
    selectNode(null);
  };

  // 渲染连接状态警告
  const renderConnectionWarning = () => {
    if (hasConnectedServers || !currentGraph) return null;

    return (
      <Alert
        message="MCP服务器连接"
        description="当前没有连接的MCP服务器。某些节点功能可能无法正常工作。"
        type="warning"
        showIcon
        className="mb-4"
        action={
          <Button size="small" type="text">
            检查连接
          </Button>
        }
      />
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          className="mb-4"
          closable
        />
      )}

      {renderConnectionWarning()}

      <GraphControls onAddNode={() => setAddNodeModalVisible(true)} />

      <Spin spinning={loading} tip="加载中..." delay={300}>
        {!currentGraph ? (
          <Card className="text-center p-8" style={{ height: '85vh' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无图配置"
            >
              <Space direction="vertical">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setAddNodeModalVisible(true)}
                >
                  创建新图
                </Button>
                <Text type="secondary">
                  您也可以使用AI生成功能或导入现有图配置
                </Text>
              </Space>
            </Empty>
          </Card>
        ) : (
          <Card
            bodyStyle={{ padding: 0 }}
            className="overflow-hidden"
            style={{ height: '85vh' }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>图画布 - {currentGraph.name}</span>
                {currentGraph.description && (
                  <Tooltip title={currentGraph.description}>
                    <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                  </Tooltip>
                )}
              </div>
            }
          >
            <ReactFlowProvider>
              <GraphCanvas />
            </ReactFlowProvider>
          </Card>
        )}
      </Spin>

      {/* 节点属性模态框 */}
      <Modal
        title="节点属性设置"
        open={!!selectedNode}
        onCancel={handleCloseNodeProperties}
        footer={null}
        width={1000}
        style={{ top: 20 }}
        bodyStyle={{ 
          height: '80vh', 
          overflow: 'auto',
          padding: '0'
        }}
        destroyOnClose={true}
      >
        <NodePropertiesPanel />
      </Modal>

      <AddNodeModal
        visible={addNodeModalVisible}
        onClose={() => setAddNodeModalVisible(false)}
        onAdd={handleAddNode}
      />

      {/* 全局键盘事件处理 */}
      <div
        style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0 }}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Delete' && selectedNode) {
            // 这里可以触发删除选中节点的操作
            console.log('Delete key pressed for node:', selectedNode);
          } else if (e.key === 'Escape') {
            // 取消选择或关闭模态框
            if (selectedNode) {
              selectNode(null);
            }
          }
        }}
      />
    </div>
  );
};

export default GraphEditor;