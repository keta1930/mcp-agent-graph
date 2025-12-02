// src/services/api.ts
import axios from 'axios';
import { getToken, getRefreshToken, setToken, setRefreshToken, removeToken } from '../utils/auth';

// API 基础 URL（空字符串表示使用相对路径，自动使用当前域名）
const API_BASE_URL = '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token刷新相关状态
let isRefreshing = false;  // 是否正在刷新
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];  // 失败请求队列

// 处理队列中的请求
const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

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

// 响应拦截器：处理401错误并自动刷新Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 如果是401错误且未重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 如果正在刷新，将请求加入队列
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshTokenValue = getRefreshToken();

      // 如果没有refresh token，直接跳转登录
      if (!refreshTokenValue) {
        removeToken();
        if (!window.location.pathname.startsWith('/login') &&
            !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // 调用refresh接口
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshTokenValue
        });

        const { access_token, refresh_token } = response.data;

        // 保存新的Token
        setToken(access_token);
        setRefreshToken(refresh_token);

        // 更新默认请求头
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        // 处理队列中的请求
        processQueue(null, access_token);

        // 重试原请求
        return api(originalRequest);

      } catch (refreshError) {
        // 刷新失败，清除Token并跳转登录
        processQueue(refreshError, null);
        removeToken();

        if (!window.location.pathname.startsWith('/login') &&
            !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }

    } else if (error.response?.status === 403) {
      // 权限不足
      console.error('权限不足:', error.response.data?.detail);
    }

    return Promise.reject(error);
  }
);

export default api;
