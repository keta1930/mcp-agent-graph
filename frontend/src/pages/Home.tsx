// src/pages/Home.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Monitor, 
  MessageSquare, 
  Lightbulb,
  Zap,
  Network,
  Layers,
  ChevronRight
} from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [workspaceHover, setWorkspaceHover] = useState(false);
  const [chatHover, setChatHover] = useState(false);

  const handleEnterWorkspace = () => {
    navigate('/workspace');
  };

  const handleEnterChat = () => {
    navigate('/chat');
  };

  return (
    <>
      <style>
        {`
          @keyframes gentleFadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          @keyframes slowSlideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes subtleFloat {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-3px);
            }
          }
        `}
      </style>
      
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #faf8f5 0%, #f5f3f0 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 背景装饰 - 微妙的纹理 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="none"/><path d="M0 0L100 100M100 0L0 100" stroke="%238b7355" stroke-width="0.5"/></svg>')`,
          backgroundSize: '100px 100px',
          pointerEvents: 'none'
        }} />

        {/* 主容器 */}
        <div style={{
          maxWidth: '1200px',
          width: '100%',
          animation: 'gentleFadeIn 0.8s ease-out',
          position: 'relative',
          zIndex: 1
        }}>
          {/* 顶部标题区域 */}
          <div style={{
            textAlign: 'center',
            marginBottom: '64px',
            animation: 'slowSlideUp 0.8s ease-out'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              padding: '8px 20px',
              background: 'rgba(255, 255, 255, 0.6)',
              borderRadius: '24px',
              border: '1px solid rgba(139, 115, 85, 0.12)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)'
            }}>
              <Layers size={20} strokeWidth={1.5} style={{ color: '#b85845' }} />
              <span style={{
                fontSize: '13px',
                color: 'rgba(45, 45, 45, 0.75)',
                fontWeight: 500,
                letterSpacing: '1px'
              }}>
                MCP AGENT GRAPH
              </span>
            </div>
            
            <h1 style={{
              fontSize: '42px',
              fontWeight: 500,
              color: '#2d2d2d',
              margin: '0 0 16px 0',
              letterSpacing: '1px',
              lineHeight: 1.4
            }}>
              智能体开发框架
            </h1>
            
            <p style={{
              fontSize: '16px',
              color: 'rgba(45, 45, 45, 0.65)',
              margin: 0,
              fontWeight: 400,
              letterSpacing: '0.5px',
              lineHeight: 1.6
            }}>
              从需求到实现，让 AI 开发变得简单而优雅
            </p>
          </div>

          {/* 核心特性 - 横向卡片 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '48px',
            animation: 'slowSlideUp 0.8s ease-out 0.2s both'
          }}>
            {[
              { icon: Lightbulb, title: '需求驱动', desc: '从想法到智能体' },
              { icon: Zap, title: 'AI 生成', desc: '自动创建 MCP 工具' },
              { icon: Network, title: '图嵌套图', desc: '复杂流程编排' },
              { icon: Layers, title: '可视化', desc: '直观的编辑体验' }
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  style={{
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '8px',
                    border: '1px solid rgba(139, 115, 85, 0.12)',
                    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 115, 85, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
                  }}
                >
                  <Icon size={24} strokeWidth={1.5} style={{ 
                    color: '#b85845',
                    marginBottom: '12px'
                  }} />
                  <div style={{
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#2d2d2d',
                    marginBottom: '4px',
                    letterSpacing: '0.3px'
                  }}>
                    {feature.title}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(45, 45, 45, 0.65)',
                    letterSpacing: '0.2px',
                    lineHeight: 1.5
                  }}>
                    {feature.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 主要入口 - 大卡片 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            animation: 'slowSlideUp 0.8s ease-out 0.4s both'
          }}>
            {/* 工作台卡片 */}
            <div
              onClick={handleEnterWorkspace}
              onMouseEnter={() => setWorkspaceHover(true)}
              onMouseLeave={() => setWorkspaceHover(false)}
              style={{
                padding: '32px',
                background: workspaceHover 
                  ? 'linear-gradient(135deg, rgba(184, 88, 69, 0.08) 0%, rgba(160, 130, 109, 0.08) 100%)'
                  : 'rgba(255, 255, 255, 0.85)',
                borderRadius: '12px',
                border: workspaceHover 
                  ? '1px solid rgba(184, 88, 69, 0.25)'
                  : '1px solid rgba(139, 115, 85, 0.15)',
                boxShadow: workspaceHover
                  ? '0 8px 24px rgba(184, 88, 69, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                  : '0 2px 8px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                transform: workspaceHover ? 'translateY(-4px)' : 'translateY(0)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* 装饰性渐变 */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '120px',
                height: '120px',
                background: 'radial-gradient(circle at top right, rgba(184, 88, 69, 0.08), transparent)',
                pointerEvents: 'none',
                opacity: workspaceHover ? 1 : 0.5,
                transition: 'opacity 0.4s ease'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'inline-flex',
                  padding: '12px',
                  background: 'rgba(184, 88, 69, 0.1)',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <Monitor size={32} strokeWidth={1.5} style={{ color: '#b85845' }} />
                </div>

                <h3 style={{
                  fontSize: '20px',
                  fontWeight: 500,
                  color: '#2d2d2d',
                  margin: '0 0 8px 0',
                  letterSpacing: '0.5px'
                }}>
                  进入工作台
                </h3>

                <p style={{
                  fontSize: '14px',
                  color: 'rgba(45, 45, 45, 0.65)',
                  margin: '0 0 20px 0',
                  lineHeight: 1.6,
                  letterSpacing: '0.3px'
                }}>
                  管理 Agent、模型配置和 MCP 服务器
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#b85845',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.3px'
                }}>
                  <span>开始管理</span>
                  <ChevronRight 
                    size={16} 
                    strokeWidth={2}
                    style={{
                      transform: workspaceHover ? 'translateX(4px)' : 'translateX(0)',
                      transition: 'transform 0.3s ease'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 对话系统卡片 */}
            <div
              onClick={handleEnterChat}
              onMouseEnter={() => setChatHover(true)}
              onMouseLeave={() => setChatHover(false)}
              style={{
                padding: '32px',
                background: chatHover 
                  ? 'linear-gradient(135deg, rgba(205, 127, 50, 0.08) 0%, rgba(212, 165, 116, 0.08) 100%)'
                  : 'rgba(255, 255, 255, 0.85)',
                borderRadius: '12px',
                border: chatHover 
                  ? '1px solid rgba(205, 127, 50, 0.25)'
                  : '1px solid rgba(139, 115, 85, 0.15)',
                boxShadow: chatHover
                  ? '0 8px 24px rgba(205, 127, 50, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                  : '0 2px 8px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                transform: chatHover ? 'translateY(-4px)' : 'translateY(0)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* 装饰性渐变 */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '120px',
                height: '120px',
                background: 'radial-gradient(circle at top right, rgba(205, 127, 50, 0.08), transparent)',
                pointerEvents: 'none',
                opacity: chatHover ? 1 : 0.5,
                transition: 'opacity 0.4s ease'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'inline-flex',
                  padding: '12px',
                  background: 'rgba(205, 127, 50, 0.1)',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <MessageSquare size={32} strokeWidth={1.5} style={{ color: '#cd7f32' }} />
                </div>

                <h3 style={{
                  fontSize: '20px',
                  fontWeight: 500,
                  color: '#2d2d2d',
                  margin: '0 0 8px 0',
                  letterSpacing: '0.5px'
                }}>
                  对话系统
                </h3>

                <p style={{
                  fontSize: '14px',
                  color: 'rgba(45, 45, 45, 0.65)',
                  margin: '0 0 20px 0',
                  lineHeight: 1.6,
                  letterSpacing: '0.3px'
                }}>
                  与 AI Agent 交互，运行智能体工作流
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#cd7f32',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.3px'
                }}>
                  <span>开始对话</span>
                  <ChevronRight 
                    size={16} 
                    strokeWidth={2}
                    style={{
                      transform: chatHover ? 'translateX(4px)' : 'translateX(0)',
                      transition: 'transform 0.3s ease'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 底部信息 */}
          <div style={{
            textAlign: 'center',
            marginTop: '64px',
            animation: 'gentleFadeIn 1.2s ease-out'
          }}>
            <div style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '20px',
              border: '1px solid rgba(139, 115, 85, 0.1)'
            }}>
              <p style={{
                color: 'rgba(45, 45, 45, 0.5)',
                margin: 0,
                fontSize: '13px',
                letterSpacing: '0.5px',
                fontWeight: 400
              }}>
                © 2025 MCP Agent Graph
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
