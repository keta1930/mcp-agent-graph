// src/components/memory-manager/ImportModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, message } from 'antd';
import { Upload } from 'lucide-react';
import { importMemories } from '../../services/memoryService';
import { getModels } from '../../services/modelService';
import { ModelConfig } from '../../types/model';
import { useT } from '../../i18n/hooks';

const { TextArea } = Input;

interface ImportModalProps {
  visible: boolean;
  owner: { type: string; id: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ visible, owner, onClose, onSuccess }) => {
  const t = useT();
  const [content, setContent] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [importing, setImporting] = useState<boolean>(false);
  const [models, setModels] = useState<ModelConfig[]>([]);

  useEffect(() => {
    if (visible) {
      setContent('');
      setModelName('');
      fetchModels();
    }
  }, [visible]);

  const fetchModels = async () => {
    try {
      const modelList = await getModels();
      setModels(modelList || []);
    } catch (error) {
      console.error('Failed to load models:', error);
      setModels([]);
    }
  };

  const handleImport = async () => {
    if (!owner) return;

    if (!content.trim()) {
      message.warning(t('pages.memoryManager.contentRequired'));
      return;
    }

    if (!modelName) {
      message.warning(t('pages.memoryManager.modelRequired'));
      return;
    }

    setImporting(true);
    try {
      const response = await importMemories(owner.type, owner.id, {
        content: content.trim(),
        model_name: modelName,
      });

      if (response.status === 'success') {
        message.success(t('pages.memoryManager.importSuccess'));
        onSuccess();
        onClose();
      } else {
        message.error(t('pages.memoryManager.importFailed', { error: response.message || '' }));
      }
    } catch (error) {
      console.error('Failed to import memories:', error);
      message.error(t('pages.memoryManager.importError'));
    } finally {
      setImporting(false);
    }
  };

  const modelOptions = models.map((model) => ({
    label: model.name,
    value: model.name,
  }));

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={18} strokeWidth={1.5} style={{ color: '#b85845' }} />
          <span>{t('pages.memoryManager.import')}</span>
        </div>
      }
      open={visible}
      onOk={handleImport}
      onCancel={onClose}
      confirmLoading={importing}
      okText={t('pages.memoryManager.import')}
      cancelText={t('common.cancel')}
      width={640}
      okButtonProps={{
        style: {
          background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
          border: 'none',
        },
      }}
    >
      <div style={{ marginTop: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#2d2d2d', fontWeight: 500 }}>
            {t('pages.memoryManager.selectModel')}
          </label>
          <Select
            value={modelName}
            onChange={setModelName}
            options={modelOptions}
            placeholder={t('pages.memoryManager.selectModel')}
            style={{ width: '100%' }}
          />
          <div style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>
            {t('pages.memoryManager.modelHint')}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#2d2d2d', fontWeight: 500 }}>
            {t('pages.memoryManager.importContent')}
          </label>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('pages.memoryManager.importContentPlaceholder')}
            rows={12}
            style={{
              fontSize: '14px',
              lineHeight: '1.6',
            }}
          />
          <div style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)' }}>
            {t('pages.memoryManager.importHint')}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ImportModal;
