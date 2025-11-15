// src/types/memory.ts

// 记忆条目
export interface MemoryItem {
  item_id: string;
  content: string;
  updated_at: string;
}

// 分类记忆
export interface CategoryMemories {
  items: MemoryItem[];
  total: number;
}

// 记忆元数据（列表展示）
export interface MemoryMetadata {
  owner_type: 'user' | 'agent';
  owner_id: string;
  categories_count: number;
  total_items: number;
  created_at?: string;
  updated_at?: string;
}

// 完整记忆数据（详情）
export interface MemoryDetail {
  owner_type: 'user' | 'agent';
  owner_id: string;
  memories: {
    [category: string]: CategoryMemories;
  };
  created_at?: string;
  updated_at?: string;
}

// API请求类型
export interface AddMemoryRequest {
  content: string;
}

export interface UpdateMemoryRequest {
  content: string;
}

export interface ImportMemoryRequest {
  content: string;
  model_name: string;
}

// API响应类型
export interface MemoryResponse {
  status: 'success' | 'error';
  message?: string;
  data?: any;
  error_code?: string;
}

export interface GetMemoriesMetadataResponse {
  status: 'success' | 'error';
  data: MemoryMetadata[];
}

export interface GetMemoriesResponse {
  status: 'success' | 'error';
  data: MemoryDetail;
}

export interface BatchDeleteResponse {
  status: 'success' | 'partial_success' | 'error';
  message: string;
  data?: {
    deleted_count?: number;
    failed_count?: number;
    deleted?: string[];
    failed?: string[];
    failed_items?: Array<{ item_id: string; error: string }>;
    failed_categories?: Array<{ category: string; error: string }>;
  };
}
