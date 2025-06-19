// src/components/mcp-manager/AIToolGeneratorForm.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Card, message } from 'antd';
import { RobotOutlined, BulbOutlined } from '@ant-design/icons';
import { useMCPStore } from '../../store/mcpStore';
import MarkdownRenderer from '../common/MarkdownRenderer';

const { TextArea } = Input;

interface AIToolGeneratorFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  models: Array<{ name: string; [key: string]: any }>;
}

const AIToolGeneratorForm: React.FC<AIToolGeneratorFormProps> = ({
  visible,
  onClose,
  onSuccess,
  models
}) => {
  const [form] = Form.useForm();
  const [showTemplate, setShowTemplate] = useState(false);
  const { 
    generateMCPTool, 
    fetchGeneratorTemplate, 
    generatorTemplate, 
    loading 
  } = useMCPStore();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const result = await generateMCPTool(values.requirement, values.modelName);
      
      if (result.status === 'success') {
        message.success(`AI工具 "${result.tool_name}" 生成成功！`);
        form.resetFields();
        onSuccess();
      } else {
        message.error(result.error || '生成失败');
      }
    } catch (error) {
      message.error('生成工具时出错: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleShowTemplate = async () => {
    if (!generatorTemplate) {
      await fetchGeneratorTemplate();
    }
    setShowTemplate(true);
  };

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <RobotOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
            AI生成MCP工具
          </div>
        }
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="template" icon={<BulbOutlined />} onClick={handleShowTemplate}>
            查看提示词模板
          </Button>,
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} loading={loading}>
            生成工具
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="modelName"
            label="选择模型"
            rules={[{ required: true, message: '请选择模型!' }]}
          >
            <Select placeholder="选择用于生成的模型">
              {models.map(model => (
                <Select.Option key={model.name} value={model.name}>
                  {model.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="requirement"
            label="工具需求描述"
            rules={[{ required: true, message: '请输入工具需求!' }]}
          >
            <TextArea
              rows={6}
              placeholder="请详细描述您需要的MCP工具功能，例如：&#10;- 创建一个可以查询天气信息的工具&#10;- 需要支持城市名称查询&#10;- 返回温度、湿度、天气状况等信息"
            />
          </Form.Item>
        </Form>

        <Card size="small" style={{ marginTop: '16px', backgroundColor: '#f8f9fa' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <p><strong>提示：</strong></p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>请详细描述工具的功能和用途</li>
              <li>说明需要的输入参数和输出格式</li>
              <li>AI将自动生成完整的MCP服务器代码</li>
              <li>生成后工具将自动注册并可立即使用</li>
            </ul>
          </div>
        </Card>
      </Modal>

      <Modal
        title="MCP生成提示词模板"
        open={showTemplate}
        onCancel={() => setShowTemplate(false)}
        footer={[
          <Button key="close" onClick={() => setShowTemplate(false)}>
            关闭
          </Button>
        ]}
        width={1000}
      >
        <MarkdownRenderer
          content={generatorTemplate}
          title="MCP生成提示词模板"
          showCopyButton={true}
        />
      </Modal>
    </>
  );
};

export default AIToolGeneratorForm;