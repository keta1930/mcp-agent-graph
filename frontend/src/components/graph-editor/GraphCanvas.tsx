// src/components/graph-editor/GraphCanvas.tsx
import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useGraphEditorStore } from '../../store/graphEditorStore';
import AgentNodeComponent from './AgentNodeComponent';

// Register custom node types
const nodeTypes: NodeTypes = {
  agent: AgentNodeComponent,
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
    (changes) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      setEdges(updatedEdges);

      // Handle edge deletion
      changes.forEach(change => {
        if (change.type === 'remove' && change.id) {
          // Extract source and target node IDs from edge ID
          const edgeToRemove = edges.find(edge => edge.id === change.id);
          if (edgeToRemove && edgeToRemove.source && edgeToRemove.target) {
            removeConnection(edgeToRemove.source, edgeToRemove.target);
          }
        }
      });
    },
    [edges, removeConnection]
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