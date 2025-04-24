// src/store/modelStore.ts
import { create } from 'zustand';
import { ModelConfig } from '../types/model';
import * as modelService from '../services/modelService';

interface ModelState {
  models: ModelConfig[];
  loading: boolean;
  error?: string;

  fetchModels: () => Promise<void>;
  addModel: (model: ModelConfig) => Promise<void>;
  updateModel: (modelName: string, model: ModelConfig) => Promise<void>;
  deleteModel: (modelName: string) => Promise<void>;
}

export const useModelStore = create<ModelState>((set) => ({
  models: [],
  loading: false,
  error: undefined,

  fetchModels: async () => {
    try {
      set({ loading: true, error: undefined });
      const models = await modelService.getModels();
      set({ models, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch models'
      });
    }
  },

  addModel: async (model) => {
    try {
      set({ loading: true, error: undefined });
      await modelService.addModel(model);
      const models = await modelService.getModels();
      set({ models, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to add model'
      });
    }
  },

  updateModel: async (modelName, model) => {
    try {
      set({ loading: true, error: undefined });
      await modelService.updateModel(modelName, model);
      const models = await modelService.getModels();
      set({ models, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update model'
      });
    }
  },

  deleteModel: async (modelName) => {
    try {
      set({ loading: true, error: undefined });
      await modelService.deleteModel(modelName);
      const models = await modelService.getModels();
      set({ models, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to delete model'
      });
    }
  },
}));