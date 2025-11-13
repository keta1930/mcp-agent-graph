import React from 'react';
import { Background } from 'reactflow';
import { Button, Tooltip } from 'antd';
import {
  Palette, Square, Minus, EyeOff, Grid3x3
} from 'lucide-react';
import { useT } from '../../../i18n/hooks';

export type BackgroundType = 'none' | 'dots' | 'lines' | 'grid' | 'cross';

/**
 * 背景样式配置
 *
 * 颜色选择考虑了白色画布的视觉对比度，确保网格线清晰可见但不过于突出。
 * 不同的 gap 和 size 设置为不同的背景类型提供了合适的视觉密度。
 */
const backgroundConfigs = {
  none: null,
  dots: {
    variant: 'dots' as const,
    gap: 20,
    size: 2,
    color: '#d1d5db', // 浅灰色点,在白色背景下清晰可见
  },
  lines: {
    variant: 'lines' as const,
    gap: 24,
    size: 1,
    color: '#e5e7eb', // 浅灰色线条
  },
  grid: {
    variant: 'lines' as const,
    gap: 16,
    size: 1,
    color: '#d1d5db', // 浅灰色网格
  },
  cross: {
    variant: 'cross' as const,
    gap: 32,
    size: 2,
    color: '#9ca3af', // 稍深的灰色交叉
  },
};

interface BackgroundControlsProps {
  backgroundType: BackgroundType;
  onBackgroundTypeChange: (type: BackgroundType) => void;
}

const getBackgroundIcon = (type: BackgroundType) => {
  switch (type) {
    case 'none': return <EyeOff size={16} strokeWidth={1.5} />;
    case 'dots': return <Grid3x3 size={16} strokeWidth={1.5} />;
    case 'lines': return <Minus size={16} strokeWidth={1.5} />;
    case 'grid': return <Square size={16} strokeWidth={1.5} />;
    case 'cross': return <Palette size={16} strokeWidth={1.5} />;
    default: return <Grid3x3 size={16} strokeWidth={1.5} />;
  }
};

const getBackgroundLabel = (type: BackgroundType, t: (key: string) => string) => {
  switch (type) {
    case 'none': return t('components.graphEditor.backgroundControls.none');
    case 'dots': return t('components.graphEditor.backgroundControls.dots');
    case 'lines': return t('components.graphEditor.backgroundControls.lines');
    case 'grid': return t('components.graphEditor.backgroundControls.grid');
    case 'cross': return t('components.graphEditor.backgroundControls.cross');
    default: return t('components.graphEditor.backgroundControls.dots');
  }
};

/**
 * 背景样式控制面板
 *
 * 提供可视化的背景样式切换功能，支持点状、线性、网格等多种背景模式。
 * 浮动面板设计不遮挡主要内容，半透明背景和模糊效果提升了视觉层次感。
 */
const BackgroundControls: React.FC<BackgroundControlsProps> = ({
  backgroundType,
  onBackgroundTypeChange
}) => {
  const t = useT();
  const backgroundTypes: BackgroundType[] = ['none', 'dots', 'lines', 'grid', 'cross'];

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      zIndex: 10,
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '6px',
      padding: '8px',
      boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      border: '1px solid rgba(139, 115, 85, 0.15)',
      display: 'flex',
      gap: '4px',
      alignItems: 'center'
    }}>
      <span style={{
        fontSize: '12px',
        color: '#8b7355',
        marginRight: '8px',
        fontWeight: '500'
      }}>
        {t('components.graphEditor.backgroundControls.label')}
      </span>
      {backgroundTypes.map(type => (
        <Tooltip key={type} title={getBackgroundLabel(type, t)}>
          <Button
            type={backgroundType === type ? 'primary' : 'text'}
            size="small"
            icon={getBackgroundIcon(type)}
            onClick={() => onBackgroundTypeChange(type)}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
              ...(backgroundType === type ? {
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                borderColor: 'transparent',
                color: 'white',
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              } : {
                background: 'transparent',
                borderColor: 'transparent',
                color: '#8b7355'
              })
            }}
          />
        </Tooltip>
      ))}
    </div>
  );
};

/**
 * 根据背景类型渲染对应的背景组件
 *
 * @param backgroundType - 背景类型
 * @returns ReactFlow Background 组件或 null
 */
export const renderBackground = (backgroundType: BackgroundType) => {
  const config = backgroundConfigs[backgroundType];
  if (!config) return null;

  return (
    <Background
      gap={config.gap}
      size={config.size}
      color={config.color}
      variant={config.variant as any}
    />
  );
};

export default BackgroundControls;
