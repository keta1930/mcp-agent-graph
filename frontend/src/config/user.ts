// src/config/user.ts
import { getUserInfo } from '../utils/auth';

export interface UserConfig {
  userId: string;
}

// 从本地存储获取用户配置（已废弃，使用 getUserInfo 代替）
export const getUserConfig = (): UserConfig => {
  const userInfo = getUserInfo();
  return {
    userId: userInfo?.user_id || 'default_user'
  };
};

// 保存用户配置到本地存储（已废弃，使用 setUserInfo 代替）
export const setUserConfig = (config: UserConfig): void => {
  // 此方法已废弃，保留仅为兼容性
  console.warn('setUserConfig is deprecated, use setUserInfo from auth.ts instead');
};

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