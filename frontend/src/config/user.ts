// src/config/user.ts
import { getUserInfo } from '../utils/auth';

export interface UserConfig {
  userId: string;
}

// 获取当前用户ID
export const getCurrentUserId = (): string => {
  const userInfo = getUserInfo();
  return userInfo?.user_id || 'default_user';
};

// 获取当前用户显示名称（直接返回userId）
export const getCurrentUserDisplayName = (): string => {
  const userInfo = getUserInfo();
  return userInfo?.user_id || 'default_user';
};