import api from './api';

// 系统工具 Schema 接口
export interface SystemToolSchema {
  name: string;
  schema: {
    type: string;
    function: {
      name: string;
      description: string;
      parameters: any;
    };
  };
}

// 工具类别接口
export interface ToolCategory {
  category: string;
  tools: SystemToolSchema[];
  tool_count: number;
}

export interface SystemToolListResponse {
  success: boolean;
  categories: ToolCategory[];
  total_count: number;
}

export interface SystemToolDetailResponse {
  success: boolean;
  name: string;
  schema: {
    type: string;
    function: {
      name: string;
      description: string;
      parameters: any;
    };
  };
  error?: string;
}

// 列出所有系统工具
export const listSystemTools = async (): Promise<SystemToolListResponse> => {
  const response = await api.get('/system-tools/list');
  return response.data;
};

// 获取系统工具详情
export const getSystemToolDetail = async (toolName: string): Promise<SystemToolDetailResponse> => {
  const response = await api.get(`/system-tools/${toolName}`);
  return response.data;
};
