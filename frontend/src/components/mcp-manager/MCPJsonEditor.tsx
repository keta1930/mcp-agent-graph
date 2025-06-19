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

const cleanServerConfigForEditor = (config: any): any => {
  const transportType = config.transportType || 'stdio';
  
  const cleanConfig: any = {
    autoApprove: Array.isArray(config.autoApprove) ? config.autoApprove.filter((item: any) => item && typeof item === 'string') : [],
    disabled: Boolean(config.disabled),
    timeout: Number(config.timeout) || 60,
    transportType: transportType,
  };

  if (transportType === 'stdio') {
    if (config.command && typeof config.command === 'string') {
      cleanConfig.command = config.command;
    }
    if (Array.isArray(config.args) && config.args.length > 0) {
      cleanConfig.args = config.args.filter((arg: any) => arg && typeof arg === 'string');
    }
  } else if (transportType === 'sse' || transportType === 'streamable_http') {
    // 修复：为 sse 和 streamable_http 都保留 url 字段
    if (config.url && typeof config.url === 'string') {
      cleanConfig.url = config.url;
    }
  }

  // 添加：保留 ai_generated 字段
  if (config.ai_generated === true) {
    cleanConfig.ai_generated = true;
  }

  if (config.env && typeof config.env === 'object' && !Array.isArray(config.env) && Object.keys(config.env).length > 0) {
    cleanConfig.env = config.env;
  }

  return cleanConfig;
};

const cleanFullConfigForEditor = (config: any): MCPConfig => {
  const cleanedServers: Record<string, any> = {};
  
  if (config && config.mcpServers && typeof config.mcpServers === 'object') {
    Object.keys(config.mcpServers).forEach(serverName => {
      cleanedServers[serverName] = cleanServerConfigForEditor(config.mcpServers[serverName]);
    });
  }

  return {
    mcpServers: cleanedServers
  };
};

const MCPJsonEditor: React.FC<MCPJsonEditorProps> = ({
  config,
  onSave,
  loading
}) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const cleanedConfig = cleanFullConfigForEditor(config);
      const formatted = JSON.stringify(cleanedConfig, null, 2);
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
      const cleaned = cleanFullConfigForEditor(parsed);
      const formatted = JSON.stringify(cleaned, null, 2);
      setJsonText(formatted);
      setError(null);
      message.success('JSON 格式化并清理完成');
    } catch {
      setError('无法格式化 JSON: 格式无效');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
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

      const cleanedConfig = cleanFullConfigForEditor(configToSave);
      await Promise.all([
        onSave(cleanedConfig as MCPConfig),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
      
    } catch (err) {
      const errorMsg = `Failed to save configuration: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMsg);
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setSaving(false);
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
          <Tooltip title="Edit the JSON configuration directly. The configuration will be validated and cleaned before saving.">
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
          Format & Clean JSON
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
          disabled={!!error || loading || saving}
          loading={loading || saving}
          className="json-editor-save-btn"
        >
          Save Configuration
        </Button>
      </div>

      <div style={{ marginTop: '16px', color: '#666', fontSize: '14px' }}>
        <p>Configuration will be automatically cleaned to remove unnecessary fields before saving.</p>
      </div>
    </div>
  );
};

export default MCPJsonEditor;