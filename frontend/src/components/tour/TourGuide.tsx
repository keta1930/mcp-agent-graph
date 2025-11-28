// src/components/tour/TourGuide.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Button } from 'antd';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number;
}

interface TourGuideProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const TourGuide: React.FC<TourGuideProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (!isOpen || !step) return;

    const updatePosition = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // 滚动到目标元素
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, step, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  const getTooltipPosition = (): React.CSSProperties => {
    if (!targetRect || !tooltipRef.current) {
      return { display: 'none' };
    }

    const placement = step.placement || 'bottom';
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 20;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = targetRect.top - tooltipRect.height - gap;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.right + gap;
        break;
      case 'center':
        top = window.innerHeight / 2 - tooltipRect.height / 2;
        left = window.innerWidth / 2 - tooltipRect.width / 2;
        break;
    }

    // 边界检查
    if (left < 20) left = 20;
    if (left + tooltipRect.width > window.innerWidth - 20) {
      left = window.innerWidth - tooltipRect.width - 20;
    }
    if (top < 20) top = 20;
    if (top + tooltipRect.height > window.innerHeight - 20) {
      top = window.innerHeight - tooltipRect.height - 20;
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 10002
    };
  };

  if (!isOpen || !step) return null;

  const padding = step.spotlightPadding || 8;

  return (
    <>
      {/* 遮罩层 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          pointerEvents: 'none'
        }}
      >
        <svg width="100%" height="100%" style={{ position: 'absolute' }}>
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && step.placement !== 'center' && (
                <rect
                  x={targetRect.left - padding}
                  y={targetRect.top - padding}
                  width={targetRect.width + padding * 2}
                  height={targetRect.height + padding * 2}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.6)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* 高亮边框 */}
        {targetRect && step.placement !== 'center' && (
          <div
            style={{
              position: 'absolute',
              left: targetRect.left - padding,
              top: targetRect.top - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
              border: '2px solid #b85845',
              borderRadius: '8px',
              boxShadow: '0 0 0 4px rgba(184, 88, 69, 0.2), 0 0 20px rgba(184, 88, 69, 0.4)',
              pointerEvents: 'none',
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />
        )}
      </div>

      {/* 提示框 */}
      <div
        ref={tooltipRef}
        style={{
          ...getTooltipPosition(),
          maxWidth: '400px',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '12px',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          boxShadow: '0 8px 32px rgba(139, 115, 85, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          padding: '24px',
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* 关闭按钮 */}
        <Button
          type="text"
          icon={<X size={16} strokeWidth={1.5} />}
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            color: 'rgba(45, 45, 45, 0.45)',
            padding: '4px',
            width: '28px',
            height: '28px',
            minWidth: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#b85845';
            e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(45, 45, 45, 0.45)';
            e.currentTarget.style.background = 'transparent';
          }}
        />

        {/* 步骤指示器 */}
        <div style={{
          fontSize: '12px',
          color: 'rgba(45, 45, 45, 0.45)',
          marginBottom: '12px',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}>
          步骤 {currentStep + 1} / {steps.length}
        </div>

        {/* 标题 */}
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#2d2d2d',
          marginBottom: '12px',
          letterSpacing: '0.5px',
          lineHeight: 1.4
        }}>
          {step.title}
        </h3>

        {/* 内容 */}
        <p style={{
          fontSize: '14px',
          color: 'rgba(45, 45, 45, 0.85)',
          lineHeight: 1.7,
          marginBottom: '20px',
          letterSpacing: '0.3px'
        }}>
          {step.content}
        </p>

        {/* 底部按钮 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Button
            onClick={handlePrev}
            disabled={currentStep === 0}
            style={{
              color: currentStep === 0 ? 'rgba(45, 45, 45, 0.25)' : '#8b7355',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              borderRadius: '6px',
              padding: '8px 16px',
              height: 'auto',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.6)'
            }}
            onMouseEnter={(e) => {
              if (currentStep > 0) {
                e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.3)';
                e.currentTarget.style.background = 'rgba(139, 115, 85, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentStep > 0) {
                e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
              }
            }}
          >
            <ChevronLeft size={14} strokeWidth={2} />
            上一步
          </Button>

          <Button
            onClick={handleNext}
            style={{
              background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              padding: '8px 20px',
              height: 'auto',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
              letterSpacing: '0.3px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(184, 88, 69, 0.25)';
            }}
          >
            {currentStep === steps.length - 1 ? '完成' : '下一步'}
            {currentStep < steps.length - 1 && <ChevronRight size={14} strokeWidth={2} />}
          </Button>
        </div>
      </div>

      {/* 动画样式 */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              box-shadow: 0 0 0 4px rgba(184, 88, 69, 0.2), 0 0 20px rgba(184, 88, 69, 0.4);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(184, 88, 69, 0.1), 0 0 30px rgba(184, 88, 69, 0.6);
            }
          }
        `}
      </style>
    </>
  );
};

export default TourGuide;
