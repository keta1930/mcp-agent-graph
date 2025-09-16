// src/services/graphService.ts
import api from './api';
import { 
  BackendGraphConfig, 
  GraphCardResponse, 
  MCPScriptResponse,
  ImportResult,
  ExportResult,
  GraphReadmeResponse,
  PromptTemplateResponse
} from '../types/graph';

// Clean special characters, comments, etc. from JSON
function sanitizeForJson(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (typeof obj === 'string') {
    return obj
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')           
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForJson(item));
  }

  const result: any = {};
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
  const cleanedGraph = sanitizeForJson(graph);

  cleanedGraph.nodes.forEach((node: any) => {
    if (!Array.isArray(node.input_nodes)) node.input_nodes = [];
    if (!Array.isArray(node.output_nodes)) node.output_nodes = [];
    if (!Array.isArray(node.mcp_servers)) node.mcp_servers = [];
    if (!Array.isArray(node.context)) node.context = [];

    const allNodeNames = cleanedGraph.nodes.map((n: any) => n.name);
    node.input_nodes = node.input_nodes.filter(
      (input: string) => input === "start" || allNodeNames.includes(input)
    );
    node.output_nodes = node.output_nodes.filter(
      (output: string) => output === "end" || allNodeNames.includes(output)
    );
    node.context = node.context.filter(
      (contextNode: string) => allNodeNames.includes(contextNode)
    );
  });

  const requestBody = {
    name: cleanedGraph.name,
    description: cleanedGraph.description || "",
    end_template: cleanedGraph.end_template || "",
    nodes: cleanedGraph.nodes.map((node: any) => {
      const result: any = {
        name: node.name,
        description: node.description || "",
        is_subgraph: Boolean(node.is_subgraph),
        mcp_servers: Array.isArray(node.mcp_servers) ? node.mcp_servers : [],
        system_prompt: typeof node.system_prompt === 'string' ? node.system_prompt : "",
        user_prompt: typeof node.user_prompt === 'string' ? node.user_prompt : "",
        input_nodes: Array.isArray(node.input_nodes) ? node.input_nodes : [],
        output_nodes: Array.isArray(node.output_nodes) ? node.output_nodes : [],
        handoffs: node.handoffs || null,
        global_output: Boolean(node.global_output),
        context: Array.isArray(node.context) ? node.context : [],
        context_mode: node.context_mode || 'all',
        context_n: typeof node.context_n === 'number' ? node.context_n : 1,
        output_enabled: node.output_enabled !== undefined ? Boolean(node.output_enabled) : true,
        position: node.position || { x: 0, y: 0 },
        level: node.level || null,
        save: node.save || null
      };

      if (node.is_subgraph) {
        result.subgraph_name = node.subgraph_name || "";
        result.model_name = "";
      } else {
        result.model_name = node.model_name || "";
        result.subgraph_name = null;
      }

      return result;
    })
  };

  try {
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

// ======= 导入导出功能 =======

// Import graph from JSON file (by file path)
export const importGraph = async (filePath: string): Promise<ImportResult> => {
  const response = await api.post('/graphs/import', { file_path: filePath });
  return response.data;
};

// Import graph from uploaded JSON file
export const importGraphFromFile = async (file: File): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/graphs/import_from_file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Export graph to ZIP package
export const exportGraph = async (graphName: string): Promise<ExportResult> => {
  const response = await api.get(`/graphs/${graphName}/export`);
  return response.data;
};

// Import graph package from ZIP (by file path)
export const importGraphPackage = async (filePath: string): Promise<ImportResult> => {
  const response = await api.post('/graphs/import_package', { file_path: filePath });
  return response.data;
};

// Import graph package from uploaded ZIP file
export const importGraphPackageFromFile = async (file: File): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/graphs/import_package_from_file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// ======= AI提示词模板功能 =======

// Get prompt template for graph generation
export const getPromptTemplate = async (request?: { mcp_servers?: string[], graph_name?: string }): Promise<PromptTemplateResponse> => {
  const response = await api.post('/prompt-template', {
    mcp_servers: request?.mcp_servers || [],
    graph_name: request?.graph_name
  });
  return response.data;
};


// ======= README功能 =======

// Get graph README
export const getGraphReadme = async (graphName: string): Promise<GraphReadmeResponse> => {
  const response = await api.get(`/graphs/${graphName}/readme`);
  return response.data;
};
