// src/components/mcp-manager/MCPJsonEditor.tsx
import React, { useState, useEffect } from 'react';
import { Button, message, Alert, Card, Tooltip } from 'antd';
import {
  Check,
  Copy,
  Save,
  Paintbrush,
  Info,
  AlertTriangle
} from 'lucide-react';
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
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <span style={{
          fontSize: '16px',
          fontWeight: 500,
          color: '#2d2d2d',
          letterSpacing: '0.5px'
        }}>
          编辑MCP配置JSON
        </span>
        <Tooltip title="直接编辑JSON配置。配置将在保存前进行验证和清理。">
          <Info size={16} strokeWidth={1.5} style={{ color: '#8b7355', cursor: 'pointer' }} />
        </Tooltip>
      </div>

      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          icon={<AlertTriangle size={16} strokeWidth={1.5} />}
          closable
          onClose={() => setError(null)}
          style={{
            margin: '0 0 16px 0',
            borderRadius: '6px',
            border: '1px solid rgba(184, 88, 69, 0.3)',
            background: 'rgba(255, 245, 243, 0.9)'
          }}
        />
      )}

      <Card
        style={{
          borderRadius: '6px',
          border: '1px solid rgba(139, 115, 85, 0.15)',
          boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
          background: 'rgba(255, 255, 255, 0.85)',
          overflow: 'hidden'
        }}
        styles={{
          body: { padding: '0' }
        }}
      >
        <Editor
          height="600px"
          defaultLanguage="json"
          value={jsonText}
          onChange={handleJsonTextChange}
          onMount={(editor, monaco) => {
            // Define custom theme
            monaco.editor.defineTheme('mcp-editor-theme', {
              base: 'vs',
              inherit: true,
              rules: [
                { token: 'comment', foreground: '8b7355', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'b85845', fontStyle: 'bold' },
                { token: 'string', foreground: 'a0826d' },
                { token: 'number', foreground: 'd4a574' },
                { token: 'type', foreground: '8b7355' },
                { token: 'function', foreground: 'b85845' },
              ],
              colors: {
                'editor.background': '#faf8f5',
                'editor.foreground': '#2d2d2d',
                'editor.lineHighlightBackground': '#f5f3f0',
                'editor.selectionBackground': '#e8dfd5',
                'editor.inactiveSelectionBackground': '#f0ebe5',
                'editorLineNumber.foreground': '#a89f92',
                'editorLineNumber.activeForeground': '#8b7355',
                'editorCursor.foreground': '#b85845',
                'editor.selectionHighlightBackground': '#e8dfd588',
                'editorIndentGuide.background': '#e5ddd3',
                'editorIndentGuide.activeBackground': '#8b7355',
              },
            });
            // Set the custom theme
            monaco.editor.setTheme('mcp-editor-theme');
          }}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            formatOnPaste: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
            folding: true,
            showFoldingControls: 'always',
            lineNumbers: 'on',
            padding: { top: 16, bottom: 16 },
          }}
          theme="mcp-editor-theme"
        />
      </Card>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '16px',
        justifyContent: 'flex-start'
      }}>
        <Button
          onClick={formatJson}
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
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#b85845';
            e.currentTarget.style.color = '#b85845';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
            e.currentTarget.style.color = '#8b7355';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
          }}
        >
          <Paintbrush size={16} strokeWidth={1.5} />
          格式化并清理JSON
        </Button>

        <Button
          onClick={handleCopy}
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
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#b85845';
            e.currentTarget.style.color = '#b85845';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
            e.currentTarget.style.color = '#8b7355';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
          }}
        >
          {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
          {copied ? '已复制' : '复制'}
        </Button>

        <Button
          onClick={handleSave}
          disabled={!!error || loading || saving}
          loading={loading || saving}
          style={{
            height: '36px',
            background: (!!error || loading || saving) ? 'rgba(139, 115, 85, 0.1)' : 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: 'none',
            borderRadius: '6px',
            color: (!!error || loading || saving) ? 'rgba(139, 115, 85, 0.4)' : '#fff',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.3px',
            boxShadow: (!!error || loading || saving) ? 'none' : '0 2px 6px rgba(184, 88, 69, 0.25)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: (!!error || loading || saving) ? 'not-allowed' : 'pointer'
          }}
          onMouseEnter={(e) => {
            if (!error && !loading && !saving) {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.35)';
            }
          }}
          onMouseLeave={(e) => {
            if (!error && !loading && !saving) {
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(184, 88, 69, 0.25)';
            }
          }}
        >
          <Save size={16} strokeWidth={1.5} />
          保存配置
        </Button>
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(250, 248, 245, 0.6)',
        borderRadius: '6px',
        border: '1px solid rgba(139, 115, 85, 0.12)'
      }}>
        <p style={{
          margin: 0,
          fontSize: '13px',
          color: 'rgba(45, 45, 45, 0.75)',
          lineHeight: '1.6'
        }}>
          配置将在保存前自动清理，移除不必要的字段。
        </p>
      </div>
    </div>
  );
};

export default MCPJsonEditor;