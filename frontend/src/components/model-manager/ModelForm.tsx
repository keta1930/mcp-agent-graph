// src/components/model-manager/ModelForm.tsx
import React, { useState } from 'react';
import { Form, Input, Modal, Button, InputNumber, Switch } from 'antd';
import { ChevronDown } from 'lucide-react';
import { ModelConfig } from '../../types/model';
import { useT } from '../../i18n/hooks';

const { TextArea } = Input;

interface ModelFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (model: ModelConfig) => void;
  initialValues?: ModelConfig;
  title: string;
}

const ModelForm: React.FC<ModelFormProps> = ({
  visible,
  onClose,
  onSubmit,
  initialValues,
  title
}) => {
  const t = useT();
  const [form] = Form.useForm();
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  React.useEffect(() => {
    if (visible && initialValues) {
      // 准备表单初始值
      const formValues = {
        ...initialValues,
        // 处理 extra_body 参数，如果存在则转换为JSON字符串
        extra_body_json: initialValues.extra_body ? JSON.stringify(initialValues.extra_body, null, 2) : '',
        // 处理 stop 参数，如果是数组则转换为逗号分隔的字符串
        stop: Array.isArray(initialValues.stop) ? initialValues.stop.join(', ') : (initialValues.stop || ''),
        // API密钥字段在编辑模式下保持空白（安全考虑）
        api_key: ''
      };
      form.setFieldsValue(formValues);
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, initialValues, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      // 创建一个干净的对象，只包含有值的参数
      const cleanedValues: any = {};
      
      // 处理必填参数
      cleanedValues.name = values.name;
      cleanedValues.base_url = values.base_url;
      cleanedValues.model = values.model;
      
      // 处理API密钥：编辑模式下如果为空则不包含此字段，让后端保持原值
      if (!initialValues) {
        // 新增模式：API key 必须有值
        cleanedValues.api_key = values.api_key;
      } else {
        // 编辑模式：只有用户输入了新值才更新
        if (values.api_key && values.api_key.trim() !== '') {
          cleanedValues.api_key = values.api_key.trim();
        }
      }
      
      // 处理可选参数 - 只有明确有值时才添加
      // 数值参数 - 只有当用户实际输入了值时才包含
      const numericFields = [
        'temperature', 'max_tokens', 'max_completion_tokens', 
        'top_p', 'frequency_penalty', 'presence_penalty', 
        'n', 'seed', 'top_logprobs', 'timeout'
      ];
      
      numericFields.forEach(field => {
        const value = values[field];
        // 检查是否有实际的数值（不是undefined、null、空字符串、或NaN）
        if (value !== undefined && value !== null && value !== '' && !isNaN(Number(value))) {
          cleanedValues[field] = Number(value);
        }
      });
      
      // logprobs 开关
      if (values.logprobs !== undefined && values.logprobs !== null) {
        cleanedValues.logprobs = values.logprobs;
      }
      
      // 处理 stop 参数
      if (values.stop && values.stop.trim() !== '') {
        const stopValue = values.stop.trim();
        if (stopValue.includes(',')) {
          const stopArray = stopValue.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
          if (stopArray.length > 0) {
            cleanedValues.stop = stopArray;
          }
        } else {
          cleanedValues.stop = stopValue;
        }
      }
      
      // 处理 extra_body 参数
      if (values.extra_body_json && values.extra_body_json.trim() !== '') {
        try {
          const parsedExtraBody = JSON.parse(values.extra_body_json.trim());
          if (parsedExtraBody && typeof parsedExtraBody === 'object') {
            cleanedValues.extra_body = parsedExtraBody;
          }
        } catch (e) {
          // JSON 解析失败时忽略该字段
          console.warn(t('pages.modelManager.form.invalidJson'), e);
        }
      }
      
      console.log('提交清理后的值:', cleanedValues);
      onSubmit(cleanedValues as ModelConfig);
      form.resetFields();
    }).catch((errorInfo) => {
      console.log('验证失败:', errorInfo);
    });
  };

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      width={600}
      styles={{
        header: {
          borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
          paddingBottom: '16px',
          marginBottom: '20px'
        },
        body: {
          padding: '24px'
        }
      }}
      footer={[
        <Button
          key="cancel"
          onClick={onClose}
          style={{
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            background: 'rgba(255, 255, 255, 0.85)',
            color: '#8b7355',
            padding: '6px 16px',
            height: 'auto'
          }}
        >
          {t('common.cancel')}
        </Button>,
        <Button
          key="submit"
          onClick={handleSubmit}
          style={{
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            padding: '6px 16px',
            height: 'auto',
            fontWeight: 500,
            boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
            marginLeft: '8px'
          }}
        >
          {t('common.submit')}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        name="modelForm"
      >
        {/* 基本配置 */}
        <Form.Item
          name="name"
          label={t('pages.modelManager.form.modelName')}
          rules={[{ required: true, message: t('pages.modelManager.form.modelNameRequired') }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="base_url"
          label={t('pages.modelManager.form.baseUrlLabel')}
          rules={[{ required: true, message: t('pages.modelManager.form.baseUrlRequired') }]}
        >
          <Input placeholder={t('pages.modelManager.form.baseUrlPlaceholder')} />
        </Form.Item>
        <Form.Item
          name="api_key"
          label={t('pages.modelManager.form.apiKey')}
          rules={[
            {
              required: !initialValues,
              message: t('pages.modelManager.form.apiKeyRequired')
            }
          ]}
        >
          <Input.Password placeholder={initialValues ? t('pages.modelManager.form.apiKeyPlaceholder') : ""} />
        </Form.Item>
        <Form.Item
          name="model"
          label={t('pages.modelManager.form.modelIdentifierLabel')}
          rules={[{ required: true, message: t('pages.modelManager.form.modelIdentifierRequired') }]}
        >
          <Input placeholder={t('pages.modelManager.form.modelIdentifierPlaceholder')} />
        </Form.Item>

        {/* 高级配置 */}
        <div
          style={{
            marginTop: '16px',
            borderRadius: '8px',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            background: 'rgba(250, 248, 245, 0.6)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'background 0.2s ease'
            }}
            onClick={() => setAdvancedExpanded(!advancedExpanded)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(250, 248, 245, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{
              fontWeight: 500,
              fontSize: '14px',
              color: '#2d2d2d'
            }}>
              {t('pages.modelManager.form.advancedConfig')}
            </span>
            <ChevronDown
              size={18}
              strokeWidth={2}
              style={{
                color: '#8b7355',
                transform: advancedExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}
            />
          </div>
          {advancedExpanded && (
            <div style={{ padding: '16px', paddingTop: '8px' }}>
            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="temperature"
                label={t('pages.modelManager.form.temperature')}
                help={t('pages.modelManager.form.temperatureHelp')}
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={0}
                  max={2}
                  step={0.1}
                  placeholder={t('pages.modelManager.form.temperaturePlaceholder')}
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="max_tokens"
                label={t('pages.modelManager.form.maxTokens')}
                help={t('pages.modelManager.form.maxTokensHelp')}
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={1}
                  placeholder={t('pages.modelManager.form.maxTokensPlaceholder')}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="max_completion_tokens"
                label={t('pages.modelManager.form.maxCompletionTokens')}
                help={t('pages.modelManager.form.maxCompletionTokensHelp')}
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={1}
                  placeholder={t('pages.modelManager.form.maxCompletionTokensPlaceholder')}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="top_p"
                label={t('pages.modelManager.form.topP')}
                help={t('pages.modelManager.form.topPHelp')}
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  placeholder={t('pages.modelManager.form.topPPlaceholder')}
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="frequency_penalty"
                label={t('pages.modelManager.form.frequencyPenalty')}
                help={t('pages.modelManager.form.frequencyPenaltyHelp')}
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={-2}
                  max={2}
                  step={0.1}
                  placeholder={t('pages.modelManager.form.frequencyPenaltyPlaceholder')}
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="presence_penalty"
                label={t('pages.modelManager.form.presencePenalty')}
                help={t('pages.modelManager.form.presencePenaltyHelp')}
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={-2}
                  max={2}
                  step={0.1}
                  placeholder={t('pages.modelManager.form.presencePenaltyPlaceholder')}
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="n"
                label={t('pages.modelManager.form.responseCount')}
                help={t('pages.modelManager.form.responseCountHelp')}
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={1}
                  max={10}
                  placeholder={t('pages.modelManager.form.responseCountPlaceholder')}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="stop"
                label={t('pages.modelManager.form.stopSequence')}
                help={t('pages.modelManager.form.stopSequenceHelp')}
                style={{ marginBottom: '24px' }}
              >
                <Input placeholder={t('pages.modelManager.form.stopSequencePlaceholder')} />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="seed"
                label={t('pages.modelManager.form.seed')}
                help={t('pages.modelManager.form.seedHelp')}
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  placeholder={t('pages.modelManager.form.seedPlaceholder')}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="logprobs"
                label={t('pages.modelManager.form.logprobs')}
                valuePropName="checked"
                style={{ marginBottom: '24px' }}
              >
                <Switch
                  style={{
                    backgroundColor: 'rgba(139, 115, 85, 0.2)'
                  }}
                  className="custom-switch"
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="top_logprobs"
                label={t('pages.modelManager.form.topLogprobs')}
                help={t('pages.modelManager.form.topLogprobsHelp')}
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={0}
                  max={20}
                  placeholder={t('pages.modelManager.form.topLogprobsPlaceholder')}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="timeout"
                label={t('pages.modelManager.form.timeout')}
                help={t('pages.modelManager.form.timeoutHelp')}
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={1}
                  placeholder={t('pages.modelManager.form.timeoutPlaceholder')}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '12px' }}>
              <Form.Item
                name="extra_body_json"
                label={t('pages.modelManager.form.extraBody')}
                help={t('pages.modelManager.form.extraBodyHelp')}
                style={{ marginBottom: '12px' }}
              >
                <TextArea
                  rows={4}
                  placeholder={t('pages.modelManager.form.extraBodyPlaceholder')}
                />
              </Form.Item>
            </div>
            </div>
          )}
        </div>
      </Form>
    </Modal>
  );
};

export default ModelForm;