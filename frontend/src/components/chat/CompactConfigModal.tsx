// src/components/chat/CompactConfigModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Select, InputNumber, Form, Typography, Divider } from 'antd';
import { useModelStore } from '../../store/modelStore';

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
          title: '精确压缩',
          description: 'AI会智能总结工具调用的内容，保留完整的对话结构和上下文。适合需要保持对话完整性的场景。'
        };
      case 'brutal':
        return {
          title: '暴力压缩', 
          description: '每轮对话只保留用户消息和最后的AI回复，大幅减少对话长度。适合只需要保留核心交互的场景。'
        };
      default:
        return { title: '', description: '' };
    }
  };

  const typeInfo = getTypeDescription();

  return (
    <Modal
      title="对话压缩配置"
      open={visible}
      onOk={handleConfirm}
      onCancel={onCancel}
      okText="开始压缩"
      cancelText="取消"
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
            label="选择压缩模型"
            name="model"
            rules={[{ required: true, message: '请选择一个模型' }]}
          >
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              placeholder="选择用于压缩的模型"
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)
                  ?.toLowerCase()
                  .indexOf(input.toLowerCase()) >= 0
              }
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
              label="压缩阈值（字符数）"
              name="threshold"
              help="超过此字符数的工具调用结果将被AI总结压缩"
            >
              <InputNumber
                value={threshold}
                onChange={(value) => setThreshold(value || 2000)}
                min={500}
                max={10000}
                step={500}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
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
            ⚠️ 压缩操作不可逆，建议在压缩前确认对话内容无需完整保留。
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default CompactConfigModal;