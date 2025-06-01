// src/pages/GraphEditor.tsx
import React, { useEffect, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { Row, Col, Card, Alert, Spin, Typography, Empty, Button, Tooltip, Tag, Space } from 'antd';
import { 
  PlusOutlined, InfoCircleOutlined, WarningOutlined, 
  RobotOutlined, GlobalOutlined, BranchesOutlined 
} from '@ant-design/icons';
import GraphCanvas from '../components/graph-editor/GraphCanvas';
import NodePropertiesPanel from '../components/graph-editor/NodePropertiesPanel';
import GraphControls from '../components/graph-editor/GraphControls';
import AddNodeModal from '../components/graph-editor/AddNodeModal';
import { useGraphEditorStore } from '../store/graphEditorStore';
import { useMCPStore } from '../store/mcpStore';

const { Title, Text } = Typography;

const GraphEditor: React.FC = () => {
  const { 
    fetchGraphs, 
    addNode, 
    loading, 
    error, 
    currentGraph,
    selectedNode 
  } = useGraphEditorStore();
  const { fetchConfig, fetchStatus, config, status } = useMCPStore();
  const [addNodeModalVisible, setAddNodeModalVisible] = useState(false);

  // 检查是否有连接的MCP服务器
  const hasConnectedServers = Object.values(status || {}).some(serverStatus => 
    serverStatus?.connected
  );

  // 获取图的统计信息
  const getGraphStats = () => {
    if (!currentGraph) return null;

    const nodes = currentGraph.nodes || [];
    const totalNodes = nodes.length;
    const agentNodes = nodes.filter(n => !n.is_subgraph).length;
    const subgraphNodes = nodes.filter(n => n.is_subgraph).length;
    const globalOutputNodes = nodes.filter(n => n.global_output).length;
    const leveledNodes = nodes.filter(n => n.level !== undefined && n.level !== null).length;
    const contextNodes = nodes.filter(n => n.context && n.context.length > 0).length;
    const startNodes = nodes.filter(n => n.input_nodes?.includes('start')).length;
    const endNodes = nodes.filter(n => n.output_nodes?.includes('end')).length;

    return {
      totalNodes,
      agentNodes,
      subgraphNodes,
      globalOutputNodes,
      leveledNodes,
      contextNodes,
      startNodes,
      endNodes
    };
  };

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

  // 渲染图统计信息
  const renderGraphStats = () => {
    const stats = getGraphStats();
    if (!stats) return null;

    return (
      <Card 
        size="small" 
        title="图统计" 
        style={{ marginBottom: '16px' }}
        bodyStyle={{ padding: '12px' }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">总节点数</Text>
            <Tag color="blue">{stats.totalNodes}</Tag>
          </div>
          
          {stats.agentNodes > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <RobotOutlined style={{ marginRight: '4px', color: '#52c41a' }} />
                <Text type="secondary">智能体节点</Text>
              </span>
              <Tag color="green">{stats.agentNodes}</Tag>
            </div>
          )}
          
          {stats.subgraphNodes > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <BranchesOutlined style={{ marginRight: '4px', color: '#1677ff' }} />
                <Text type="secondary">子图节点</Text>
              </span>
              <Tag color="blue">{stats.subgraphNodes}</Tag>
            </div>
          )}
          
          {stats.startNodes > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">起始节点</Text>
              <Tag color="green">{stats.startNodes}</Tag>
            </div>
          )}
          
          {stats.endNodes > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">结束节点</Text>
              <Tag color="red">{stats.endNodes}</Tag>
            </div>
          )}
          
          {stats.globalOutputNodes > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <GlobalOutlined style={{ marginRight: '4px', color: '#722ed1' }} />
                <Text type="secondary">全局输出</Text>
              </span>
              <Tag color="purple">{stats.globalOutputNodes}</Tag>
            </div>
          )}
          
          {stats.leveledNodes > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">分层节点</Text>
              <Tag color="orange">{stats.leveledNodes}</Tag>
            </div>
          )}
          
          {stats.contextNodes > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary">引用节点</Text>
              <Tag color="magenta">{stats.contextNodes}</Tag>
            </div>
          )}
        </Space>
      </Card>
    );
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

  // 渲染选中节点信息
  const renderSelectedNodeInfo = () => {
    if (!selectedNode || !currentGraph) return null;

    const node = currentGraph.nodes.find(n => n.id === selectedNode);
    if (!node) return null;

    return (
      <Card 
        size="small" 
        title="选中节点" 
        style={{ marginBottom: '16px' }}
        bodyStyle={{ padding: '12px' }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {node.is_subgraph ? (
              <BranchesOutlined style={{ color: '#1677ff' }} />
            ) : (
              <RobotOutlined style={{ color: '#52c41a' }} />
            )}
            <Text strong>{node.name}</Text>
          </div>
          
          {node.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {node.description}
            </Text>
          )}
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {node.input_nodes?.includes('start') && <Tag color="green" size="small">起始</Tag>}
            {node.output_nodes?.includes('end') && <Tag color="red" size="small">结束</Tag>}
            {node.global_output && <Tag color="purple" size="small">全局</Tag>}
            {node.level !== undefined && node.level !== null && (
              <Tag color="orange" size="small">L{node.level}</Tag>
            )}
            {node.handoffs && node.handoffs > 1 && (
              <Tag color="cyan" size="small">循环×{node.handoffs}</Tag>
            )}
            {node.save && <Tag color="green" size="small">{node.save}</Tag>}
          </div>
          
          {/* 连接信息 */}
          {(node.input_nodes?.length > 0 || node.output_nodes?.length > 0) && (
            <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
              {node.input_nodes?.length > 0 && (
                <div>输入: {node.input_nodes.join(', ')}</div>
              )}
              {node.output_nodes?.length > 0 && (
                <div>输出: {node.output_nodes.join(', ')}</div>
              )}
            </div>
          )}
        </Space>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Title level={2} className="m-0">图编辑器</Title>
        
        {/* 显示版本和功能提示 */}
        <Space>
          <Tooltip title="支持AI生成、导入导出、节点连接、全局输出、执行层级等功能">
            <InfoCircleOutlined style={{ color: '#1677ff' }} />
          </Tooltip>
        </Space>
      </div>

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
          <Card className="text-center p-8">
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
          <Row gutter={16} className="mt-4">
            <Col span={18}>
              <Card
                bodyStyle={{ padding: 0 }}
                className="overflow-hidden"
                style={{ height: '77vh' }}
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
            </Col>
            <Col span={6}>
              <div style={{ display: 'flex', flexDirection: 'column', height: '75vh' }}>
                {renderGraphStats()}
                {renderSelectedNodeInfo()}
                <div style={{ flex: 1 }}>
                  <NodePropertiesPanel />
                </div>
              </div>
            </Col>
          </Row>
        )}
      </Spin>

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
            // 取消选择
            if (selectedNode) {
              console.log('Escape pressed, deselecting node');
            }
          }
        }}
      />
    </div>
  );
};

export default GraphEditor;