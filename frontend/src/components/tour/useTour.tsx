// src/components/tour/useTour.tsx
import { useEffect, useRef } from 'react';
import { driver, DriveStep, Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useT } from '../../i18n/hooks';

export interface TourStep {
  element: string;
  titleKey: string;
  contentKey: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface UseTourOptions {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

export const useTour = ({ steps, onComplete, onSkip }: UseTourOptions) => {
  const t = useT();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    // 自定义样式配置
    const customConfig: Config = {
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: '{{current}}/{{total}}',
      nextBtnText: t('components.tour.nextBtn') || '下一步',
      prevBtnText: t('components.tour.prevBtn') || '上一步',
      doneBtnText: t('components.tour.doneBtn') || '完成',
      closeBtnText: '×',
      animate: true,
      overlayOpacity: 0.7,
      smoothScroll: true,
      allowClose: true,
      overlayColor: '#000',
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: 'tour-popover',
      onDestroyed: () => {
        // 引导完成或被关闭时触发
        if (onComplete) {
          onComplete();
        }
      },
      onDestroyStarted: () => {
        // 判断是否是中途跳过
        if (onSkip && driverRef.current) {
          const currentIndex = driverRef.current.getActiveIndex();
          if (currentIndex !== undefined && currentIndex < steps.length - 1) {
            onSkip();
          }
        }
      },
      onNextClick: (element, step, options) => {
        // 检查是否是最后一步
        if (driverRef.current) {
          const currentIndex = driverRef.current.getActiveIndex();
          if (currentIndex !== undefined && currentIndex === steps.length - 1) {
            // 最后一步，点击下一步/完成按钮时销毁driver
            driverRef.current.destroy();
            return;
          }
        }
        // 不是最后一步，继续下一步
        driverRef.current?.moveNext();
      }
    };

    // 转换步骤为driver.js格式
    const driveSteps: DriveStep[] = steps.map((step) => ({
      element: step.element,
      popover: {
        title: t(step.titleKey),
        description: t(step.contentKey),
        side: step.placement || 'bottom',
        align: 'start'
      }
    }));

    driverRef.current = driver({
      ...customConfig,
      steps: driveSteps
    });

    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, [steps, t, onComplete, onSkip]);

  const startTour = () => {
    if (driverRef.current) {
      driverRef.current.drive();
    }
  };

  const stopTour = () => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }
  };

  return { startTour, stopTour };
};
