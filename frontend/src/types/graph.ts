// src/types/graph.ts
export interface NodePosition {
  x: number;
  y: number;
}

export interface AgentNode {
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
  position?: NodePosition;
  level?: number; // 添加层级字段
}

export interface BackendGraphConfig {
  name: string;
  description: string;
  nodes: AgentNode[];
}

export interface GraphInput {
  graph_name: string;
  input_text: string;
  conversation_id?: string;
  parallel?: boolean; // 添加并行执行选项
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
  level?: number;
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

export interface GraphCardResponse {
  graph_name: string;
  description: string;
  input_format: any;
  output_format: any;
  api_endpoint: string;
  method: string;
}

export interface MCPScriptResponse {
  graph_name: string;
  script: string;
}