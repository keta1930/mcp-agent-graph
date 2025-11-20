// README 模态框组件
import React from 'react';
import { Modal, Button } from 'antd';
import { useT } from '../../i18n/hooks';
import { buttonStyles } from '../../utils/graphEditorConstants';

interface ReadmeModalProps {
  visible: boolean;
  content: string;
  onClose: () => void;
}

/**
 * README 内容展示模态框
 */
const ReadmeModal: React.FC<ReadmeModalProps> = ({ visible, content, onClose }) => {
  const t = useT();

  return (
    <Modal
      title={t('pages.graphEditor.readmeTitle')}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button
          key="close"
          onClick={onClose}
          style={buttonStyles.modalCancel}
        >
          {t('pages.graphEditor.close')}
        </Button>
      ]}
      width={800}
    >
      <div style={{
        maxHeight: '60vh',
        overflow: 'auto',
        padding: '16px',
        background: '#faf8f5',
        borderRadius: '6px'
      }}>
        <pre style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          fontFamily: 'monospace',
          fontSize: '13px',
          lineHeight: '1.6',
          color: '#2d2d2d'
        }}>
          {content}
        </pre>
      </div>
    </Modal>
  );
};

export default ReadmeModal;
