// src/pages/AdminPanel.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Space, Tag, Button, Table, Modal, Input, message, App, Pagination } from 'antd';
import { Shield, Users, Key, Plus, Copy, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { isAdmin } from '../utils/auth';
import {
  listUsers,
  promoteUser,
  deactivateUser,
  listInviteCodes,
  createInviteCode,
  toggleInviteCode,
  User,
  InviteCode
} from '../services/adminService';
import { useT } from '../i18n/hooks';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const t = useT();
  const { modal } = App.useApp();
  const [viewMode, setViewMode] = useState<'users' | 'invites'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  const [newCodeDescription, setNewCodeDescription] = useState('');
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userPageSize] = useState(10);
  const [inviteCurrentPage, setInviteCurrentPage] = useState(1);
  const [invitePageSize] = useState(10);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    loadData();
  }, [viewMode, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'users') {
        const userList = await listUsers();
        setUsers(userList);
      } else {
        const codeList = await listInviteCodes();
        setInviteCodes(codeList);
      }
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('pages.adminPanel.loadDataFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteUser = async (userId: string) => {
    modal.confirm({
      title: t('pages.adminPanel.users.promoteConfirmTitle'),
      content: t('pages.adminPanel.users.promoteConfirmMessage', { userId }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      centered: true,
      styles: {
        mask: {
          backdropFilter: 'blur(8px)',
          background: 'rgba(139, 115, 85, 0.15)'
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
          boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
        }
      },
      cancelButtonProps: {
        style: {
          borderRadius: '6px',
          height: '36px',
          padding: '0 20px',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          color: '#8b7355',
          fontWeight: 500
        }
      },
      onOk: async () => {
        try {
          await promoteUser(userId);
          message.success(t('pages.adminPanel.operationSuccess'));
          loadData();
        } catch (err: any) {
          message.error(err.response?.data?.detail || t('pages.adminPanel.operationFailed'));
        }
      }
    });
  };

  const handleDeactivateUser = async (userId: string) => {
    modal.confirm({
      title: t('pages.adminPanel.users.deactivateConfirmTitle'),
      content: t('pages.adminPanel.users.deactivateConfirmMessage', { userId }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      centered: true,
      styles: {
        mask: {
          backdropFilter: 'blur(8px)',
          background: 'rgba(139, 115, 85, 0.15)'
        }
      },
      okButtonProps: {
        danger: true,
        style: {
          borderRadius: '6px',
          height: '36px',
          padding: '0 20px',
          fontWeight: 500
        }
      },
      cancelButtonProps: {
        style: {
          borderRadius: '6px',
          height: '36px',
          padding: '0 20px',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          color: '#8b7355',
          fontWeight: 500
        }
      },
      onOk: async () => {
        try {
          await deactivateUser(userId);
          message.success(t('pages.adminPanel.operationSuccess'));
          loadData();
        } catch (err: any) {
          message.error(err.response?.data?.detail || t('pages.adminPanel.operationFailed'));
        }
      }
    });
  };

  const handleCreateInviteCode = () => {
    setNewCodeDescription('');
    setDescriptionModalVisible(true);
  };

  const handleConfirmCreateCode = async () => {
    try {
      const code = await createInviteCode(newCodeDescription || undefined);
      message.success(t('pages.adminPanel.inviteCodes.createSuccess', { code }));
      setDescriptionModalVisible(false);
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('pages.adminPanel.inviteCodes.createFailed'));
    }
  };

  const handleToggleInviteCode = async (code: string, isActive: boolean) => {
    try {
      await toggleInviteCode(code, !isActive);
      message.success(t('pages.adminPanel.operationSuccess'));
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('pages.adminPanel.operationFailed'));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(t('pages.adminPanel.copiedToClipboard'));
  };

  // 表格自定义样式组件（现在 index.css 已经使用大地色系，不再需要 !important）
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
  const userColumns = [
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
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
          }}>
            {userId.charAt(0).toUpperCase()}
          </div>
          <Text style={{ color: '#2d2d2d', fontWeight: 500 }}>{userId}</Text>
        </div>
      )
    },
    {
      title: t('pages.adminPanel.users.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const roleConfig = {
          super_admin: { text: t('pages.adminPanel.users.roleSuperAdmin'), color: '#b85845' },
          admin: { text: t('pages.adminPanel.users.roleAdmin'), color: '#a0826d' },
          user: { text: t('pages.adminPanel.users.roleUser'), color: '#8b7355' }
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
        <Tag style={{
          background: isActive ? 'rgba(82, 196, 26, 0.08)' : 'rgba(139, 115, 85, 0.08)',
          color: isActive ? '#52c41a' : '#8b7355',
          border: `1px solid ${isActive ? 'rgba(82, 196, 26, 0.25)' : 'rgba(139, 115, 85, 0.25)'}`,
          borderRadius: '6px',
          fontWeight: 500,
          padding: '4px 12px'
        }}>
          {isActive ? t('pages.adminPanel.users.statusActive') : t('pages.adminPanel.users.statusDeactivated')}
        </Tag>
      )
    },
    {
      title: t('pages.adminPanel.users.registrationTime'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '13px' }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      )
    },
    {
      title: t('pages.adminPanel.users.lastLogin'),
      dataIndex: 'last_login',
      key: 'last_login',
      render: (date: string | null) => (
        <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '13px' }}>
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
              onClick={() => handlePromoteUser(record.user_id)}
              style={{
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
                height: '28px',
                padding: '0 12px'
              }}
            >
              {t('pages.adminPanel.users.promoteToAdmin')}
            </Button>
          )}
          {record.is_active && record.role !== 'super_admin' && (
            <Button
              size="small"
              danger
              onClick={() => handleDeactivateUser(record.user_id)}
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

  // 邀请码表格列定义
  const inviteColumns = [
    {
      title: t('pages.adminPanel.inviteCodes.inviteCode'),
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <code style={{
            background: 'rgba(139, 115, 85, 0.08)',
            color: '#b85845',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid rgba(139, 115, 85, 0.2)',
            fontFamily: 'monospace'
          }}>
            {code}
          </code>
          <div
            onClick={() => copyToClipboard(code)}
            style={{
              padding: '4px',
              borderRadius: '4px',
              color: '#8b7355',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#b85845';
              e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8b7355';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Copy size={14} strokeWidth={1.5} />
          </div>
        </div>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag style={{
          background: isActive ? 'rgba(82, 196, 26, 0.08)' : 'rgba(139, 115, 85, 0.08)',
          color: isActive ? '#52c41a' : '#8b7355',
          border: `1px solid ${isActive ? 'rgba(82, 196, 26, 0.25)' : 'rgba(139, 115, 85, 0.25)'}`,
          borderRadius: '6px',
          fontWeight: 500,
          padding: '4px 12px'
        }}>
          {isActive ? t('pages.adminPanel.inviteCodes.statusActive') : t('pages.adminPanel.inviteCodes.statusDeactivated')}
        </Tag>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.usage'),
      key: 'usage',
      render: (_: any, record: InviteCode) => (
        <Text style={{ color: 'rgba(45, 45, 45, 0.85)', fontSize: '13px', fontWeight: 500 }}>
          {record.current_uses} / {record.max_uses || t('pages.adminPanel.inviteCodes.unlimited')}
        </Text>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.creator'),
      dataIndex: 'created_by',
      key: 'created_by',
      render: (creator: string) => (
        <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '13px' }}>
          {creator}
        </Text>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '13px' }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.expiresAt'),
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (date: string | null) => (
        <Text style={{ color: 'rgba(45, 45, 45, 0.65)', fontSize: '13px' }}>
          {date ? new Date(date).toLocaleDateString() : t('pages.adminPanel.inviteCodes.permanent')}
        </Text>
      )
    },
    {
      title: t('pages.adminPanel.inviteCodes.actions'),
      key: 'action',
      render: (_: any, record: InviteCode) => (
        <Button
          size="small"
          danger={record.is_active}
          onClick={() => handleToggleInviteCode(record.code, record.is_active)}
          icon={record.is_active ? <XCircle size={14} strokeWidth={1.5} /> : <CheckCircle size={14} strokeWidth={1.5} />}
          style={{
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            height: '28px',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {record.is_active ? t('pages.adminPanel.inviteCodes.deactivate') : t('pages.adminPanel.inviteCodes.activate')}
        </Button>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#faf8f5' }}>
      {/* Header 顶栏 */}
      <Header style={{
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
        backdropFilter: 'blur(20px)',
        padding: '0 48px',
        borderBottom: 'none',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        position: 'relative'
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          {/* 左侧：图标 + 标题 + 统计标签 */}
          <Space size="large">
            <Shield size={28} color="#b85845" strokeWidth={1.5} />
            <Title level={4} style={{
              margin: 0,
              color: '#2d2d2d',
              fontWeight: 500,
              letterSpacing: '2px',
              fontSize: '18px'
            }}>
              {t('pages.adminPanel.title')}
            </Title>
            <Tag style={{
              background: 'rgba(184, 88, 69, 0.08)',
              color: '#b85845',
              border: '1px solid rgba(184, 88, 69, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {t('pages.adminPanel.usersCount', { count: users.length })}
            </Tag>
            <Tag style={{
              background: 'rgba(139, 115, 85, 0.08)',
              color: '#8b7355',
              border: '1px solid rgba(139, 115, 85, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              padding: '4px 12px',
              fontSize: '12px'
            }}>
              {t('pages.adminPanel.inviteCodesCount', { count: inviteCodes.length })}
            </Tag>
          </Space>

          {/* 右侧：视图切换按钮 + 返回按钮 */}
          <Space size="middle">
            <Button
              onClick={() => setViewMode(viewMode === 'users' ? 'invites' : 'users')}
              style={{
                height: '36px',
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#8b7355',
                fontSize: '14px',
                fontWeight: 500,
                letterSpacing: '0.3px',
                boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#b85845';
                e.currentTarget.style.color = '#b85845';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.2)';
                e.currentTarget.style.color = '#8b7355';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
              }}
            >
              {viewMode === 'users' ? (
                <>
                  <Key size={16} strokeWidth={1.5} />
                  {t('pages.adminPanel.inviteCodeManagement')}
                </>
              ) : (
                <>
                  <Users size={16} strokeWidth={1.5} />
                  {t('pages.adminPanel.userManagement')}
                </>
              )}
            </Button>
            <Button
              icon={<ArrowLeft size={16} strokeWidth={1.5} />}
              onClick={() => navigate('/')}
              style={{
                height: '36px',
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#8b7355',
                fontWeight: 500,
                boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {t('pages.adminPanel.backHome')}
            </Button>
          </Space>
        </div>
      </Header>

      {/* Content 内容区 */}
      <Content style={{ padding: '32px 48px', overflow: 'auto' }}>
        {/* 用户管理视图 */}
        {viewMode === 'users' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '8px',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
            overflow: 'hidden',
            height: '750px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Table
                columns={userColumns}
                dataSource={users.slice((userCurrentPage - 1) * userPageSize, userCurrentPage * userPageSize)}
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
                current={userCurrentPage}
                pageSize={userPageSize}
                total={users.length}
                onChange={(page) => {
                  setUserCurrentPage(page);
                }}
                showTotal={(total) => t('pages.adminPanel.users.totalUsers', { total })}
                itemRender={(page, type, originalElement) => {
                  if (type === 'page') {
                    return page === userCurrentPage ? originalElement : null;
                  }
                  return originalElement;
                }}
                style={{
                  margin: 0
                }}
              />
            </div>
          </div>
        )}

        {/* 邀请码管理视图 */}
        {viewMode === 'invites' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '8px',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
            overflow: 'hidden',
            height: '750px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <Table
                columns={inviteColumns}
                dataSource={inviteCodes.slice((inviteCurrentPage - 1) * invitePageSize, inviteCurrentPage * invitePageSize)}
                rowKey="code"
                loading={loading}
                components={tableComponents}
                pagination={false}
                style={{
                  background: 'transparent'
                }}
              />
            </div>
            {/* 自定义底部：分页 + 创建按钮 */}
            <div style={{
              padding: '16px',
              background: 'rgba(250, 248, 245, 0.5)',
              borderTop: '1px solid rgba(139, 115, 85, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              position: 'relative'
            }}>
              <div style={{ width: '150px' }} />
              <div style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)'
              }}>
                <Pagination
                  current={inviteCurrentPage}
                  pageSize={invitePageSize}
                  total={inviteCodes.length}
                  onChange={(page) => {
                    setInviteCurrentPage(page);
                  }}
                  showTotal={(total) => t('pages.adminPanel.inviteCodes.totalCodes', { total })}
                  itemRender={(page, type, originalElement) => {
                    if (type === 'page') {
                      return page === inviteCurrentPage ? originalElement : null;
                    }
                    return originalElement;
                  }}
                  style={{
                    margin: 0
                  }}
                />
              </div>
              <Button
                type="primary"
                icon={<Plus size={16} strokeWidth={1.5} />}
                onClick={handleCreateInviteCode}
                style={{
                  height: '32px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0
                }}
              >
                {t('pages.adminPanel.inviteCodes.generateNewCode')}
              </Button>
            </div>
          </div>
        )}
      </Content>

      {/* 创建邀请码描述弹窗 */}
      <Modal
        title={
          <span style={{
            color: '#2d2d2d',
            fontSize: '16px',
            fontWeight: 500,
            letterSpacing: '0.5px'
          }}>
            {t('pages.adminPanel.inviteCodes.createCodeTitle')}
          </span>
        }
        open={descriptionModalVisible}
        onOk={handleConfirmCreateCode}
        onCancel={() => setDescriptionModalVisible(false)}
        okText={t('pages.adminPanel.inviteCodes.generate')}
        cancelText={t('common.cancel')}
        centered
        width={480}
        styles={{
          mask: {
            backdropFilter: 'blur(8px)',
            background: 'rgba(139, 115, 85, 0.15)'
          },
          content: {
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(139, 115, 85, 0.15)',
            border: '1px solid rgba(139, 115, 85, 0.1)'
          },
          header: {
            borderBottom: '1px solid rgba(139, 115, 85, 0.1)',
            padding: '18px 24px',
            marginBottom: 0
          },
          body: {
            background: 'rgba(255, 255, 255, 0.98)',
            padding: '24px'
          },
          footer: {
            padding: '14px 20px',
            marginTop: 0
          }
        }}
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
            border: 'none',
            borderRadius: '6px',
            height: '36px',
            padding: '0 20px',
            fontWeight: 500,
            fontSize: '14px',
            letterSpacing: '0.3px',
            boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
            transition: 'all 0.3s ease'
          }
        }}
        cancelButtonProps={{
          style: {
            borderRadius: '6px',
            height: '36px',
            padding: '0 20px',
            border: '1px solid rgba(139, 115, 85, 0.25)',
            background: 'rgba(255, 255, 255, 0.8)',
            color: '#8b7355',
            fontWeight: 500,
            fontSize: '14px',
            letterSpacing: '0.3px',
            transition: 'all 0.3s ease'
          }
        }}
      >
        <div>
          <Text style={{
            display: 'block',
            marginBottom: '10px',
            color: 'rgba(45, 45, 45, 0.85)',
            fontWeight: 500,
            fontSize: '13px',
            letterSpacing: '0.3px'
          }}>
            {t('pages.adminPanel.inviteCodes.codeDescription')}
          </Text>
          <Input
            placeholder={t('pages.adminPanel.inviteCodes.codeDescriptionPlaceholder')}
            value={newCodeDescription}
            onChange={(e) => setNewCodeDescription(e.target.value)}
            style={{
              height: '40px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.9)',
              boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              color: '#2d2d2d',
              letterSpacing: '0.3px',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#b85845';
              e.target.style.boxShadow = '0 0 0 3px rgba(184, 88, 69, 0.08), 0 1px 3px rgba(139, 115, 85, 0.08)';
              e.target.style.background = 'rgba(255, 255, 255, 0.98)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)';
              e.target.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)';
              e.target.style.background = 'rgba(255, 255, 255, 0.9)';
            }}
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default AdminPanel;
