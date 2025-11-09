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

  // 保留 provider 信息字段（团队共享，标记提供者）
  if (config.provider_user_id && typeof config.provider_user_id === 'string') {
    cleanConfig.provider_user_id = config.provider_user_id;
  }
  if (config.provider_username && typeof config.provider_username === 'string') {
    cleanConfig.provider_username = config.provider_username;
  }
  if (config.created_at && typeof config.created_at === 'string') {
    cleanConfig.created_at = config.created_at;
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
      setError('无效的JSON配置');
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
      message.success('JSON格式化并清理完成');
    } catch {
      setError('无法格式化JSON: 格式无效');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const configToSave = JSON.parse(jsonText);

      // Basic validation for MCP config structure
      if (!configToSave || typeof configToSave !== 'object' || Array.isArray(configToSave)) {
        setError('无效的MCP配置: 配置必须是一个对象');
        return;
      }
      
      const typedConfig = configToSave as Record<string, unknown>;
      
      if (!typedConfig.mcpServers || typeof typedConfig.mcpServers !== 'object' || Array.isArray(typedConfig.mcpServers)) {
        setError('无效的MCP配置: 缺少mcpServers属性或它不是一个对象');
        return;
      }

      // Validate each server has required properties
      const mcpServers = typedConfig.mcpServers as Record<string, Record<string, unknown>>;
      for (const [serverName, server] of Object.entries(mcpServers)) {
        if (!server.transportType) {
          setError(`服务器 "${serverName}" 缺少必需属性: transportType`);
          return;
        }
      }

      const cleanedConfig = cleanFullConfigForEditor(configToSave);
      await Promise.all([
        onSave(cleanedConfig as MCPConfig),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);

    } catch (err: any) {
      if (err.isVersionConflict) {
        const errorMsg = `版本冲突：配置已被其他用户修改。页面已自动刷新最新配置，请重新检查后再保存。`;
        message.error({
          content: errorMsg,
          duration: 5
        });
      } else {
        const errorMsg = `保存配置失败: ${err instanceof Error ? err.message : String(err)}`;
        setError(errorMsg);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText).then(() => {
      setCopied(true);
      message.success('JSON已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="json-editor-container">
      <div className="json-editor-header">
        <div className="json-editor-title">
          <span>编辑MCP配置JSON</span>
          <Tooltip title="直接编辑JSON配置。配置将在保存前进行验证和清理。">
            <InfoCircleOutlined style={{ marginLeft: '8px', color: '#1890ff' }} />
          </Tooltip>
        </div>
      </div>

      {error && (
        <Alert
          message="错误"
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
          格式化并清理JSON
        </Button>

        <Button
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopy}
        >
          {copied ? '已复制' : '复制'}
        </Button>

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          disabled={!!error || loading || saving}
          loading={loading || saving}
          className="json-editor-save-btn"
        >
          保存配置
        </Button>
      </div>

      <div style={{ marginTop: '16px', color: '#666', fontSize: '14px' }}>
        <p>配置将在保存前自动清理，移除不必要的字段。</p>
      </div>
    </div>
  );
};

export default MCPJsonEditor;