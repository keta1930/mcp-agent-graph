export interface PromptInfo {
  name: string;
  category?: string;
  size: number;
  created_time: string;
  modified_time: string;
}

export interface PromptDetail extends PromptInfo {
  content: string;
}

export interface PromptCreate {
  name: string;
  content: string;
  category: string;
}

export interface PromptUpdate {
  content?: string;
  category?: string;
}

export interface PromptList {
  prompts: PromptInfo[];
  total: number;
}

export interface PromptResponse<T = any> {
  success: boolean;
  message: string;
  error_code?: string;
  data?: T;
}

export interface PromptImportByFileRequest {
  name: string;
  category: string;
}

export interface PromptExportRequest {
  names: string[];
}

export interface PromptBatchDeleteRequest {
  names: string[];
}