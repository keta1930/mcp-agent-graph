// src/types/graph.ts
export interface NodePosition {
  x: number;
  y: number;
}

export interface AgentNode {
  name: string;
  description?: string;
  agent_name?: string;
  is_subgraph: boolean;
  model_name?: string;
  subgraph_name?: string;
  mcp_servers: string[];
  system_tools?: string[];
  system_prompt: string;
  user_prompt: string;
  max_iterations?: number;
  input_nodes: string[];
  output_nodes: string[];
  handoffs?: number;
  output_enabled: boolean;
  position?: NodePosition;
  level?: number;
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
  error?: string;
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

// ======= 版本管理相关类型 =======

/**
 * 图版本记录
 */
export interface GraphVersionRecord {
  version_id: string;
  commit_message: string;
  created_at: string;
  size: number;
}

/**
 * 版本列表响应
 */
export interface GraphVersionListResponse {
  graph_name: string;
  version_count: number;
  versions: GraphVersionRecord[];
}

/**
 * 创建版本请求
 */
export interface CreateVersionRequest {
  commit_message: string;
}

/**
 * 创建版本响应
 */
export interface CreateVersionResponse {
  status: string;
  message: string;
  version_id?: string;
  version_count?: number;
}

/**
 * 获取版本配置响应
 */
export interface GetVersionConfigResponse {
  version_id: string;
  graph_name: string;
  commit_message?: string;
  config: BackendGraphConfig;
}

