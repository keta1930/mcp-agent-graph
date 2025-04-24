// src/types/graph.ts
export interface Position {
  x: number;
  y: number;
}

// 前端使用的节点类型（包含id）
export interface AgentNode {
  id: string;
  name: string;
  is_subgraph: boolean;
  model_name?: string;
  mcp_servers: string[];
  system_prompt: string;
  user_prompt: string;
  input_nodes: string[];
  output_nodes: string[];
  output_enabled: boolean;
  is_start: boolean;
  is_end: boolean;
  subgraph_name?: string;
  position: Position;
}

// 后端期望的节点类型（不含id）
export interface BackendAgentNode {
  name: string;
  is_subgraph: boolean;
  model_name?: string;
  mcp_servers: string[];
  system_prompt: string;
  user_prompt: string;
  input_nodes: string[];
  output_nodes: string[];
  output_enabled: boolean;
  is_start: boolean;
  is_end: boolean;
  subgraph_name?: string;
  position?: Position;
}

export interface NodeConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// 前端使用的图配置
export interface GraphConfig {
  name: string;
  description: string;
  nodes: AgentNode[];
  connections?: NodeConnection[];
}

// 后端期望的图配置
export interface BackendGraphConfig {
  name: string;
  description: string;
  nodes: BackendAgentNode[];
}

export interface NodeResult {
  node_name: string;
  input: string;
  output: string;
  tool_calls: any[];
  tool_results: any[];
  is_subgraph?: boolean;
  subgraph_name?: string;
  subgraph_conversation_id?: string;
  subgraph_results?: any[];
  error?: string;
  is_start_input?: boolean;
}

export interface GraphResult {
  graph_name: string;
  conversation_id: string;
  input: string;
  output: string;
  node_results: NodeResult[];
  completed: boolean;
  error?: string;
}

export interface GraphInput {
  graph_name: string;
  input_text: string;
  conversation_id?: string;
}

export interface GraphCardResponse {
  graph_name: string;
  description: string;
  input_format: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  output_format: {
    type: string;
    properties: Record<string, any>;
  };
  api_endpoint: string;
  method: string;
}

export interface MCPScriptResponse {
  graph_name: string;
  script: string;
}