// src/components/memory-manager/ExportModal.tsx
import React, { useState } from 'react';
import { Modal, Radio, message } from 'antd';
import { Download } from 'lucide-react';
import { exportMemories } from '../../services/memoryService';
import { useT } from '../../i18n/hooks';

interface ExportModalProps {
  visible: boolean;
  owner: { type: string; id: string } | null;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ visible, owner, onClose }) => {
  const t = useT();
  const [format, setFormat] = useState<'json' | 'txt' | 'markdown' | 'yaml'>('json');
  const [exporting, setExporting] = useState<boolean>(false);

  const handleExport = async () => {
    if (!owner) return;

    setExporting(true);
    try {
      const blob = await exportMemories(owner.type, owner.id, format);
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `memory_${owner.type}_${owner.id}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success(t('pages.memoryManager.exportSuccess'));
      onClose();
    } catch (error) {
      console.error('Failed to export memories:', error);
      message.error(t('pages.memoryManager.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={18} strokeWidth={1.5} style={{ color: '#b85845' }} />
          <span>{t('pages.memoryManager.export')}</span>
        </div>
      }
      open={visible}
      onOk={handleExport}
      onCancel={onClose}
      confirmLoading={exporting}
      okText={t('pages.memoryManager.export')}
      cancelText={t('common.cancel')}
      okButtonProps={{
        style: {
          background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
          border: 'none',
        },
      }}
    >
      <div style={{ marginTop: '16px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', color: '#2d2d2d', fontWeight: 500 }}>
          {t('pages.memoryManager.exportFormat')}
        </label>
        <Radio.Group
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          style={{ width: '100%' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Radio
              value="json"
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.15)',
                background: format === 'json' ? 'rgba(184, 88, 69, 0.05)' : 'rgba(255, 255, 255, 0.85)',
              }}
            >
              <div>
                <div style={{ fontWeight: 500, color: '#2d2d2d' }}>JSON</div>
                <div style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>
                  {t('pages.memoryManager.jsonDescription')}
                </div>
              </div>
            </Radio>
            <Radio
              value="txt"
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.15)',
                background: format === 'txt' ? 'rgba(184, 88, 69, 0.05)' : 'rgba(255, 255, 255, 0.85)',
              }}
            >
              <div>
                <div style={{ fontWeight: 500, color: '#2d2d2d' }}>TXT</div>
                <div style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>
                  {t('pages.memoryManager.txtDescription')}
                </div>
              </div>
            </Radio>
            <Radio
              value="markdown"
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.15)',
                background: format === 'markdown' ? 'rgba(184, 88, 69, 0.05)' : 'rgba(255, 255, 255, 0.85)',
              }}
            >
              <div>
                <div style={{ fontWeight: 500, color: '#2d2d2d' }}>Markdown</div>
                <div style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>
                  {t('pages.memoryManager.markdownDescription')}
                </div>
              </div>
            </Radio>
            <Radio
              value="yaml"
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.15)',
                background: format === 'yaml' ? 'rgba(184, 88, 69, 0.05)' : 'rgba(255, 255, 255, 0.85)',
              }}
            >
              <div>
                <div style={{ fontWeight: 500, color: '#2d2d2d' }}>YAML</div>
                <div style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>
                  {t('pages.memoryManager.yamlDescription')}
                </div>
              </div>
            </Radio>
          </div>
        </Radio.Group>
      </div>
    </Modal>
  );
};

export default ExportModal;
