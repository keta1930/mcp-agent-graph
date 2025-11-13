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
        onClick={onToggle}
        size={size}
        style={{
          color: isSystemPromptMode ? '#b85845' : 'rgba(139, 115, 85, 0.75)',
          border: 'none',
          background: isSystemPromptMode ? 'rgba(184, 88, 69, 0.1)' : 'transparent',
          transition: 'all 0.2s ease',
          height: '28px',
          padding: '0 10px',
          fontSize: '12px',
          borderRadius: '6px',
          fontWeight: 500
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#b85845';
          e.currentTarget.style.background = 'rgba(184, 88, 69, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = isSystemPromptMode ? '#b85845' : 'rgba(139, 115, 85, 0.75)';
          e.currentTarget.style.background = isSystemPromptMode ? 'rgba(184, 88, 69, 0.1)' : 'transparent';
        }}
      >
        {getButtonText()}
      </Button>
    </Tooltip>
  );
};

export default SystemPromptToggle;
