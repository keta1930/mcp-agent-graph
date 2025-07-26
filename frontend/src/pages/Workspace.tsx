// src/pages/Workspace.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Workspace: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 访问工作台根路径时，默认重定向到图形编辑器
    navigate('/workspace/graph-editor', { replace: true });
  }, [navigate]);

  return null;
};

export default Workspace;
