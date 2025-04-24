// src/components/model-manager/ModelForm.tsx
import React from 'react';
import { Form, Input, Modal, Button } from 'antd';
import { ModelConfig } from '../../types/model';

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
      form.setFieldsValue(initialValues);
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, initialValues, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSubmit(values as ModelConfig);
      form.resetFields();
    });
  };

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
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
        initialValues={initialValues}
      >
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
          rules={[{ required: true, message: 'Please input API key!' }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="model"
          label="Model Identifier"
          rules={[{ required: true, message: 'Please input model identifier!' }]}
        >
          <Input placeholder="gpt-4" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModelForm;