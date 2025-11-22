import api from './api';

// Agent 配置接口
export interface AgentConfig {
  name: string;
  card: string;
  model: string;
  instruction?: string;
  max_actions?: number;
  mcp?: string[];
  system_tools?: string[];
  category: string;
  tags?: string[];
}

export interface Agent {
  _id?: string;
  name: string;
  agent_config: AgentConfig;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface AgentListItem {
  name: string;
  category: string;
  tags: string[];
  model: string;
  created_at: string;
  updated_at: string;
}

export interface AgentCategoryItem {
  category: string;
  agent_count: number;
}

export interface AgentInCategoryItem {
  name: string;
  tags: string[];
}

// 列出 Agents
export const listAgents = async (category?: string, limit = 100, skip = 0) => {
  const params: any = { limit, skip };
  if (category) params.category = category;

  const response = await api.get('/agent/list', { params });
  return response.data;
};

// 获取 Agent 分类列表
export const listCategories = async () => {
  const response = await api.get('/agent/categories');
  return response.data;
};

// 获取指定分类下的 Agents
export const listAgentsInCategory = async (category: string) => {
  const response = await api.get(`/agent/category/${category}`);
  return response.data;
};

// 获取 Agent 配置
export const getAgent = async (agentName: string) => {
  const response = await api.get(`/agent/${agentName}`);
  return response.data;
};

// 创建 Agent
export const createAgent = async (agentConfig: AgentConfig) => {
  const response = await api.post('/agent', {
    agent_config: agentConfig
  });
  return response.data;
};

// 更新 Agent
export const updateAgent = async (
  agentName: string,
  agentConfig: AgentConfig
) => {
  const response = await api.put(`/agent/${agentName}`, {
    agent_config: agentConfig
  });
  return response.data;
};

// 删除 Agent
export const deleteAgent = async (agentName: string) => {
  const response = await api.delete(`/agent/${agentName}`);
  return response.data;
};

// 导入 Agents
export const importAgents = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/agent/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    responseType: 'blob', // 接收文件
  });

  // 创建下载链接
  const blob = new Blob([response.data], { type: 'text/markdown' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // 从响应头获取文件名，如果没有则使用默认名称
  const contentDisposition = response.headers['content-disposition'];
  let filename = 'agent_import_report.md';
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '');
    }
  }
  
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return { success: true };
};
