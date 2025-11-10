// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../services/authService';
import { setToken, setRefreshToken, setUserInfo } from '../utils/auth';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import './LoginPage.css';

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
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>MCP Agent Graph</h1>
          <p className="login-subtitle">欢迎回来，请登录您的账号</p>
        </div>

        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>
              <UserOutlined className="input-icon" />
              用户名
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="请输入用户名"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>
              <LockOutlined className="input-icon" />
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <>正在登录...</>
            ) : (
              <>
                <LoginOutlined /> 登录
              </>
            )}
          </button>
        </form>

        <div className="register-link">
          还没有账号？<a href="/register">立即注册</a>
        </div>

        <div className="login-footer">
          <p>默认管理员账号：admin / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
