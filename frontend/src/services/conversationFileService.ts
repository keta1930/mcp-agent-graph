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

/**
 * Conversation File Service
 * Handles all file operations for conversation documents (virtual file system)
 */

export const conversationFileService = {
  /**
   * List all files in a conversation
   */
  async listFiles(conversationId: string): Promise<FileListResponse> {
    const response = await api.get(`/conversations/${conversationId}/files`);
    return response.data;
  },

  /**
   * Get file details and content (latest version)
   */
  async getFile(conversationId: string, filename: string): Promise<FileDetailResponse> {
    const encodedFilename = encodeURIComponent(filename);
    const response = await api.get(`/conversations/${conversationId}/files/${encodedFilename}`);
    return response.data;
  },

  /**
   * Get a specific version of a file
   */
  async getFileVersion(
    conversationId: string,
    filename: string,
    versionId: string
  ): Promise<FileVersionResponse> {
    const encodedFilename = encodeURIComponent(filename);
    const response = await api.get(
      `/conversations/${conversationId}/files/${encodedFilename}/versions/${versionId}`
    );
    return response.data;
  },

  /**
   * Create a new file
   */
  async createFile(
    conversationId: string,
    data: CreateFileRequest
  ): Promise<FileOperationResponse> {
    const response = await api.post(`/conversations/${conversationId}/files`, data);
    return response.data;
  },

  /**
   * Update an existing file (creates new version)
   */
  async updateFile(
    conversationId: string,
    filename: string,
    data: SaveFileRequest
  ): Promise<FileOperationResponse> {
    const encodedFilename = encodeURIComponent(filename);
    const response = await api.put(
      `/conversations/${conversationId}/files/${encodedFilename}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a file and all its versions
   */
  async deleteFile(conversationId: string, filename: string): Promise<DeleteFileResponse> {
    const encodedFilename = encodeURIComponent(filename);
    const response = await api.delete(`/conversations/${conversationId}/files/${encodedFilename}`);
    return response.data;
  },

  /**
   * Download a single file
   */
  async downloadFile(
    conversationId: string,
    filename: string,
    format: 'md' | 'docx' | 'pdf' = 'md'
  ): Promise<Blob> {
    const encodedFilename = encodeURIComponent(filename);
    const response = await api.get(
      `/conversations/${conversationId}/files/${encodedFilename}/download?format=${format}`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  /**
   * Download all files in a conversation as ZIP
   * Note: This endpoint may not be implemented yet on backend
   */
  async downloadAllFiles(conversationId: string): Promise<Blob> {
    const response = await api.post(
      `/conversations/${conversationId}/files/download-all`,
      {},
      { responseType: 'blob' }
    );
    return response.data;
  },

  /**
   * Batch delete multiple files
   */
  async batchDelete(conversationId: string, filenames: string[]): Promise<void> {
    // Execute deletes in parallel
    await Promise.all(filenames.map((filename) => this.deleteFile(conversationId, filename)));
  },

  /**
   * Upload a file (create with content from File object)
   */
  async uploadFile(
    conversationId: string,
    file: File,
    targetPath?: string
  ): Promise<FileOperationResponse> {
    const content = await file.text();
    const filename = targetPath || file.name;

    return this.createFile(conversationId, {
      filename,
      summary: `Uploaded file: ${file.name}`,
      content,
      log: `Uploaded from local file system`,
    });
  },

  /**
   * Batch upload multiple files
   */
  async batchUpload(
    conversationId: string,
    files: File[],
    targetDirectory?: string
  ): Promise<FileOperationResponse[]> {
    const results = await Promise.all(
      files.map((file) => {
        const targetPath = targetDirectory ? `${targetDirectory}/${file.name}` : file.name;
        return this.uploadFile(conversationId, file, targetPath);
      })
    );
    return results;
  },
};

export default conversationFileService;
