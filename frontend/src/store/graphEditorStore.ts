// src/store/graphEditorStore.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import * as graphService from '../services/graphService';
import { AgentNode, BackendGraphConfig, NodePosition } from '../types/graph';

interface GraphConfig {
  name: string;
  description: string;
  nodes: AgentNode[];
  end_template?: string;
}

interface GraphEditorState {
  graphs: string[];
  currentGraph: GraphConfig | null;
  originalGraph: GraphConfig | null;
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

  // 图属性操作
  updateGraphProperties: (updates: Partial<GraphConfig>) => void;

  // 节点操作
  addNode: (node: Partial<AgentNode>) => void;
  updateNode: (id: string, updates: Partial<AgentNode>) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  updateNodePosition: (id: string, position: NodePosition) => void;

  // 连接操作 - 更新为基于节点数据的连接管理
  addConnection: (source: string, target: string) => void;
  removeConnection: (source: string, target: string) => void;

  // 新增：导入导出功能
  importGraph: (filePath: string) => Promise<any>;
  importGraphFromFile: (file: File) => Promise<any>;
  exportGraph: (graphName: string) => Promise<any>;
  importGraphPackage: (filePath: string) => Promise<any>;
  importGraphPackageFromFile: (file: File) => Promise<any>;

  // 新增：AI生成功能
  generateGraph: (requirement: string, modelName: string) => Promise<any>;

  // 新增：README功能
  getGraphReadme: (graphName: string) => Promise<any>;

  // MCP导出
  generateMCPScript: (graphName: string) => Promise<any>;
}

// 创建默认节点
const createDefaultNode = (nodeData: Partial<AgentNode>): AgentNode => {
  return {
    id: uuidv4(),
    name: nodeData.name || `Node ${Date.now()}`,
    description: nodeData.description || "",
    is_subgraph: nodeData.is_subgraph || false,
    model_name: nodeData.model_name || "",
    subgraph_name: nodeData.subgraph_name || "",
    mcp_servers: nodeData.mcp_servers || [],
    system_prompt: nodeData.system_prompt || "",
    user_prompt: nodeData.user_prompt || "",
    input_nodes: nodeData.input_nodes || [],
    output_nodes: nodeData.output_nodes || [],
    handoffs: nodeData.handoffs,
    global_output: nodeData.global_output || false,
    context: nodeData.context || [],
    context_mode: nodeData.context_mode || 'all',
    context_n: nodeData.context_n || 1,
    output_enabled: nodeData.output_enabled ?? true,
    position: nodeData.position || { x: 100, y: 100 },
    level: nodeData.level,
    save: nodeData.save,
    ...nodeData
  };
};

// 转换为后端格式
const convertToBackendFormat = (graph: GraphConfig): BackendGraphConfig => {
  return {
    name: graph.name,
    description: graph.description || "",
    end_template: graph.end_template,
    nodes: graph.nodes.map(node => {
      const result: any = {
        name: node.name,
        description: node.description || "",
        is_subgraph: node.is_subgraph,
        mcp_servers: node.mcp_servers || [],
        system_prompt: node.system_prompt || "",
        user_prompt: node.user_prompt || "",
        input_nodes: node.input_nodes || [],
        output_nodes: node.output_nodes || [],
        handoffs: node.handoffs,
        global_output: node.global_output || false,
        context: node.context || [],
        context_mode: node.context_mode || 'all',
        context_n: node.context_n || 1,
        output_enabled: node.output_enabled ?? true,
        position: node.position || { x: 100, y: 100 },
        level: node.level,
        save: node.save
      };

      // 根据节点类型添加特定字段
      if (node.is_subgraph) {
        result.subgraph_name = node.subgraph_name || "";
      } else {
        result.model_name = node.model_name || "";
      }

      return result;
    })
  };
};

