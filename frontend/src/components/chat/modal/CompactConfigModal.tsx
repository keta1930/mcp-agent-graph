// src/components/chat/modal/CompactConfigModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Select, InputNumber, Form, Typography, Divider } from 'antd';
import { useModelStore } from '../../../store/modelStore';
import { useT } from '../../../i18n/hooks';
import './CompactConfigModal.css';

const { Option } = Select;
const { Text } = Typography;

interface CompactConfigModalProps {
  visible: boolean;
  onConfirm: (config: { modelName: string; compactType: 'brutal' | 'precise'; threshold: number }) => void;
  onCancel: () => void;
  compactType: 'brutal' | 'precise';
}

const CompactConfigModal: React.FC<CompactConfigModalProps> = ({
  visible,
  onConfirm,
  onCancel,
  compactType
}) => {
  const t = useT();
  const [form] = Form.useForm();
  const { models: availableModels } = useModelStore();
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(2000);

  // 初始化默认模型
  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      const defaultModel = availableModels[0].name;
      setSelectedModel(defaultModel);
      form.setFieldsValue({ model: defaultModel });
    }
  }, [availableModels, selectedModel, form]);

  const handleConfirm = () => {
    if (!selectedModel) return;
    
    onConfirm({
      modelName: selectedModel,
      compactType,
      threshold
    });
  };

  const getTypeDescription = () => {
    switch (compactType) {
      case 'precise':
        return {
          title: t('components.compactConfigModal.preciseTitle'),
          description: t('components.compactConfigModal.preciseDescription')
        };
      case 'brutal':
        return {
          title: t('components.compactConfigModal.brutalTitle'), 
          description: t('components.compactConfigModal.brutalDescription')
        };
      default:
        return { title: '', description: '' };
    }
  };

  const typeInfo = getTypeDescription();

  return (
    <Modal
      title={t('components.compactConfigModal.title')}
      open={visible}
      onOk={handleConfirm}
      onCancel={onCancel}
      okText={t('components.compactConfigModal.startCompact')}
      cancelText={t('common.cancel')}
      width={480}
      okButtonProps={{ disabled: !selectedModel }}
    >
      <div className="compact-config-content">
        <div className="compact-type-info">
          <Text strong>{typeInfo.title}</Text>
          <div style={{ marginTop: 8, color: '#666', fontSize: '13px' }}>
            {typeInfo.description}
          </div>
        </div>

        <Divider />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            model: selectedModel,
            threshold: 2000
          }}
        >
          <Form.Item
            label={t('components.compactConfigModal.selectModel')}
            name="model"
            rules={[{ required: true, message: t('components.compactConfigModal.modelRequired') }]}
          >
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              placeholder={t('components.compactConfigModal.modelPlaceholder')}
              showSearch
              filterOption={(input, option) => {
                if (!option || !option.children) return false;
                const children = String(option.children);
                return children.toLowerCase().indexOf(input.toLowerCase()) >= 0;
              }}
            >
              {availableModels.map(model => (
                <Option key={model.name} value={model.name}>
                  {model.alias || model.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {compactType === 'precise' && (
            <Form.Item
              label={t('components.compactConfigModal.threshold')}
              name="threshold"
              help={t('components.compactConfigModal.thresholdHelp')}
            >
              <InputNumber
                value={threshold}
                onChange={(value) => setThreshold(value || 2000)}
                min={500}
                max={10000}
                step={500}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
              />
            </Form.Item>
          )}
        </Form>

        <div className="compact-warning" style={{ 
          marginTop: 16, 
          padding: 12, 
          background: '#fff7e6', 
          border: '1px solid #ffd591', 
          borderRadius: 6,
          fontSize: '13px'
        }}>
          <Text type="warning">
            {t('components.compactConfigModal.warning')}
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default CompactConfigModal;