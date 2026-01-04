import api from './api';
import {
  FileListResponse,
  FileDetailResponse,
  FileVersionResponse,
  CreateFileRequest,
  SaveFileRequest,
  FileOperationResponse,
  DeleteFileResponse,
} from '../types/conversationFile';

export interface PushFileFromConversationRequest {
  conversation_id: string;
  filename: string;
}

export const projectFileService = {
  async listFiles(projectId: string): Promise<FileListResponse> {
    const response = await api.get(`/projects/${projectId}/files`);
    return response.data;
  },

  async getFile(projectId: string, filename: string): Promise<FileDetailResponse> {
    const encodedFilename = encodeURIComponent(filename);
    const response = await api.get(`/projects/${projectId}/files/${encodedFilename}`);
    return response.data;
  },

  async getFileVersion(
    projectId: string,
    filename: string,
    versionId: string
  ): Promise<FileVersionResponse> {
    const encodedFilename = encodeURIComponent(filename);
    const response = await api.get(
      `/projects/${projectId}/files/${encodedFilename}/versions/${versionId}`
    );
    return response.data;
  },

  async createFile(
    projectId: string,
    data: CreateFileRequest
  ): Promise<FileOperationResponse> {
    const response = await api.post(`/projects/${projectId}/files`, data);
    return response.data;
  },

  async updateFile(
    projectId: string,
    filename: string,
    data: SaveFileRequest
  ): Promise<FileOperationResponse> {
    const encodedFilename = encodeURIComponent(filename);
    const response = await api.put(
      `/projects/${projectId}/files/${encodedFilename}`,
      data
    );
    return response.data;
  },

  async deleteFile(projectId: string, filename: string): Promise<DeleteFileResponse> {
    const encodedFilename = encodeURIComponent(filename);
    const response = await api.delete(`/projects/${projectId}/files/${encodedFilename}`);
    return response.data;
  },

  async pushFileFromConversation(
    projectId: string,
    payload: PushFileFromConversationRequest
  ): Promise<FileOperationResponse> {
    const response = await api.post(`/projects/${projectId}/files/push-from-conversation`, payload);
    return response.data;
  },

  async uploadFile(
    projectId: string,
    file: File,
    targetPath?: string
  ): Promise<FileOperationResponse> {
    const content = await file.text();
    const filename = targetPath || file.name;

    return this.createFile(projectId, {
      filename,
      summary: `Uploaded file: ${file.name}`,
      content,
      log: 'Uploaded from local file system',
    });
  },
};

export default projectFileService;
