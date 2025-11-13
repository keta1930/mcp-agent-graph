// src/components/mcp-manager/MCPServerForm.tsx
import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Switch, Select, Modal, Button, Typography, ConfigProvider } from 'antd';
import { MCPServerConfig } from '../../types/mcp';
import { useT } from '../../i18n/hooks';

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
  const t = useT();
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
          colorBorder: 'rgba(139, 115, 85, 0.2)',
          colorBorderSecondary: 'rgba(139, 115, 85, 0.15)',
          colorText: '#2d2d2d',
          colorTextPlaceholder: 'rgba(45, 45, 45, 0.35)',
          borderRadius: 6,
          controlHeight: 40,
        },
        components: {
          Input: {
            activeBorderColor: '#b85845',
            hoverBorderColor: 'rgba(184, 88, 69, 0.4)',
            activeShadow: '0 0 0 2px rgba(184, 88, 69, 0.1)',
          },
          InputNumber: {
            activeBorderColor: '#b85845',
            hoverBorderColor: 'rgba(184, 88, 69, 0.4)',
            activeShadow: '0 0 0 2px rgba(184, 88, 69, 0.1)',
          },
          Select: {
            optionSelectedBg: 'rgba(184, 88, 69, 0.08)',
            optionActiveBg: 'rgba(184, 88, 69, 0.05)',
          },
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
          {t('common.cancel')}
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
          {t('common.submit')}
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
          label={t('pages.mcpManager.form.serverName')}
          initialValue={initialName}
          rules={[{ required: true, message: t('pages.mcpManager.form.serverNameRequired') }]}
        >
          <Input disabled={!!initialName} />
        </Form.Item>

        <Form.Item
          name="disabled"
          label={t('pages.mcpManager.form.disabled')}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="timeout"
          label={t('pages.mcpManager.form.timeout')}
          rules={[{ required: true, message: t('pages.mcpManager.form.timeoutRequired') }]}
        >
          <InputNumber min={1} max={300} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="transportType"
          label={t('pages.mcpManager.form.transportType')}
          rules={[{ required: true, message: t('pages.mcpManager.form.transportTypeRequired') }]}
        >
          <Select>
            <Select.Option value="stdio">{t('pages.mcpManager.form.transportStdio')}</Select.Option>
            <Select.Option value="sse">{t('pages.mcpManager.form.transportSse')}</Select.Option>
            <Select.Option value="streamable_http">{t('pages.mcpManager.form.transportHttp')}</Select.Option>
          </Select>
        </Form.Item>

        {/* STDIO specific fields */}
        {transportType === 'stdio' && (
          <>
            <Form.Item
              name="command"
              label={t('pages.mcpManager.form.command')}
              rules={[{ required: true, message: t('pages.mcpManager.form.commandRequired') }]}
            >
              <Input placeholder={t('pages.mcpManager.form.commandPlaceholder')} />
            </Form.Item>

            <Form.Item
              name="args"
              label={t('pages.mcpManager.form.args')}
            >
              <Input placeholder={t('pages.mcpManager.form.argsPlaceholder')} />
            </Form.Item>
          </>
        )}

        {/* SSE specific fields */}
        {(transportType === 'sse' || transportType === 'streamable_http') && (
          <Form.Item
            name="url"
            label={transportType === 'sse' ? t('pages.mcpManager.form.sseUrl') : t('pages.mcpManager.form.httpUrl')}
            rules={[{ required: true, message: t('pages.mcpManager.form.urlRequired') }]}
          >
            <Input placeholder={
              transportType === 'sse' 
                ? t('pages.mcpManager.form.sseUrlPlaceholder')
                : t('pages.mcpManager.form.httpUrlPlaceholder')
            } />
          </Form.Item>
        )}

        <Form.Item
          name="autoApprove"
          label={t('pages.mcpManager.form.autoApprove')}
        >
          <Input placeholder={t('pages.mcpManager.form.autoApprovePlaceholder')} />
        </Form.Item>

        <Form.Item
          name="envText"
          label={
            <div>
              <Text>{t('pages.mcpManager.form.envVars')}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {t('pages.mcpManager.form.envVarsHelp')}
              </Text>
            </div>
          }
        >
          <TextArea
            rows={4}
            placeholder={t('pages.mcpManager.form.envVarsPlaceholder')}
          />
        </Form.Item>
      </Form>
    </Modal>
    </ConfigProvider>
  );
};

export default MCPServerForm;
