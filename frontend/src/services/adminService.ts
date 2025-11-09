// src/services/adminService.ts
import api from './api';

// 用户相关类型
export interface User {
  user_id: string;
  role: 'super_admin' | 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface ListUsersResponse {
  status: string;
  users: User[];
}

// 邀请码相关类型
export interface InviteCode {
  code: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  description?: string;
}

export interface ListInviteCodesResponse {
  status: string;
  codes: InviteCode[];
}

export interface CreateInviteCodeRequest {
  description?: string;
  max_uses?: number;
  expires_at?: string;
}

export interface CreateInviteCodeResponse {
  status: string;
  code: string;
}

export interface InviteCodeStats {
  code: string;
  current_uses: number;
  max_uses: number | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface InviteCodeStatsResponse {
  status: string;
  stats: InviteCodeStats;
}

// 团队设置相关类型
export interface TeamSettings {
  team_name: string;
}

export interface TeamSettingsResponse {
  status: string;
  settings: TeamSettings;
}

// ========== 用户管理 API ==========

/**
 * 获取所有用户列表
 */
export const listUsers = async (): Promise<User[]> => {
  const response = await api.get<ListUsersResponse>('/admin/users');
  return response.data.users;
};

/**
 * 提升用户为管理员
 */
export const promoteUser = async (userId: string): Promise<void> => {
  await api.post(`/admin/users/${userId}/promote`);
};

/**
 * 停用用户
 */
export const deactivateUser = async (userId: string): Promise<void> => {
  await api.post(`/admin/users/${userId}/deactivate`);
};

// ========== 邀请码管理 API ==========

/**
 * 获取所有邀请码列表
 */
export const listInviteCodes = async (): Promise<InviteCode[]> => {
  const response = await api.get<ListInviteCodesResponse>('/admin/invite-codes');
  return response.data.codes;
};

/**
 * 创建新邀请码
 */
export const createInviteCode = async (
  description?: string,
  maxUses?: number,
  expiresAt?: string
): Promise<string> => {
  const requestData: CreateInviteCodeRequest = {};

  if (description) {
    requestData.description = description;
  }
  if (maxUses !== undefined) {
    requestData.max_uses = maxUses;
  }
  if (expiresAt) {
    requestData.expires_at = expiresAt;
  }

  const response = await api.post<CreateInviteCodeResponse>('/admin/invite-codes', requestData);
  return response.data.code;
};

/**
 * 切换邀请码激活状态
 */
export const toggleInviteCode = async (code: string, isActive: boolean): Promise<void> => {
  await api.patch(`/admin/invite-codes/${code}`, {
    is_active: isActive
  });
};

/**
 * 获取邀请码统计信息
 */
export const getInviteCodeStats = async (code: string): Promise<InviteCodeStats> => {
  const response = await api.get<InviteCodeStatsResponse>(`/admin/invite-codes/${code}/stats`);
  return response.data.stats;
};

// ========== 团队设置 API ==========

/**
 * 获取团队设置
 */
export const getTeamSettings = async (): Promise<TeamSettings> => {
  const response = await api.get<TeamSettingsResponse>('/admin/team/settings');
  return response.data.settings;
};

/**
 * 更新团队设置
 */
export const updateTeamSettings = async (teamName: string): Promise<void> => {
  await api.put('/admin/team/settings', {
    team_name: teamName
  });
};
