// src/services/conversationService.ts
import api from './api';
import {
  ConversationListResponse,
  ConversationDetail,
  GraphExecuteRequest,
  AgentRunRequest,
  CreateShareResponse,
  ShareStatusResponse,
  DeleteShareResponse,
  SharedConversationResponse,
  SharedFileInfo
} from '../types/conversation';

const CONVERSATION_API_BASE = '/conversations';

export class ConversationService {
  // 获取对话列表
  static async getConversations(): Promise<ConversationListResponse> {
    const response = await api.get(`${CONVERSATION_API_BASE}`);
    return response.data;
  }

  // 获取对话详情
  static async getConversationDetail(conversationId: string): Promise<ConversationDetail> {
    const response = await api.get(`${CONVERSATION_API_BASE}/${conversationId}`);
    return response.data;
  }

  // 更新对话状态
  static async updateConversationStatus(
    conversationId: string,
    status: 'active' | 'deleted' | 'favorite'
  ): Promise<void> {
    await api.put(`${CONVERSATION_API_BASE}/${conversationId}/status`, {
      status
    });
  }

  // 更新对话标题
  static async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    await api.put(`${CONVERSATION_API_BASE}/${conversationId}/title`, {
      title
    });
  }

  // 更新对话标签
  static async updateConversationTags(
    conversationId: string,
    tags: string[]
  ): Promise<void> {
    await api.put(`${CONVERSATION_API_BASE}/${conversationId}/tags`, {
      tags
    });
  }

  // 更新输入配置
  static async updateInputConfig(
    conversationId: string,
    inputConfig: {
      selected_model?: string;
      selected_graph?: string;
      system_prompt?: string;
      selected_mcp_servers?: string[];
      selected_agent?: string | null;
      selected_system_tools?: string[];
      max_iterations?: number | null;
    }
  ): Promise<void> {
    await api.put(`${CONVERSATION_API_BASE}/${conversationId}/input-config`, {
      input_config: inputConfig
    });
  }

  // 永久删除对话
  static async deleteConversationPermanent(
    conversationId: string
  ): Promise<void> {
    await api.delete(`${CONVERSATION_API_BASE}/${conversationId}/permanent`);
  }

  // 压缩对话
  static async compactConversation(
    conversationId: string,
    modelName: string,
    compactType: 'brutal' | 'precise' = 'precise',
    compactThreshold: number = 2000
  ): Promise<any> {
    const response = await api.post(`${CONVERSATION_API_BASE}/${conversationId}/compact`, {
      conversation_id: conversationId,
      model_name: modelName,
      compact_type: compactType,
      compact_threshold: compactThreshold
    });
    return response.data;
  }



  // Graph模式 - 创建SSE连接
  static async createGraphSSE(request: GraphExecuteRequest): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${api.defaults.baseURL}/graphs/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    return response.body.getReader();
  }



  // Agent Invoke - 创建SSE连接（支持文件上传）
  static async createAgentRunSSE(request: AgentRunRequest): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      // 使用 FormData 代替 JSON（支持文件上传）
      const formData = new FormData();

      // 必需参数
      formData.append('user_prompt', request.user_prompt);
      formData.append('stream', String(request.stream ?? true));

      // 可选参数
      if (request.agent_name) {
        formData.append('agent_name', request.agent_name);
      }
      if (request.conversation_id) {
        formData.append('conversation_id', request.conversation_id);
      }
      if (request.model_name) {
        formData.append('model_name', request.model_name);
      }
      if (request.system_prompt) {
        formData.append('system_prompt', request.system_prompt);
      }
      if (request.mcp_servers && request.mcp_servers.length > 0) {
        formData.append('mcp_servers', JSON.stringify(request.mcp_servers));
      }
      if (request.system_tools && request.system_tools.length > 0) {
        formData.append('system_tools', JSON.stringify(request.system_tools));
      }
      if (request.max_iterations !== undefined) {
        formData.append('max_iterations', String(request.max_iterations));
      }

      // 文件上传（新增）
      if (request.files && request.files.length > 0) {
        request.files.forEach(file => {
          formData.append('files', file);
        });
      }

      const response = await fetch(`${api.defaults.baseURL}/agent/run`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        // 尝试解析错误响应
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // 如果无法解析JSON，使用默认错误消息
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      return response.body.getReader();
    } catch (error) {
      console.error('创建 Agent SSE 连接失败:', error);
      throw error;
    }
  }

  // 分享相关API
  // 创建分享链接
  static async createShare(conversationId: string): Promise<CreateShareResponse> {
    const response = await api.post(`${CONVERSATION_API_BASE}/${conversationId}/share`);
    return response.data;
  }

  // 查询分享状态
  static async getShareStatus(conversationId: string): Promise<ShareStatusResponse> {
    const response = await api.get(`${CONVERSATION_API_BASE}/${conversationId}/share/status`);
    return response.data;
  }

  // 删除分享
  static async deleteShare(shareId: string): Promise<DeleteShareResponse> {
    const response = await api.delete(`/share/${shareId}`);
    return response.data;
  }

  // 获取分享的对话（无需认证）
  static async getSharedConversation(shareId: string): Promise<SharedConversationResponse> {
    const response = await api.get(`/share/${shareId}`);
    return response.data;
  }

  // 获取分享的文件列表（无需认证）
  static async getSharedFiles(shareId: string): Promise<string[]> {
    const response = await api.get(`/share/${shareId}/files`);
    return response.data.files; // 后端返回 {success, files, total_count}
  }

  // 下载分享的单个文件（无需认证）
  static async downloadSharedFile(shareId: string, filename: string): Promise<Blob> {
    const response = await api.get(`/share/${shareId}/file/${filename}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // 批量下载分享的所有文件（无需认证）
  static async downloadAllSharedFiles(shareId: string): Promise<Blob> {
    const response = await api.get(`/share/${shareId}/batch`, {
      responseType: 'blob'
    });
    return response.data;
  }
}

// 工具函数：生成MongoDB格式的ID
export function generateMongoId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const randomHex = Math.random().toString(16).substring(2, 18);
  return (timestamp + randomHex).padEnd(24, '0').substring(0, 24);
}

// 本地存储工具
export class ConversationStorage {
  private static readonly CONVERSATIONS_KEY = 'conversations_cache';
  private static readonly CURRENT_CONVERSATION_KEY = 'current_conversation';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟

  // 缓存对话列表
  static cacheConversationList(data: ConversationListResponse): void {
    const cacheData = {
      timestamp: Date.now(),
      data
    };
    localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(cacheData));
  }

  // 获取缓存的对话列表
  static getCachedConversationList(): ConversationListResponse | null {
    try {
      const cached = localStorage.getItem(this.CONVERSATIONS_KEY);
      if (!cached) return null;

      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        localStorage.removeItem(this.CONVERSATIONS_KEY);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  // 清除对话列表缓存
  static clearConversationListCache(): void {
    localStorage.removeItem(this.CONVERSATIONS_KEY);
  }

  // 存储当前对话详情
  static setCurrentConversation(conversation: ConversationDetail): void {
    sessionStorage.setItem(this.CURRENT_CONVERSATION_KEY, JSON.stringify(conversation));
  }

  // 获取当前对话详情
  static getCurrentConversation(): ConversationDetail | null {
    try {
      const stored = sessionStorage.getItem(this.CURRENT_CONVERSATION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // 清除当前对话详情
  static clearCurrentConversation(): void {
    sessionStorage.removeItem(this.CURRENT_CONVERSATION_KEY);
  }

  // 更新当前对话的标题
  static updateCurrentConversationTitle(title: string): void {
    const current = this.getCurrentConversation();
    if (current) {
      current.title = title;
      this.setCurrentConversation(current);
    }
  }
}