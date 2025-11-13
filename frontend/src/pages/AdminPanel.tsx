// src/pages/AdminPanel.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Space, Tag, Button, Table, Modal, Input, message, App } from 'antd';
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
  const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  const [newCodeDescription, setNewCodeDescription] = useState('');

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    loadData();
  }, [activeTab, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
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
      okButtonProps: { danger: true },
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

          {/* 右侧：返回按钮 */}
          <Button
            icon={<ArrowLeft size={16} strokeWidth={1.5} />}
            onClick={() => navigate('/')}
            style={{
              height: '40px',
              borderRadius: '8px',
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
        </div>
      </Header>

      {/* Content 内容区 */}
      <Content style={{ padding: '32px 48px', overflow: 'auto' }}>
        {/* Tab 切换 */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          padding: '8px',
          background: 'rgba(255, 255, 255, 0.6)',
          borderRadius: '8px',
          border: '1px solid rgba(139, 115, 85, 0.15)',
          width: 'fit-content'
        }}>
          <div
            onClick={() => setActiveTab('users')}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              background: activeTab === 'users' ? 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)' : 'transparent',
              color: activeTab === 'users' ? '#fff' : '#8b7355',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: activeTab === 'users' ? '0 2px 6px rgba(184, 88, 69, 0.25)' : 'none'
            }}
          >
            <Users size={16} strokeWidth={1.5} />
            {t('pages.adminPanel.userManagement')}
          </div>
          <div
            onClick={() => setActiveTab('invites')}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              background: activeTab === 'invites' ? 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)' : 'transparent',
              color: activeTab === 'invites' ? '#fff' : '#8b7355',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: activeTab === 'invites' ? '0 2px 6px rgba(184, 88, 69, 0.25)' : 'none'
            }}
          >
            <Key size={16} strokeWidth={1.5} />
            {t('pages.adminPanel.inviteCodeManagement')}
          </div>
        </div>

        {/* 用户管理 Tab */}
        {activeTab === 'users' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '8px',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
            overflow: 'hidden'
          }}>
            <Table
              columns={userColumns}
              dataSource={users}
              rowKey="user_id"
              loading={loading}
              components={tableComponents}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => t('pages.adminPanel.users.totalUsers', { total }),
                style: {
                  padding: '16px',
                  background: 'rgba(250, 248, 245, 0.5)',
                  borderTop: '1px solid rgba(139, 115, 85, 0.1)'
                }
              }}
              style={{
                background: 'transparent'
              }}
            />
          </div>
        )}

        {/* 邀请码管理 Tab */}
        {activeTab === 'invites' && (
          <div>
            {/* 操作栏 */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '16px'
            }}>
              <Button
                type="primary"
                icon={<Plus size={16} strokeWidth={1.5} />}
                onClick={handleCreateInviteCode}
                style={{
                  height: '40px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {t('pages.adminPanel.inviteCodes.generateNewCode')}
              </Button>
            </div>

            {/* 表格 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.85)',
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.15)',
              boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
              overflow: 'hidden'
            }}>
              <Table
                columns={inviteColumns}
                dataSource={inviteCodes}
                rowKey="code"
                loading={loading}
                components={tableComponents}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => t('pages.adminPanel.inviteCodes.totalCodes', { total }),
                  style: {
                    padding: '16px',
                    background: 'rgba(250, 248, 245, 0.5)',
                    borderTop: '1px solid rgba(139, 115, 85, 0.1)'
                  }
                }}
                style={{
                  background: 'transparent'
                }}
              />
            </div>
          </div>
        )}
      </Content>

      {/* 创建邀请码描述弹窗 */}
      <Modal
        title={t('pages.adminPanel.inviteCodes.createCodeTitle')}
        open={descriptionModalVisible}
        onOk={handleConfirmCreateCode}
        onCancel={() => setDescriptionModalVisible(false)}
        okText={t('pages.adminPanel.inviteCodes.generate')}
        cancelText={t('common.cancel')}
      >
        <div style={{ marginTop: '16px' }}>
          <Text style={{ display: 'block', marginBottom: '8px', color: '#2d2d2d', fontWeight: 500 }}>
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
              background: 'rgba(255, 255, 255, 0.85)'
            }}
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default AdminPanel;
