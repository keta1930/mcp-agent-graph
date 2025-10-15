// src/components/chat/RawPreviewModal.tsx
import React from 'react';
import { Modal, Spin } from 'antd';

interface RawPreviewModalProps {
  visible: boolean;
  title?: string;
  data?: any;
  loading?: boolean;
  onClose: () => void;
}

const RawPreviewModal: React.FC<RawPreviewModalProps> = ({ visible, title, data, loading, onClose }) => {
  return (
    <Modal
      title={title || '原始数据预览'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin tip="加载中..." />
        </div>
      ) : (
        <pre style={{ maxHeight: 520, overflow: 'auto', background: 'transparent', padding: 0, border: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {data ? JSON.stringify(data, null, 2) : '暂无数据'}
        </pre>
      )}
    </Modal>
  );
};

export default RawPreviewModal;