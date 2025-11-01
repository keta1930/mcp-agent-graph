import React from 'react';
import { Background } from 'reactflow';
import { Button, Tooltip } from 'antd';
import {
  BgColorsOutlined,
  BorderOutlined,
  DashOutlined,
  EyeInvisibleOutlined,
  AppstoreOutlined
} from '@ant-design/icons';

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
    case 'none': return <EyeInvisibleOutlined />;
    case 'dots': return <AppstoreOutlined />;
    case 'lines': return <DashOutlined />;
    case 'grid': return <BorderOutlined />;
    case 'cross': return <BgColorsOutlined />;
    default: return <AppstoreOutlined />;
  }
};

const getBackgroundLabel = (type: BackgroundType) => {
  switch (type) {
    case 'none': return '无背景';
    case 'dots': return '点状';
    case 'lines': return '线性';
    case 'grid': return '网格';
    case 'cross': return '交叉';
    default: return '点状';
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
  const backgroundTypes: BackgroundType[] = ['none', 'dots', 'lines', 'grid', 'cross'];

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      zIndex: 10,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(8px)',
      borderRadius: '8px',
      padding: '8px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(229, 231, 235, 0.8)',
      display: 'flex',
      gap: '4px',
      alignItems: 'center'
    }}>
      <span style={{
        fontSize: '12px',
        color: '#666',
        marginRight: '8px',
        fontWeight: '500'
      }}>
        背景:
      </span>
      {backgroundTypes.map(type => (
        <Tooltip key={type} title={getBackgroundLabel(type)}>
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
              transition: 'all 0.2s ease',
              ...(backgroundType === type ? {
                background: '#1677ff',
                borderColor: '#1677ff',
                color: 'white',
                boxShadow: '0 2px 8px rgba(22, 119, 255, 0.3)'
              } : {
                background: 'transparent',
                borderColor: 'transparent',
                color: '#666'
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
