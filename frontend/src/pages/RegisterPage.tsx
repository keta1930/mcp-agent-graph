// src/pages/RegisterPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input, Button, Alert, Typography, Space, Progress } from 'antd';
import { User, Lock, Shield, UserPlus } from 'lucide-react';
import { register } from '../services/authService';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (pwd: string): string => {
    if (pwd.length < 8) {
      return '密码至少需要8个字符';
    }
    return '';
  };

  const getPasswordStrength = (pwd: string): { level: number; text: string; color: string } => {
    if (pwd.length === 0) return { level: 0, text: '', color: '' };
    if (pwd.length < 8) return { level: 1, text: '弱', color: '#f5222d' };

    let strength = 0;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { level: 2, text: '中', color: '#fa8c16' };
    if (strength <= 4) return { level: 3, text: '强', color: '#52c41a' };
    return { level: 4, text: '很强', color: '#1890ff' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证密码
    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      await register(inviteCode, userId, password);

      // 注册成功，跳转登录
      navigate('/login', {
        state: { message: '注册成功，请登录' }
      });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail === 'Invalid invite code') {
        setError('邀请码无效或已被禁用');
      } else if (detail === 'User already exists') {
        setError('该用户名已被注册');
      } else if (detail === 'Invite code expired') {
        setError('邀请码已过期');
      } else if (detail === 'Invite code has reached maximum uses') {
        setError('邀请码使用次数已达上限');
      } else {
        setError(detail || '注册失败，请稍后重试');
      }
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
      {/* Language Switcher - positioned at top right */}
      <div style={{
        position: 'absolute',
        top: '24px',
        right: '24px',
        zIndex: 10
      }}>
        <LanguageSwitcher />
      </div>

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

      {/* 注册卡片 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        padding: '48px',
        borderRadius: '8px',
        border: '1px solid rgba(139, 115, 85, 0.15)',
        boxShadow: '0 4px 12px rgba(139, 115, 85, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        width: '100%',
        maxWidth: '480px',
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
            创建账号
          </Title>
          <Text style={{
            color: 'rgba(45, 45, 45, 0.65)',
            fontSize: '14px'
          }}>
            加入 MCP Agent Graph
          </Text>
        </div>

        {/* 表单 */}
        <form onSubmit={handleRegister}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {/* 邀请码输入框 */}
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
                <Shield size={14} strokeWidth={1.5} style={{ color: '#8b7355' }} />
                邀请码
              </Text>
              <Input
                size="large"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="请输入邀请码（如：TEAM-ABC123）"
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
              <Text style={{
                display: 'block',
                marginTop: '6px',
                color: 'rgba(45, 45, 45, 0.45)',
                fontSize: '12px'
              }}>
                请联系管理员获取邀请码
              </Text>
            </div>

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
                placeholder="至少8个字符"
                required
                style={{
                  height: '40px',
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  background: 'rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
                }}
              />
              {password && (
                <div style={{ marginTop: '8px' }}>
                  <Progress
                    percent={(passwordStrength.level / 4) * 100}
                    strokeColor={passwordStrength.color}
                    showInfo={false}
                    size="small"
                    style={{ marginBottom: '4px' }}
                  />
                  <Text style={{
                    fontSize: '12px',
                    color: passwordStrength.color
                  }}>
                    密码强度：{passwordStrength.text}
                  </Text>
                </div>
              )}
            </div>

            {/* 确认密码输入框 */}
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
                确认密码
              </Text>
              <Input.Password
                size="large"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入密码"
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

            {/* 注册按钮 */}
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
              block
              icon={<UserPlus size={16} strokeWidth={1.5} />}
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
              {loading ? '正在注册...' : '注册'}
            </Button>
          </Space>
        </form>

        {/* 登录链接 */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(139, 115, 85, 0.1)'
        }}>
          <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '14px' }}>
            已有账号？
            <Link
              to="/login"
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
              立即登录
            </Link>
          </Text>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
