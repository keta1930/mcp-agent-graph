// src/components/mcp-manager/MCPJsonEditor.tsx
import React, { useState, useEffect } from 'react';
import { Button, message, Alert, Card, Tooltip } from 'antd';
import { 
  CheckOutlined, 
  CopyOutlined, 
  SaveOutlined, 
  FormatPainterOutlined, 
  InfoCircleOutlined,
  WarningOutlined 
} from '@ant-design/icons';
import { MCPConfig } from '../../types/mcp';
import Editor from "@monaco-editor/react";

interface MCPJsonEditorProps {
  config: MCPConfig;
  onSave: (config: MCPConfig) => Promise<void>;
  loading: boolean;
}

const MCPJsonEditor: React.FC<MCPJsonEditorProps> = ({
  config,
  onSave,
  loading
}) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Format the config to pretty-printed JSON
  useEffect(() => {
    try {
      const formatted = JSON.stringify(config, null, 2);
      setJsonText(formatted);
      setError(null);
    } catch {
      setError('Invalid JSON configuration');
    }
  }, [config]);

  const handleJsonTextChange = (value: string | undefined) => {
    const newValue = value || '';
    setJsonText(newValue);
    setCopied(false);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      setError(null);
      message.success('JSON 格式化成功');
    } catch {
      setError('无法格式化 JSON: 格式无效');
    }
  };

  const handleSave = async () => {
    try {
      const configToSave = JSON.parse(jsonText);

      // Basic validation for MCP config structure
      if (!configToSave || typeof configToSave !== 'object' || Array.isArray(configToSave)) {
        setError('Invalid MCP configuration: configuration must be an object');
        return;
      }
      
      const typedConfig = configToSave as Record<string, unknown>;
      
      if (!typedConfig.mcpServers || typeof typedConfig.mcpServers !== 'object' || Array.isArray(typedConfig.mcpServers)) {
        setError('Invalid MCP configuration: missing mcpServers property or it is not an object');
        return;
      }

      // Validate each server has required properties
      const mcpServers = typedConfig.mcpServers as Record<string, Record<string, unknown>>;
      for (const [serverName, server] of Object.entries(mcpServers)) {
        if (!server.transportType) {
          setError(`Server "${serverName}" is missing required property: transportType`);
          return;
        }
      }

      await onSave(configToSave as MCPConfig);
      message.success('Configuration saved successfully');
    } catch (err) {
      setError(`Failed to save configuration: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText).then(() => {
      setCopied(true);
      message.success('JSON copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="json-editor-container">
      <div className="json-editor-header">
        <div className="json-editor-title">
          <span>Edit MCP Configuration JSON</span>
          <Tooltip title="Edit the JSON configuration directly. The configuration will be validated before saving.">
            <InfoCircleOutlined style={{ marginLeft: '8px', color: '#1890ff' }} />
          </Tooltip>
        </div>
      </div>

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          icon={<WarningOutlined />}
          closable
          onClose={() => setError(null)}
          style={{ margin: '12px 0' }}
        />
      )}

      <Card 
        bodyStyle={{ padding: '0' }}
        className="json-editor-card"
      >
        <Editor
          height="600px"
          defaultLanguage="json"
          value={jsonText}
          onChange={handleJsonTextChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            formatOnPaste: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
            folding: true,
            showFoldingControls: 'always',
            lineNumbers: 'on',
          }}
          theme="vs-dark"
        />
      </Card>

      <div className="json-editor-actions">
        <Button
          icon={<FormatPainterOutlined />}
          onClick={formatJson}
          className="json-editor-format-btn"
        >
          Format JSON
        </Button>

        <Button
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopy}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          disabled={!!error || loading}
          loading={loading}
          className="json-editor-save-btn"
        >
          Save Configuration
        </Button>
      </div>

      <div style={{ marginTop: '16px', color: '#666', fontSize: '14px' }}>
      </div>
    </div>
  );
};

export default MCPJsonEditor;