// src/types/conversation.ts

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  reasoning_content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  image_paths?: string[]; // 图片路径列表（MinIO路径，用于多模态消息）
}

export interface ToolCall {
  id?: string;
  type?: 'function';
  index?: number;  // 用于流式工具调用的索引
  function: {
    name: string;
    arguments: string;
  };
}

export interface ConversationRound {
  round: number;
  messages: ConversationMessage[];
  agent_name?: string; // Agent 名称
  model?: string; // 使用的模型
  prompt_tokens?: number; // 输入 token 数
  completion_tokens?: number; // 输出 token 数
  tools?: any[]; // 工具 schema
  node_name?: string; // For graph execution
  level?: number; // For graph execution
  output_enabled?: string; // For graph execution
  mcp_servers?: string[]; // For graph execution
}

export interface TokenUsage {
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
}

export interface ConversationSummary {
  conversation_id: string;
  user_id: string;
  type: 'agent' | 'graph';
  title: string;
  created_at: string;
  updated_at: string;
  round_count: number;
  total_token_usage: TokenUsage;
  status: 'active' | 'deleted' | 'favorite';
  tags: string[];
  project_id?: string | null;
}

export interface InputConfig {
  selected_model?: string;
  selected_graph?: string;
  system_prompt?: string;
  selected_mcp_servers?: string[];
  selected_agent?: string | null;
  selected_system_tools?: string[];
  max_iterations?: number | null;
}

export interface ConversationDetail {
  conversation_id: string;
  title: string;
  rounds: ConversationRound[];
  type: 'agent' | 'graph';
  project_id?: string | null;
  documents?: ConversationDocuments; // 新增：文档列表
  parsed_results?: ParsedResults;
  execution_chain?: string[][];
  final_result?: string;
  tasks?: TaskData[]; // 新增：Sub Agent 任务数据
  input_config?: InputConfig; // 新增：输入配置
}

export interface ParsedResults {
  analysis?: string;
  todo?: string;
  graph_name?: string;
  graph_description?: string;
  nodes?: any[];
  end_template?: string;
  folder_name?: string;
  script_files?: Record<string, string>;
  dependencies?: string;
  readme?: string;
}

// 对话文档
export interface ConversationDocuments {
  total_count: number;
  files: DocumentFile[];
}

export interface DocumentFile {
  filename: string;
  summary: string;
  size: number;
  created_at: string;
  updated_at: string;
  current_version_id: string;
  logs?: Array<{
    log_id: string;
    agent: string;
    comment: string;
    timestamp: string;
  }>;
}

export interface ConversationListResponse {
  conversations: ConversationSummary[];
  total_count: number;
}

export interface SSEMessage {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning_content?: string;
      reasoning?: string; // OpenRouter format
      tool_calls?: ToolCall[];
    };
    finish_reason?: 'stop' | 'tool_calls' | null;
  }>;
  usage?: TokenUsage;
  error?: {
    message: string;
    type: string;
  };
  role?: 'tool';
  tool_call_id?: string;
  content?: string;
  completion?: {
    tool_name?: string;
    graph_name?: string;
    message: string;
  };
  incomplete?: {
    message: string;
    missing_fields: string[];
  };
  type?: 'node_start' | 'node_end' | 'graph_complete' | 'title_update' | 'task_start' | 'task_complete' | 'task_error' | 'conversation_created'; // 扩展：添加 Task 事件类型
  node_name?: string;
  level?: number;
  final_result?: string;
  execution_chain?: string[][];
  task_id?: string; // 新增：Task 标识
  title?: string; // 新增：标题更新
  tags?: string[]; // 新增：标签更新
  conversation_id?: string; // 新增：对话 ID
  // Task 事件专用字段
  agent_name?: string; // Task 使用的 Agent 名称
  task_description?: string; // Task 描述
  success?: boolean; // Task 是否成功
  result?: string; // Task 结果
  error_type?: string; // 错误类型
}

// Agent 运行请求（支持文件上传）
export interface AgentRunRequest {
  // Agent 选择（可选）
  agent_name?: string;

  // 用户输入
  user_prompt: string;

  // 对话管理
  conversation_id?: string;
  stream?: boolean;

  // 可选配置参数（覆盖/扩展 Agent 配置）
  model_name?: string; // 覆盖 Agent 的模型
  system_prompt?: string; // 覆盖 Agent 的系统提示词
  mcp_servers?: string[]; // 添加到 Agent 的 MCP 服务器列表
  system_tools?: string[]; // 添加到 Agent 的系统工具列表
  max_iterations?: number; // 覆盖 Agent 的最大迭代次数

  // 文件上传（新增）
  files?: File[]; // 上传的文件列表（图片、文本文件等）
}

export interface GraphExecuteRequest {
  graph_name: string;
  input_text: string;
  conversation_id?: string;
  continue_from_checkpoint?: boolean;
}

export interface ConversationUpdateRequest {
  status?: 'active' | 'deleted' | 'favorite';
  title?: string;
  tags?: string[];
}

// 对话模式：只保留 agent 和 graph
export type ConversationMode = 'agent' | 'graph';

// 流式输出块类型
export type StreamingBlockType = 'reasoning' | 'content' | 'tool_calls' | 'node_start' | 'task';

// 流式输出块
export interface StreamingBlock {
  id: string;
  type: StreamingBlockType;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  isComplete: boolean;
  timestamp: number;
  nodeInfo?: {
    nodeName: string;
    level: number;
    status: 'running' | 'completed' | 'pending';
  };
  taskId?: string; // Task 标识
  taskStatus?: 'running' | 'completed' | 'failed'; // Task 状态
}

// Task 块（扩展 StreamingBlock）
export interface TaskBlock extends StreamingBlock {
  type: 'task';
  taskId: string;
  taskStatus: 'running' | 'completed' | 'failed';
}

// Task 数据（后端返回的完整 task 数据）
export interface TaskData {
  task_id: string;
  agent_name: string;
  rounds: TaskRound[];
}

// Task Round 数据
export interface TaskRound {
  round: number;
  messages: ConversationMessage[];
  model?: string;
  tool_call_id?: string; // 关联主对话的工具调用 ID
}

// Task Round 数据（用于展示，包含 agent 信息）
export interface TaskRoundData {
  task_id: string;
  agent_name: string;
  round: TaskRound;
}

// 增强的流式状态，支持分块渲染
export interface EnhancedStreamingState {
  isStreaming: boolean;
  blocks: StreamingBlock[];
  error: string | null;
  nodeInfo: {
    nodeName?: string;
    level?: number;
    status?: 'running' | 'completed' | 'pending';
  } | null;
}

// 分享相关类型定义
export interface ShareInfo {
  share_id: string;
  conversation_id: string;
  created_at: string;
  created_by: string;
}

export interface CreateShareResponse {
  share_id: string;
  share_url: string;
  created_at: string;
}

export interface ShareStatusResponse {
  is_shared: boolean;
  share_info?: ShareInfo;
}

export interface DeleteShareResponse {
  message: string;
}

export interface SharedConversationResponse {
  conversation_id: string;
  title: string;
  rounds: ConversationRound[];
  type: 'agent' | 'graph';
  created_at: string;
  round_count: number;
  // 可选字段
  execution_chain?: string[][];
  final_result?: string;
  tasks?: TaskData[];
}

export interface SharedFileInfo {
  filename: string;
  size: number;
  created_at: string;
}

export interface SharedFilesResponse {
  success: boolean;
  files: string[];
  total_count: number;
}
