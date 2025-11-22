// src/components/common/UserMenu.tsx
import React from 'react';
import { Dropdown, App, message } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { useT } from '../../i18n/hooks';
import { getCurrentUserDisplayName } from '../../config/user';
import { logout as logoutAPI } from '../../services/authService';
import { removeToken } from '../../utils/auth';

interface UserMenuProps {
  /** 是否收起状态（影响显示样式） */
  collapsed?: boolean;
  /** 下拉菜单弹出位置 */
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}

/**
 * 用户头像下拉菜单组件
 * 
 * 功能：
 * - 显示用户头像和用户名
 * - 下拉菜单包含：个人设置（未来）、退出登录
 * - 统一的登出确认弹窗样式
 */
const UserMenu: React.FC<UserMenuProps> = ({ 
  collapsed = false,
  placement = 'topLeft'
}) => {
  const navigate = useNavigate();
  const t = useT();
  const { modal } = App.useApp();
  const currentUserDisplayName = getCurrentUserDisplayName();

  const handleLogout = () => {
    modal.confirm({
      title: (
        <span style={{
          color: '#2d2d2d',
          fontSize: '16px',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}>
          {t('pages.workspace.logoutConfirmTitle')}
        </span>
      ),
      content: (
        <span style={{
          color: 'rgba(45, 45, 45, 0.75)',
          fontSize: '14px'
        }}>
          {t('pages.workspace.logoutConfirmMessage')}
        </span>
      ),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      centered: true,
      styles: {
        body: {
          padding: '24px',
        },
        header: {
          padding: '24px 24px 16px',
          borderBottom: '1px solid rgba(139, 115, 85, 0.1)',
        },
        footer: {
          padding: '16px 24px',
          borderTop: '1px solid rgba(139, 115, 85, 0.1)',
        },
        mask: {
          backdropFilter: 'blur(4px)',
        },
        content: {
          borderRadius: '8px',
          border: '1px solid rgba(139, 115, 85, 0.15)',
          boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)',
          background: 'rgba(255, 255, 255, 0.95)',
        }
      },
      okButtonProps: {
        style: {
          background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
          border: 'none',
          borderRadius: '6px',
          height: '36px',
          padding: '0 20px',
          fontWeight: 500,
          letterSpacing: '0.3px',
          boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
        }
      },
      cancelButtonProps: {
        style: {
          background: 'rgba(139, 115, 85, 0.08)',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          borderRadius: '6px',
          height: '36px',
          padding: '0 20px',
          fontWeight: 500,
          letterSpacing: '0.3px',
          color: 'rgba(45, 45, 45, 0.85)',
        }
      },
      onOk: async () => {
        try {
          await logoutAPI();
          removeToken();
          message.success(t('pages.workspace.logoutSuccess'));
          navigate('/login');
        } catch (error) {
          console.error('Logout failed:', error);
          // 即使API调用失败，也清除本地token并跳转
          removeToken();
          navigate('/login');
        }
      }
    });
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <Settings size={16} strokeWidth={1.5} />,
      label: t('pages.workspace.userSettings'),
      disabled: true, // 暂时禁用，未来实现
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogOut size={16} strokeWidth={1.5} />,
      label: t('pages.workspace.logout'),
      onClick: handleLogout,
      style: {
        color: 'rgba(184, 88, 69, 0.85)',
      }
    },
  ];

  return (
    <Dropdown
      menu={{ items: userMenuItems }}
      trigger={['click']}
      placement={placement}
      overlayStyle={{
        minWidth: collapsed ? '180px' : '220px',
      }}
      dropdownRender={(menu) => (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '8px',
          border: '1px solid rgba(139, 115, 85, 0.15)',
          boxShadow: '0 4px 12px rgba(139, 115, 85, 0.12)',
          overflow: 'hidden',
        }}>
          {!collapsed && (
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(139, 115, 85, 0.1)',
              background: 'rgba(250, 248, 245, 0.5)',
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#2d2d2d',
                marginBottom: '4px',
              }}>
                {currentUserDisplayName}
              </div>
              <div style={{
                fontSize: '12px',
                color: 'rgba(45, 45, 45, 0.55)',
              }}>
                {t('pages.workspace.userMenuSubtitle')}
              </div>
            </div>
          )}
          {React.cloneElement(menu as React.ReactElement, {
            style: {
              border: 'none',
              boxShadow: 'none',
            }
          })}
        </div>
      )}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? '0' : '8px',
          padding: collapsed ? '8px' : '8px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          flex: collapsed ? 'none' : 1,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(139, 115, 85, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
        }}>
          {currentUserDisplayName.charAt(0).toUpperCase()}
        </div>
        {!collapsed && (
          <span style={{
            color: 'rgba(45, 45, 45, 0.85)',
            fontSize: '13px',
            fontWeight: 500,
          }}>
            {currentUserDisplayName}
          </span>
        )}
      </div>
    </Dropdown>
  );
};

export default UserMenu;
