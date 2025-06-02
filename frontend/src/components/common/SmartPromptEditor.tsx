// src/components/common/SmartPromptEditor.tsx
import React, { useState, useRef } from 'react';
import { Input } from 'antd';
import { NodeIndexOutlined, PlayCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface SmartPromptEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  availableNodes: string[];
  size?: 'small' | 'middle' | 'large';
}

const SmartPromptEditor: React.FC<SmartPromptEditorProps> = ({
  value = '',
  onChange,
  placeholder,
  rows = 8,
  availableNodes,
  size = 'large'
}) => {
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompleteOptions, setAutoCompleteOptions] = useState<{ value: string; isSpecial?: boolean }[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textAreaRef = useRef<any>(null);

  // 处理文本变化
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart;
    
    onChange?.(newValue);
    setCursorPosition(position);

    // 检查是否输入了 {
    const beforeCursor = newValue.substring(0, position);
    const lastBraceIndex = beforeCursor.lastIndexOf('{');
    
    if (lastBraceIndex !== -1) {
      // 检查这个 { 之后是否已经有对应的 }
      const afterBrace = newValue.substring(lastBraceIndex + 1, position);
      const hasClosingBrace = newValue.substring(position).indexOf('}') !== -1;
      
      // 如果还没有闭合的 } 且没有换行符，显示自动完成
      if (!hasClosingBrace && !afterBrace.includes('\n') && afterBrace.length <= 20) {
        setShowAutoComplete(true);
        
        // 过滤节点选项
        const filteredOptions = availableNodes
          .filter(nodeName => 
            nodeName.toLowerCase().includes(afterBrace.toLowerCase())
          )
          .map(nodeName => ({ 
            value: nodeName,
            isSpecial: nodeName === 'start'
          }));
        
        setAutoCompleteOptions(filteredOptions);
      } else {
        setShowAutoComplete(false);
      }
    } else {
      setShowAutoComplete(false);
    }
  };

  // 处理节点选择
  const handleNodeSelect = (selectedNodeName: string) => {
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    
    // 找到最后一个 { 的位置
    const lastBraceIndex = beforeCursor.lastIndexOf('{');
    
    if (lastBraceIndex !== -1) {
      // 构建新的文本：{ 之前的部分 + {selectedNodeName} + 光标之后的部分
      const beforeBrace = value.substring(0, lastBraceIndex);
      const newValue = beforeBrace + `{${selectedNodeName}}` + afterCursor;
      
      onChange?.(newValue);
      
      // 设置新的光标位置（在 } 之后）
      const newCursorPosition = lastBraceIndex + selectedNodeName.length + 2;
      
      // 延迟设置光标位置，确保文本已更新
      setTimeout(() => {
        if (textAreaRef.current?.resizableTextArea?.textArea) {
          const textArea = textAreaRef.current.resizableTextArea.textArea;
          textArea.focus();
          textArea.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    }
    
    setShowAutoComplete(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutoComplete && e.key === 'Escape') {
      setShowAutoComplete(false);
      e.preventDefault();
    }
  };

  // 处理焦点失去
  const handleBlur = () => {
    // 延迟隐藏，以便用户可以点击选项
    setTimeout(() => {
      setShowAutoComplete(false);
    }, 200);
  };

  return (
    <div style={{ position: 'relative' }}>
      <TextArea
        ref={textAreaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
        showCount
        size={size}
      />
      
      {showAutoComplete && autoCompleteOptions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'white',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            maxHeight: '200px',
            overflowY: 'auto',
            marginTop: '4px'
          }}
        >
          {/* 标题栏 */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: '#fafafa',
            fontSize: '12px',
            fontWeight: '500',
            color: '#666'
          }}>
            可引用的节点
          </div>

          {/* 节点选项列表 */}
          {autoCompleteOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => handleNodeSelect(option.value)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              {/* 图标 */}
              <div style={{ marginRight: '8px' }}>
                {option.isSpecial ? (
                  <PlayCircleOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
                ) : (
                  <NodeIndexOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
                )}
              </div>
              
              {/* 大括号和节点名称 */}
              <span style={{ 
                color: option.isSpecial ? '#52c41a' : '#1890ff', 
                fontWeight: 'bold',
                marginRight: '4px'
              }}>
                {'{'}
              </span>
              <span style={{ flex: 1 }}>{option.value}</span>
              <span style={{ 
                color: option.isSpecial ? '#52c41a' : '#1890ff', 
                fontWeight: 'bold'
              }}>
                {'}'}
              </span>
              
              {/* 特殊节点标识 */}
              {option.isSpecial && (
                <span style={{ 
                  fontSize: '11px', 
                  color: '#999',
                  marginLeft: '8px'
                }}>
                  (用户输入)
                </span>
              )}
            </div>
          ))}
          
          {/* 底部提示 */}
          <div style={{
            padding: '6px 12px',
            fontSize: '11px',
            color: '#999',
            backgroundColor: '#fafafa',
            textAlign: 'center'
          }}>
            点击选择节点，或按 Esc 关闭
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartPromptEditor;