// src/components/chat/controls/MaxIterationsConfig.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Button, Tooltip, Typography, InputNumber } from 'antd';
import { Repeat } from 'lucide-react';

const { Text } = Typography;

/**
 * 最大迭代次数配置组件属性
 */
interface MaxIterationsConfigProps {
  /** 当前最大迭代次数值 */
  value: number | null;
  /** 最大迭代次数变更回调 */
  onChange: (value: number | null) => void;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义类名 */
  className?: string;
}

/**
 * 最大迭代次数配置组件
 *
 * 用于在对话输入区域配置 Agent 的最大迭代次数。
 * 提供一个下拉面板，允许用户输入或清除最大迭代次数。
 */
const MaxIterationsConfig: React.FC<MaxIterationsConfigProps> = ({
  value,
  onChange,
  size = 'small',
  className = ''
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [tempValue, setTempValue] = useState<number | null>(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

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

  const handleApply = () => {
    onChange(tempValue);
    setShowPanel(false);
  };

  const handleClear = () => {
    setTempValue(null);
    onChange(null);
    setShowPanel(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <Tooltip title={value ? `最大迭代: ${value}次` : '配置最大迭代次数'}>
        <Button
          type="text"
          icon={<Repeat size={14} strokeWidth={1.5} />}
          onClick={() => setShowPanel(!showPanel)}
          size={size}
          style={{
            color: value ? '#8b7355' : 'rgba(139, 115, 85, 0.75)',
            border: 'none',
            background: showPanel || value ? 'rgba(139, 115, 85, 0.1)' : 'transparent',
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
            e.currentTarget.style.color = '#8b7355';
            e.currentTarget.style.background = 'rgba(139, 115, 85, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = value ? '#8b7355' : 'rgba(139, 115, 85, 0.75)';
            e.currentTarget.style.background = showPanel || value ? 'rgba(139, 115, 85, 0.1)' : 'transparent';
          }}
        />
      </Tooltip>

      {showPanel && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: '8px',
          minWidth: '240px',
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
            <Text strong style={{ color: '#2d2d2d', fontSize: '13px' }}>最大迭代次数</Text>
          </div>
          <div style={{
            padding: '16px'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <Text style={{ fontSize: '12px', color: 'rgba(45, 45, 45, 0.65)', display: 'block', marginBottom: '8px' }}>
                设置 Agent 执行的最大迭代次数
              </Text>
              <InputNumber
                value={tempValue}
                onChange={setTempValue}
                min={1}
                max={100}
                placeholder="输入次数 (1-100)"
                style={{ width: '100%' }}
                size="small"
              />
            </div>
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end'
            }}>
              <Button
                size="small"
                onClick={handleClear}
                style={{ fontSize: '12px' }}
              >
                清除
              </Button>
              <Button
                type="primary"
                size="small"
                onClick={handleApply}
                style={{
                  fontSize: '12px',
                  background: '#8b7355',
                  borderColor: '#8b7355'
                }}
              >
                应用
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaxIterationsConfig;
