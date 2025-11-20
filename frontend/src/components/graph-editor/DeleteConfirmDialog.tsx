// 删除确认对话框组件
import React from 'react';
import { Card, Button, Typography } from 'antd';
import { useT } from '../../i18n/hooks';
import { buttonStyles } from '../../utils/graphEditorConstants';

const { Text } = Typography;

interface DeleteConfirmDialogProps {
  visible: boolean;
  graphName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 删除图确认对话框
 */
const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  visible,
  graphName,
  onConfirm,
  onCancel
}) => {
  const t = useT();

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(45, 45, 45, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onCancel}
    >
      <Card
        style={{
          borderRadius: '8px',
          border: '1px solid rgba(139, 115, 85, 0.15)',
          background: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)',
          minWidth: '320px',
          maxWidth: '400px'
        }}
        styles={{ body: { padding: '24px' } }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text style={{
            fontSize: '16px',
            fontWeight: 500,
            color: '#2d2d2d',
            display: 'block',
            marginBottom: '8px'
          }}>
            {t('pages.graphEditor.deleteConfirmTitle')}
          </Text>
          <Text style={{
            fontSize: '14px',
            color: 'rgba(45, 45, 45, 0.65)'
          }}>
            {t('pages.graphEditor.deleteConfirmMessage', { name: graphName })}
          </Text>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button
            style={{
              ...buttonStyles.secondary,
              padding: '6px 16px',
              height: 'auto'
            }}
            onClick={onCancel}
          >
            {t('common.cancel')}
          </Button>
          <Button
            style={{
              ...buttonStyles.primary,
              padding: '6px 16px',
              height: 'auto',
              fontWeight: 500,
              boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
            }}
            onClick={onConfirm}
          >
            {t('common.confirm')} {t('common.delete')}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DeleteConfirmDialog;
