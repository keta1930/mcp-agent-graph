import React from 'react';
import {
  File,
  Folder,
  FileText,
  FileCode,
  Image,
  FileArchive,
  FileType,
  FileSpreadsheet,
  Presentation,
  Code,
} from 'lucide-react';
import { getFileExtension } from '../../utils/fileUtils';

interface FileIconProps {
  filename: string;
  isDirectory?: boolean;
  style?: React.CSSProperties;
}

export const FileIcon: React.FC<FileIconProps> = ({ filename, isDirectory = false, style }) => {
  if (isDirectory) {
    return <Folder size={18} style={{ color: '#d4a574', ...style }} />;
  }

  const ext = getFileExtension(filename);

  // Markdown files
  if (['md', 'markdown'].includes(ext)) {
    return <FileCode size={18} style={{ color: '#b85845', ...style }} />;
  }

  // Code files
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'php', 'rb'].includes(ext)) {
    return <Code size={18} style={{ color: '#52c41a', ...style }} />;
  }

  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
    return <Image size={18} style={{ color: '#eb2f96', ...style }} />;
  }

  // Archive files
  if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2'].includes(ext)) {
    return <FileArchive size={18} style={{ color: '#722ed1', ...style }} />;
  }

  // PDF files
  if (ext === 'pdf') {
    return <FileType size={18} style={{ color: '#f5222d', ...style }} />;
  }

  // Text files
  if (['txt', 'log', 'csv'].includes(ext)) {
    return <FileText size={18} style={{ color: '#8b7355', ...style }} />;
  }

  // Config files
  if (['json', 'yaml', 'yml', 'xml', 'toml', 'ini', 'cfg', 'conf'].includes(ext)) {
    return <File size={18} style={{ color: '#13c2c2', ...style }} />;
  }

  // Office files
  if (['xls', 'xlsx'].includes(ext)) {
    return <FileSpreadsheet size={18} style={{ color: '#52c41a', ...style }} />;
  }
  if (['doc', 'docx'].includes(ext)) {
    return <FileText size={18} style={{ color: '#b85845', ...style }} />;
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return <Presentation size={18} style={{ color: '#d4a574', ...style }} />;
  }

  // Default
  return <File size={18} style={{ color: '#8b7355', ...style }} />;
};

export default FileIcon;
