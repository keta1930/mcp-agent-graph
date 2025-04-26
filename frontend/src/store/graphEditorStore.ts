// src/store/graphEditorStore.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import * as graphService from '../services/graphService';

// 直接使用后端期望的数据格式，只在内部添加id用于前端标识
interface Position {
  x: number;
  y: number;
}

interface AgentNode {
  id: string; // 仅前端使用，不发送给后端
  name: string;
  is_subgraph: boolean;
  model_name?: string;
  mcp_servers: string[];
  system_prompt: string;
  user_prompt: string;
  input_nodes: string[]; // 存储节点名称
  output_nodes: string[]; // 存储节点名称
  output_enabled: boolean;
  is_start: boolean;
  is_end: boolean;
  subgraph_name?: string;
  position: Position;
}

interface GraphConfig {
  name: string;
  description: string;
  nodes: AgentNode[];
}

interface GraphEditorState {
  graphs: string[];
  currentGraph: GraphConfig | null;
  originalGraph: GraphConfig | null; // 存储原始图结构，用于UI显示
  loading: boolean;
  error?: string;
  selectedNode: string | null;
  dirty: boolean;

  // 图列表操作
  fetchGraphs: () => Promise<void>;
  createNewGraph: (name: string, description: string) => void;
  loadGraph: (name: string) => Promise<void>;
  saveGraph: () => Promise<void>;
  deleteGraph: (name: string) => Promise<void>;
  renameGraph: (oldName: string, newName: string) => Promise<void>;

  // 节点操作
  addNode: (node: Partial<AgentNode>) => void;
  updateNode: (id: string, updates: Partial<AgentNode>) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  updateNodePosition: (id: string, position: Position) => void;

  // 连接操作
  addConnection: (source: string, target: string) => void;
  removeConnection: (source: string, target: string) => void;

  // MCP导出
  generateMCPScript: (graphName: string) => Promise<any>;
}

// 重构子图的辅助函数
function restructureSubgraphs(graph: GraphConfig): GraphConfig {
  if (!graph || !graph.nodes) return graph;

  const processedGraph = {...graph};
  const nodesByPrefix = {};
  const nodeConnections = {};

  // 1. 识别所有可能的子图前缀并收集连接信息
  processedGraph.nodes.forEach(node => {
    // 收集所有节点的输入输出连接
    nodeConnections[node.name] = {
      inputs: node.input_nodes || [],
      outputs: node.output_nodes || []
    };

    if (node.name.includes('.')) {
      const prefix = node.name.split('.')[0];
      if (!nodesByPrefix[prefix]) {
        nodesByPrefix[prefix] = [];
      }
      nodesByPrefix[prefix].push(node);
    }
  });

  // 2. 对每个前缀，检查是否代表一个子图
  Object.keys(nodesByPrefix).forEach(prefix => {
    const nodes = nodesByPrefix[prefix];
    if (nodes.length > 0 && nodes[0]._subgraph_name) {
      const subgraphName = nodes[0]._subgraph_name;

      // 找出子图的起始和结束节点
      const startNodes = nodes.filter(node =>
        node.is_start || node.input_nodes.includes("start")
      );

      const endNodes = nodes.filter(node =>
        node.is_end || node.output_nodes.includes("end")
      );

      // 收集子图的外部连接
      const externalInputs = new Set<string>();
      const externalOutputs = new Set<string>();

      // 找出子图的输入输出连接
      processedGraph.nodes.forEach(node => {
        // 如果节点不是子图的一部分
        if (!node.name.startsWith(prefix + '.')) {
          // 查找输出到子图的连接
          (node.output_nodes || []).forEach(output => {
            if (output.startsWith(prefix + '.')) {
              externalInputs.add(node.name);
            }
          });

          // 查找来自子图的输入
          (node.input_nodes || []).forEach(input => {
            if (input.startsWith(prefix + '.')) {
              externalOutputs.add(node.name);
            }
          });
        }
      });

      // 3. 创建替代子图的单个节点
      const position = startNodes.length > 0 ?
        startNodes[0].position :
        (nodes[0].position || { x: 100, y: 100 });

      const subgraphNode = {
        id: uuidv4(),
        name: prefix,
        is_subgraph: true,
        subgraph_name: subgraphName,
        mcp_servers: [],
        system_prompt: "",
        user_prompt: "",
        input_nodes: Array.from(externalInputs),
        output_nodes: Array.from(externalOutputs),
        output_enabled: true,
        is_start: startNodes.some(n => n.is_start),
        is_end: endNodes.some(n => n.is_end),
        position: position
      };

      // 为子图节点添加"start"或"end"连接
      if (subgraphNode.is_start && !subgraphNode.input_nodes.includes("start")) {
        subgraphNode.input_nodes.push("start");
      }
      if (subgraphNode.is_end && !subgraphNode.output_nodes.includes("end")) {
        subgraphNode.output_nodes.push("end");
      }

      // 4. 更新节点列表
      processedGraph.nodes = processedGraph.nodes.filter(
        node => !node.name.startsWith(prefix + '.')
      );
      processedGraph.nodes.push(subgraphNode);

      // 5. 更新其他节点的连接引用
      processedGraph.nodes.forEach(node => {
        if (node.name !== prefix) {
          // 更新输入引用
          node.input_nodes = (node.input_nodes || []).map(input => {
            return input.startsWith(prefix + '.') ? prefix : input;
          });

          // 更新输出引用
          node.output_nodes = (node.output_nodes || []).map(output => {
            return output.startsWith(prefix + '.') ? prefix : output;
          });
        }
      });
    }
  });

  return processedGraph;
}

export const useGraphEditorStore = create<GraphEditorState>((set, get) => ({
  graphs: [],
  currentGraph: null,
  originalGraph: null,
  loading: false,
  selectedNode: null,
  dirty: false,

  fetchGraphs: async () => {
    try {
      set({ loading: true, error: undefined });
      const graphs = await graphService.getGraphs();
      set({ graphs, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch graphs'
      });
    }
  },

  createNewGraph: (name, description) => {
    const newGraph: GraphConfig = {
      name,
      description,
      nodes: []
    };
    set({
      currentGraph: newGraph,
      originalGraph: newGraph,
      selectedNode: null,
      dirty: true
    });
  },

  loadGraph: async (name) => {
    try {
      set({ loading: true, error: undefined });
      const graph = await graphService.getGraph(name);

      // 添加id用于前端识别
      const graphWithIds = {
        ...graph,
        nodes: graph.nodes.map(node => ({
          ...node,
          id: uuidv4(), // 添加唯一ID用于前端
          position: node.position || { x: 100, y: 100 }
        }))
      };

      // 重构子图以便于UI显示
      const restructuredGraph = restructureSubgraphs(graphWithIds);

      set({
        currentGraph: restructuredGraph,
        originalGraph: restructuredGraph,
        loading: false,
        selectedNode: null,
        dirty: false
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : `Failed to load graph ${name}`
      });
    }
  },

  saveGraph: async () => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    try {
      set({ loading: true, error: undefined });

      // 保存原始图结构
      const originalGraph = JSON.parse(JSON.stringify(currentGraph));

      // 构建符合后端格式的简单对象
      const backendGraph = {
        name: currentGraph.name,
        description: currentGraph.description || "",
        nodes: currentGraph.nodes.map(node => {
          const result = {
            name: node.name,
            is_subgraph: node.is_subgraph,
            mcp_servers: [],
            system_prompt: "",
            user_prompt: "",
            input_nodes: [],
            output_nodes: [],
            output_enabled: true,
            is_start: node.is_start,
            is_end: node.is_end,
            position: node.position
          };

          // 填充数组和文本
          if (node.mcp_servers && Array.isArray(node.mcp_servers)) result.mcp_servers = node.mcp_servers;
          if (node.input_nodes && Array.isArray(node.input_nodes)) result.input_nodes = node.input_nodes;
          if (node.output_nodes && Array.isArray(node.output_nodes)) result.output_nodes = node.output_nodes;
          if (typeof node.system_prompt === 'string') result.system_prompt = node.system_prompt;
          if (typeof node.user_prompt === 'string') result.user_prompt = node.user_prompt;
          if (node.output_enabled !== undefined) result.output_enabled = node.output_enabled;

          // 根据节点类型添加特定字段
          if (node.is_subgraph) {
            result.subgraph_name = node.subgraph_name || "";
          } else {
            result.model_name = node.model_name || "";
          }

          return result;
        })
      };

      console.log('保存图数据:', JSON.stringify(backendGraph, null, 2));
      await graphService.createGraph(backendGraph);

      set({
        loading: false,
        dirty: false,
        originalGraph: originalGraph
      });
      await get().fetchGraphs();
    } catch (error) {
      console.error('保存图时出错:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : '保存图失败'
      });
    }
  },

  deleteGraph: async (name) => {
    try {
      set({ loading: true, error: undefined });
      await graphService.deleteGraph(name);
      set({ loading: false });

      // 刷新图列表并清除当前图（如果被删除）
      await get().fetchGraphs();
      const { currentGraph } = get();
      if (currentGraph && currentGraph.name === name) {
        set({ currentGraph: null, originalGraph: null });
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : `Failed to delete graph ${name}`
      });
    }
  },

  renameGraph: async (oldName, newName) => {
    try {
      set({ loading: true, error: undefined });
      await graphService.renameGraph(oldName, newName);

      // 更新当前图（如果是被重命名的图）
      const { currentGraph } = get();
      if (currentGraph && currentGraph.name === oldName) {
        set({
          currentGraph: { ...currentGraph, name: newName },
          originalGraph: { ...currentGraph, name: newName }
        });
      }

      set({ loading: false });
      await get().fetchGraphs();
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : `Failed to rename graph`
      });
    }
  },

  addNode: (nodeData) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const newNode: AgentNode = {
      id: uuidv4(),
      name: nodeData.name || `Node ${currentGraph.nodes.length + 1}`,
      is_subgraph: nodeData.is_subgraph || false,
      mcp_servers: nodeData.mcp_servers || [],
      system_prompt: nodeData.system_prompt || "",
      user_prompt: nodeData.user_prompt || "",
      input_nodes: nodeData.input_nodes || [],
      output_nodes: nodeData.output_nodes || [],
      output_enabled: nodeData.output_enabled ?? true,
      is_start: nodeData.is_start || false,
      is_end: nodeData.is_end || false,
      position: nodeData.position || { x: 100, y: 100 },
    };

    if (nodeData.is_subgraph) {
      newNode.subgraph_name = nodeData.subgraph_name || "";
    } else {
      newNode.model_name = nodeData.model_name || "";
    }

    // 更新起始和结束信息
    if (newNode.is_start && !newNode.input_nodes.includes("start")) {
      newNode.input_nodes.push("start");
    }
    if (newNode.is_end && !newNode.output_nodes.includes("end")) {
      newNode.output_nodes.push("end");
    }

    set({
      currentGraph: {
        ...currentGraph,
        nodes: [...currentGraph.nodes, newNode]
      },
      dirty: true
    });
  },

  updateNode: (id, updates) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const updatedNodes = currentGraph.nodes.map(node => {
      if (node.id !== id) return node;

      const updatedNode = { ...node, ...updates };

      // 更新起始和结束信息
      if (updatedNode.is_start && !updatedNode.input_nodes.includes("start")) {
        updatedNode.input_nodes = [...updatedNode.input_nodes, "start"];
      } else if (!updatedNode.is_start && updatedNode.input_nodes.includes("start")) {
        updatedNode.input_nodes = updatedNode.input_nodes.filter(n => n !== "start");
      }

      if (updatedNode.is_end && !updatedNode.output_nodes.includes("end")) {
        updatedNode.output_nodes = [...updatedNode.output_nodes, "end"];
      } else if (!updatedNode.is_end && updatedNode.output_nodes.includes("end")) {
        updatedNode.output_nodes = updatedNode.output_nodes.filter(n => n !== "end");
      }

      return updatedNode;
    });

    set({
      currentGraph: { ...currentGraph, nodes: updatedNodes },
      dirty: true
    });
  },

  removeNode: (id) => {
    const { currentGraph, selectedNode } = get();
    if (!currentGraph) return;

    // 找到要删除的节点
    const nodeToRemove = currentGraph.nodes.find(node => node.id === id);
    if (!nodeToRemove) return;

    console.log(`准备删除节点: ${nodeToRemove.name}`, nodeToRemove);

    // 移除节点
    const filteredNodes = currentGraph.nodes.filter(node => node.id !== id);

    // 从其他节点的输入/输出列表中移除引用
    const updatedNodes = filteredNodes.map(node => {
      const updatedNode = {...node};

      // 移除输入引用
      if (updatedNode.input_nodes && updatedNode.input_nodes.includes(nodeToRemove.name)) {
        updatedNode.input_nodes = updatedNode.input_nodes.filter(n => n !== nodeToRemove.name);
        console.log(`从节点 ${updatedNode.name} 的输入中移除了 ${nodeToRemove.name}`);
      }

      // 移除输出引用
      if (updatedNode.output_nodes && updatedNode.output_nodes.includes(nodeToRemove.name)) {
        updatedNode.output_nodes = updatedNode.output_nodes.filter(n => n !== nodeToRemove.name);
        console.log(`从节点 ${updatedNode.name} 的输出中移除了 ${nodeToRemove.name}`);
      }

      return updatedNode;
    });

    // 确保图还有起始和结束节点
    const hasStart = updatedNodes.some(node =>
      node.is_start || (node.input_nodes && node.input_nodes.includes("start"))
    );

    const hasEnd = updatedNodes.some(node =>
      node.is_end || (node.output_nodes && node.output_nodes.includes("end"))
    );

    console.log(`移除节点后: 起始节点存在: ${hasStart}, 结束节点存在: ${hasEnd}`);
    console.log('更新后的节点:', updatedNodes.map(n => n.name));

    // 如果选中的节点被移除，则清除选择
    if (selectedNode === id) {
      set({ selectedNode: null });
    }

    set({
      currentGraph: {
        ...currentGraph,
        nodes: updatedNodes
      },
      dirty: true
    });
  },

  selectNode: (id) => {
    set({ selectedNode: id });
  },

  updateNodePosition: (id, position) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const updatedNodes = currentGraph.nodes.map(node =>
      node.id === id ? { ...node, position } : node
    );

    set({
      currentGraph: { ...currentGraph, nodes: updatedNodes },
      dirty: true
    });
  },

  // 添加连接 - 基于节点名称
  addConnection: (sourceId, targetId) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    // 找到源节点和目标节点
    const sourceNode = currentGraph.nodes.find(node => node.id === sourceId);
    const targetNode = currentGraph.nodes.find(node => node.id === targetId);

    if (!sourceNode || !targetNode) return;

    // 更新节点的输入/输出列表
    const updatedNodes = currentGraph.nodes.map(node => {
      if (node.id === sourceId) {
        // 如果输出列表中不包含目标节点名称，则添加
        if (!node.output_nodes.includes(targetNode.name)) {
          return {
            ...node,
            output_nodes: [...node.output_nodes, targetNode.name]
          };
        }
      } else if (node.id === targetId) {
        // 如果输入列表中不包含源节点名称，则添加
        if (!node.input_nodes.includes(sourceNode.name)) {
          return {
            ...node,
            input_nodes: [...node.input_nodes, sourceNode.name]
          };
        }
      }
      return node;
    });

    set({
      currentGraph: {
        ...currentGraph,
        nodes: updatedNodes
      },
      dirty: true
    });
  },

  // 移除连接 - 基于节点名称
  removeConnection: (sourceId, targetId) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    // 找到源节点和目标节点
    const sourceNode = currentGraph.nodes.find(node => node.id === sourceId);
    const targetNode = currentGraph.nodes.find(node => node.id === targetId);

    if (!sourceNode || !targetNode) return;

    console.log(`移除连接: ${sourceNode.name} -> ${targetNode.name}`);

    // 更新节点的输入/输出列表
    const updatedNodes = currentGraph.nodes.map(node => {
      if (node.id === sourceId) {
        // 从输出列表中移除目标节点名称
        return {
          ...node,
          output_nodes: node.output_nodes.filter(name => name !== targetNode.name)
        };
      } else if (node.id === targetId) {
        // 从输入列表中移除源节点名称
        return {
          ...node,
          input_nodes: node.input_nodes.filter(name => name !== sourceNode.name)
        };
      }
      return node;
    });

    set({
      currentGraph: {
        ...currentGraph,
        nodes: updatedNodes
      },
      dirty: true
    });
  },

  generateMCPScript: async (graphName) => {
    try {
      set({ loading: true, error: undefined });

      // 保存当前图 - 确保最新的图已经保存
      const { currentGraph, dirty } = get();
      if (currentGraph && currentGraph.name === graphName && dirty) {
        await get().saveGraph();
      }

      const response = await graphService.generateMCPScript(graphName);
      set({ loading: false });
      return response;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : `Failed to generate MCP script for ${graphName}`
      });
      throw error;
    }
  }
}));