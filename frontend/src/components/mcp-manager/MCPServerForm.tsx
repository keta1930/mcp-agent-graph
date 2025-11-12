// src/components/mcp-manager/MCPServerForm.tsx
import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Switch, Select, Modal, Button, Typography, ConfigProvider } from 'antd';
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
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

      // 等待异步 onSubmit 完成，如果抛出错误会被外层 catch 捕获
      await onSubmit(serverName, serverConfig as MCPServerConfig);
      form.resetFields();
    } catch (error) {
      // 表单验证错误或 onSubmit 抛出的错误（包括版本冲突）
      // 错误已在父组件处理（MCPManager），这里不重复处理
      // 不重置表单，保留用户输入
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#b85845',
          colorPrimaryHover: '#a0826d',
        },
      }}
    >
      <Modal
        title={title}
        open={visible}
        onCancel={onClose}
      footer={[
        <Button
          key="cancel"
          onClick={onClose}
          style={{
            height: '36px',
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            background: 'rgba(255, 255, 255, 0.85)',
            color: '#8b7355',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.3px',
            boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)',
            transition: 'all 0.3s ease'
          }}
        >
          取消
        </Button>,
        <Button
          key="submit"
          onClick={handleSubmit}
          style={{
            height: '36px',
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.3px',
            boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
          }}
        >
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
    </ConfigProvider>
  );
};

export default MCPServerForm;