// src/pages/admin/AdminPanel.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin } from '../../utils/auth';
import {
  listUsers,
  promoteUser,
  deactivateUser,
  listInviteCodes,
  createInviteCode,
  toggleInviteCode,
  User,
  InviteCode
} from '../../services/adminService';
import {
  TeamOutlined,
  UserOutlined,
  SafetyOutlined,
  PlusOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  StopOutlined
} from '@ant-design/icons';
import './AdminPanel.css';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 检查是否是管理员
    if (!isAdmin()) {
      navigate('/');
      return;
    }

    loadData();
  }, [activeTab, navigate]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'users') {
        const userList = await listUsers();
        setUsers(userList);
      } else {
        const codeList = await listInviteCodes();
        setInviteCodes(codeList);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteUser = async (userId: string) => {
    if (!confirm(`确定要提升用户 ${userId} 为管理员吗？`)) return;

    try {
      await promoteUser(userId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失败');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm(`确定要停用用户 ${userId} 吗？`)) return;

    try {
      await deactivateUser(userId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失败');
    }
  };

  const handleCreateInviteCode = async () => {
    const description = prompt('请输入邀请码描述（可选）:');

    try {
      const code = await createInviteCode(description || undefined);
      alert(`邀请码创建成功：${code}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || '创建失败');
    }
  };

  const handleToggleInviteCode = async (code: string, isActive: boolean) => {
    try {
      await toggleInviteCode(code, !isActive);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失败');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>
          <TeamOutlined /> 管理后台
        </h1>
        <button className="back-button" onClick={() => navigate('/')}>
          返回主页
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <UserOutlined /> 用户管理
        </button>
        <button
          className={`tab ${activeTab === 'invites' ? 'active' : ''}`}
          onClick={() => setActiveTab('invites')}
        >
          <SafetyOutlined /> 邀请码管理
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {activeTab === 'users' && (
        <div className="admin-content">
          <div className="content-header">
            <h2>用户列表</h2>
            <span className="count-badge">{users.length} 位用户</span>
          </div>

          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>用户名</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>注册时间</th>
                  <th>最后登录</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {user.user_id.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="user-id">{user.user_id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role === 'super_admin' ? '超级管理员' :
                         user.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? '活跃' : '停用'}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>{user.last_login ? new Date(user.last_login).toLocaleString() : '-'}</td>
                    <td>
                      {user.role === 'user' && user.is_active && (
                        <button
                          className="action-button primary"
                          onClick={() => handlePromoteUser(user.user_id)}
                        >
                          提升为管理员
                        </button>
                      )}
                      {user.is_active && user.role !== 'super_admin' && (
                        <button
                          className="action-button danger"
                          onClick={() => handleDeactivateUser(user.user_id)}
                        >
                          停用
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'invites' && (
        <div className="admin-content">
          <div className="content-header">
            <h2>邀请码列表</h2>
            <button className="create-button" onClick={handleCreateInviteCode}>
              <PlusOutlined /> 生成新邀请码
            </button>
          </div>

          {loading ? (
            <div className="loading">加载中...</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>邀请码</th>
                  <th>状态</th>
                  <th>使用情况</th>
                  <th>创建者</th>
                  <th>创建时间</th>
                  <th>过期时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {inviteCodes.map((code) => (
                  <tr key={code.code}>
                    <td>
                      <div className="code-cell">
                        <code className="invite-code">{code.code}</code>
                        <button
                          className="copy-icon"
                          onClick={() => copyToClipboard(code.code)}
                          title="复制"
                        >
                          <CopyOutlined />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${code.is_active ? 'active' : 'inactive'}`}>
                        {code.is_active ? '激活' : '停用'}
                      </span>
                    </td>
                    <td>
                      <div className="usage-info">
                        {code.current_uses} / {code.max_uses || '∞'}
                      </div>
                    </td>
                    <td>{code.created_by}</td>
                    <td>{new Date(code.created_at).toLocaleDateString()}</td>
                    <td>{code.expires_at ? new Date(code.expires_at).toLocaleDateString() : '永久'}</td>
                    <td>
                      <button
                        className={`action-button ${code.is_active ? 'danger' : 'primary'}`}
                        onClick={() => handleToggleInviteCode(code.code, code.is_active)}
                      >
                        {code.is_active ? (
                          <>
                            <StopOutlined /> 停用
                          </>
                        ) : (
                          <>
                            <CheckCircleOutlined /> 激活
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
