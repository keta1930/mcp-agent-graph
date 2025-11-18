// src/components/chat/controls/PromptSelector.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { FileText } from 'lucide-react';
import { promptService } from '../../../services/promptService';
import { PromptInfo } from '../../../types/prompt';
import { useT } from '../../../i18n/hooks';

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
  const t = useT();
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
      console.error(t('components.promptSelector.fetchPromptsFailed'), error);
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
      console.error(t('components.promptSelector.fetchContentFailed'), error);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <Tooltip title={t('components.promptSelector.selectPrompt')}>
        <Button
          type="text"
          icon={<FileText size={14} strokeWidth={1.5} />}
          onClick={handlePromptButtonClick}
          size={size}
          loading={loadingPrompts}
          style={{
            color: showPanel ? '#d4a574' : 'rgba(139, 115, 85, 0.75)',
            border: 'none',
            background: showPanel ? 'rgba(212, 165, 116, 0.1)' : 'transparent',
            transition: 'all 0.2s ease',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#d4a574';
            e.currentTarget.style.background = 'rgba(212, 165, 116, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = showPanel ? '#d4a574' : 'rgba(139, 115, 85, 0.75)';
            e.currentTarget.style.background = showPanel ? 'rgba(212, 165, 116, 0.1)' : 'transparent';
          }}
        />
      </Tooltip>

      {/* 提示词面板 */}
      {showPanel && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: '8px',
          minWidth: '260px',
          maxWidth: '320px',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(139, 115, 85, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          zIndex: 1000,
          animation: 'slideUp 0.2s ease-out'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(139, 115, 85, 0.15)'
          }}>
            <Text strong style={{ color: '#2d2d2d', fontSize: '13px' }}>{t('components.promptSelector.selectPrompt')}</Text>
          </div>
          <div style={{
            padding: '8px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {availablePrompts.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: 'rgba(45, 45, 45, 0.45)',
                fontSize: '13px'
              }}>{t('components.promptSelector.noPrompts')}</div>
            ) : (
              availablePrompts.map(prompt => (
                <div
                  key={prompt.name}
                  onClick={() => handleSelectPrompt(prompt.name)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(212, 165, 116, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{
                    fontSize: '13px',
                    color: '#2d2d2d',
                    marginBottom: '2px'
                  }}>{prompt.name}</div>
                  {prompt.category && (
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(45, 45, 45, 0.45)'
                    }}>{prompt.category}</div>
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
