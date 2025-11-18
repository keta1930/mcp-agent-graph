// src/store/agentStore.ts
import { create } from 'zustand';
import * as agentService from '../services/agentService';
import { AgentListItem } from '../services/agentService';

interface AgentState {
  agents: AgentListItem[];
  loading: boolean;
  error?: string;

  fetchAgents: () => Promise<void>;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  loading: false,
  error: undefined,

  fetchAgents: async () => {
    try {
      set({ loading: true, error: undefined });
      const response = await agentService.listAgents();
      set({ agents: response.agents || [], loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch agents'
      });
    }
  },
}));
