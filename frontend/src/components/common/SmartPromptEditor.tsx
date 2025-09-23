// src/components/common/SmartPromptEditor.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Input } from 'antd';
import { NodeIndexOutlined, PlayCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { promptService } from '../../services/promptService';

const { TextArea } = Input;

interface SmartPromptEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  availableNodes: string[];
  currentNodeName?: string; // 当前节点名，用于自引用
  size?: 'small' | 'middle' | 'large';
}

const SmartPromptEditor: React.FC<SmartPromptEditorProps> = ({
  value = '',
  onChange,
  placeholder,
  rows = 8,
  availableNodes,
  currentNodeName,
  size = 'large'
}) => {
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompleteOptions, setAutoCompleteOptions] = useState<{ value: string; type: 'node' | 'prompt'; isSpecial?: boolean }[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [availablePrompts, setAvailablePrompts] = useState<string[]>([]);
  const textAreaRef = useRef<any>(null);

  // 由于availableNodes已经包含所有节点，直接使用
  const allAvailableNodes = availableNodes;

  // 获取可用的提示词列表
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const prompts = await promptService.listPrompts();
        if (prompts.success && prompts.data && Array.isArray(prompts.data.prompts)) {
          setAvailablePrompts(prompts.data.prompts.map((prompt: any) => prompt.name));
        }
      } catch (error) {
        console.error('获取提示词列表失败:', error);
      }
    };

    fetchPrompts();
  }, []);

  // 处理文本变化
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart;

    onChange?.(newValue);
    setCursorPosition(position);

    // 检查是否输入了 {{
    const beforeCursor = newValue.substring(0, position);
    const doubleBraceMatch = beforeCursor.match(/\{\{([^}]*)$/);

    if (doubleBraceMatch) {
      const afterDoubleBrace = doubleBraceMatch[1];
      const hasClosingDoubleBrace = newValue.substring(position).indexOf('}}') !== -1;

      // 如果还没有闭合的 }} 且没有换行符，显示自动完成
      if (!hasClosingDoubleBrace && !afterDoubleBrace.includes('\n') && afterDoubleBrace.length <= 50) {
        setShowAutoComplete(true);

        let filteredOptions: { value: string; type: 'node' | 'prompt'; isSpecial?: boolean }[] = [];

        // 检查是否是提示词引用 (以@开头)
        if (afterDoubleBrace.startsWith('@')) {
          const promptFilter = afterDoubleBrace.substring(1); // 移除@
          filteredOptions = availablePrompts
            .filter(promptName =>
              promptName.toLowerCase().includes(promptFilter.toLowerCase())
            )
            .map(promptName => ({
              value: `@${promptName}`,
              type: 'prompt' as const
            }));
        } else {
          // 解析联合引用语法：node1:3|node2:2|node3
          const parts = afterDoubleBrace.split('|');
          const lastPart = parts[parts.length - 1].trim();

          // 提取最后一部分的节点名（可能包含:count）
          const nodeMatch = lastPart.match(/^([^:]*)/);
          const currentNodeInput = nodeMatch ? nodeMatch[1] : lastPart;

          // 过滤节点列表（包含当前节点）
          filteredOptions = allAvailableNodes
            .filter(nodeName =>
              nodeName.toLowerCase().includes(currentNodeInput.toLowerCase())
            )
            .map(nodeName => {
              // 构建完整的替换值
              const otherParts = parts.slice(0, -1);
              const newLastPart = lastPart.replace(currentNodeInput, nodeName);
              const fullValue = otherParts.length > 0
                ? `${otherParts.join('|')}|${newLastPart}`
                : newLastPart;

              return {
                value: fullValue,
                type: 'node' as const,
                isSpecial: nodeName === 'start' || nodeName === currentNodeName
              };
            });
        }

        setAutoCompleteOptions(filteredOptions);
      } else {
        setShowAutoComplete(false);
      }
    } else {
      setShowAutoComplete(false);
    }
  };

  // 处理节点/提示词选择
  const handleOptionSelect = (selectedValue: string) => {
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);

    // 找到最后一个 {{ 的位置
    const doubleBraceMatch = beforeCursor.match(/\{\{([^}]*)$/);

    if (doubleBraceMatch) {
      const beforeDoubleBrace = beforeCursor.substring(0, doubleBraceMatch.index!);
      // 不自动添加 }}，让用户手动输入 | 或 }}
      const newValue = beforeDoubleBrace + `{{${selectedValue}` + afterCursor;

      onChange?.(newValue);

      // 设置新的光标位置（在选择的值之后）
      const newCursorPosition = beforeDoubleBrace.length + selectedValue.length + 2; // {{...

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
            {autoCompleteOptions.length > 0 && autoCompleteOptions[0].type === 'prompt'
              ? '可引用的提示词模板'
              : '可引用的节点'}
          </div>

          {/* 选项列表 */}
          {autoCompleteOptions.map((option) => {
            const isPrompt = option.type === 'prompt';
            const displayValue = isPrompt ? option.value.substring(1) : option.value; // 移除@显示
            const color = option.isSpecial ? '#52c41a' : (isPrompt ? '#722ed1' : '#1890ff');

            return (
              <div
                key={option.value}
                onClick={() => handleOptionSelect(option.value)}
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
                    <PlayCircleOutlined style={{ color, fontSize: '14px' }} />
                  ) : isPrompt ? (
                    <FileTextOutlined style={{ color, fontSize: '14px' }} />
                  ) : (
                    <NodeIndexOutlined style={{ color, fontSize: '14px' }} />
                  )}
                </div>

                {/* 双大括号和内容 */}
                <span style={{
                  color,
                  fontWeight: 'bold',
                  marginRight: '4px'
                }}>
                  {'{{'}
                </span>
                {isPrompt && (
                  <span style={{ color, fontWeight: 'bold' }}>@</span>
                )}
                <span style={{ flex: 1 }}>{displayValue}</span>
                <span style={{
                  color,
                  fontWeight: 'bold'
                }}>
                  {'}}'}
                </span>

                {/* 标识 */}
                {option.isSpecial && (
                  <span style={{
                    fontSize: '11px',
                    color: '#999',
                    marginLeft: '8px'
                  }}>
                    {(() => {
                      const displayValue = isPrompt ? option.value.substring(1) : option.value.split('|').pop()?.split(':')[0];
                      if (displayValue === 'start') return '(用户输入)';
                      if (displayValue === currentNodeName) return '(当前节点)';
                      return '';
                    })()}
                  </span>
                )}
                {isPrompt && (
                  <span style={{
                    fontSize: '11px',
                    color: '#999',
                    marginLeft: '8px'
                  }}>
                    (提示词)
                  </span>
                )}
              </div>
            );
          })}

          {/* 底部提示 */}
          <div style={{
            padding: '6px 12px',
            fontSize: '11px',
            color: '#999',
            backgroundColor: '#fafafa',
            textAlign: 'center'
          }}>
            选择节点后输入 | 联合引用或 {'}}'}  闭合，{'{{'}@ 引用提示词，按 Esc 关闭
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartPromptEditor;