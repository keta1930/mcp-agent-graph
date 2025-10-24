// src/components/chat/modal/ExportManagerButton.tsx
import React from 'react';
import { Button, Tooltip } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const ExportManagerButton: React.FC = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/export');
  };

  return (
    <Tooltip title="导出管理">
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
