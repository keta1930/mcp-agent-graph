// src/store/graphRunnerStore.ts
import { create } from 'zustand';
import * as graphService from '../services/graphService';
import { GraphResult } from '../types/graph';

interface ConversationDetail {
  conversation_id: string;
  graph_name: string;
  input: string;
  output: string;
  completed: boolean;
  node_results: any[];
  start_time: string;
  graph_config: any;
  results: any[];
  attachments: any[];
  node_states: Record<string, any>;
  handoffs_counters: Record<string, number>;
  global_outputs: Record<string, string[]>;
  parallel: boolean;
}

interface GraphRunnerState {
  graphs: string[];
  selectedGraph: string | null;
  conversations: Record<string, GraphResult>;
  conversationDetails: Record<string, ConversationDetail>;
  conversationList: string[];
  currentConversation: string | null;
  loading: boolean;
  refreshing: boolean;
  error?: string;
  parallelExecution: boolean;

  // Actions
  fetchGraphs: () => Promise<void>;
  selectGraph: (graphName: string) => void;
  executeGraph: (input: string, conversationId?: string) => Promise<GraphResult>;
  refreshConversation: (conversationId: string) => Promise<void>;
  fetchConversationList: () => Promise<void>;
  loadConversationDetail: (conversationId: string) => Promise<void>;
  selectConversation: (conversationId: string) => void;
  continueConversation: (conversationId: string, input?: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  clearConversations: () => void;
  toggleParallelExecution: () => void;
  setParallelExecution: (enabled: boolean) => void;
}

export const useGraphRunnerStore = create<GraphRunnerState>((set, get) => ({
  graphs: [],
  selectedGraph: null,
  conversations: {},
  conversationDetails: {},
  conversationList: [],
  currentConversation: null,
  loading: false,
  refreshing: false,
  error: undefined,
  parallelExecution: false,

  fetchGraphs: async () => {
    try {
      set({ loading: true, error: undefined });
      const graphs = await graphService.getGraphs();
      set({ graphs, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '获取图列表失败'
      });
    }
  },

  selectGraph: (graphName) => {
    set({ selectedGraph: graphName });
  },

  executeGraph: async (input, conversationId) => {
    const { selectedGraph, parallelExecution } = get();
    if (!selectedGraph) {
      throw new Error('请先选择一个图');
    }

    try {
      set({ loading: true, error: undefined });

      const result = await graphService.executeGraph({
        graph_name: selectedGraph,
        input_text: input,
        conversation_id: conversationId,
        parallel: parallelExecution
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

      // 立即加载详细信息，确保数据完整性
      setTimeout(async () => {
        await get().loadConversationDetail(result.conversation_id);
        await get().fetchConversationList();
      }, 500);

      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '执行图失败'
      });
      throw error;
    }
  },

  refreshConversation: async (conversationId) => {
    try {
      set({ refreshing: true, error: undefined });
      await get().loadConversationDetail(conversationId);
      set({ refreshing: false });
    } catch (error) {
      set({
        refreshing: false,
        error: error instanceof Error ? error.message : '刷新会话失败'
      });
    }
  },

  fetchConversationList: async () => {
    try {
      const conversations = await graphService.getConversationList();
      set({ conversationList: conversations });
      
      // 为每个会话预加载基本信息
      const { conversationDetails } = get();
      for (const conversationId of conversations.slice(0, 10)) { // 只预加载前10个
        if (!conversationDetails[conversationId]) {
          try {
            await get().loadConversationDetail(conversationId);
          } catch (error) {
            console.warn(`预加载会话 ${conversationId} 失败:`, error);
          }
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取会话列表失败'
      });
    }
  },

  loadConversationDetail: async (conversationId) => {
    try {
      console.log(`开始加载会话详情: ${conversationId}`);
      const detail = await graphService.getConversationHierarchy(conversationId);
      console.log(`会话详情加载完成:`, detail);
      
      // 确保数据结构完整
      const processedDetail = {
        ...detail,
        node_states: detail.node_states || {},
        global_outputs: detail.global_outputs || {},
        attachments: detail.attachments || [],
        results: detail.results || []
      };
      
      set(state => ({
        conversationDetails: {
          ...state.conversationDetails,
          [conversationId]: processedDetail
        }
      }));
      
      console.log(`会话详情已保存到Store，node_states:`, processedDetail.node_states);
      console.log(`会话详情已保存到Store，global_outputs:`, processedDetail.global_outputs);
      
    } catch (error) {
      console.error(`加载会话详情失败:`, error);
      set({
        error: error instanceof Error ? error.message : '加载会话详情失败'
      });
    }
  },

  selectConversation: (conversationId) => {
    console.log(`选择会话: ${conversationId}`);
    set({ currentConversation: conversationId });
    
    // 确保数据已加载
    const { conversationDetails } = get();
    if (!conversationDetails[conversationId]) {
      console.log(`会话详情不存在，开始加载...`);
      get().loadConversationDetail(conversationId);
    } else {
      console.log(`会话详情已存在:`, conversationDetails[conversationId]);
    }
  },

  continueConversation: async (conversationId, input) => {
    const { parallelExecution } = get();
    try {
      set({ loading: true, error: undefined });

      const result = await graphService.continueConversation({
        graph_name: '',
        input_text: input || '',
        conversation_id: conversationId,
        parallel: parallelExecution,
        continue_from_checkpoint: !input
      });

      set(state => ({
        conversations: {
          ...state.conversations,
          [conversationId]: result
        },
        loading: false
      }));

      // 重新加载详细信息
      setTimeout(async () => {
        await get().loadConversationDetail(conversationId);
      }, 500);
      
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '继续执行会话失败'
      });
    }
  },

  deleteConversation: async (conversationId) => {
    try {
      set({ loading: true, error: undefined });
      await graphService.deleteConversation(conversationId);

      set(state => {
        const newConversations = { ...state.conversations };
        const newConversationDetails = { ...state.conversationDetails };
        const newConversationList = state.conversationList.filter(id => id !== conversationId);
        
        delete newConversations[conversationId];
        delete newConversationDetails[conversationId];

        const newCurrentConversation =
          state.currentConversation === conversationId ? null : state.currentConversation;

        return {
          conversations: newConversations,
          conversationDetails: newConversationDetails,
          conversationList: newConversationList,
          currentConversation: newCurrentConversation,
          loading: false
        };
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '删除会话失败'
      });
    }
  },

  clearConversations: () => {
    set({
      conversations: {},
      conversationDetails: {},
      conversationList: [],
      currentConversation: null
    });
  },

  toggleParallelExecution: () => {
    set(state => ({
      parallelExecution: !state.parallelExecution
    }));
  },

  setParallelExecution: (enabled) => {
    set({ parallelExecution: enabled });
  }
}));