import api from './api';
import {
  PromptInfo,
  PromptDetail,
  PromptCreate,
  PromptUpdate,
  PromptList,
  PromptResponse,
  PromptImportByFileRequest,
  PromptExportRequest,
  PromptBatchDeleteRequest
} from '../types/prompt';

export const promptService = {
  async createPrompt(data: PromptCreate): Promise<PromptResponse> {
    const response = await api.post('/prompt/create', data);
    return response.data;
  },

  async getPromptContent(name: string): Promise<PromptResponse<PromptDetail>> {
    const response = await api.get(`/prompt/content/${encodeURIComponent(name)}`);
    return response.data;
  },

  async updatePrompt(name: string, data: PromptUpdate): Promise<PromptResponse> {
    const response = await api.put(`/prompt/update/${encodeURIComponent(name)}`, data);
    return response.data;
  },

  async deletePrompt(name: string): Promise<PromptResponse> {
    const response = await api.delete(`/prompt/delete/${encodeURIComponent(name)}`);
    return response.data;
  },

  async listPrompts(): Promise<PromptResponse<PromptList>> {
    const response = await api.get('/prompt/list');
    return response.data;
  },

  async batchDeletePrompts(data: PromptBatchDeleteRequest): Promise<PromptResponse> {
    const response = await api.post('/prompt/batch-delete', data);
    return response.data;
  },

  async importPromptByFile(file: File, data: PromptImportByFileRequest): Promise<PromptResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', data.name);
    formData.append('category', data.category);

    const response = await api.post('/prompt/import/by-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async exportPrompts(data: PromptExportRequest): Promise<Blob> {
    const response = await api.post('/prompt/export', data, {
      responseType: 'blob',
    });
    return response.data;
  }
};