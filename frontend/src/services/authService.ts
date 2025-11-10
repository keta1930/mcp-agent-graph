import api from './api'

export interface LoginRequest {
  user_id: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string  // 新增
  token_type: string
  user_id: string
  role: string
}

export interface RegisterRequest {
  invite_code: string
  user_id: string
  password: string
}

export const login = async (userId: string, password: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', {
    user_id: userId,
    password: password
  })
  return response.data
}

export const register = async (
  inviteCode: string,
  userId: string,
  password: string
): Promise<void> => {
  await api.post('/auth/register', {
    invite_code: inviteCode,
    user_id: userId,
    password: password
  })
}

export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    console.error('Logout API call failed:', error)
  }
}

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me')
  return response.data
}

export const refreshToken = async (refreshToken: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/refresh', {
    refresh_token: refreshToken
  })
  return response.data
}
