// src/pages/Home.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Card, Space, Typography } from 'antd';
import { 
  Briefcase, 
  MessageSquare, 
  Lightbulb,
  Plug,
  Settings,
  Edit3,
  ChevronRight
} from 'lucide-react';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleEnterWorkspace = () => {
    navigate('/workspace');
  };

  const handleEnterChat = () => {
    navigate('/chat');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#faf8f5' }}>
      {/* Header 顶栏 */}
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative',
        height: '80px',
        display: 'flex',
        alignItems: 'center'
      }}>
        {/* 装饰性底部渐变线 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)'
        }} />

        <div style={{ textAlign: 'center', width: '100%' }}>
          <Title level={1} style={{
            margin: 0,
            color: '#2d2d2d',
            fontWeight: 500,
            letterSpacing: '2px',
            fontSize: '28px'
          }}>
            MCP Agent Graph
          </Title>
          <Text style={{
            color: 'rgba(45, 45, 45, 0.65)',
            fontSize: '14px',
            letterSpacing: '0.5px'
          }}>
            高效、轻量、易上手的 Agent 开发框架
          </Text>
        </div>
      </Header>

      {/* Content 内容区 */}
      <Content style={{
        padding: '64px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '48px'
      }}>
        {/* 核心特性展示 */}
        <div style={{
          display: 'flex',
          gap: '32px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '900px'
        }}>
          {[
            { icon: Lightbulb, text: '从需求到智能体', color: '#b85845' },
            { icon: Plug, text: 'AI 生成 MCP 工具', color: '#a0826d' },
            { icon: Settings, text: '图嵌套图', color: '#8b7355' },
            { icon: Edit3, text: '可视化编辑器', color: '#d4a574' }
          ].map((feature, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 24px',
              background: 'rgba(255, 255, 255, 0.6)',
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.1)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(139, 115, 85, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06)';
            }}
            >
              <feature.icon size={20} strokeWidth={1.5} style={{ color: feature.color }} />
              <Text style={{
                color: '#2d2d2d',
                fontSize: '14px',
                fontWeight: 500
              }}>
                {feature.text}
              </Text>
            </div>
          ))}
        </div>

        {/* 主入口卡片 */}
        <div style={{
          display: 'flex',
          gap: '32px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '1000px',
          width: '100%'
        }}>
          {/* 工作台入口 */}
          <Card
            hoverable
            onClick={handleEnterWorkspace}
            style={{
              flex: '1 1 400px',
              minWidth: '400px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.15)',
              boxShadow: '0 2px 6px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              background: 'rgba(255, 255, 255, 0.85)',
              transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
              cursor: 'pointer'
            }}
            styles={{
              body: { padding: '32px' }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(184, 88, 69, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Briefcase size={48} color="#b85845" strokeWidth={1.5} />
                <ChevronRight size={32} color="rgba(139, 115, 85, 0.3)" strokeWidth={1.5} />
              </div>
              <div>
                <Title level={3} style={{
                  margin: '0 0 8px 0',
                  color: '#2d2d2d',
                  fontSize: '22px',
                  fontWeight: 500
                }}>
                  进入工作台
                </Title>
                <Text style={{
                  color: 'rgba(45, 45, 45, 0.65)',
                  fontSize: '14px',
                  letterSpacing: '1px'
                }}>
                  GRAPH • MODEL • MCP 管理
                </Text>
              </div>
            </Space>
          </Card>

          {/* 对话系统入口 */}
          <Card
            hoverable
            onClick={handleEnterChat}
            style={{
              flex: '1 1 400px',
              minWidth: '400px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.15)',
              boxShadow: '0 2px 6px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              background: 'rgba(255, 255, 255, 0.85)',
              transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
              cursor: 'pointer'
            }}
            styles={{
              body: { padding: '32px' }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(160, 130, 109, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.borderColor = 'rgba(160, 130, 109, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <MessageSquare size={48} color="#a0826d" strokeWidth={1.5} />
                <ChevronRight size={32} color="rgba(139, 115, 85, 0.3)" strokeWidth={1.5} />
              </div>
              <div>
                <Title level={3} style={{
                  margin: '0 0 8px 0',
                  color: '#2d2d2d',
                  fontSize: '22px',
                  fontWeight: 500
                }}>
                  对话系统
                </Title>
                <Text style={{
                  color: 'rgba(45, 45, 45, 0.65)',
                  fontSize: '14px',
                  letterSpacing: '1px'
                }}>
                  CHAT • AGENT • GRAPH 运行
                </Text>
              </div>
            </Space>
          </Card>
        </div>

        {/* 底部信息 */}
        <div style={{
          marginTop: '32px',
          textAlign: 'center'
        }}>
          <Text style={{
            color: 'rgba(45, 45, 45, 0.45)',
            fontSize: '13px'
          }}>
            © 2025 MCP Agent Graph - 让智能体开发变得简单
          </Text>
        </div>
      </Content>
    </Layout>
  );
};

export default Home;
