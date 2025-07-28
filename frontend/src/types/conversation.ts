// src/types/conversation.ts

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  reasoning_content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ConversationRound {
  round: number;
  messages: ConversationMessage[];
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
  _id: string;
  user_id: string;
  type: 'chat' | 'agent' | 'graph';
  title: string;
  created_at: string;
  updated_at: string;
  round_count: number;
  total_token_usage: TokenUsage;
  status: 'active' | 'deleted' | 'favorite';
  tags: string[];
}

export interface ConversationDetail {
  conversation_id: string;
  title: string;
  rounds: ConversationRound[];
  generation_type: 'chat' | 'graph' | 'mcp' | 'graph_run';
  parsed_results?: ParsedResults;
  execution_chain?: string[][];
  final_result?: string;
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

export interface ConversationListResponse {
  conversations: ConversationSummary[];
  total_count: number;
}

export interface SSEMessage {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning_content?: string;
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
  type?: 'node_start' | 'node_end' | 'graph_complete';
  node_name?: string;
  level?: number;
  final_result?: string;
  execution_chain?: string[][];
}

export interface ChatRequest {
  user_prompt: string;
  system_prompt?: string;
  mcp_servers?: string[];
  model_name: string;
  conversation_id?: string;
  user_id?: string;
}

export interface AgentRequest {
  requirement: string;
  model_name: string;
  conversation_id?: string;
  user_id?: string;
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
  user_id?: string;
}

export type ConversationMode = 'chat' | 'agent' | 'graph';
export type AgentType = 'mcp' | 'graph';

// 流式输出块类型
export type StreamingBlockType = 'reasoning' | 'content' | 'tool_calls';

// 流式输出块
export interface StreamingBlock {
  id: string;
  type: StreamingBlockType;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  isComplete: boolean;
  timestamp: number;
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