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
  useReactFlow,
  EdgeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
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

const edgeTypes: EdgeTypes = {
  button:  ButtonEdge,
}

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
        global_output: node.global_output || false,
        context: node.context || [],
        context_mode: node.context_mode || 'all',
        context_n: node.context_n || 1,
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

    currentGraph.nodes.forEach(targetNode => {
      // 为每个input_node创建到当前节点的边
      targetNode.input_nodes?.forEach(inputNodeName => {
        if (inputNodeName === "start") return; // Skip start connections

        const sourceNode = nodeMap.get(inputNodeName);
        if (sourceNode && sourceNode.id && targetNode.id) {
          newEdges.push({
            id: `e-${sourceNode.id}-${targetNode.id}`,
            type: 'button',
            source: sourceNode.id,
            target: targetNode.id,
            style: getEdgeStyle(sourceNode, targetNode),
            animated: shouldAnimateEdge(sourceNode, targetNode),
          });
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

    // 如果目标节点是全局输出节点，使用紫色
    if (targetNode.global_output) {
      style.stroke = '#722ed1';
      style.strokeWidth = 3;
    }

    // 如果源节点有循环，使用虚线
    if (sourceNode.handoffs && sourceNode.handoffs > 1) {
      style.strokeDasharray = '5,5';
    }

    return style;
  };

  // 确定是否需要动画
  const shouldAnimateEdge = (sourceNode: any, targetNode: any) => {
    // 如果有执行层级或循环，显示动画
    return (sourceNode.level !== undefined && sourceNode.level !== null) || 
           (sourceNode.handoffs && sourceNode.handoffs > 1) ||
           targetNode.global_output;
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
              if (edge.source && edge.target) {
                removeConnection(edge.source, edge.target);
              }
            });
          } else if (change.type === 'remove') {
            // Handle remove type changes
            const edgeToRemove = edges.find(edge => edge.id === change.id);
            if (edgeToRemove?.source && edgeToRemove?.target) {
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
    if (nodeData.global_output) return '#722ed1';
    if (nodeData.input_nodes?.includes('start')) return '#52c41a';
    if (nodeData.output_nodes?.includes('end')) return '#f5222d';
    
    return '#d9d9d9';
  };

  return (
    <div style={{ width: '100%', height: '70vh' }}>
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
      >
        <Controls />
        <MiniMap 
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          pannable
          zoomable
          style={{
            backgroundColor: '#f5f5f5',
          }}
        />
        <Background 
          gap={16} 
          size={1} 
          color="#e1e1e1"
          variant="dots" as any
        />
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
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        
        .edge-button:hover {
          opacity: 1;
          background: #ff7875;
        }
        
        .react-flow__node-agent {
          background: transparent;
          border: none;
        }
        
        .react-flow__handle {
          border: 2px solid #fff;
          box-shadow: 0 0 4px rgba(0,0,0,0.3);
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
      `}</style>
    </div>
  );
};

export default GraphCanvas;