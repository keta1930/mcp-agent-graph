// src/pages/Home.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DesktopOutlined, 
  MessageOutlined, 
  ApiOutlined,
  SettingOutlined,
  EditOutlined,
  StarOutlined,
  BulbOutlined
} from '@ant-design/icons';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleEnterWorkspace = () => {
    navigate('/workspace');
  };

  const handleEnterChat = () => {
    navigate('/chat');
  };

  return (
    <div className="home-container">
      {/* 头部区域 */}
      <div className="home-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="main-title">MCP Agent Graph</h1>
            <p className="subtitle">高效、轻量、易上手的 Agent 开发框架</p>
          </div>
        </div>
      </div>

      {/* 核心特性简介 */}
      <div className="features-brief">
        <div className="features-row">
          <div className="feature-item">
            <BulbOutlined className="feature-icon" />
            <span>从需求到智能体</span>
          </div>
          <div className="feature-item">
            <ApiOutlined className="feature-icon" />
            <span>AI 生成 MCP 工具</span>
          </div>
          <div className="feature-item">
            <SettingOutlined className="feature-icon" />
            <span>图嵌套图</span>
          </div>
          <div className="feature-item">
            <EditOutlined className="feature-icon" />
            <span>可视化编辑器</span>
          </div>
        </div>
      </div>

      {/* 主要入口按钮区域 - 水平长条形状 */}
      <div className="main-actions">
        <div className="actions-horizontal">
          <div className="action-bar workspace-bar" onClick={handleEnterWorkspace}>
            <div className="bar-icon">
              <DesktopOutlined />
            </div>
            <div className="bar-content">
              <h3>进入工作台</h3>
              <p>GRAPH • MODEL • MCP 管理</p>
            </div>
            <div className="bar-arrow">
              <DesktopOutlined />
            </div>
          </div>

          <div className="action-bar chat-bar" onClick={handleEnterChat}>
            <div className="bar-icon">
              <MessageOutlined />
            </div>
            <div className="bar-content">
              <h3>对话系统</h3>
              <p>CHAT • AGENT • GRAPH 运行</p>
            </div>
            <div className="bar-arrow">
              <StarOutlined />
            </div>
          </div>
        </div>
      </div>

      {/* 底部信息 */}
      <div className="home-footer">
        <p>© 2025 MCP Agent Graph - 让智能体开发变得简单</p>
      </div>
    </div>
  );
};

export default Home;
