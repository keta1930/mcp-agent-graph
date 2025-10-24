// src/components/chat/controls/SystemPromptToggle.tsx
import React from 'react';
import { Button, Tooltip } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

/**
 * 系统提示词切换按钮组件属性
 */
interface SystemPromptToggleProps {
  /** 是否处于系统提示词模式 */
  isSystemPromptMode: boolean;
  /** 切换模式回调 */
  onToggle: () => void;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义类名 */
  className?: string;
}

/**
 * 系统提示词切换按钮组件
 *
 * 用于在用户消息和系统提示词之间切换输入模式。
 * 在 Chat 模式下使用,允许用户配置系统级别的提示词。
 */
const SystemPromptToggle: React.FC<SystemPromptToggleProps> = ({
  isSystemPromptMode,
  onToggle,
  size = 'small',
  className = ''
}) => {
  /**
   * 获取提示文本
   */
  const getTooltipTitle = () => {
    return isSystemPromptMode ? '切换到用户消息' : '切换到系统提示词';
  };

  /**
   * 获取按钮文字
   */
  const getButtonText = () => {
    return isSystemPromptMode ? '系统' : '用户';
  };

  return (
    <Tooltip title={getTooltipTitle()}>
      <Button
        type="text"
        icon={<SwapOutlined />}
        className={`system-prompt-toggle ${isSystemPromptMode ? 'active' : ''} ${className}`}
        onClick={onToggle}
        size={size}
      >
        {getButtonText()}
      </Button>
    </Tooltip>
  );
};

export default SystemPromptToggle;
