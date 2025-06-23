// src/components/mcp-manager/MCPToolsViewer.tsx
import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Tabs, 
  Card, 
  Typography, 
  Descriptions, 
  Form, 
  Input, 
  InputNumber, 
  Switch, 
  Button, 
  message,
  Alert,
  Spin,
  Space
} from 'antd';
import { PlayCircleOutlined, BugOutlined } from '@ant-design/icons';
import { useMCPStore } from '../../store/mcpStore';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface MCPToolsViewerProps {
  visible: boolean;
  onClose: () => void;
  serverName: string;
}

// 根据JSON Schema生成表单项
const generateFormItem = (name: string, schema: any) => {
  const { type, description, format, minimum, maximum, items } = schema;

  switch (type) {
    case 'string':
      if (format === 'uri') {
        return (
          <Form.Item 
            name={name} 
            label={name}
            tooltip={description}
            rules={[{ type: 'url', message: '请输入有效的URL' }]}
          >
            <Input placeholder={description || '输入URL'} />
          </Form.Item>
        );
      }
      return (
        <Form.Item 
          name={name} 
          label={name}
          tooltip={description}
        >
          <Input placeholder={description || `输入 ${name}`} />
        </Form.Item>
      );
    
    case 'integer':
    case 'number':
      return (
        <Form.Item 
          name={name} 
          label={name}
          tooltip={description}
        >
          <InputNumber 
            style={{ width: '100%' }}
            min={minimum}
            max={maximum}
            placeholder={description || `输入 ${name}`}
          />
        </Form.Item>
      );
    
    case 'boolean':
      return (
        <Form.Item 
          name={name} 
          label={name}
          tooltip={description}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      );
    
    case 'array':
      return (
        <Form.Item 
          name={name} 
          label={name}
          tooltip={description}
        >
          <TextArea 
            rows={3}
            placeholder={`${description || `输入 ${name}`} (每行一项)`}
          />
        </Form.Item>
      );
    
    case 'object':
      return (
        <Form.Item 
          name={name} 
          label={name}
          tooltip={description}
        >
          <TextArea 
            rows={4}
            placeholder={`${description || `输入 ${name}`} (JSON格式)`}
          />
        </Form.Item>
      );
    
    default:
      return (
        <Form.Item 
          name={name} 
          label={name}
          tooltip={description}
        >
          <Input placeholder={description || `输入 ${name}`} />
        </Form.Item>
      );
  }
};

const MCPToolsViewer: React.FC<MCPToolsViewerProps> = ({
  visible,
  onClose,
  serverName,
}) => {
  const { tools, fetchTools, testTool } = useMCPStore();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [forms] = useState(() => new Map());

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchTools().finally(() => setLoading(false));
    }
  }, [visible, fetchTools]);

  const serverTools = tools[serverName] || [];

  const handleTest = async (toolName: string) => {
    const form = forms.get(toolName);
    if (!form) return;

    try {
      setTestLoading(true);
      const values = await form.validateFields();
      
      // 处理特殊类型的参数
      const processedParams: Record<string, any> = {};
      
      Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        
        // 处理数组类型
        if (typeof value === 'string' && value.includes('\n')) {
          processedParams[key] = value.split('\n').filter(line => line.trim());
        }
        // 处理JSON对象
        else if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            processedParams[key] = JSON.parse(value);
          } catch {
            processedParams[key] = value;
          }
        }
        else {
          processedParams[key] = value;
        }
      });

      const result = await testTool(serverName, toolName, processedParams);
      
      setTestResults(prev => ({
        ...prev,
        [toolName]: result
      }));

      if (result.status === 'success') {
        message.success(`工具 "${toolName}" 测试成功`);
      } else {
        message.error(`工具 "${toolName}" 测试失败: ${result.error}`);
      }
    } catch (error) {
      message.error('测试工具时出错: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setTestLoading(false);
    }
  };

  // 渲染JSON对象
  const renderJsonObject = (obj: any) => {
    if (!obj) return <span>null</span>;
    return (
      <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
        {JSON.stringify(obj, null, 2)}
      </pre>
    );
  };

  // 为每个工具生成测试表单
  const generateTestForm = (tool: any) => {
    const schema = tool.input_schema;
    if (!schema || !schema.properties) {
      return <Text type="secondary">该工具无需参数</Text>;
    }

    const formItems = Object.entries(schema.properties).map(([name, propSchema]: [string, any]) => 
      generateFormItem(name, propSchema)
    );

    return (
      <Form
        layout="vertical"
        ref={(formRef: any) => {
          if (formRef) forms.set(tool.name, formRef);
        }}
      >
        {formItems}
        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => handleTest(tool.name)}
              loading={testLoading}
            >
              测试工具
            </Button>
          </Space>
        </Form.Item>
      </Form>
    );
  };

  // 渲染测试结果
  const renderTestResult = (toolName: string) => {
    const result = testResults[toolName];
    if (!result) return null;

    return (
      <Card 
        size="small" 
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <BugOutlined style={{ marginRight: '8px' }} />
            测试结果
          </div>
        }
        style={{ marginTop: '16px' }}
      >
        {result.status === 'success' ? (
          <Alert 
            type="success" 
            message="测试成功" 
            description={
              <div>
                <p><strong>执行时间:</strong> {result.execution_time?.toFixed(3)}秒</p>
                <p><strong>返回结果:</strong></p>
                <div style={{ background: '#f6ffed', padding: '8px', borderRadius: '4px' }}>
                  {typeof result.result === 'string' ? (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{result.result}</pre>
                  ) : (
                    renderJsonObject(result.result)
                  )}
                </div>
              </div>
            }
          />
        ) : (
          <Alert 
            type="error" 
            message="测试失败" 
            description={
              <div>
                <p><strong>错误信息:</strong> {result.error}</p>
                {result.execution_time && (
                  <p><strong>执行时间:</strong> {result.execution_time.toFixed(3)}秒</p>
                )}
              </div>
            }
          />
        )}
      </Card>
    );
  };

  return (
    <Modal
      title={`工具测试器 - ${serverName}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      {loading ? (
        <div className="text-center py-4">
          <Spin size="large" />
          <p>加载工具中...</p>
        </div>
      ) : serverTools.length === 0 ? (
        <div className="text-center py-4">无可用工具</div>
      ) : (
        <Tabs
          type="card"
          items={serverTools.map(tool => ({
            key: tool.name,
            label: tool.name,
            children: (
              <div>
                <Descriptions column={1} bordered style={{ marginBottom: '16px' }}>
                  <Descriptions.Item label="工具名称">
                    <Text strong>{tool.name}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="功能描述">
                    {tool.description}
                  </Descriptions.Item>
                  <Descriptions.Item label="参数结构">
                    {renderJsonObject(tool.input_schema)}
                  </Descriptions.Item>
                </Descriptions>

                <Card title="参数测试" size="small">
                  {generateTestForm(tool)}
                  {renderTestResult(tool.name)}
                </Card>
              </div>
            )
          }))}
        />
      )}
    </Modal>
  );
};

export default MCPToolsViewer;