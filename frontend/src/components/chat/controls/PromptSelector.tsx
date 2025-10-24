// src/components/chat/controls/PromptSelector.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { promptService } from '../../../services/promptService';
import { PromptInfo } from '../../../types/prompt';

const { Text } = Typography;

/**
 * Prompt 选择器组件属性
 */
interface PromptSelectorProps {
  /** 选择 Prompt 后的回调函数 */
  onSelectPrompt: (content: string) => void;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义类名 */
  className?: string;
}

/**
 * Prompt 选择器组件
 *
 * 用于在对话输入区域选择和插入预设的提示词模板。
 * 提供一个下拉面板,显示所有可用的提示词,
 * 用户点击后可以将提示词内容插入到输入框中。
 */
const PromptSelector: React.FC<PromptSelectorProps> = ({
  onSelectPrompt,
  size = 'small',
  className = ''
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [availablePrompts, setAvailablePrompts] = useState<PromptInfo[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPanel(false);
      }
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPanel]);

  // 获取提示词列表
  const fetchPrompts = async () => {
    setLoadingPrompts(true);
    try {
      const response = await promptService.listPrompts();
      if (response.success && response.data) {
        setAvailablePrompts(response.data.prompts);
      }
    } catch (error) {
      console.error('获取提示词列表失败:', error);
    } finally {
      setLoadingPrompts(false);
    }
  };

  // 处理提示词按钮点击
  const handlePromptButtonClick = () => {
    if (!showPanel && availablePrompts.length === 0) {
      fetchPrompts();
    }
    setShowPanel(!showPanel);
  };

  // 选择提示词
  const handleSelectPrompt = async (promptName: string) => {
    try {
      const response = await promptService.getPromptContent(promptName);
      if (response.success && response.data) {
        onSelectPrompt(response.data.content);
        setShowPanel(false);
      }
    } catch (error) {
      console.error('获取提示词内容失败:', error);
    }
  };

  return (
    <div className={`prompt-selector-container ${className}`} ref={dropdownRef}>
      <Tooltip title="选择提示词">
        <Button
          type="text"
          icon={<FileTextOutlined />}
          className={`prompt-selector-button ${showPanel ? 'active' : ''}`}
          onClick={handlePromptButtonClick}
          size={size}
          loading={loadingPrompts}
        />
      </Tooltip>

      {/* 提示词面板 */}
      {showPanel && (
        <div className="prompt-selector-panel">
          <div className="prompt-selector-header">
            <Text strong>选择提示词</Text>
          </div>
          <div className="prompt-selector-list">
            {availablePrompts.length === 0 ? (
              <div className="prompt-empty">暂无提示词</div>
            ) : (
              availablePrompts.map(prompt => (
                <div
                  key={prompt.name}
                  className="prompt-item"
                  onClick={() => handleSelectPrompt(prompt.name)}
                >
                  <div className="prompt-item-name">{prompt.name}</div>
                  {prompt.category && (
                    <div className="prompt-item-category">{prompt.category}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptSelector;