// 从后端格式转换，添加前端需要的字段
const convertFromBackendFormat = (backendGraph: any): GraphConfig => {
  return {
    ...backendGraph,
    nodes: backendGraph.nodes.map((node: any) => ({
      ...node,
      id: uuidv4(), // 添加前端ID
      description: node.description || "",
      global_output: node.global_output || false,
      context: node.context || [],
      context_mode: node.context_mode || 'all',
      context_n: node.context_n || 1,
      position: node.position || { x: 100, y: 100 },
      input_nodes: node.input_nodes || [],
      output_nodes: node.output_nodes || [],
    }))
  };
};

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
      nodes: [],
      end_template: ""
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
      const backendGraph = await graphService.getGraph(name);
      const graph = convertFromBackendFormat(backendGraph);

      set({
        currentGraph: graph,
        originalGraph: graph,
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
      const backendGraph = convertToBackendFormat(currentGraph);
      await graphService.createGraph(backendGraph);

      set({
        loading: false,
        dirty: false,
        originalGraph: JSON.parse(JSON.stringify(currentGraph))
      });
      await get().fetchGraphs();
    } catch (error) {
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

  updateGraphProperties: (updates) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    set({
      currentGraph: { ...currentGraph, ...updates },
      dirty: true
    });
  },

  addNode: (nodeData) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const newNode = createDefaultNode(nodeData);

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
      return { ...node, ...updates };
    });

    set({
      currentGraph: { ...currentGraph, nodes: updatedNodes },
      dirty: true
    });
  },

  removeNode: (id) => {
    const { currentGraph, selectedNode } = get();
    if (!currentGraph) return;

    const nodeToRemove = currentGraph.nodes.find(node => node.id === id);
    if (!nodeToRemove) return;

    // 移除节点
    const filteredNodes = currentGraph.nodes.filter(node => node.id !== id);

    // 从其他节点的输入/输出和context列表中移除引用
    const updatedNodes = filteredNodes.map(node => {
      const updatedNode = { ...node };

      // 移除输入引用
      if (updatedNode.input_nodes?.includes(nodeToRemove.name)) {
        updatedNode.input_nodes = updatedNode.input_nodes.filter(n => n !== nodeToRemove.name);
      }

      // 移除输出引用
      if (updatedNode.output_nodes?.includes(nodeToRemove.name)) {
        updatedNode.output_nodes = updatedNode.output_nodes.filter(n => n !== nodeToRemove.name);
      }

      // 移除context引用
      if (updatedNode.context?.includes(nodeToRemove.name)) {
        updatedNode.context = updatedNode.context.filter(n => n !== nodeToRemove.name);
      }

      return updatedNode;
    });

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

  // 更新连接管理逻辑 - 基于节点名称而非ID
  addConnection: (sourceId, targetId) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const sourceNode = currentGraph.nodes.find(node => node.id === sourceId);
    const targetNode = currentGraph.nodes.find(node => node.id === targetId);

    if (!sourceNode || !targetNode) return;

    const updatedNodes = currentGraph.nodes.map(node => {
      if (node.id === sourceId) {
        // 添加到源节点的output_nodes
        if (!node.output_nodes.includes(targetNode.name)) {
          return {
            ...node,
            output_nodes: [...node.output_nodes, targetNode.name]
          };
        }
      } else if (node.id === targetId) {
        // 添加到目标节点的input_nodes
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

  removeConnection: (sourceId, targetId) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const sourceNode = currentGraph.nodes.find(node => node.id === sourceId);
    const targetNode = currentGraph.nodes.find(node => node.id === targetId);

    if (!sourceNode || !targetNode) return;

    const updatedNodes = currentGraph.nodes.map(node => {
      if (node.id === sourceId) {
        // 从源节点的output_nodes中移除
        return {
          ...node,
          output_nodes: node.output_nodes.filter(name => name !== targetNode.name)
        };
      } else if (node.id === targetId) {
        // 从目标节点的input_nodes中移除
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

  // 新增功能实现
  importGraph: async (filePath) => {
    try {
      set({ loading: true, error: undefined });
      const result = await graphService.importGraph(filePath);
      set({ loading: false });
      await get().fetchGraphs();
      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Import failed'
      });
      throw error;
    }
  },

  importGraphFromFile: async (file) => {
    try {
      set({ loading: true, error: undefined });
      const result = await graphService.importGraphFromFile(file);
      set({ loading: false });
      await get().fetchGraphs();
      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Import from file failed'
      });
      throw error;
    }
  },

  exportGraph: async (graphName) => {
    try {
      set({ loading: true, error: undefined });
      const result = await graphService.exportGraph(graphName);
      set({ loading: false });
      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Export failed'
      });
      throw error;
    }
  },

  importGraphPackage: async (filePath) => {
    try {
      set({ loading: true, error: undefined });
      const result = await graphService.importGraphPackage(filePath);
      set({ loading: false });
      await get().fetchGraphs();
      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Import package failed'
      });
      throw error;
    }
  },

  importGraphPackageFromFile: async (file) => {
    try {
      set({ loading: true, error: undefined });
      const result = await graphService.importGraphPackageFromFile(file);
      set({ loading: false });
      await get().fetchGraphs();
      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Import package from file failed'
      });
      throw error;
    }
  },

  generateGraph: async (requirement, modelName) => {
    try {
      set({ loading: true, error: undefined });
      const result = await graphService.generateGraph(requirement, modelName);
      set({ loading: false });
      await get().fetchGraphs();
      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Graph generation failed'
      });
      throw error;
    }
  },

  getGraphReadme: async (graphName) => {
    try {
      set({ loading: true, error: undefined });
      const result = await graphService.getGraphReadme(graphName);
      set({ loading: false });
      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load README'
      });
      throw error;
    }
  },

  generateMCPScript: async (graphName) => {
    try {
      set({ loading: true, error: undefined });

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