// src/services/api.ts
import axios from 'axios';

// 根据实际后端地址调整
const API_BASE_URL = 'http://localhost:9999/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;