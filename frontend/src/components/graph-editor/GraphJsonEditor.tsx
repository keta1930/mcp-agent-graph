// 图JSON编辑器组件
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Alert } from 'antd';
import { AlertTriangle, Paintbrush } from 'lucide-react';
import Editor from "@monaco-editor/react";
import { BackendGraphConfig } from '../../types/graph';

interface GraphJsonEditorProps {
  graphConfig: BackendGraphConfig;
}

export interface GraphJsonEditorHandle {
  getJsonText: () => string;
  validateAndGetConfig: () => { valid: boolean; config?: BackendGraphConfig; error?: string };
}

/**
 * 图JSON编辑器
 * 不进行实时验证和同步，用户可以自由编辑
 */
const GraphJsonEditor = forwardRef<GraphJsonEditorHandle, GraphJsonEditorProps>(({
  graphConfig
}, ref) => {
  const [jsonText, setJsonText] = useState('');
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);

  // 初始化JSON文本（仅在graphConfig变化时）
  useEffect(() => {
    try {
      const formatted = JSON.stringify(graphConfig, null, 2);
      setJsonText(formatted);
      setSyntaxError(null);
    } catch {
      setSyntaxError('Failed to serialize graph configuration');
    }
  }, [graphConfig]);

  // JSON文本变化处理 - 仅做轻量级语法检查
  const handleJsonTextChange = (value: string | undefined) => {
    const newValue = value || '';
    setJsonText(newValue);

    // 轻量级语法检查（不阻止编辑）
    try {
      JSON.parse(newValue);
      setSyntaxError(null);
    } catch {
      // 不设置错误，Monaco会自动显示语法错误标记
      setSyntaxError(null);
    }
  };

  // 格式化JSON
  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      setSyntaxError(null);

      // 更新编辑器内容
      if (editorInstance) {
        editorInstance.setValue(formatted);
      }
    } catch (err) {
      setSyntaxError('Cannot format invalid JSON syntax');
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    getJsonText: () => jsonText,

    validateAndGetConfig: () => {
      try {
        const parsed = JSON.parse(jsonText);

        // 验证必需字段
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return { valid: false, error: 'Configuration must be an object' };
        }

        if (!parsed.name || typeof parsed.name !== 'string') {
          return { valid: false, error: 'Missing or invalid "name" field' };
        }

        if (!Array.isArray(parsed.nodes)) {
          return { valid: false, error: 'Missing or invalid "nodes" field (must be an array)' };
        }

        return { valid: true, config: parsed as BackendGraphConfig };
      } catch (err) {
        return { valid: false, error: 'Invalid JSON syntax' };
      }
    }
  }));

  return (
    <div style={{
      position: 'relative',
      height: '100%',
      width: '100%'
    }}>
      {/* 语法错误提示（仅显示格式化失败等严重错误） */}
      {syntaxError && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          zIndex: 10
        }}>
          <Alert
            message="JSON Error"
            description={syntaxError}
            type="error"
            showIcon
            icon={<AlertTriangle size={16} strokeWidth={1.5} />}
            closable
            onClose={() => setSyntaxError(null)}
            style={{
              borderRadius: '6px',
              border: '1px solid rgba(184, 88, 69, 0.3)',
              background: 'rgba(255, 245, 243, 0.95)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(184, 88, 69, 0.15)'
            }}
          />
        </div>
      )}

      {/* JSON编辑器 */}
      <Editor
        height="100%"
        defaultLanguage="json"
        value={jsonText}
        onChange={handleJsonTextChange}
        onMount={(editor, monaco) => {
          setEditorInstance(editor);

          // 定义与MCP编辑器相同的主题
          monaco.editor.defineTheme('graph-editor-theme', {
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
          monaco.editor.setTheme('graph-editor-theme');
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
          readOnly: false,
          domReadOnly: false,
        }}
        theme="graph-editor-theme"
      />

      {/* 格式化按钮（右下角） */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        zIndex: 10
      }}>
        <button
          onClick={formatJson}
          style={{
            height: '36px',
            padding: '0 16px',
            borderRadius: '6px',
            border: '1px solid rgba(139, 115, 85, 0.2)',
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#8b7355',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.3px',
            boxShadow: '0 2px 8px rgba(139, 115, 85, 0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#b85845';
            e.currentTarget.style.color = '#b85845';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 115, 85, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
            e.currentTarget.style.color = '#8b7355';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 115, 85, 0.15)';
          }}
        >
          <Paintbrush size={16} strokeWidth={1.5} />
          Format
        </button>
      </div>
    </div>
  );
});

GraphJsonEditor.displayName = 'GraphJsonEditor';

export default GraphJsonEditor;
