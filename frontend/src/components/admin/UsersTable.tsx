import React from 'react';
import { Table, Tag, Button, Space, Typography, Pagination } from 'antd';
import { User } from '../../services/adminService';
import { COLORS, SHADOWS, getStatusTagStyle, getPrimaryButtonStyle } from '../../constants/adminPanelStyles';

const { Text } = Typography;

interface UsersTableProps {
  users: User[];
  loading: boolean;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPromoteUser: (userId: string) => void;
  onDeactivateUser: (userId: string) => void;
  t: (key: string, params?: any) => string;
}

/**
 * 用户管理表格组件
 */
const UsersTable: React.FC<UsersTableProps> = ({
  users,
  loading,
  currentPage,
  pageSize,
  onPageChange,
  onPromoteUser,
  onDeactivateUser,
  t,
}) => {
  // 表格自定义样式组件
  const tableComponents = {
    body: {
      row: (props: any) => (
        <tr
          {...props}
          style={{
            transition: 'all 0.2s ease',
            ...props.style
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(250, 248, 245, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        />
      )
    }
  };

  // 用户表格列定义
  const columns = [
    {
      title: t('pages.adminPanel.users.username'),
      dataIndex: 'user_id',
      key: 'user_id',
      render: (userId: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            color: COLORS.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: SHADOWS.button
          }}>
            {userId.charAt(0).toUpperCase()}
          </div>
          <Text style={{ color: COLORS.text, fontWeight: 500 }}>{userId}</Text>
        </div>
      )
    },
    {
      title: t('pages.adminPanel.users.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleConfig = {
          super_admin: { text: t('pages.adminPanel.users.roleSuperAdmin'), color: COLORS.primary },
          admin: { text: t('pages.adminPanel.users.roleAdmin'), color: COLORS.secondary },
          user: { text: t('pages.adminPanel.users.roleUser'), color: COLORS.tertiary }
        };
        const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.user;
        return (
          <Tag style={{
            background: `${config.color}15`,
            color: config.color,
            border: `1px solid ${config.color}40`,
            borderRadius: '6px',
            fontWeight: 500,
            padding: '4px 12px'
          }}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: t('pages.adminPanel.users.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag style={getStatusTagStyle(isActive)}>
          {isActive ? t('pages.adminPanel.users.statusActive') : t('pages.adminPanel.users.statusDeactivated')}
        </Tag>
      )
    },
    {
      title: t('pages.adminPanel.users.registrationTime'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Text style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      )
    },
    {
      title: t('pages.adminPanel.users.lastLogin'),
      dataIndex: 'last_login',
      key: 'last_login',
      render: (date: string | null) => (
        <Text style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
          {date ? new Date(date).toLocaleString() : '-'}
        </Text>
      )
    },
    {
      title: t('pages.adminPanel.users.actions'),
      key: 'action',
      render: (_: any, record: User) => (
        <Space size={8}>
          {record.role === 'user' && record.is_active && (
            <Button
              size="small"
              onClick={() => onPromoteUser(record.user_id)}
              style={{
                ...getPrimaryButtonStyle('small'),
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {t('pages.adminPanel.users.promoteToAdmin')}
            </Button>
          )}
          {record.is_active && record.role !== 'super_admin' && (
            <Button
              size="small"
              danger
              onClick={() => onDeactivateUser(record.user_id)}
              style={{
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                height: '28px',
                padding: '0 12px'
              }}
            >
              {t('pages.adminPanel.users.deactivate')}
            </Button>
          )}
        </Space>
      )
    }
  ];

  const paginatedUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{
      background: COLORS.whiteAlpha85,
      borderRadius: '8px',
      border: '1px solid rgba(139, 115, 85, 0.15)',
      boxShadow: SHADOWS.card,
      overflow: 'hidden',
      height: '750px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={paginatedUsers}
          rowKey="user_id"
          loading={loading}
          components={tableComponents}
          pagination={false}
          style={{
            background: 'transparent'
          }}
        />
      </div>
      {/* 自定义底部：统计 + 分页 */}
      <div style={{
        padding: '16px',
        background: 'rgba(250, 248, 245, 0.5)',
        borderTop: '1px solid rgba(139, 115, 85, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={users.length}
          onChange={onPageChange}
          showTotal={(total) => t('pages.adminPanel.users.totalUsers', { total })}
          itemRender={(page, type, originalElement) => {
            if (type === 'page') {
              return page === currentPage ? originalElement : null;
            }
            return originalElement;
          }}
          style={{
            margin: 0
          }}
        />
      </div>
    </div>
  );
};

export default UsersTable;
