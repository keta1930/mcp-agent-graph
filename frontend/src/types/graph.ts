// src/types/graph.ts
export interface NodePosition {
  x: number;
  y: number;
}

export interface AgentNode {
  name: string;
  description?: string;
  is_subgraph: boolean;
  model_name?: string;
  subgraph_name?: string;
  mcp_servers: string[];
  system_prompt: string;
  user_prompt: string;
  input_nodes: string[];
  output_nodes: string[];
  handoffs?: number;
  global_output: boolean;
  context: string[];
  context_mode: 'all' | 'latest' | 'latest_n';
  context_n: number;
  output_enabled: boolean;
  position?: NodePosition;
  level?: number;
  save?: string;
  id?: string;
}

export interface BackendGraphConfig {
  name: string;
  description: string;
  nodes: AgentNode[];
  end_template?: string;
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
  sequential_script?: string;
  parallel_script?: string;
  script?: string;
  default_script?: string;
}



export interface GraphFilePath {
  file_path: string;
}

export interface ImportResult {
  status: string;
  message: string;
  needs_api_key?: string[];
  skipped_models?: string[];
  skipped_servers?: string[];
}

export interface ExportResult {
  status: string;
  message: string;
  file_path: string;
}

export interface GraphReadmeResponse {
  name: string;
  config: BackendGraphConfig;
  readme: string;
}

export interface PromptTemplateResponse {
  prompt: string;
}



export const SAVE_FORMAT_OPTIONS = [
  { label: 'Markdown (.md)', value: 'md' },
  { label: 'HTML (.html)', value: 'html' },
  { label: 'Python (.py)', value: 'py' },
  { label: 'JavaScript (.js)', value: 'js' },
  { label: 'JSON (.json)', value: 'json' },
  { label: 'Text (.txt)', value: 'txt' },
  { label: 'CSV (.csv)', value: 'csv' },
  { label: 'XML (.xml)', value: 'xml' },
] as const;

export const CONTEXT_MODE_OPTIONS = [
  { label: '所有输出', value: 'all' },
  { label: '最新输出', value: 'latest' },
  { label: '最新N次输出', value: 'latest_n' },
] as const;
