const TOKEN_KEY = 'auth_token'
const USER_INFO_KEY = 'user_info'

export interface UserInfo {
  user_id: string
  role: 'super_admin' | 'admin' | 'user'
}

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_INFO_KEY)
}

export const isAuthenticated = (): boolean => {
  return !!getToken()
}

export const getUserInfo = (): UserInfo | null => {
  const userInfoStr = localStorage.getItem(USER_INFO_KEY)
  if (!userInfoStr) return null

  try {
    return JSON.parse(userInfoStr)
  } catch {
    return null
  }
}

export const setUserInfo = (userInfo: UserInfo): void => {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
}

export const isAdmin = (): boolean => {
  const userInfo = getUserInfo()
  return userInfo?.role === 'admin' || userInfo?.role === 'super_admin'
}
