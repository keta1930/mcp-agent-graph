import React from 'react';
import {
  FileOutlined,
  FolderOutlined,
  FileTextOutlined,
  FileMarkdownOutlined,
  FileImageOutlined,
  FileZipOutlined,
  FilePdfOutlined,
  FileJpgOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { getFileExtension } from '../../utils/fileUtils';

interface FileIconProps {
  filename: string;
  isDirectory?: boolean;
  style?: React.CSSProperties;
}

export const FileIcon: React.FC<FileIconProps> = ({ filename, isDirectory = false, style }) => {
  if (isDirectory) {
    return <FolderOutlined style={{ color: '#faad14', ...style }} />;
  }

  const ext = getFileExtension(filename);

  // Markdown files
  if (['md', 'markdown'].includes(ext)) {
    return <FileMarkdownOutlined style={{ color: '#1890ff', ...style }} />;
  }

  // Code files
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'php', 'rb'].includes(ext)) {
    return <CodeOutlined style={{ color: '#52c41a', ...style }} />;
  }

  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
    return <FileImageOutlined style={{ color: '#eb2f96', ...style }} />;
  }

  // Archive files
  if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2'].includes(ext)) {
    return <FileZipOutlined style={{ color: '#722ed1', ...style }} />;
  }

  // PDF files
  if (ext === 'pdf') {
    return <FilePdfOutlined style={{ color: '#f5222d', ...style }} />;
  }

  // Text files
  if (['txt', 'log', 'csv'].includes(ext)) {
    return <FileTextOutlined style={{ color: '#8c8c8c', ...style }} />;
  }

  // Config files
  if (['json', 'yaml', 'yml', 'xml', 'toml', 'ini', 'cfg', 'conf'].includes(ext)) {
    return <FileOutlined style={{ color: '#13c2c2', ...style }} />;
  }

  // Office files
  if (['xls', 'xlsx'].includes(ext)) {
    return <FileExcelOutlined style={{ color: '#52c41a', ...style }} />;
  }
  if (['doc', 'docx'].includes(ext)) {
    return <FileWordOutlined style={{ color: '#1890ff', ...style }} />;
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return <FilePptOutlined style={{ color: '#fa8c16', ...style }} />;
  }

  // Default
  return <FileOutlined style={{ color: '#595959', ...style }} />;
};

export default FileIcon;
