// src/components/tour/TourButton.tsx
import React from 'react';
import { Button, Tooltip } from 'antd';
import { Info } from 'lucide-react';
import { useT } from '../../i18n/hooks';

interface TourButtonProps {
  onClick: () => void;
  collapsed?: boolean;
}

const TourButton: React.FC<TourButtonProps> = ({ onClick, collapsed = false }) => {
  const t = useT();

  return (
    <Tooltip title={t('components.tour.startTour')} placement="right">
      <Button
        type="text"
        icon={<Info size={16} strokeWidth={1.5} />}
        onClick={onClick}
        style={{
          color: 'rgba(45, 45, 45, 0.65)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: collapsed ? 'auto' : '100%',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '8px' : '8px 16px',
          height: 'auto'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
          e.currentTarget.style.color = '#b85845';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(45, 45, 45, 0.65)';
        }}
      >
        {!collapsed && (
          <span style={{
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.3px'
          }}>
            {t('components.tour.startTour')}
          </span>
        )}
      </Button>
    </Tooltip>
  );
};

export default TourButton;
