// src/services/api.ts
import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';

// 根据实际后端地址调整
const API_BASE_URL = 'http://localhost:9999/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：自动添加Token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理401和403错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期或无效，清除Token并跳转登录
      removeToken();
      // 只在非登录/注册页面时跳转
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      // 权限不足
      console.error('权限不足:', error.response.data?.detail);
    }
    return Promise.reject(error);
  }
);

export default api;