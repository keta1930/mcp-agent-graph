// src/components/chat/ShareButton.tsx
import React from 'react';
import { Button, Tooltip } from 'antd';
import { Share2 } from 'lucide-react';
import { useT } from '../../i18n/hooks';

interface ShareButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const ShareButton: React.FC<ShareButtonProps> = ({ onClick, loading = false, disabled = false }) => {
  const t = useT();

  return (
    <Tooltip title={t('pages.chatSystem.share.shareConversation')}>
      <Button
        type="text"
        icon={<Share2 size={16} strokeWidth={1.5} />}
        size="small"
        onClick={onClick}
        loading={loading}
        disabled={disabled}
        style={{
          color: disabled ? 'rgba(45, 45, 45, 0.45)' : '#8b7355',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          borderRadius: '6px',
          background: 'rgba(255, 255, 255, 0.6)',
          padding: '4px 12px',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.color = '#b85845';
            e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
            e.currentTarget.style.background = 'rgba(184, 88, 69, 0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.color = '#8b7355';
            e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
          }
        }}
      >
        {t('pages.chatSystem.share.share')}
      </Button>
    </Tooltip>
  );
};

export default ShareButton;
