// src/types/model.ts
export interface ModelConfig {
  // 必填参数
  name: string;
  base_url: string;
  api_key: string;
  model: string;
  
  // 可选参数
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  n?: number;
  stop?: string | string[];
  seed?: number;
  logprobs?: boolean;
  top_logprobs?: number;
  extra_body?: Record<string, any>;
  extra_headers?: Record<string, string>;
  timeout?: number;
  
  [key: string]: any;
}

export interface ModelList {
  models: ModelConfig[];
}