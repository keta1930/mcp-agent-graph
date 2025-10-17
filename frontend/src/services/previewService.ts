// src/services/previewService.ts
import api from './api';

export interface CreatePreviewShareRequest {
  lang: string;
  content: string;
  title?: string;
  expire_hours?: number;
}

export interface CreatePreviewShareResponse {
  success: boolean;
  id: string;
}

export interface GetPreviewShareResponse {
  success: boolean;
  lang: string;
  title: string;
  content: string;
}

export const previewService = {
  async createShare(req: CreatePreviewShareRequest): Promise<CreatePreviewShareResponse> {
    const res = await api.post('/preview/share', req);
    return res.data;
  },

  async getShare(id: string): Promise<GetPreviewShareResponse> {
    const res = await api.get(`/preview/share/${encodeURIComponent(id)}`);
    return res.data;
  }
};