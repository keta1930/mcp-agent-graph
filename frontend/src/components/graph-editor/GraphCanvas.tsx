// src/components/graph-editor/GraphCanvas.tsx
import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import AgentNodeComponent from './AgentNodeComponent';
import ButtonEdge from './edges/ButtonEdge';
import ArcEdge from './edges/ArcEdge';
import BackgroundControls, { renderBackground, BackgroundType } from './canvas/BackgroundControls';

const nodeTypes: NodeTypes = {
  agent: AgentNodeComponent,
};

const edgeTypes: EdgeTypes = {
  button: ButtonEdge,  // 标准连接边
  arc: ArcEdge,        // handoffs 循环连接边
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

  /**
   * 当图数据变化时，将图模型转换为 ReactFlow 的节点和边
   *
   * 转换逻辑包括：
   * 1. 将图节点转换为 ReactFlow 节点，附加必要的数据和回调
   * 2. 根据 handoffs 属性区分连接类型，向上游连接使用弧线边
   * 3. 常规连接使用标准边，排除已经用弧线表示的连接
   */
  useEffect(() => {
    if (!currentGraph) {
      setNodes([]);
      setEdges([]);
      return;
    }

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
        agent_name: node.agent_name,
        subgraph_name: node.subgraph_name,
        mcp_servers: node.mcp_servers || [],
        system_tools: node.system_tools || [],
        handoffs: node.handoffs,
        level: node.level,
        selected: false,
        onClick: () => selectNode(node.id!)
      },
    }));

    setNodes(flowNodes);

    const newEdges: Edge[] = [];
    const nodeMap = new Map(currentGraph.nodes.map(n => [n.name, n]));
    const handoffConnections = new Set<string>();

    // 收集所有 handoffs 连接并创建弧线边
    currentGraph.nodes.forEach(sourceNode => {
      if (sourceNode.handoffs) {
        sourceNode.output_nodes?.forEach(outputNodeName => {
          if (outputNodeName === "end") return;
          const outputNode = nodeMap.get(outputNodeName);
          if (outputNode && sourceNode.id && outputNode.id) {
            const isUpstream = (outputNode.level !== undefined &&
                              sourceNode.level !== undefined &&
                              outputNode.level <= sourceNode.level) ||
                             (outputNode.level === undefined || sourceNode.level === undefined);

            if (isUpstream) {
              handoffConnections.add(`${sourceNode.name}->${outputNodeName}`);

              newEdges.push({
                id: `arc-${sourceNode.id}-${outputNode.id}`,
                type: 'arc',
                source: sourceNode.id as string,
                target: outputNode.id as string,
                sourceHandle: 'handoff-source',
                targetHandle: 'handoff-target',
                style: {
                  stroke: '#d4a574',
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
        if (inputNodeName === "start") return;

        const sourceNode = nodeMap.get(inputNodeName);
        if (sourceNode && sourceNode.id && targetNode.id) {
          const connectionKey = `${inputNodeName}->${targetNode.name}`;
          if (!handoffConnections.has(connectionKey)) {
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

  /**
   * 根据源节点的执行层级确定边的颜色 - 使用大地色系
   */
  const getEdgeStyle = (sourceNode: any, _targetNode: any) => {
    let style: any = { 
      stroke: '#8b7355', 
      strokeWidth: 2
    };

    if (sourceNode.level !== undefined && sourceNode.level !== null) {
      const levelColors = ['#b85845', '#cd7f32', '#d4a574', '#a0826d', '#8b7355'];
      const colorIndex = Math.min(sourceNode.level, levelColors.length - 1);
      style.stroke = levelColors[colorIndex];
    }

    return style;
  };

  const shouldAnimateEdge = (sourceNode: any, _targetNode: any) => {
    return (sourceNode.level !== undefined && sourceNode.level !== null);
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);

      changes.forEach(change => {
        if (change.type === 'position' && change.position && change.id) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [nodes, updateNodePosition]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: any[]) => {
      setEdges((edges) => {
        const newEdges = applyEdgeChanges(changes, edges);

        changes.forEach(change => {
          if (change.type === 'reset') {
            const edgesToRemove = edges.filter(edge => !newEdges.some(newEdge => newEdge.id === edge.id));
            edgesToRemove.forEach(edge => {
              if (edge.source && edge.target && !edge.data?.isHandoffEdge) {
                removeConnection(edge.source, edge.target);
              }
            });
          } else if (change.type === 'remove') {
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

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target &&
          connection.sourceHandle === 'output' &&
          connection.targetHandle === 'input') {
        addConnection(connection.source, connection.target);

        const newEdge: Edge = {
          id: `e-${connection.source}-${connection.target}`,
          type: 'button',
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          style: { stroke: '#8b7355', strokeWidth: 2 }
        };

        setEdges(eds => [...eds, newEdge]);
      }
    },
    [addConnection]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const nodeColor = (node: Node) => {
    const nodeData = node.data;
    
    if (nodeData.selected) return '#b85845';
    if (nodeData.is_subgraph) return '#cd7f32';
    if (nodeData.handoffs && nodeData.handoffs > 1) return '#d4a574';
    if (nodeData.input_nodes?.includes('start')) return '#a0826d';
    if (nodeData.output_nodes?.includes('end')) return '#b85845';
    
    return '#d4c4b0';
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      position: 'relative',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid rgba(139, 115, 85, 0.15)',
      boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
    }}>
      {/* 画布背景 - 纸张质感 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, #faf8f5 0%, #f5f3f0 100%)',
          zIndex: 0,
        }}
      />

      {/* 顶部装饰性渐变线 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '15%',
        right: '15%',
        height: '1px',
        background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.2) 50%, transparent)',
        zIndex: 2
      }} />

      <BackgroundControls
        backgroundType={backgroundType}
        onBackgroundTypeChange={setBackgroundType}
      />

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
          style: { stroke: '#8b7355', strokeWidth: 2 }
        }}
        selectNodesOnDrag={false}
        connectionLineStyle={{ stroke: '#b85845', strokeWidth: 2 }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <Controls 
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(250, 248, 245, 0.85))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
            padding: '4px'
          }}
        />
        <MiniMap 
          nodeColor={nodeColor}
          nodeStrokeWidth={2}
          pannable
          zoomable
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(250, 248, 245, 0.85))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            borderRadius: '6px',
            boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          }}
          maskColor="rgba(250, 248, 245, 0.6)"
        />
        {renderBackground(backgroundType)}
      </ReactFlow>

      <style>{`
        /* 边删除按钮 - 陶土质感 */
        .edge-button {
          width: 22px;
          height: 22px;
          background: linear-gradient(135deg, #b85845 0%, #a0826d 100%);
          border: 1px solid rgba(139, 115, 85, 0.2);
          color: #faf8f5;
          border-radius: 50%;
          cursor: pointer;
          font-size: 11px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.95;
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
          box-shadow: 0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(4px);
        }
        
        .edge-button:hover {
          opacity: 1;
          transform: translateY(-1px) scale(1.1);
          box-shadow: 0 4px 12px rgba(184, 88, 69, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          border-color: rgba(184, 88, 69, 0.3);
        }

        .arc-edge-button {
          background: linear-gradient(135deg, #d4a574 0%, #cd7f32 100%) !important;
        }

        .arc-edge-button:hover {
          box-shadow: 0 4px 12px rgba(212, 165, 116, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
        }
        
        /* Agent 节点容器 */
        .react-flow__node-agent {
          background: transparent;
          border: none;
          filter: drop-shadow(0 1px 3px rgba(139, 115, 85, 0.08));
        }
        
        /* 连接点 - 纸张质感 */
        .react-flow__handle {
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%);
          border: 2px solid rgba(139, 115, 85, 0.3);
          box-shadow: 0 1px 3px rgba(139, 115, 85, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8);
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
          backdrop-filter: blur(4px);
        }
        
        .react-flow__handle:hover {
          background: linear-gradient(135deg, rgba(250, 248, 245, 1) 0%, rgba(245, 243, 240, 0.95) 100%);
          border-color: #b85845;
          border-width: 2.5px;
          box-shadow: 0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9);
          transform: scale(1.3);
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

        .react-flow__handle-top:hover,
        .react-flow__handle-bottom:hover {
          transform: translateX(-50%) scale(1.3);
        }

        .react-flow__handle-left:hover,
        .react-flow__handle-right:hover {
          transform: translateY(-50%) scale(1.3);
        }

        /* 控制面板 */
        .react-flow__controls {
          box-shadow: 0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
          border-radius: 6px !important;
        }

        .react-flow__controls-button {
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(139, 115, 85, 0.08);
          color: #8b7355;
          transition: all 0.2s ease;
          width: 32px;
          height: 32px;
          padding: 0;
        }

        .react-flow__controls-button:hover {
          background: rgba(184, 88, 69, 0.08);
          color: #b85845;
        }

        .react-flow__controls-button:last-child {
          border-bottom: none;
        }

        .react-flow__controls-button svg {
          width: 16px;
          height: 16px;
        }

        /* 小地图 - 纸张质感 */
        .react-flow__minimap {
          border-radius: 6px !important;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
        }

        .react-flow__minimap-mask {
          fill: rgba(139, 115, 85, 0.06);
          stroke: rgba(139, 115, 85, 0.15);
          stroke-width: 1;
        }

        .react-flow__minimap-node {
          stroke: rgba(139, 115, 85, 0.25);
          stroke-width: 1.5;
        }

        /* 背景网格 - 更柔和 */
        .react-flow__background {
          opacity: 0.5;
        }

        /* 边的样式 - 自然流畅 */
        .react-flow__edge path {
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .react-flow__edge.selected path {
          stroke: #b85845 !important;
          stroke-width: 2.5 !important;
          filter: drop-shadow(0 1px 3px rgba(184, 88, 69, 0.3));
        }

        .react-flow__edge.react-flow__edge-arc path {
          stroke-dasharray: 8,4;
          animation: dash 2s linear infinite;
        }

        @keyframes dash {
          to {
            stroke-dashoffset: -24;
          }
        }

        /* 连接线预览 */
        .react-flow__connectionline {
          stroke: #b85845;
          stroke-width: 2;
          stroke-dasharray: 5,5;
          animation: dash 1s linear infinite;
        }

        /* 选择框 */
        .react-flow__selection {
          background: rgba(184, 88, 69, 0.08);
          border: 1px solid rgba(184, 88, 69, 0.3);
        }

        /* 版权信息 */
        .react-flow__attribution {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 248, 245, 0.85) 100%);
          color: rgba(139, 115, 85, 0.65);
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid rgba(139, 115, 85, 0.1);
          box-shadow: 0 1px 2px rgba(139, 115, 85, 0.06);
          backdrop-filter: blur(8px);
        }

        /* 画布整体 - 纸张纹理感 */
        .react-flow__pane {
          cursor: grab;
        }

        .react-flow__pane:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );
};

export default GraphCanvas;