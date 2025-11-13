// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Input, Button, Alert, Typography, Space } from 'antd';
import { User, Lock, LogIn } from 'lucide-react';
import { login } from '../services/authService';
import { setToken, setRefreshToken, setUserInfo } from '../utils/auth';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 获取注册成功后的提示消息
  const successMessage = (location.state as any)?.message;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(userId, password);

      // 保存Token和用户信息
      setToken(response.access_token);
      setRefreshToken(response.refresh_token);
      setUserInfo({
        user_id: response.user_id,
        role: response.role as 'super_admin' | 'admin' | 'user'
      });

      // 跳转到主页
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#faf8f5',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 装饰性背景元素 */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-5%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(184, 88, 69, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-5%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 115, 85, 0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* 登录卡片 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        padding: '48px',
        borderRadius: '8px',
        border: '1px solid rgba(139, 115, 85, 0.15)',
        boxShadow: '0 4px 12px rgba(139, 115, 85, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* 头部 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <Title level={2} style={{
            margin: '0 0 8px 0',
            color: '#2d2d2d',
            fontWeight: 500,
            letterSpacing: '1px',
            fontSize: '24px'
          }}>
            MCP Agent Graph
          </Title>
          <Text style={{
            color: 'rgba(45, 45, 45, 0.65)',
            fontSize: '14px'
          }}>
            欢迎回来，请登录您的账号
          </Text>
        </div>

        {/* 成功消息 */}
        {successMessage && (
          <Alert
            message={successMessage}
            type="success"
            showIcon
            style={{
              marginBottom: '24px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(212, 165, 116, 0.08)'
            }}
          />
        )}

        {/* 表单 */}
        <form onSubmit={handleLogin}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {/* 用户名输入框 */}
            <div>
              <Text style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
                color: '#2d2d2d',
                fontWeight: 500,
                fontSize: '14px'
              }}>
                <User size={14} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                用户名
              </Text>
              <Input
                size="large"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="请输入用户名"
                required
                autoFocus
                style={{
                  height: '40px',
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                }}
              />
            </div>

            {/* 密码输入框 */}
            <div>
              <Text style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
                color: '#2d2d2d',
                fontWeight: 500,
                fontSize: '14px'
              }}>
                <Lock size={14} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                密码
              </Text>
              <Input.Password
                size="large"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                style={{
                  height: '40px',
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                }}
              />
            </div>

            {/* 错误消息 */}
            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{
                  borderRadius: '6px',
                  border: '1px solid rgba(184, 88, 69, 0.3)',
                  background: 'rgba(184, 88, 69, 0.08)'
                }}
              />
            )}

            {/* 登录按钮 */}
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
              block
              icon={<LogIn size={16} strokeWidth={1.5} />}
              style={{
                height: '44px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                fontSize: '16px',
                fontWeight: 500,
                letterSpacing: '0.5px',
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
              }}
            >
              {loading ? '正在登录...' : '登录'}
            </Button>
          </Space>
        </form>

        {/* 注册链接 */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(139, 115, 85, 0.1)'
        }}>
          <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '14px' }}>
            还没有账号？
            <Link
              to="/register"
              style={{
                color: '#b85845',
                textDecoration: 'none',
                fontWeight: 500,
                marginLeft: '6px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#a0826d';
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#b85845';
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              立即注册
            </Link>
          </Text>
        </div>

        {/* 底部提示 */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(139, 115, 85, 0.1)'
        }}>
          <Text style={{
            color: 'rgba(45, 45, 45, 0.45)',
            fontSize: '12px'
          }}>
            默认管理员账号：admin / admin123
          </Text>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
