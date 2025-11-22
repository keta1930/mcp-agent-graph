// src/pages/AdminPanel.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, message, App } from 'antd';
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
import AdminHeader from '../components/admin/AdminHeader';
import UsersTable from '../components/admin/UsersTable';
import InviteCodesTable from '../components/admin/InviteCodesTable';
import CreateInviteCodeModal from '../components/admin/CreateInviteCodeModal';
import { COLORS, getPrimaryButtonStyle, getSecondaryButtonStyle, getConfirmModalStyles } from '../constants/adminPanelStyles';

const { Content } = Layout;

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
  const [newCodeMaxUses, setNewCodeMaxUses] = useState<number | null>(null);
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

  /**
   * 提升用户为管理员
   */
  const handlePromoteUser = async (userId: string) => {
    modal.confirm({
      title: t('pages.adminPanel.users.promoteConfirmTitle'),
      content: t('pages.adminPanel.users.promoteConfirmMessage', { userId }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      centered: true,
      styles: getConfirmModalStyles(),
      okButtonProps: {
        style: getPrimaryButtonStyle()
      },
      cancelButtonProps: {
        style: getSecondaryButtonStyle()
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

  /**
   * 停用用户
   */
  const handleDeactivateUser = async (userId: string) => {
    modal.confirm({
      title: t('pages.adminPanel.users.deactivateConfirmTitle'),
      content: t('pages.adminPanel.users.deactivateConfirmMessage', { userId }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      centered: true,
      styles: getConfirmModalStyles(),
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
        style: getSecondaryButtonStyle()
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

  /**
   * 打开创建邀请码弹窗
   */
  const handleCreateInviteCode = () => {
    setNewCodeDescription('');
    setNewCodeMaxUses(null);
    setDescriptionModalVisible(true);
  };

  /**
   * 确认创建邀请码
   */
  const handleConfirmCreateCode = async () => {
    try {
      const code = await createInviteCode(
        newCodeDescription || undefined,
        newCodeMaxUses || undefined
      );
      message.success(t('pages.adminPanel.inviteCodes.createSuccess', { code }));
      setDescriptionModalVisible(false);
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('pages.adminPanel.inviteCodes.createFailed'));
    }
  };

  /**
   * 切换邀请码激活状态
   */
  const handleToggleInviteCode = async (code: string, isActive: boolean) => {
    try {
      await toggleInviteCode(code, !isActive);
      message.success(t('pages.adminPanel.operationSuccess'));
      loadData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('pages.adminPanel.operationFailed'));
    }
  };

  /**
   * 复制到剪贴板
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(t('pages.adminPanel.copiedToClipboard'));
  };

  return (
    <Layout style={{ minHeight: '100vh', background: COLORS.background }}>
      {/* Header 顶栏 */}
      <AdminHeader
        title={t('pages.adminPanel.title')}
        usersCount={users.length}
        inviteCodesCount={inviteCodes.length}
        viewMode={viewMode}
        onViewModeChange={() => setViewMode(viewMode === 'users' ? 'invites' : 'users')}
        onBack={() => navigate('/')}
        t={t}
      />

      {/* Content 内容区 */}
      <Content style={{ padding: '32px 48px', overflow: 'auto' }}>
        {/* 用户管理视图 */}
        {viewMode === 'users' && (
          <UsersTable
            users={users}
            loading={loading}
            currentPage={userCurrentPage}
            pageSize={userPageSize}
            onPageChange={setUserCurrentPage}
            onPromoteUser={handlePromoteUser}
            onDeactivateUser={handleDeactivateUser}
            t={t}
          />
        )}

        {/* 邀请码管理视图 */}
        {viewMode === 'invites' && (
          <InviteCodesTable
            inviteCodes={inviteCodes}
            loading={loading}
            currentPage={inviteCurrentPage}
            pageSize={invitePageSize}
            onPageChange={setInviteCurrentPage}
            onToggleInviteCode={handleToggleInviteCode}
            onCopyCode={copyToClipboard}
            onCreateCode={handleCreateInviteCode}
            t={t}
          />
        )}
      </Content>

      {/* 创建邀请码描述弹窗 */}
      <CreateInviteCodeModal
        visible={descriptionModalVisible}
        description={newCodeDescription}
        maxUses={newCodeMaxUses}
        onDescriptionChange={setNewCodeDescription}
        onMaxUsesChange={setNewCodeMaxUses}
        onConfirm={handleConfirmCreateCode}
        onCancel={() => setDescriptionModalVisible(false)}
        t={t}
      />
    </Layout>
  );
};

export default AdminPanel;
