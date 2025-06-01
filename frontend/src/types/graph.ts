// src/types/graph.ts
export interface NodePosition {
  x: number;
  y: number;
}

export interface AgentNode {
  name: string;
  description?: string; // 新增：节点描述
  is_subgraph: boolean;
  model_name?: string;
  subgraph_name?: string;
  mcp_servers: string[];
  system_prompt: string;
  user_prompt: string;
  input_nodes: string[];
  output_nodes: string[];
  handoffs?: number; // 新增：循环执行次数
  global_output: boolean; // 新增：是否全局管理输出
  context: string[]; // 新增：需要引用的全局管理节点列表
  context_mode: 'all' | 'latest' | 'latest_n'; // 新增：全局内容获取模式
  context_n: number; // 新增：获取最新的n次输出
  output_enabled: boolean;
  position?: NodePosition;
  level?: number; // 新增：节点层级
  save?: string; // 新增：输出保存文件扩展名
  
  // 前端专用字段
  id?: string; // 前端节点ID
}

export interface BackendGraphConfig {
  name: string;
  description: string;
  nodes: AgentNode[];
  end_template?: string; // 新增：终止节点输出模板
}

export interface GraphInput {
  graph_name: string;
  input_text: string;
  conversation_id?: string;
  parallel?: boolean;
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
  sequential_script?: string;
  parallel_script?: string;
  script?: string; // 向后兼容
  default_script?: string; // 向后兼容
}

// 新增：图生成请求
export interface GraphGenerationRequest {
  requirement: string;
  model_name: string;
}

// 新增：图导入导出相关
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

// 新增：README相关
export interface GraphReadmeResponse {
  name: string;
  config: BackendGraphConfig;
  readme: string;
}

// 新增：提示词模板响应
export interface PromptTemplateResponse {
  prompt: string;
}

// 文件保存格式选项
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

// 上下文模式选项
export const CONTEXT_MODE_OPTIONS = [
  { label: '所有输出', value: 'all' },
  { label: '最新输出', value: 'latest' },
  { label: '最新N次输出', value: 'latest_n' },
] as const;