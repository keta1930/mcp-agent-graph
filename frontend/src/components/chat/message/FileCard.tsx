// src/components/chat/message/FileCard.tsx
import React, { useState } from 'react';
import { FileText, Image as ImageIcon, File, Loader, AlertCircle } from 'lucide-react';
import { message as antMessage } from 'antd';
import { useT } from '../../../i18n/hooks';
import api from '../../../services/api';

interface FileCardProps {
  filename: string;
  isImage?: boolean;
  size?: 'small' | 'medium';
  conversationId?: string;
  imagePath?: string;
}

const FileCard: React.FC<FileCardProps> = ({
  filename,
  isImage = false,
  size = 'medium',
  conversationId,
  imagePath
}) => {
  const t = useT();
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const loadImage = async () => {
    if (!isImage || !conversationId || !imagePath || imageData || imageLoading) return;

    setImageLoading(true);
    setImageError(false);

    try {
      const imageFilename = imagePath.split('/').pop();
      const response = await api.get(`/conversations/${conversationId}/image/${imageFilename}`);

      if (response.data.image_data && response.data.mime_type) {
        const dataUrl = `data:${response.data.mime_type};base64,${response.data.image_data}`;
        setImageData(dataUrl);
      } else {
        setImageError(true);
      }
    } catch (error) {
      console.error('Failed to load image:', error);
      setImageError(true);
      antMessage.error(t('components.fileUploadButton.loadFailed'));
    } finally {
      setImageLoading(false);
    }
  };

  const handleCloseFullscreen = () => {
    setShowFullscreen(false);
    setImageData(null);
  };

  const getFileIcon = () => {
    if (isImage) {
      return <ImageIcon size={size === 'small' ? 14 : 16} strokeWidth={1.5} style={{ color: '#b85845', flexShrink: 0 }} />;
    }

    const ext = filename.split('.').pop()?.toLowerCase();
    const codeExts = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'go', 'rs'];

    if (codeExts.includes(ext || '')) {
      return <FileText size={size === 'small' ? 14 : 16} strokeWidth={1.5} style={{ color: '#8b7355', flexShrink: 0 }} />;
    }

    return <File size={size === 'small' ? 14 : 16} strokeWidth={1.5} style={{ color: '#8b7355', flexShrink: 0 }} />;
  };

  const truncateFilename = (name: string, maxLength: number = 30): string => {
    if (name.length <= maxLength) return name;

    const ext = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - ext!.length - 4) + '...';

    return `${truncated}.${ext}`;
  };

  if (isImage && imageLoading) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.85)',
        border: '1px solid rgba(139, 115, 85, 0.2)',
        borderRadius: '8px',
        margin: '4px 8px 4px 0',
        boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
        color: '#8b7355'
      }}>
        <Loader size={16} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '13px', letterSpacing: '0.3px' }}>
          {t('components.fileUploadButton.loading')}
        </span>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (isImage && imageError) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.85)',
        border: '1px solid rgba(184, 88, 69, 0.3)',
        borderRadius: '8px',
        margin: '4px 8px 4px 0',
        boxShadow: '0 1px 3px rgba(184, 88, 69, 0.12)',
        color: '#b85845'
      }}>
        <AlertCircle size={16} strokeWidth={1.5} />
        <span style={{ fontSize: '13px', letterSpacing: '0.3px' }}>
          {t('components.fileUploadButton.loadFailed')}
        </span>
      </div>
    );
  }

  if (isImage && imageData && showFullscreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          cursor: 'pointer'
        }}
        onClick={handleCloseFullscreen}
      >
        <img
          src={imageData}
          alt={filename}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}
        />
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          color: 'white',
          fontSize: '14px',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '8px 16px',
          borderRadius: '6px',
          letterSpacing: '0.3px'
        }}>
          {t('components.fileUploadButton.clickToClose')}
        </div>
      </div>
    );
  }

  if (isImage && imageData) {
    return (
      <div
        style={{
          display: 'inline-block',
          maxWidth: size === 'small' ? '200px' : '400px',
          margin: '4px 8px 4px 0',
          cursor: 'pointer',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          boxShadow: '0 2px 8px rgba(139, 115, 85, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
          background: 'rgba(255, 255, 255, 0.85)'
        }}
        onClick={() => setShowFullscreen(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(184, 88, 69, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
          e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 115, 85, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
          e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
        }}
      >
        <img
          src={imageData}
          alt={filename}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            maxHeight: size === 'small' ? '150px' : '300px',
            objectFit: 'contain'
          }}
        />
        <div style={{
          padding: '8px 12px',
          background: 'rgba(245, 243, 240, 0.6)',
          borderTop: '1px solid rgba(139, 115, 85, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {getFileIcon()}
          <span style={{
            fontSize: '12px',
            color: '#2d2d2d',
            letterSpacing: '0.3px',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }} title={filename}>
            {truncateFilename(filename)}
          </span>
        </div>
      </div>
    );
  }

  if (isImage && !imageData) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: size === 'small' ? '4px' : '6px',
          padding: size === 'small' ? '6px 10px' : '8px 14px',
          background: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          borderRadius: '6px',
          transition: 'all 0.2s ease',
          margin: '4px 8px 4px 0',
          maxWidth: '280px',
          boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
          cursor: 'pointer'
        }}
        onClick={loadImage}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(245, 243, 240, 0.9)';
          e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
          e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
        }}
      >
        {getFileIcon()}
        <span
          style={{
            color: '#2d2d2d',
            fontSize: size === 'small' ? '12px' : '13px',
            letterSpacing: '0.3px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          title={filename}
        >
          {truncateFilename(filename)}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size === 'small' ? '4px' : '6px',
      padding: size === 'small' ? '6px 10px' : '8px 14px',
      background: 'rgba(255, 255, 255, 0.85)',
      border: '1px solid rgba(139, 115, 85, 0.2)',
      borderRadius: '6px',
      transition: 'all 0.2s ease',
      margin: '4px 8px 4px 0',
      maxWidth: '280px',
      boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(245, 243, 240, 0.9)';
      e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.25)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
      e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
    }}
    >
      {getFileIcon()}
      <span
        style={{
          color: '#2d2d2d',
          fontSize: size === 'small' ? '12px' : '13px',
          letterSpacing: '0.3px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        title={filename}
      >
        {truncateFilename(filename)}
      </span>
    </div>
  );
};

export default FileCard;
