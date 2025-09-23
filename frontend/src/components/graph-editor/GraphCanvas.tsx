// src/components/graph-editor/GraphCanvas.tsx
import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  useReactFlow,
  EdgeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button, Tooltip } from 'antd';
import { 
  BgColorsOutlined, 
  BorderOutlined, 
  DashOutlined,
  EyeInvisibleOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import AgentNodeComponent from './AgentNodeComponent';

// Register custom node types
const nodeTypes: NodeTypes = {
  agent: AgentNodeComponent,
};

/**
 * 自定义边组件，带有删除按钮
 */
const ButtonEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    setEdges((edges) => {
        return edges.filter((edge) => edge.id !== id)
    });
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style}></BaseEdge>
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button className="edge-button" onClick={onEdgeClick}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

/**
 * 弧线边组件，用于handoffs连接
 */
const ArcEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const { setEdges } = useReactFlow();

  // 创建弧线路径
  const createArcPath = () => {
    const midX = (sourceX + targetX) / 2;
    const midY = Math.min(sourceY, targetY) - 60; // 弧线高度控制
    
    return `M ${sourceX} ${sourceY} Q ${midX} ${midY} ${targetX} ${targetY}`;
  };

  const onEdgeClick = () => {
    setEdges((edges) => {
        return edges.filter((edge) => edge.id !== id)
    });
  }

  const arcPath = createArcPath();
  const labelX = (sourceX + targetX) / 2;
  const labelY = Math.min(sourceY, targetY) - 30;

  return (
    <>
      <path
        d={arcPath}
        style={style}
        markerEnd={markerEnd}
        fill="none"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button 
            className="edge-button arc-edge-button" 
            onClick={onEdgeClick}
            style={{
              backgroundColor: '#fa8c16',
              border: '2px solid white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(250, 140, 22, 0.4)'
            }}
          >
            ×
          </button>
          {/* 显示handoffs标识 */}
          {data?.handoffs && (
            <div
              style={{
                position: 'absolute',
                top: '-25px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#fa8c16',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                whiteSpace: 'nowrap'
              }}
            >
              ↻ {data.handoffs}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const edgeTypes: EdgeTypes = {
  button: ButtonEdge,
  arc: ArcEdge,
}

// 背景类型定义
type BackgroundType = 'none' | 'dots' | 'lines' | 'grid' | 'cross';

// 背景配置 - 在白色背景下清晰显示的颜色
const backgroundConfigs = {
  none: null,
  dots: {
    variant: 'dots' as const,
    gap: 20,
    size: 2,
    color: '#d1d5db', // 浅灰色点，在白色背景下清晰可见
  },
  lines: {
    variant: 'lines' as const,
    gap: 24,
    size: 1,
    color: '#e5e7eb', // 浅灰色线条
  },
  grid: {
    variant: 'lines' as const,
    gap: 16,
    size: 1,
    color: '#d1d5db', // 浅灰色网格
  },
  cross: {
    variant: 'cross' as const,
    gap: 32,
    size: 2,
    color: '#9ca3af', // 稍深的灰色交叉
  },
};

const GraphCanvas: React.FC = () => {
  const {
    currentGraph,
    selectedNode,
    selectNode,
    updateNodePosition,
    addConnection,
    removeConnection
  } = useGraphEditorStore();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('dots');

  // 获取背景图标
  const getBackgroundIcon = (type: BackgroundType) => {
    switch (type) {
      case 'none': return <EyeInvisibleOutlined />;
      case 'dots': return <AppstoreOutlined />;
      case 'lines': return <DashOutlined />;
      case 'grid': return <BorderOutlined />;
      case 'cross': return <BgColorsOutlined />;
      default: return <AppstoreOutlined />;
    }
  };

  const getBackgroundLabel = (type: BackgroundType) => {
    switch (type) {
      case 'none': return '无背景';
      case 'dots': return '点状';
      case 'lines': return '线性';
      case 'grid': return '网格';
      case 'cross': return '交叉';
      default: return '点状';
    }
  };

  // 渲染背景组件
  const renderBackground = () => {
    const config = backgroundConfigs[backgroundType];
    if (!config) return null;
    
    return (
      <Background
        gap={config.gap}
        size={config.size}
        color={config.color}
        variant={config.variant as any}
      />
    );
  };

  // 渲染背景控制面板
  const renderBackgroundControls = () => {
    const backgroundTypes: BackgroundType[] = ['none', 'dots', 'lines', 'grid', 'cross'];
    
    return (
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(229, 231, 235, 0.8)',
        display: 'flex',
        gap: '4px',
        alignItems: 'center'
      }}>
        <span style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginRight: '8px',
          fontWeight: '500'
        }}>
          背景:
        </span>
        {backgroundTypes.map(type => (
          <Tooltip key={type} title={getBackgroundLabel(type)}>
            <Button
              type={backgroundType === type ? 'primary' : 'text'}
              size="small"
              icon={getBackgroundIcon(type)}
              onClick={() => setBackgroundType(type)}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                ...(backgroundType === type ? {
                  background: '#1677ff',
                  borderColor: '#1677ff',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(22, 119, 255, 0.3)'
                } : {
                  background: 'transparent',
                  borderColor: 'transparent',
                  color: '#666'
                })
              }}
            />
          </Tooltip>
        ))}
      </div>
    );
  };

  // Update nodes and edges when the graph changes
  useEffect(() => {
    if (!currentGraph) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Transform nodes
    const flowNodes = currentGraph.nodes.map(node => ({
      id: node.id!,
      type: 'agent',
      position: node.position || { x: 100, y: 100 },
      data: {
        id: node.id!,
        name: node.name,
        description: node.description || "",
        is_subgraph: node.is_subgraph,
        input_nodes: node.input_nodes || [],
        output_nodes: node.output_nodes || [],
        model_name: node.model_name,
        subgraph_name: node.subgraph_name,
        mcp_servers: node.mcp_servers || [],
        handoffs: node.handoffs,
        level: node.level,
        save: node.save,
        selected: selectedNode === node.id,
        onClick: () => selectNode(node.id!)
      },
    }));

    setNodes(flowNodes);

    // Generate edges based on input_nodes and output_nodes
    const newEdges: Edge[] = [];
    const nodeMap = new Map(currentGraph.nodes.map(n => [n.name, n]));
    const handoffConnections = new Set<string>(); // 记录哪些连接应该用弧线表示

    // 首先收集所有handoffs连接信息
    currentGraph.nodes.forEach(sourceNode => {
      if (sourceNode.handoffs) {
        sourceNode.output_nodes?.forEach(outputNodeName => {
          if (outputNodeName === "end") return;
          const outputNode = nodeMap.get(outputNodeName);
          if (outputNode) {
            // 判断是否是向上游的连接（需要用弧线）
            const isUpstream = (outputNode.level !== undefined && 
                              sourceNode.level !== undefined && 
                              outputNode.level <= sourceNode.level) ||
                             // 如果没有level信息，默认认为是向上游的循环
                             (outputNode.level === undefined || sourceNode.level === undefined);
            
            if (isUpstream) {
              handoffConnections.add(`${sourceNode.name}->${outputNodeName}`);
              
              // 创建弧线连接
              newEdges.push({
                id: `arc-${sourceNode.id}-${outputNode.id}`,
                type: 'arc',
                source: sourceNode.id,
                target: outputNode.id,
                sourceHandle: 'handoff-source',
                targetHandle: 'handoff-target',
                style: {
                  stroke: '#fa8c16',
                  strokeWidth: 3,
                  strokeDasharray: '8,4',
                },
                animated: true,
                data: {
                  handoffs: sourceNode.handoffs,
                  isHandoffEdge: true
                }
              });
            }
          }
        });
      }
    });

    // 然后生成常规连接（排除已经用弧线表示的handoffs连接）
    currentGraph.nodes.forEach(targetNode => {
      targetNode.input_nodes?.forEach(inputNodeName => {
        if (inputNodeName === "start") return; // Skip start connections

        const sourceNode = nodeMap.get(inputNodeName);
        if (sourceNode && sourceNode.id && targetNode.id) {
          // 检查这个连接是否应该用弧线表示
          const connectionKey = `${inputNodeName}->${targetNode.name}`;
          if (!handoffConnections.has(connectionKey)) {
            // 只有不是handoffs弧线连接的才创建常规连接
            newEdges.push({
              id: `e-${sourceNode.id}-${targetNode.id}`,
              type: 'button',
              source: sourceNode.id,
              target: targetNode.id,
              sourceHandle: 'output',
              targetHandle: 'input',
              style: getEdgeStyle(sourceNode, targetNode),
              animated: shouldAnimateEdge(sourceNode, targetNode),
            });
          }
        }
      });
    });

    setEdges(newEdges);
  }, [currentGraph, selectedNode, selectNode]);

  // 根据节点属性确定边的样式
  const getEdgeStyle = (sourceNode: any, targetNode: any) => {
    let style: any = { 
      stroke: '#555', 
      strokeWidth: 2 
    };

    // 如果源节点有执行层级，使用不同颜色
    if (sourceNode.level !== undefined && sourceNode.level !== null) {
      const levelColors = ['#ff4d4f', '#fa8c16', '#fadb14', '#a0d911', '#52c41a'];
      const colorIndex = Math.min(sourceNode.level, levelColors.length - 1);
      style.stroke = levelColors[colorIndex];
    }

    // Note: global_output feature has been removed

    return style;
  };

  // 确定是否需要动画
  const shouldAnimateEdge = (sourceNode: any, targetNode: any) => {
    // 如果有执行层级，显示动画
    return (sourceNode.level !== undefined && sourceNode.level !== null);
  };

  // Handle node changes
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);

      // Handle position updates
      changes.forEach(change => {
        if (change.type === 'position' && change.position && change.id) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [nodes, updateNodePosition]
  );

  // Handle edge changes
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: any[]) => {
      setEdges((edges) => {
        const newEdges = applyEdgeChanges(changes, edges);

        // Handle edge changes
        changes.forEach(change => {
          if (change.type === 'reset') {
            // Handle reset type changes
            // Find edges that are in the current set but not in the new set
            const edgesToRemove = edges.filter(edge => !newEdges.some(newEdge => newEdge.id === edge.id));
            edgesToRemove.forEach(edge => {
              if (edge.source && edge.target && !edge.data?.isHandoffEdge) {
                removeConnection(edge.source, edge.target);
              }
            });
          } else if (change.type === 'remove') {
            // Handle remove type changes
            const edgeToRemove = edges.find(edge => edge.id === change.id);
            if (edgeToRemove?.source && edgeToRemove?.target && !edgeToRemove.data?.isHandoffEdge) {
              removeConnection(edgeToRemove.source, edgeToRemove.target);
            }
          }
        });

        return newEdges;
      });
    },
    [removeConnection]
  );

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        // 只处理常规连接，不处理handoffs连接
        if (connection.sourceHandle === 'output' && connection.targetHandle === 'input') {
          // Create connection relationship
          addConnection(connection.source, connection.target);

          // Add new edge to display
          const newEdge: Edge = {
            id: `e-${connection.source}-${connection.target}`,
            type: 'button',
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
            style: { stroke: '#555', strokeWidth: 2 }
          };

          setEdges(eds => [...eds, newEdge]);
        }
      }
    },
    [addConnection]
  );

  // Click background to deselect
  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // 自定义MiniMap节点颜色
  const nodeColor = (node: Node) => {
    const nodeData = node.data;
    
    if (nodeData.selected) return '#1677ff';
    if (nodeData.is_subgraph) return '#1677ff';
    if (nodeData.handoffs && nodeData.handoffs > 1) return '#fa8c16';
    if (nodeData.input_nodes?.includes('start')) return '#52c41a';
    if (nodeData.output_nodes?.includes('end')) return '#f5222d';
    
    return '#d9d9d9';
  };

  return (
    <div style={{ width: '100%', height: '72vh', position: 'relative' }}>
      {/* 纯白色背景 */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#ffffff', // 纯白色背景
          zIndex: 0,
        }}
      />

      {/* 背景控制面板 */}
      {renderBackgroundControls()}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        connectionLineType={ConnectionLineType.Straight}
        defaultEdgeOptions={{
          type: 'button',
          style: { stroke: '#555', strokeWidth: 2 }
        }}
        // 启用选择模式
        selectNodesOnDrag={false}
        // 自定义连接线样式
        connectionLineStyle={{ stroke: '#1677ff', strokeWidth: 2 }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <Controls 
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(229, 231, 235, 0.8)',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          }}
        />
        <MiniMap 
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          pannable
          zoomable
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(229, 231, 235, 0.8)',
            borderRadius: '8px',
          }}
        />
        {renderBackground()}
      </ReactFlow>

      {/* 添加自定义样式 */}
      <style jsx>{`
        .edge-button {
          width: 20px;
          height: 20px;
          background: #ff4d4f;
          border: none;
          color: white;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          display: 'flex';
          align-items: center;
          justify-content: center;
          opacity: 0.8;
          transition: opacity 0.2s, transform 0.2s;
          box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
        }
        
        .edge-button:hover {
          opacity: 1;
          background: #ff7875;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4);
        }

        .arc-edge-button:hover {
          background: #ffa940 !important;
          box-shadow: 0 4px 12px rgba(250, 140, 22, 0.6) !important;
        }
        
        .react-flow__node-agent {
          background: transparent;
          border: none;
        }
        
        .react-flow__handle {
          border: 2px solid #fff;
          box-shadow: 0 0 8px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        
        .react-flow__handle:hover {
          box-shadow: 0 0 12px rgba(22, 119, 255, 0.4);
          border-color: #1677ff;
        }
        
        .react-flow__handle-top,
        .react-flow__handle-bottom {
          left: 50%;
          transform: translateX(-50%);
        }
        
        .react-flow__handle-left,
        .react-flow__handle-right {
          top: 50%;
          transform: translateY(-50%);
        }

        .react-flow__controls-button {
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }

        .react-flow__controls-button:hover {
          background: rgba(22, 119, 255, 0.1);
          color: #1677ff;
        }

        .react-flow__controls-button:last-child {
          border-bottom: none;
        }

        .react-flow__minimap {
          border-radius: 8px !important;
          overflow: hidden;
        }

        .react-flow__background {
          opacity: 0.8;
        }

        /* 弧线边的特殊样式 */
        .react-flow__edge.react-flow__edge-arc path {
          stroke-dasharray: 8,4;
          animation: dash 2s linear infinite;
        }

        @keyframes dash {
          to {
            stroke-dashoffset: -24;
          }
        }
      `}</style>
    </div>
  );
};

export default GraphCanvas;