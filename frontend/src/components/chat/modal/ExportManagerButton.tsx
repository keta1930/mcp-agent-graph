// src/components/chat/modal/ExportManagerButton.tsx
import React from 'react';
import { Button, Tooltip } from 'antd';
import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../../i18n/hooks';

const ExportManagerButton: React.FC = () => {
  const navigate = useNavigate();
  const t = useT();

  const handleClick = () => {
    navigate('/export');
  };

  return (
    <Tooltip title={t('components.exportManagerButton.title')}>
      <Button
        type="text"
        icon={<Download size={16} strokeWidth={1.5} />}
        onClick={handleClick}
        style={{
          color: 'rgba(45, 45, 45, 0.65)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      />
    </Tooltip>
  );
};

export default ExportManagerButton;
