// src/components/model-manager/ModelForm.tsx
import React from 'react';
import { Form, Input, Modal, Button, InputNumber, Switch, Select, Collapse } from 'antd';
import { ModelConfig } from '../../types/model';

const { Panel } = Collapse;
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
          console.warn('Invalid JSON in extra_body:', e);
        }
      }
      
      console.log('Submitting cleaned values:', cleanedValues);
      onSubmit(cleanedValues as ModelConfig);
      form.resetFields();
    }).catch((errorInfo) => {
      console.log('Validation failed:', errorInfo);
    });
  };

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          Submit
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
          label="Model Name"
          rules={[{ required: true, message: 'Please input model name!' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="base_url"
          label="Base URL"
          rules={[{ required: true, message: 'Please input base URL!' }]}
        >
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>
        <Form.Item
          name="api_key"
          label="API Key"
          rules={[
            { 
              required: !initialValues, 
              message: 'Please input API key!' 
            }
          ]}
          help={initialValues ? "Leave blank to keep current API key, or enter new one to update" : undefined}
        >
          <Input.Password placeholder={initialValues ? "••••••••••••••••" : ""} />
        </Form.Item>
        <Form.Item
          name="model"
          label="Model Identifier"
          rules={[{ required: true, message: 'Please input model identifier!' }]}
        >
          <Input placeholder="gpt-4" />
        </Form.Item>

        {/* 高级配置 */}
        <Collapse ghost>
          <Panel header="Advanced Configuration" key="advanced">
            <Form.Item
              name="stream"
              label="Enable Streaming"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="temperature"
              label="Temperature"
              help="Controls randomness (0.0 to 2.0). Leave empty to remove this parameter."
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

            <Form.Item
              name="max_tokens"
              label="Max Tokens"
              help="Maximum number of tokens to generate. Leave empty to remove this parameter."
            >
              <InputNumber
                min={1}
                placeholder="1000"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="max_completion_tokens"
              label="Max Completion Tokens"
              help="Maximum number of completion tokens. Leave empty to remove this parameter."
            >
              <InputNumber
                min={1}
                placeholder="1000"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="top_p"
              label="Top P"
              help="Nucleus sampling parameter (0.0 to 1.0). Leave empty to remove this parameter."
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

            <Form.Item
              name="frequency_penalty"
              label="Frequency Penalty"
              help="Penalize frequent tokens (-2.0 to 2.0). Leave empty to remove this parameter."
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

            <Form.Item
              name="presence_penalty"
              label="Presence Penalty"
              help="Penalize present tokens (-2.0 to 2.0). Leave empty to remove this parameter."
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

            <Form.Item
              name="n"
              label="Number of Responses"
              help="Number of completions to generate. Leave empty to remove this parameter."
            >
              <InputNumber
                min={1}
                max={10}
                placeholder="1"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="stop"
              label="Stop Sequences"
              help="Comma-separated stop sequences. Leave empty to remove this parameter."
            >
              <Input placeholder="\\n, ." />
            </Form.Item>

            <Form.Item
              name="seed"
              label="Seed"
              help="Random seed for reproducible results. Leave empty to remove this parameter."
            >
              <InputNumber
                placeholder="12345"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="logprobs"
              label="Return Log Probabilities"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="top_logprobs"
              label="Top Log Probabilities"
              help="Number of most likely tokens to return. Leave empty to remove this parameter."
            >
              <InputNumber
                min={0}
                max={20}
                placeholder="0"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="timeout"
              label="Timeout (seconds)"
              help="Request timeout in seconds. Leave empty to remove this parameter."
            >
              <InputNumber
                min={1}
                placeholder="60"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="extra_body_json"
              label="Extra Body Parameters"
              help="Additional request body parameters in JSON format. Leave empty to remove this parameter."
            >
              <TextArea
                rows={4}
                placeholder='{"custom_param": "value"}'
              />
            </Form.Item>
          </Panel>
        </Collapse>
      </Form>
    </Modal>
  );
};

export default ModelForm;