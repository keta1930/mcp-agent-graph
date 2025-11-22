// src/components/chat/ShareModal.tsx
import React, { useState } from 'react';
import { Modal, Input, Button, Space, Typography, App } from 'antd';
import { Copy, Trash2, ExternalLink } from 'lucide-react';
import { useT } from '../../i18n/hooks';

const { Text } = Typography;

interface ShareModalProps {
  visible: boolean;
  shareUrl: string;
  shareId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
  onClose: () => void;
  onDelete: () => Promise<void>;
}

const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  shareUrl,
  shareId,
  onClose,
  onDelete
}) => {
  const t = useT();
  const { modal, message } = App.useApp();
  const [deleting, setDeleting] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      message.success(t('pages.chatSystem.share.copySuccess'));
    } catch (error) {
      message.error(t('pages.chatSystem.share.copyFailed'));
    }
  };

  const handleDelete = async () => {
    modal.confirm({
      title: t('pages.chatSystem.share.deleteConfirmTitle'),
      content: t('pages.chatSystem.share.deleteConfirmMessage'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: {
        danger: true,
        style: {
          background: '#b85845',
          borderColor: '#b85845'
        }
      },
      onOk: async () => {
        setDeleting(true);
        try {
          await onDelete();
          message.success(t('pages.chatSystem.share.deleteSuccess'));
          onClose();
        } catch (error: any) {
          message.error(t('pages.chatSystem.share.deleteFailed', { error: error.message }));
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const handleOpenInNewTab = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <Modal
      title={t('pages.chatSystem.share.shareLink')}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      styles={{
        body: {
          padding: '24px'
        }
      }}
      style={{
        borderRadius: '8px'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 分享链接输入框 */}
        <div>
          <Text style={{
            fontSize: '13px',
            color: 'rgba(45, 45, 45, 0.65)',
            marginBottom: '8px',
            display: 'block'
          }}>
            {t('pages.chatSystem.share.shareLinkLabel')}
          </Text>
          <Input
            value={shareUrl}
            readOnly
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(250, 248, 245, 0.6)',
              fontSize: '14px',
              color: '#2d2d2d'
            }}
            suffix={
              <Button
                type="text"
                icon={<ExternalLink size={16} strokeWidth={1.5} />}
                onClick={handleOpenInNewTab}
                style={{
                  color: '#8b7355',
                  padding: '4px'
                }}
              />
            }
          />
        </div>

        {/* 操作按钮 */}
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button
            icon={<Trash2 size={16} strokeWidth={1.5} />}
            onClick={handleDelete}
            loading={deleting}
            disabled={deleting}
            style={{
              color: '#b85845',
              border: '1px solid rgba(184, 88, 69, 0.3)',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.6)',
              padding: '4px 16px',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!deleting) {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.borderColor = '#b85845';
                e.currentTarget.style.background = '#b85845';
              }
            }}
            onMouseLeave={(e) => {
              if (!deleting) {
                e.currentTarget.style.color = '#b85845';
                e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
              }
            }}
          >
            {t('pages.chatSystem.share.deleteShare')}
          </Button>
          <Button
            type="primary"
            icon={<Copy size={16} strokeWidth={1.5} />}
            onClick={handleCopyLink}
            style={{
              background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 16px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            {t('pages.chatSystem.share.copyLink')}
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default ShareModal;
