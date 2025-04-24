// src/components/mcp-manager/MCPServerForm.tsx
import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Switch, Select, Modal, Button } from 'antd';
import { MCPServerConfig } from '../../types/mcp';

interface MCPServerFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (serverName: string, config: MCPServerConfig) => void;
  initialName?: string;
  initialValues?: MCPServerConfig;
  title: string;
}

const MCPServerForm: React.FC<MCPServerFormProps> = ({
  visible,
  onClose,
  onSubmit,
  initialName = '',
  initialValues,
  title,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
        // Set default values
        form.setFieldsValue({
          disabled: false,
          timeout: 60,
          args: [],
          autoApprove: [],
          transportType: 'stdio',
        });
      }
    }
  }, [visible, initialValues, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const { serverName, ...serverConfig } = values;

      // Convert string arrays
      if (typeof serverConfig.args === 'string') {
        serverConfig.args = serverConfig.args.split(',').map(arg => arg.trim());
      }

      if (typeof serverConfig.autoApprove === 'string') {
        serverConfig.autoApprove = serverConfig.autoApprove.split(',').map(tool => tool.trim());
      }

      onSubmit(serverName, serverConfig as MCPServerConfig);
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
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        name="mcpServerForm"
      >
        <Form.Item
          name="serverName"
          label="Server Name"
          initialValue={initialName}
          rules={[{ required: true, message: 'Please input server name!' }]}
        >
          <Input disabled={!!initialName} />
        </Form.Item>

        <Form.Item
          name="disabled"
          label="Disabled"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="timeout"
          label="Timeout (seconds)"
          rules={[{ required: true, message: 'Please input timeout!' }]}
        >
          <InputNumber min={1} max={300} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="transportType"
          label="Transport Type"
          rules={[{ required: true, message: 'Please select transport type!' }]}
        >
          <Select>
            <Select.Option value="stdio">STDIO</Select.Option>
            <Select.Option value="http">HTTP</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="command"
          label="Command"
          rules={[{ required: true, message: 'Please input command!' }]}
        >
          <Input placeholder="python -m mcp_server" />
        </Form.Item>

        <Form.Item
          name="args"
          label="Arguments (comma separated)"
        >
          <Input placeholder="--arg1, --arg2" />
        </Form.Item>

        <Form.Item
          name="autoApprove"
          label="Auto Approve Tools (comma separated)"
        >
          <Input placeholder="tool1, tool2" />
        </Form.Item>

        <Form.Item
          name="base_url"
          label="Base URL (for HTTP transport)"
          dependencies={['transportType']}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (getFieldValue('transportType') === 'http' && !value) {
                  return Promise.reject(new Error('Base URL is required for HTTP transport!'));
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input placeholder="http://localhost:8080" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MCPServerForm;