// src/services/systemService.ts
import api from './api';

export const shutdownSystem = async (): Promise<any> => {
  try {
    const response = await api.post('/system/shutdown');
    return response.data;
  } catch (error) {
    console.error('Error shutting down system:', error);
    throw error;
  }
};