// src/services/modelService.ts
import api from './api';
import { ModelConfig } from '../types/model';

export const getModels = async () => {
  const response = await api.get('/models');
  return response.data;
};

export const getModelForEdit = async (modelName: string) => {
  const encodedModelName = encodeURIComponent(modelName);
  const response = await api.get(`/models/${encodedModelName}`);
  return response.data;
};

export const addModel = async (model: ModelConfig) => {
  const response = await api.post('/models', model);
  return response.data;
};

export const updateModel = async (modelName: string, model: ModelConfig) => {
  const encodedModelName = encodeURIComponent(modelName);
  const response = await api.put(`/models/${encodedModelName}`, model);
  return response.data;
};

export const deleteModel = async (modelName: string) => {
  const encodedModelName = encodeURIComponent(modelName);
  const response = await api.delete(`/models/${encodedModelName}`);
  return response.data;
};