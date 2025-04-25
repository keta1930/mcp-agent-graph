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
 * @param {ButtonEdgeProps} props - 边属性
 * @returns {JSX.Element} 渲染的边组件
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
  
  /**
   * 删除指定ID的边
   * @function onEdgeClick
   * @returns {void}
   */
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
            // EdgeLabelRenderer 内部的元素默认没有 pointer-events
            // 如果你有交互元素，设置 pointer-events: all
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
      id: node.id,
      type: 'agent',
      position: node.position,
      data: {
        ...node,
        selected: selectedNode === node.id,
        onClick: () => selectNode(node.id)
      },
    }));

    setNodes(flowNodes);

    // Generate edges - based on nodes' input_nodes and output_nodes
    const newEdges: Edge[] = [];

    // Create edges for each node
    currentGraph.nodes.forEach(sourceNode => {
      // Create an edge for each output node
      sourceNode.output_nodes.forEach(targetNodeName => {
        if (targetNodeName === "end") return; // Skip special marker

        // Find target node ID
        const targetNode = currentGraph.nodes.find(n => n.name === targetNodeName);
        if (targetNode) {
          newEdges.push({
            id: `e-${sourceNode.id}-${targetNode.id}`,
            type: 'button',
            source: sourceNode.id,
            target: targetNode.id,
          });
        }
      });
    });

    setEdges(newEdges);
  }, [currentGraph, selectedNode, selectNode]);

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
          targetHandle: connection.targetHandle
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
          type: 'default',
          style: { stroke: '#555', strokeWidth: 2 }
        }}
      >
        <Controls />
        <MiniMap />
        <Background gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default GraphCanvas;
