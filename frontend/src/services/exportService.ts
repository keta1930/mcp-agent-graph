// src/services/exportService.ts
import api from './api';

export interface ExportRequest {
  dataset_name: string;
  file_name: string;
  conversation_ids: string[];
  file_format?: 'jsonl' | 'csv' | 'parquet';
  data_format?: 'standard';
}

export interface FileInfo {
  file_format: string;
  file_size: string;
}

export interface ExportResponse {
  success: boolean;
  message: string;
  dataset_name?: string;
  preview_data?: any[];
  total_records?: number;
  file_info?: FileInfo;
}

export interface PreviewResponse {
  success: boolean;
  message?: string;
  dataset_name?: string;
  dataset_info?: Record<string, any>;
  preview_data?: any[];
  total_records?: number;
}

export interface DatasetListItem {
  dataset_name: string;
  data_format: string;
  created_at: string;
}

export interface ListResponse {
  success: boolean;
  exports: DatasetListItem[];
}

export interface DeleteResponse {
  success: boolean;
  message: string;
  dataset_name?: string;
}

export const exportService = {
  async exportConversations(req: ExportRequest): Promise<ExportResponse> {
    const response = await api.post('/export/conversations', {
      dataset_name: req.dataset_name,
      file_name: req.file_name,
      conversation_ids: req.conversation_ids,
      file_format: req.file_format || 'jsonl',
      data_format: req.data_format || 'standard',
    });
    return response.data;
  },

  async listDatasets(): Promise<ListResponse> {
    const response = await api.get('/export/list');
    return response.data;
  },

  async previewDataset(datasetName: string, dataFormat: string = 'standard'): Promise<PreviewResponse> {
    const response = await api.get(`/export/preview/${encodeURIComponent(datasetName)}`, {
      params: { data_format: dataFormat },
    });
    return response.data;
  },

  async downloadDataset(datasetName: string, dataFormat: string = 'standard'): Promise<void> {
    const response = await api.get(`/export/download/${encodeURIComponent(datasetName)}`, {
      params: { data_format: dataFormat },
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/zip' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${datasetName}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async deleteDataset(datasetName: string, dataFormat: string = 'standard'): Promise<DeleteResponse> {
    const response = await api.delete(`/export/${encodeURIComponent(datasetName)}`, {
      params: { data_format: dataFormat },
    });
    return response.data;
  }
};

export default exportService;