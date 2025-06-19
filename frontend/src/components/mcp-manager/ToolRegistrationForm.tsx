// src/components/mcp-manager/ToolRegistrationForm.tsx
import React, { useState } from 'react';
import { Modal, Form, Input, InputNumber, Alert, Button, message, Card } from 'antd';
import { ToolOutlined, WarningOutlined } from '@ant-design/icons';
import { useMCPStore } from '../../store/mcpStore';

const { TextArea } = Input;

interface ToolRegistrationFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ToolRegistrationForm: React.FC<ToolRegistrationFormProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const { registerMCPTool, getUsedPorts, loading } = useMCPStore();
  const [usedPorts] = useState(() => getUsedPorts());

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 解析脚本文件
      const scriptFiles: Record<string, string> = {};
      if (values.mainScript && values.mainScriptName) {
        scriptFiles[values.mainScriptName] = values.mainScript;
      }

      await registerMCPTool({
        folder_name: values.folderName,
        script_files: scriptFiles,
        readme: values.readme || '# MCP Tool\n\n手动注册的MCP工具',
        dependencies: values.dependencies || '',
        port: values.port
      });

      message.success(`工具 "${values.folderName}" 注册成功！`);
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error('注册工具时出错: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ToolOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
          注册MCP工具
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
          注册工具
        </Button>,
      ]}
      width={800}
    >
      {usedPorts.length > 0 && (
        <Alert
          message="端口占用提醒"
          description={`以下端口已被占用: ${usedPorts.join(', ')}。请选择其他端口。`}
          type="warning"
          icon={<WarningOutlined />}
          style={{ marginBottom: '16px' }}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="folderName"
          label="工具文件夹名称"
          rules={[
            { required: true, message: '请输入文件夹名称!' },
            { pattern: /^[a-z0-9_]+$/, message: '只能包含小写字母、数字和下划线!' }
          ]}
        >
          <Input placeholder="tool_name_server" />
        </Form.Item>

        <Form.Item
          name="port"
          label="端口号"
          rules={[
            { required: true, message: '请输入端口号!' },
            { type: 'number', min: 8001, max: 9099, message: '端口号必须在8001-9099范围内!' }
          ]}
        >
          <InputNumber 
            style={{ width: '100%' }} 
            placeholder="选择未占用的端口号"
            min={8001}
            max={9099}
          />
        </Form.Item>

        <Form.Item
          name="mainScriptName"
          label="主脚本文件名"
          rules={[{ required: true, message: '请输入脚本文件名!' }]}
          initialValue="main_server.py"
        >
          <Input placeholder="main_server.py" />
        </Form.Item>

        <Form.Item
          name="mainScript"
          label="主脚本内容"
          rules={[{ required: true, message: '请输入脚本内容!' }]}
        >
          <TextArea
            rows={12}
            placeholder="输入完整的FastMCP服务器代码..."
            style={{ fontFamily: 'Monaco, "Courier New", monospace', fontSize: '12px' }}
          />
        </Form.Item>

        <Form.Item
          name="dependencies"
          label="依赖包"
        >
          <Input placeholder="fastmcp requests pandas" />
        </Form.Item>

        <Form.Item
          name="readme"
          label="README内容"
        >
          <TextArea
            rows={4}
            placeholder="工具说明文档（可选）"
          />
        </Form.Item>
      </Form>

      <Card size="small" style={{ backgroundColor: '#f8f9fa' }}>
        <div style={{ fontSize: '12px', color: '#666' }}>
          <p><strong>注意事项：</strong></p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>工具将在指定端口上运行</li>
            <li>确保脚本内容完整且可执行</li>
            <li>系统将自动创建虚拟环境并安装依赖</li>
            <li>注册后工具将自动连接并可立即使用</li>
          </ul>
        </div>
      </Card>
    </Modal>
  );
};

export default ToolRegistrationForm;