import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Spin, message } from 'antd';
import { getLanguageFromExtension, getFileExtension } from '../../utils/fileUtils';

interface FileEditorProps {
  filename: string;
  content: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  isDirty?: boolean;
  loading?: boolean;
  readOnly?: boolean;
}

const FileEditor: React.FC<FileEditorProps> = ({
  filename,
  content,
  onChange,
  onSave,
  isDirty,
  loading = false,
  readOnly = false,
}) => {
  const editorRef = useRef<any>(null);

  // Get language based on file extension
  const extension = getFileExtension(filename);
  const language = getLanguageFromExtension(extension);

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Define custom theme with 06 style colors
    monaco.editor.defineTheme('wabi-sabi', {
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
    monaco.editor.setTheme('wabi-sabi');

    // Add keyboard shortcut for save (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave && isDirty) {
        onSave();
      }
    });

    // Set editor options
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      readOnly: readOnly,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      padding: { top: 16, bottom: 16 },
    });
  };

  // Handle content change
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && !readOnly) {
      onChange(value);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Spin size="large" tip="加载编辑器..." />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Editor
        height="100%"
        language={language}
        value={content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="wabi-sabi"
        options={{
          readOnly: readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          padding: { top: 16, bottom: 16 },
        }}
        loading={<Spin size="large" tip="加载编辑器..." />}
      />
      {isDirty && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'linear-gradient(135deg, rgba(212, 164, 116, 0.95) 0%, rgba(184, 88, 69, 0.9) 100%)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px rgba(184, 88, 69, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            zIndex: 10,
          }}
        >
          未保存 (Ctrl+S 保存)
        </div>
      )}
    </div>
  );
};

export default FileEditor;
