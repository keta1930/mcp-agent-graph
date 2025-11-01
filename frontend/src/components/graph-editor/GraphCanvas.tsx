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
   * 根据源节点的执行层级确定边的颜色
   */
  const getEdgeStyle = (sourceNode: any, _targetNode: any) => {
    let style: any = { 
      stroke: '#555', 
      strokeWidth: 2
    };

    if (sourceNode.level !== undefined && sourceNode.level !== null) {
      const levelColors = ['#ff4d4f', '#fa8c16', '#fadb14', '#a0d911', '#52c41a'];
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
          style: { stroke: '#555', strokeWidth: 2 }
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
    
    if (nodeData.selected) return '#1677ff';
    if (nodeData.is_subgraph) return '#1677ff';
    if (nodeData.handoffs && nodeData.handoffs > 1) return '#fa8c16';
    if (nodeData.input_nodes?.includes('start')) return '#52c41a';
    if (nodeData.output_nodes?.includes('end')) return '#f5222d';
    
    return '#d9d9d9';
  };

  return (
    <div style={{ width: '100%', height: '72vh', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#ffffff',
          zIndex: 0,
        }}
      />

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
          style: { stroke: '#555', strokeWidth: 2 }
        }}
        selectNodesOnDrag={false}
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
        {renderBackground(backgroundType)}
      </ReactFlow>

      <style>{`
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