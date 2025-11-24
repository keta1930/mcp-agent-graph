// src/components/common/UserAvatar.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { getUserInfo, removeToken, isAdmin } from '../../utils/auth';
import { logout } from '../../services/authService';
import { setUserLanguage } from '../../services/userSettingsService';
import { UserOutlined, LogoutOutlined, SettingOutlined, TeamOutlined, GlobalOutlined } from '@ant-design/icons';
import { useI18n } from '../../i18n/I18nContext';
import './UserAvatar.css';

export const UserAvatar: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [showLanguageSubmenu, setShowLanguageSubmenu] = useState(false);
  const userInfo = getUserInfo();
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();

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

  const handleLanguageChange = async (language: 'en' | 'zh') => {
    try {
      await setUserLanguage(language);
      setLocale(language);
      message.success(
        language === 'zh'
          ? '语言已切换为中文'
          : 'Language switched to English'
      );
      setShowLanguageSubmenu(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to set language:', error);
      message.error(
        language === 'zh'
          ? '语言设置失败'
          : 'Failed to set language'
      );
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
              <span>{t('pages.workspace.userSettings')}</span>
            </div>

            <div className="menu-divider" />

            <div
              className="menu-item"
              onMouseEnter={() => setShowLanguageSubmenu(true)}
              onMouseLeave={() => setShowLanguageSubmenu(false)}
              style={{ position: 'relative' }}
            >
              <GlobalOutlined className="menu-icon" />
              <span>{t('components.languageSwitcher.title')}</span>

              {showLanguageSubmenu && (
                <div className="language-submenu">
                  <div
                    className="submenu-item"
                    onClick={() => handleLanguageChange('en')}
                    style={{
                      color: locale === 'en' ? '#b85845' : undefined,
                      fontWeight: locale === 'en' ? 600 : undefined,
                    }}
                  >
                    {t('components.languageSwitcher.english')}
                  </div>
                  <div
                    className="submenu-item"
                    onClick={() => handleLanguageChange('zh')}
                    style={{
                      color: locale === 'zh' ? '#b85845' : undefined,
                      fontWeight: locale === 'zh' ? 600 : undefined,
                    }}
                  >
                    {t('components.languageSwitcher.chinese')}
                  </div>
                </div>
              )}
            </div>

            <div className="menu-divider" />

            <div className="menu-item danger" onClick={handleLogout}>
              <LogoutOutlined className="menu-icon" />
              <span>{t('pages.workspace.logout')}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserAvatar;
