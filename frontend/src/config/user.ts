// src/config/user.ts
export interface UserConfig {
  userId: string;
  displayName?: string;
}

// 从本地存储获取用户配置
export const getUserConfig = (): UserConfig => {
  // 从本地存储获取
  const storedConfig = localStorage.getItem('user_config');
  let localConfig: UserConfig | null = null;
  
  if (storedConfig) {
    try {
      localConfig = JSON.parse(storedConfig);
    } catch {
      // 忽略解析错误
    }
  }
  
  // 优先级：本地存储 > 默认值
  return {
    userId: localConfig?.userId || 'default_user',
    displayName: localConfig?.displayName || 'Default User'
  };
};

// 保存用户配置到本地存储
export const setUserConfig = (config: UserConfig): void => {
  localStorage.setItem('user_config', JSON.stringify(config));
};

// 获取当前用户ID（向后兼容）
export const getCurrentUserId = (): string => {
  return getUserConfig().userId;
};

// 获取当前用户显示名称
export const getCurrentUserDisplayName = (): string => {
  return getUserConfig().displayName || getUserConfig().userId;
};