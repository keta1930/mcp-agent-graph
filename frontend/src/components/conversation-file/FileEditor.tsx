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
        theme="vs-dark"
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
        }}
        loading={<Spin size="large" tip="加载编辑器..." />}
      />
      {isDirty && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(250, 173, 20, 0.9)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
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
