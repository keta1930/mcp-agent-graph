// src/services/graphService.ts
import api from './api';
import { BackendGraphConfig, GraphCardResponse, MCPScriptResponse } from '../types/graph';

// Clean special characters, comments, etc. from JSON
function sanitizeForJson(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (typeof obj === 'string') {
    // Remove comment-like content and control characters
    return obj
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* ... */ comments
      .replace(/\/\/.*/g, '')           // Remove // ... comments
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters, but keep \n (\x0A) and \r (\x0D)
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForJson(item));
  }

  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = sanitizeForJson(obj[key]);
    }
  }
  return result;
}

// Get all graphs list
export const getGraphs = async (): Promise<string[]> => {
  const response = await api.get('/graphs');
  return response.data;
};

// Get a specific graph
export const getGraph = async (graphName: string): Promise<any> => {
  const response = await api.get(`/graphs/${graphName}`);
  return response.data;
};

// Create or update a graph
export const createGraph = async (graph: BackendGraphConfig): Promise<any> => {
  // Ensure request body format is correct and clean special characters
  const cleanedGraph = sanitizeForJson(graph);

  // 确保没有空引用
  cleanedGraph.nodes.forEach(node => {
    // 确保所有数组属性有效
    if (!Array.isArray(node.input_nodes)) node.input_nodes = [];
    if (!Array.isArray(node.output_nodes)) node.output_nodes = [];
    if (!Array.isArray(node.mcp_servers)) node.mcp_servers = [];

    // 过滤掉引用不存在的节点
    const allNodeNames = cleanedGraph.nodes.map(n => n.name);
    node.input_nodes = node.input_nodes.filter(
      input => input === "start" || allNodeNames.includes(input)
    );
    node.output_nodes = node.output_nodes.filter(
      output => output === "end" || allNodeNames.includes(output)
    );
  });

  const requestBody = {
    name: cleanedGraph.name,
    description: cleanedGraph.description || "",
    nodes: cleanedGraph.nodes.map(node => {
      // Create a new object according to backend expectations, rather than modifying existing object
      const result = {
        name: node.name,
        is_subgraph: Boolean(node.is_subgraph),
        mcp_servers: Array.isArray(node.mcp_servers) ? node.mcp_servers : [],
        system_prompt: typeof node.system_prompt === 'string' ? node.system_prompt : "",
        user_prompt: typeof node.user_prompt === 'string' ? node.user_prompt : "",
        input_nodes: Array.isArray(node.input_nodes) ? node.input_nodes : [],
        output_nodes: Array.isArray(node.output_nodes) ? node.output_nodes : [],
        output_enabled: node.output_enabled !== undefined ? Boolean(node.output_enabled) : true,
        is_start: Boolean(node.is_start),
        is_end: Boolean(node.is_end),
        position: node.position || { x: 0, y: 0 }
      };

      // Add specific fields based on node type
      if (node.is_subgraph) {
        result.subgraph_name = node.subgraph_name || "";
        result.model_name = ""; // Empty string instead of undefined
      } else {
        result.model_name = node.model_name || "";
        result.subgraph_name = null; // null instead of undefined
      }

      return result;
    })
  };

  try {
    // Ensure no undefined or special characters exist in the output
    const cleanJson = JSON.stringify(requestBody);
    const finalBody = JSON.parse(cleanJson);

    console.log('Data structure submitted to API:', finalBody);

    const response = await api.post('/graphs', finalBody);
    return response.data;
  } catch (error) {
    console.error('Error submitting to API:', error);
    console.log('Submitted data:', JSON.stringify(requestBody, null, 2));
    throw error;
  }
};

// Delete a graph
export const deleteGraph = async (graphName: string): Promise<any> => {
  const response = await api.delete(`/graphs/${graphName}`);
  return response.data;
};

// Rename a graph
export const renameGraph = async (oldName: string, newName: string): Promise<any> => {
  const response = await api.put(`/graphs/${oldName}/rename/${newName}`);
  return response.data;
};

// Execute a graph
export const executeGraph = async (input: {
  graph_name: string;
  input_text: string;
  conversation_id?: string;
  parallel?: boolean;
}): Promise<any> => {
  const response = await api.post('/graphs/execute', input);
  return response.data;
};


// Get a conversation
export const getConversation = async (conversationId: string): Promise<any> => {
  const response = await api.get(`/conversations/${conversationId}`);
  return response.data;
};

// Delete a conversation
export const deleteConversation = async (conversationId: string): Promise<any> => {
  const response = await api.delete(`/conversations/${conversationId}`);
  return response.data;
};

// Get conversation hierarchy
export const getConversationHierarchy = async (conversationId: string): Promise<any> => {
  const response = await api.get(`/conversations/${conversationId}/hierarchy`);
  return response.data;
};

// Get graph card
export const getGraphCard = async (graphName: string): Promise<GraphCardResponse> => {
  const response = await api.get(`/graphs/${graphName}/card`);
  return response.data;
};

// Generate MCP script
export const generateMCPScript = async (graphName: string): Promise<MCPScriptResponse> => {
  const response = await api.get(`/graphs/${graphName}/generate_mcp`);
  return response.data;
};