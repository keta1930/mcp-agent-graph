// src/store/graphRunnerStore.ts
import { create } from 'zustand';
import * as graphService from '../services/graphService';
import { GraphResult } from '../types/graph';

interface GraphRunnerState {
  graphs: string[];
  selectedGraph: string | null;
  conversations: Record<string, GraphResult>;
  currentConversation: string | null;
  loading: boolean;
  error?: string;
  parallelExecution: boolean; // 新增：并行执行选项

  // Actions
  fetchGraphs: () => Promise<void>;
  selectGraph: (graphName: string) => void;
  executeGraph: (input: string, conversationId?: string) => Promise<GraphResult>;
  getConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  clearConversations: () => void;
  toggleParallelExecution: () => void; // 新增：切换并行执行选项
  setParallelExecution: (enabled: boolean) => void; // 新增：设置并行执行选项
}

export const useGraphRunnerStore = create<GraphRunnerState>((set, get) => ({
  graphs: [],
  selectedGraph: null,
  conversations: {},
  currentConversation: null,
  loading: false,
  error: undefined,
  parallelExecution: false, // 默认不启用并行执行

  fetchGraphs: async () => {
    try {
      set({ loading: true, error: undefined });
      const graphs = await graphService.getGraphs();
      set({ graphs, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch graphs'
      });
    }
  },

  selectGraph: (graphName) => {
    set({ selectedGraph: graphName });
  },

  executeGraph: async (input, conversationId) => {
    const { selectedGraph, parallelExecution } = get(); // 获取并行执行标志
    if (!selectedGraph) {
      throw new Error('No graph selected');
    }

    try {
      set({ loading: true, error: undefined });

      const result = await graphService.executeGraph({
        graph_name: selectedGraph,
        input_text: input,
        conversation_id: conversationId,
        parallel: parallelExecution // 传递并行执行标志
      });

      // 更新会话
      set(state => ({
        conversations: {
          ...state.conversations,
          [result.conversation_id]: result
        },
        currentConversation: result.conversation_id,
        loading: false
      }));

      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to execute graph'
      });
      throw error;
    }
  },

  getConversation: async (conversationId) => {
    try {
      set({ loading: true, error: undefined });
      const conversation = await graphService.getConversation(conversationId);

      set(state => ({
        conversations: {
          ...state.conversations,
          [conversationId]: conversation
        },
        loading: false
      }));
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to get conversation'
      });
    }
  },

  deleteConversation: async (conversationId) => {
    try {
      set({ loading: true, error: undefined });
      await graphService.deleteConversation(conversationId);

      set(state => {
        // 删除对应的会话
        const newConversations = { ...state.conversations };
        delete newConversations[conversationId];

        // 如果删除的是当前会话，重置当前会话
        const newCurrentConversation =
          state.currentConversation === conversationId ? null : state.currentConversation;

        return {
          conversations: newConversations,
          currentConversation: newCurrentConversation,
          loading: false
        };
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to delete conversation'
      });
    }
  },

  clearConversations: () => {
    set({
      conversations: {},
      currentConversation: null
    });
  },

  // 新增：切换并行执行选项
  toggleParallelExecution: () => {
    set(state => ({
      parallelExecution: !state.parallelExecution
    }));
  },

  // 新增：设置并行执行选项
  setParallelExecution: (enabled) => {
    set({ parallelExecution: enabled });
  }
}));