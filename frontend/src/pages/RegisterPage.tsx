// src/pages/RegisterPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/authService';
import {
  UserOutlined,
  LockOutlined,
  SafetyOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import './RegisterPage.css';

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
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>创建账号</h1>
          <p className="register-subtitle">加入 MCP Agent Graph</p>
        </div>

        <form onSubmit={handleRegister} className="register-form">
          <div className="form-group">
            <label>
              <SafetyOutlined className="input-icon" />
              邀请码 *
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="请输入邀请码（如：TEAM-ABC123）"
              required
              autoFocus
            />
            <small className="input-hint">请联系管理员获取邀请码</small>
          </div>

          <div className="form-group">
            <label>
              <UserOutlined className="input-icon" />
              用户名 *
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <LockOutlined className="input-icon" />
              密码 *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少8个字符"
              required
            />
            {password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(passwordStrength.level / 4) * 100}%`,
                      backgroundColor: passwordStrength.color
                    }}
                  />
                </div>
                <span style={{ color: passwordStrength.color }}>
                  密码强度：{passwordStrength.text}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>
              <LockOutlined className="input-icon" />
              确认密码 *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? (
              <>正在注册...</>
            ) : (
              <>
                <UserAddOutlined /> 注册
              </>
            )}
          </button>
        </form>

        <div className="login-link">
          已有账号？<a href="/login">立即登录</a>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
