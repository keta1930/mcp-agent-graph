// src/components/mcp-manager/MCPServerForm.tsx
import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Switch, Select, Modal, Button, Typography } from 'antd';
import { MCPServerConfig } from '../../types/mcp';

const { TextArea } = Input;
const { Text } = Typography;

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
  const transportType = Form.useWatch('transportType', form);

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        const formValues = { ...initialValues };
        if (formValues.env && Object.keys(formValues.env).length > 0) {
          const envText = Object.entries(formValues.env)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
          formValues.envText = envText;
        }
        form.setFieldsValue(formValues);
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
      const { serverName, envText, ...serverConfig } = values;

      // Convert string arrays
      if (typeof serverConfig.args === 'string') {
        serverConfig.args = serverConfig.args.split(',').map((arg: string) => arg.trim()).filter((arg: string) => arg);
      } else if (!Array.isArray(serverConfig.args)) {
        serverConfig.args = [];
      }

      if (typeof serverConfig.autoApprove === 'string') {
        serverConfig.autoApprove = serverConfig.autoApprove.split(',').map((tool: string) => tool.trim()).filter((tool: string) => tool);
      } else if (!Array.isArray(serverConfig.autoApprove)) {
        serverConfig.autoApprove = [];
      }

      if (envText && envText.trim()) {
        const env: Record<string, string> = {};
        const lines = envText.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && trimmedLine.includes('=')) {
            const [key, ...valueParts] = trimmedLine.split('=');
            const value = valueParts.join('=');
            if (key.trim() && value.trim()) {
              env[key.trim()] = value.trim();
            }
          }
        }
        if (Object.keys(env).length > 0) {
          serverConfig.env = env;
        }
      }

      if (serverConfig.transportType === 'sse') {
        delete serverConfig.command;
        delete serverConfig.args;
        delete serverConfig.base_url;
      } else if (serverConfig.transportType === 'stdio') {
        delete serverConfig.url;
        delete serverConfig.base_url;
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
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          提交
        </Button>,
      ]}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        name="mcpServerForm"
      >
        <Form.Item
          name="serverName"
          label="服务器名称"
          initialValue={initialName}
          rules={[{ required: true, message: '请输入服务器名称!' }]}
        >
          <Input disabled={!!initialName} />
        </Form.Item>

        <Form.Item
          name="disabled"
          label="禁用状态"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="timeout"
          label="超时时间（秒）"
          rules={[{ required: true, message: '请输入超时时间!' }]}
        >
          <InputNumber min={1} max={300} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="transportType"
          label="传输类型"
          rules={[{ required: true, message: '请选择传输类型!' }]}
        >
          <Select>
            <Select.Option value="stdio">STDIO</Select.Option>
            <Select.Option value="sse">SSE</Select.Option>
            <Select.Option value="streamable_http">流式HTTP</Select.Option>
          </Select>
        </Form.Item>

        {/* STDIO specific fields */}
        {transportType === 'stdio' && (
          <>
            <Form.Item
              name="command"
              label="命令"
              rules={[{ required: true, message: '请输入命令!' }]}
            >
              <Input placeholder="python -m mcp_server" />
            </Form.Item>

            <Form.Item
              name="args"
              label="参数（逗号分隔）"
            >
              <Input placeholder="--arg1, --arg2" />
            </Form.Item>
          </>
        )}

        {/* SSE specific fields */}
        {(transportType === 'sse' || transportType === 'streamable_http') && (
          <Form.Item
            name="url"
            label={transportType === 'sse' ? 'SSE地址' : 'HTTP地址'}
            rules={[{ required: true, message: '请输入URL!' }]}
          >
            <Input placeholder={
              transportType === 'sse' 
                ? "https://mcp.api-inference.modelscope.cn/bd902138dc1a4d/sse" 
                : "https://fastmcp.cloud/mcp"
            } />
          </Form.Item>
        )}

        <Form.Item
          name="autoApprove"
          label="自动批准的工具（逗号分隔）"
        >
          <Input placeholder="tool1, tool2" />
        </Form.Item>

        <Form.Item
          name="envText"
          label={
            <div>
              <Text>环境变量</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                每行一个，格式为 KEY=VALUE （例如：API_KEY=your-key-here）
              </Text>
            </div>
          }
        >
          <TextArea
            rows={4}
            placeholder={`TAVILY_API_KEY=your-api-key-here
OPENAI_API_KEY=your-openai-key
DATABASE_URL=your-database-url`}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MCPServerForm;