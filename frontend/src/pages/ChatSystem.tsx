// src/pages/ChatSystem.tsx
import React from 'react';
import { Card, Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { HomeOutlined, ToolOutlined, MessageOutlined } from '@ant-design/icons';
import './ChatSystem.css';

const ChatSystem: React.FC = () => {
  const navigate = useNavigate();

  const handleBackHome = () => {
    navigate('/');
  };

  return (
    <div className="chat-system-container">
      <div className="chat-system-content">
        <Card className="development-card">
          <Result
            icon={<ToolOutlined className="development-icon" />}
            title="对话系统正在开发中"
            subTitle="我们正在努力为您构建一个智能、高效的对话体验"
            extra={
              <div className="development-actions">
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<HomeOutlined />}
                  onClick={handleBackHome}
                  className="back-home-button"
                >
                  返回首页
                </Button>
              </div>
            }
          />
          
          <div className="development-info">
            <h3><MessageOutlined /> 即将推出的功能</h3>
            <ul>
              <li>智能对话体验</li>
              <li>多轮对话上下文保持</li>
              <li>与 Agent 图的深度集成</li>
              <li>实时协作功能</li>
              <li>个性化助手配置</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChatSystem;
