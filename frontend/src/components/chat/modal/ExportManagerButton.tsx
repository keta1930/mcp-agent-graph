// src/components/chat/modal/ExportManagerButton.tsx
import React from 'react';
import { Button, Tooltip } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
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
        icon={<ExportOutlined />}
        onClick={handleClick}
        style={{
          color: '#666',
          transition: 'all 0.3s ease'
        }}
      />
    </Tooltip>
  );
};

export default ExportManagerButton;
