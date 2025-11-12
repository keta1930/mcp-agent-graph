// src/components/model-manager/ModelForm.tsx
import React, { useState } from 'react';
import { Form, Input, Modal, Button, InputNumber, Switch, Select } from 'antd';
import { ChevronDown } from 'lucide-react';
import { ModelConfig } from '../../types/model';

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
      // Stream 开关
      if (values.stream !== undefined && values.stream !== null) {
        cleanedValues.stream = values.stream;
      }
      
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
          console.warn('extra_body中的JSON格式无效:', e);
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
          取消
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
          提交
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
          label="模型名称"
          rules={[{ required: true, message: '请输入模型名称!' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="base_url"
          label="基础URL"
          rules={[{ required: true, message: '请输入基础URL!' }]}
        >
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>
        <Form.Item
          name="api_key"
          label="API密钥"
          rules={[
            {
              required: !initialValues,
              message: '请输入API密钥!'
            }
          ]}
        >
          <Input.Password placeholder={initialValues ? "••••••••••••••••" : ""} />
        </Form.Item>
        <Form.Item
          name="model"
          label="模型标识符"
          rules={[{ required: true, message: '请输入模型标识符!' }]}
        >
          <Input placeholder="gpt-4" />
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
              高级配置
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
                name="stream"
                label="启用流式响应"
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
                name="temperature"
                label="温度参数"
                help="控制随机性 (0.0 到 2.0)。留空将移除此参数。"
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={0}
                  max={2}
                  step={0.1}
                  placeholder="0.7"
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="max_tokens"
                label="最大令牌数"
                help="生成的最大令牌数。留空将移除此参数。"
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={1}
                  placeholder="1000"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="max_completion_tokens"
                label="最大完成令牌数"
                help="完成部分的最大令牌数。留空将移除此参数。"
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={1}
                  placeholder="1000"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="top_p"
                label="Top P参数"
                help="核采样参数 (0.0 到 1.0)。留空将移除此参数。"
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  placeholder="1.0"
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="frequency_penalty"
                label="频率惩罚"
                help="对频繁令牌的惩罚 (-2.0 到 2.0)。留空将移除此参数。"
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={-2}
                  max={2}
                  step={0.1}
                  placeholder="0.0"
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="presence_penalty"
                label="存在惩罚"
                help="对已存在令牌的惩罚 (-2.0 到 2.0)。留空将移除此参数。"
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={-2}
                  max={2}
                  step={0.1}
                  placeholder="0.0"
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="n"
                label="响应数量"
                help="生成的完成数量。留空将移除此参数。"
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={1}
                  max={10}
                  placeholder="1"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="stop"
                label="停止序列"
                help="逗号分隔的停止序列。留空将移除此参数。"
                style={{ marginBottom: '24px' }}
              >
                <Input placeholder="\\n, ." />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="seed"
                label="随机种子"
                help="用于可重现结果的随机种子。留空将移除此参数。"
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  placeholder="12345"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="logprobs"
                label="返回对数概率"
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
                label="Top对数概率数量"
                help="返回最可能令牌的数量。留空将移除此参数。"
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={0}
                  max={20}
                  placeholder="0"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '24px' }}>
              <Form.Item
                name="timeout"
                label="超时时间（秒）"
                help="请求超时时间（秒）。留空将移除此参数。"
                style={{ marginBottom: '24px' }}
              >
                <InputNumber
                  min={1}
                  placeholder="60"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </div>

            <div style={{ paddingBottom: '12px' }}>
              <Form.Item
                name="extra_body_json"
                label="额外请求参数"
                help="JSON格式的额外请求体参数。留空将移除此参数。"
                style={{ marginBottom: '12px' }}
              >
                <TextArea
                  rows={4}
                  placeholder='{"custom_param": "value"}'
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