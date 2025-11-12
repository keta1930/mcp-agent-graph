import { FileTreeNode, FileMetadata } from '../types/conversationFile';
import {
  FileOutlined,
  FolderOutlined,
  FileTextOutlined,
  FileMarkdownOutlined,
  FileImageOutlined,
  FileZipOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import React from 'react';

/**
 * Format file size from bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Get file name without extension
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
}

/**
 * Validate filename - no path traversal, no special characters
 */
export function validateFileName(filename: string): { valid: boolean; error?: string } {
  if (!filename || filename.trim() === '') {
    return { valid: false, error: 'Filename cannot be empty' };
  }

  if (filename.length > 255) {
    return { valid: false, error: 'Filename too long (max 255 characters)' };
  }

  // Check for path traversal
  if (filename.includes('..') || filename.startsWith('/')) {
    return { valid: false, error: 'Invalid filename: path traversal not allowed' };
  }

  // Check for special characters
  const invalidChars = ['\\', ':', '*', '?', '"', '<', '>', '|'];
  for (const char of invalidChars) {
    if (filename.includes(char)) {
      return { valid: false, error: `Invalid character in filename: ${char}` };
    }
  }

  return { valid: true };
}

/**
 * Get Monaco Editor language from file extension
 */
export function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sql: 'sql',
    html: 'html',
    xml: 'xml',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    markdown: 'markdown',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    ps1: 'powershell',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    txt: 'plaintext',
  };

  return languageMap[extension.toLowerCase()] || 'plaintext';
}

/**
 * Get file icon based on extension
 */
export function getFileIcon(filename: string, isDirectory: boolean): React.ReactElement {
  if (isDirectory) {
    return React.createElement(FolderOutlined);
  }

  const ext = getFileExtension(filename);

  if (['md', 'markdown'].includes(ext)) {
    return React.createElement(FileMarkdownOutlined);
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return React.createElement(FileImageOutlined);
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return React.createElement(FileZipOutlined);
  }
  if (ext === 'pdf') {
    return React.createElement(FilePdfOutlined);
  }
  if (['txt', 'log'].includes(ext)) {
    return React.createElement(FileTextOutlined);
  }

  return React.createElement(FileOutlined);
}

/**
 * Build file tree structure from flat file list
 */
export function buildFileTree(files: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const nodeMap = new Map<string, FileTreeNode>();

  // Sort files to ensure directories come before their children
  const sortedFiles = [...files].sort();

  for (const filePath of sortedFiles) {
    const parts = filePath.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!nodeMap.has(currentPath)) {
        const node: FileTreeNode = {
          key: currentPath,
          title: part,
          isLeaf: isLast,
          path: currentPath,
          type: isLast ? 'file' : 'directory',
          icon: getFileIcon(part, !isLast),
          children: isLast ? undefined : [],
        };

        nodeMap.set(currentPath, node);

        // Add to parent or root
        if (i === 0) {
          root.push(node);
        } else {
          const parentPath = parts.slice(0, i).join('/');
          const parentNode = nodeMap.get(parentPath);
          if (parentNode && parentNode.children) {
            parentNode.children.push(node);
          }
        }
      }
    }
  }

  return root;
}

/**
 * Extract directory path from file path
 */
export function getDirectoryPath(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
}

/**
 * Get filename from full path
 */
export function getFileName(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
}

/**
 * Parse file metadata from filename
 */
export function parseFileMetadata(filename: string): FileMetadata {
  const name = getFileName(filename);
  const path = getDirectoryPath(filename);
  const extension = getFileExtension(filename);
  const isDirectory = filename.endsWith('/');

  return {
    filename,
    path,
    name,
    extension,
    isDirectory,
  };
}

/**
 * Check if file is a text file (editable)
 */
export function isTextFile(filename: string): boolean {
  const textExtensions = [
    'txt',
    'md',
    'markdown',
    'json',
    'xml',
    'yaml',
    'yml',
    'js',
    'jsx',
    'ts',
    'tsx',
    'py',
    'java',
    'c',
    'cpp',
    'h',
    'hpp',
    'cs',
    'go',
    'rs',
    'php',
    'rb',
    'swift',
    'kt',
    'scala',
    'sql',
    'html',
    'css',
    'scss',
    'less',
    'sh',
    'bash',
    'zsh',
    'ps1',
    'r',
    'lua',
    'pl',
    'vim',
    'dockerfile',
    'makefile',
    'gitignore',
    'env',
    'cfg',
    'conf',
    'ini',
    'toml',
  ];

  const ext = getFileExtension(filename);
  return textExtensions.includes(ext);
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check if file is markdown
 */
export function isMarkdownFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['md', 'markdown'].includes(ext);
}

/**
 * Get all unique directories from file list
 */
export function getDirectories(files: string[]): string[] {
  const directories = new Set<string>();

  for (const file of files) {
    const parts = file.split('/');
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join('/');
      directories.add(dir);
    }
  }

  return Array.from(directories).sort();
}
