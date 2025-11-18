// src/store/systemToolsStore.ts
import { create } from 'zustand';
import * as systemToolsService from '../services/systemToolsService';

interface SystemToolsState {
  systemTools: string[];
  loading: boolean;
  error?: string;

  fetchSystemTools: () => Promise<void>;
}

export const useSystemToolsStore = create<SystemToolsState>((set) => ({
  systemTools: [],
  loading: false,
  error: undefined,

  fetchSystemTools: async () => {
    try {
      set({ loading: true, error: undefined });
      const response = await systemToolsService.listSystemTools();
      // Extract tool names from all categories
      const toolNames: string[] = [];
      response.categories.forEach(category => {
        category.tools.forEach(tool => {
          toolNames.push(tool.name);
        });
      });
      set({ systemTools: toolNames, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch system tools'
      });
    }
  },
}));
