// src/components/chat/controls/FileUploadButton.tsx
import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { message, Button, Tooltip } from 'antd';
import { useT } from '../../../i18n/hooks';

interface FileUploadButtonProps {
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  size?: 'small' | 'middle' | 'large';
  clearTrigger?: number;
  addFilesTrigger?: { files: File[]; timestamp: number };
}

interface FileItem {
  file: File;
  id: string;
}

/**
 * 文件上传按钮组件
 *
 * 功能：
 * - 点击上传文件
 * - 支持粘贴图片（Ctrl+V）
 * - 显示已上传文件列表
 * - 支持删除文件
 */
const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  onFilesChange,
  disabled = false,
  maxFiles = 10,
  maxSize = 10,
  accept = 'image/*,.txt,.md,.json,.csv,.py,.js,.ts',
  size = 'small',
  clearTrigger,
  addFilesTrigger
}) => {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (clearTrigger !== undefined) {
      setSelectedFiles([]);
      setShowPanel(false);
    }
  }, [clearTrigger]);

  React.useEffect(() => {
    if (addFilesTrigger && addFilesTrigger.files.length > 0) {
      addFiles(addFilesTrigger.files);
    }
  }, [addFilesTrigger]);

  const validateFile = (file: File): boolean => {
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSize) {
      message.error(t('components.fileUploadButton.fileSizeExceeded', { name: file.name, max: maxSize }));
      return false;
    }

    if (selectedFiles.length >= maxFiles) {
      message.error(t('components.fileUploadButton.maxFilesError', { max: maxFiles }));
      return false;
    }

    return true;
  };

  // 添加文件
  const addFiles = (newFiles: File[]) => {
    const validFiles: FileItem[] = [];

    for (const file of newFiles) {
      if (validateFile(file)) {
        validFiles.push({
          file,
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        });
      }
    }

    if (validFiles.length > 0) {
      const updatedFiles = [...selectedFiles, ...validFiles].slice(0, maxFiles);
      setSelectedFiles(updatedFiles);
      onFilesChange(updatedFiles.map(item => item.file));
    }
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(Array.from(files));
    }
    // 清空 input，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 处理粘贴事件
  const handlePaste = (e: ClipboardEvent) => {
    if (disabled) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // 检查是否为图片
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          // 生成文件名
          const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
          const ext = item.type.split('/')[1] || 'png';
          const renamedFile = new File([file], `pasted-image-${timestamp}.${ext}`, {
            type: file.type
          });
          imageFiles.push(renamedFile);
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
      message.success(t('components.fileUploadButton.pasteSuccess', { count: imageFiles.length }));
    }
  };

  // 删除文件
  const removeFile = (id: string) => {
    const updatedFiles = selectedFiles.filter(item => item.id !== id);
    setSelectedFiles(updatedFiles);
    onFilesChange(updatedFiles.map(item => item.file));
  };

  // 注册粘贴事件监听和点击外部关闭面板
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    document.addEventListener('paste', handlePaste);
    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [disabled, selectedFiles, showPanel]);

  // 获取文件图标
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon size={14} strokeWidth={1.5} style={{ color: '#b85845', flexShrink: 0 }} />;
    }
    return <FileText size={14} strokeWidth={1.5} style={{ color: '#8b7355', flexShrink: 0 }} />;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleButtonClick = () => {
    if (selectedFiles.length > 0) {
      setShowPanel(!showPanel);
    } else {
      fileInputRef.current?.click();
    }
  };

  const getTooltipTitle = () => {
    if (disabled) return t('components.fileUploadButton.disabled');
    if (selectedFiles.length >= maxFiles) return t('components.fileUploadButton.maxFilesReached', { max: maxFiles });
    if (selectedFiles.length > 0) return t('components.fileUploadButton.filesSelected', { count: selectedFiles.length });
    return t('components.fileUploadButton.uploadOrPaste');
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <Tooltip title={getTooltipTitle()}>
        <Button
          type="text"
          icon={<Upload size={14} strokeWidth={1.5} />}
          onClick={handleButtonClick}
          disabled={disabled || selectedFiles.length >= maxFiles}
          size={size}
          style={{
            color: selectedFiles.length > 0 ? '#b85845' : '#8b7355',
            border: 'none',
            background: showPanel || selectedFiles.length > 0 ? 'rgba(184, 88, 69, 0.08)' : 'transparent',
            transition: 'all 0.2s ease',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxShadow: selectedFiles.length > 0 ? '0 1px 3px rgba(184, 88, 69, 0.15)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (!disabled && selectedFiles.length < maxFiles) {
              e.currentTarget.style.color = '#b85845';
              e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.color = selectedFiles.length > 0 ? '#b85845' : '#8b7355';
              e.currentTarget.style.background = showPanel || selectedFiles.length > 0 ? 'rgba(184, 88, 69, 0.08)' : 'transparent';
            }
          }}
        />
      </Tooltip>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* 文件列表面板 */}
      {showPanel && selectedFiles.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: '8px',
          minWidth: '320px',
          maxWidth: '400px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* 顶部装饰线 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(184, 88, 69, 0.3) 50%, transparent)'
          }} />

          {/* 头部 */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              color: '#2d2d2d',
              fontSize: '14px',
              letterSpacing: '0.5px',
              fontWeight: 500
            }}>
              {t('components.fileUploadButton.selectedFiles', { count: selectedFiles.length })}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                type="text"
                size="small"
                icon={<Upload size={12} strokeWidth={1.5} />}
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedFiles.length >= maxFiles}
                style={{
                  fontSize: '12px',
                  color: '#b85845',
                  padding: '2px 8px',
                  height: 'auto',
                  fontWeight: 500
                }}
              >
                {t('components.fileUploadButton.addMore')}
              </Button>
            </div>
          </div>

          {/* 文件列表 */}
          <div style={{
            padding: '10px',
            maxHeight: '280px',
            overflowY: 'auto'
          }}>
            {selectedFiles.map(item => (
              <div
                key={item.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  border: '1px solid rgba(139, 115, 85, 0.15)',
                  background: 'rgba(255, 255, 255, 0.6)',
                  boxShadow: '0 1px 2px rgba(139, 115, 85, 0.04)',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(245, 243, 240, 0.8)';
                  e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1,
                  minWidth: 0
                }}>
                  {getFileIcon(item.file)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      color: '#2d2d2d',
                      letterSpacing: '0.3px',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.file.name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(45, 45, 45, 0.65)',
                      marginTop: '2px'
                    }}>
                      {formatFileSize(item.file.size)}
                    </div>
                  </div>
                </div>
                <div
                  onClick={() => removeFile(item.id)}
                  style={{
                    padding: '4px',
                    borderRadius: '4px',
                    color: '#8b7355',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#b85845';
                    e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#8b7355';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <X size={14} strokeWidth={1.5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadButton;
