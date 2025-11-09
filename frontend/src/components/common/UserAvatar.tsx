// src/components/common/UserAvatar.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserInfo, removeToken, isAdmin } from '../../utils/auth';
import { logout } from '../../services/authService';
import { UserOutlined, LogoutOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons';
import './UserAvatar.css';

export const UserAvatar: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const userInfo = getUserInfo();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      removeToken();
      navigate('/login');
    }
  };

  if (!userInfo) return null;

  return (
    <div className="user-avatar-container">
      <div
        className="avatar-button"
        onClick={() => setShowMenu(!showMenu)}
      >
        <div className="avatar-icon">
          {userInfo.user_id.charAt(0).toUpperCase()}
        </div>
        <span className="username">{userInfo.user_id}</span>
        {(userInfo.role === 'admin' || userInfo.role === 'super_admin') && (
          <span className="role-badge admin">管理员</span>
        )}
      </div>

      {showMenu && (
        <>
          <div className="menu-overlay" onClick={() => setShowMenu(false)} />
          <div className="user-menu">
            <div className="menu-header">
              <div className="menu-user-info">
                <div className="menu-avatar">
                  {userInfo.user_id.charAt(0).toUpperCase()}
                </div>
                <div className="menu-user-details">
                  <div className="menu-username">{userInfo.user_id}</div>
                </div>
              </div>
            </div>

            <div className="menu-divider" />

            {isAdmin() && (
              <>
                <div className="menu-item" onClick={() => {
                  setShowMenu(false);
                  navigate('/admin');
                }}>
                  <TeamOutlined className="menu-icon" />
                  <span>管理后台</span>
                </div>
                <div className="menu-divider" />
              </>
            )}

            <div className="menu-item" onClick={() => {
              setShowMenu(false);
              navigate('/settings');
            }}>
              <SettingOutlined className="menu-icon" />
              <span>设置</span>
            </div>

            <div className="menu-divider" />

            <div className="menu-item danger" onClick={handleLogout}>
              <LogoutOutlined className="menu-icon" />
              <span>退出登录</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserAvatar;
