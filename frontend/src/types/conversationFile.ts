/**
 * Conversation File Types
 * Types for the conversation document (virtual file system) feature
 */

/**
 * File version information
 */
export interface FileVersion {
  version_id: string;
  timestamp: string;
}

/**
 * File operation log
 */
export interface FileLog {
  log_id: string;
  agent: string;
  comment: string;
  timestamp: string;
}

/**
 * File detail (complete information)
 */
export interface FileDetail {
  filename: string;
  summary: string;
  content: string;
  current_version_id: string;
  versions: FileVersion[];
}

/**
 * File list response
 */
export interface FileListResponse {
  success: boolean;
  conversation_id: string;
  project_id?: string;
  total_count: number;
  files: string[];
  project_files?: string[];
}

/**
 * File detail response
 */
export interface FileDetailResponse {
  success: boolean;
  file: FileDetail;
}

/**
 * File version detail
 */
export interface FileVersionDetail {
  filename: string;
  version_id: string;
  summary: string;
  content: string;
  is_current: boolean;
}

/**
 * File version response
 */
export interface FileVersionResponse {
  success: boolean;
  file: FileVersionDetail;
}

/**
 * Create file request
 */
export interface CreateFileRequest {
  filename: string;
  summary: string;
  content: string;
  log: string;
}

/**
 * Save file request (user edit)
 */
export interface SaveFileRequest {
  content: string;
  summary: string;
  log: string;
}

/**
 * File operation response
 */
export interface FileOperationResponse {
  success: boolean;
  message: string;
  file?: any;
}

/**
 * Delete file response
 */
export interface DeleteFileResponse {
  success: boolean;
  message: string;
  filename: string;
  deleted_versions: number;
}

/**
 * Download all files request
 */
export interface DownloadAllRequest {
  include_versions?: boolean;
}

/**
 * File tree node (for tree view display)
 */
export interface FileTreeNode {
  key: string;
  title: string;
  isLeaf: boolean;
  path: string;
  type: 'file' | 'directory';
  icon?: React.ReactElement;
  children?: FileTreeNode[];
}

/**
 * File metadata
 */
export interface FileMetadata {
  filename: string;
  path: string;
  name: string;
  extension: string;
  isDirectory: boolean;
}
