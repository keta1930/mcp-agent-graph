// src/store/conversationStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  ConversationSummary,
  ConversationDetail,
  ConversationMode,
  AgentType,
  SSEMessage
} from '../types/conversation';
import { ConversationService, ConversationStorage } from '../services/conversationService';
import { message } from 'antd';

interface ConversationState {
  // 对话列表
  conversations: ConversationSummary[];
  totalCount: number;
  loading: boolean;
  
  // 当前对话
  currentConversation: ConversationDetail | null;
  currentConversationLoading: boolean;
  
  // 对话模式
  currentMode: ConversationMode;
  agentType: AgentType;
  
  // 搜索和筛选
  searchQuery: string;
  statusFilter: 'active' | 'favorite' | 'deleted';
  typeFilter: 'chat' | 'agent' | 'graph';
  
  // SSE连接
  currentSSE: EventSource | null;
  isStreaming: boolean;
  
  // UI状态
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  
  // 操作
  loadConversations: (forceRefresh?: boolean) => Promise<void>;
  silentUpdateConversations: () => Promise<void>;
  loadConversationDetail: (conversationId: string) => Promise<void>;
  updateConversationStatus: (conversationId: string, status: 'active' | 'deleted' | 'favorite') => Promise<void>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  updateConversationTags: (conversationId: string, tags: string[]) => Promise<void>;
  deleteConversationPermanent: (conversationId: string) => Promise<void>;
  
  // 对话操作
  setCurrentMode: (mode: ConversationMode) => void;
  setAgentType: (type: AgentType) => void;
  clearCurrentConversation: () => void;
  updateCurrentConversationTemporarily: (conversation: ConversationDetail) => void;
  
  // SSE操作
  startSSEConnection: (sse: EventSource) => void;
  stopSSEConnection: () => void;
  handleSSEMessage: (message: SSEMessage) => void;
  
  // 搜索和筛选
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: 'active' | 'favorite' | 'deleted') => void;
  setTypeFilter: (filter: 'chat' | 'agent' | 'graph') => void;
  
  // UI操作
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  
  // 通知
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const useConversationStore = create<ConversationState>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    conversations: [],
    totalCount: 0,
    loading: false,
    currentConversation: null,
    currentConversationLoading: false,
    currentMode: 'chat',
    agentType: 'mcp',
    searchQuery: '',
    statusFilter: 'active',
    typeFilter: 'chat',
    currentSSE: null,
    isStreaming: false,
    sidebarCollapsed: localStorage.getItem('sidebar_collapsed') === 'true',
    theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',

    // 加载对话列表
    loadConversations: async (forceRefresh = false) => {
      if (!forceRefresh) {
        const cached = ConversationStorage.getCachedConversationList();
        if (cached) {
          set({ conversations: cached.conversations, totalCount: cached.total_count });
          return;
        }
      }

      set({ loading: true });
      try {
        const result = await ConversationService.getConversations();
        ConversationStorage.cacheConversationList(result);
        set({ 
          conversations: result.conversations, 
          totalCount: result.total_count,
          loading: false 
        });
      } catch (error) {
        console.error('Failed to load conversations:', error);
        set({ loading: false });
        get().showNotification('加载对话列表失败', 'error');
      }
    },

    // 静默更新对话列表（不显示loading状态）
    silentUpdateConversations: async () => {
      try {
        const result = await ConversationService.getConversations();
        ConversationStorage.cacheConversationList(result);
        
        // 平滑更新：保持现有对话的顺序，只更新数据
        const currentConversations = get().conversations;
        const newConversations = result.conversations;
        
        // 创建一个映射来快速查找新对话数据
        const newConversationsMap = new Map(
          newConversations.map(conv => [conv._id, conv])
        );
        
        // 更新现有对话的数据，保持顺序
        const updatedConversations = currentConversations.map(conv => {
          const newConv = newConversationsMap.get(conv._id);
          return newConv || conv; // 如果找到新数据则使用，否则保持原有数据
        });
        
        // 添加新的对话（如果有的话）
        const existingIds = new Set(currentConversations.map(conv => conv._id));
        const newlyAddedConversations = newConversations.filter(
          conv => !existingIds.has(conv._id)
        );
        
        const finalConversations = [...updatedConversations, ...newlyAddedConversations];
        
        set({ 
          conversations: finalConversations, 
          totalCount: result.total_count 
        });
      } catch (error) {
        console.error('Failed to silently update conversations:', error);
        // 静默更新失败时不显示错误通知，避免打扰用户
      }
    },

    // 加载对话详情
    loadConversationDetail: async (conversationId: string) => {
      set({ currentConversationLoading: true });
      try {
        const detail = await ConversationService.getConversationDetail(conversationId);
        ConversationStorage.setCurrentConversation(detail);
        set({ 
          currentConversation: detail,
          currentConversationLoading: false 
        });
      } catch (error) {
        console.error('Failed to load conversation detail:', error);
        set({ currentConversationLoading: false });
        get().showNotification('加载对话详情失败', 'error');
      }
    },

    // 更新对话状态
    updateConversationStatus: async (conversationId: string, status: 'active' | 'deleted' | 'favorite') => {
      try {
        await ConversationService.updateConversationStatus(conversationId, status);
        
        // 更新本地状态
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv._id === conversationId ? { ...conv, status } : conv
          )
        }));
        
        // 清除缓存并静默刷新最新数据
        ConversationStorage.clearConversationListCache();
        get().silentUpdateConversations();
        get().showNotification('状态更新成功', 'success');
      } catch (error) {
        console.error('Failed to update conversation status:', error);
        get().showNotification('状态更新失败', 'error');
      }
    },

    // 更新对话标题
    updateConversationTitle: async (conversationId: string, title: string) => {
      try {
        await ConversationService.updateConversationTitle(conversationId, title);
        
        // 更新本地状态
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv._id === conversationId ? { ...conv, title } : conv
          )
        }));
        
        // 更新当前对话标题
        ConversationStorage.updateCurrentConversationTitle(title);
        if (get().currentConversation?.conversation_id === conversationId) {
          set(state => ({
            currentConversation: state.currentConversation ? 
              { ...state.currentConversation, title } : null
          }));
        }
        
        // 清除缓存并静默刷新最新数据
        ConversationStorage.clearConversationListCache();
        get().silentUpdateConversations();
        get().showNotification('标题更新成功', 'success');
      } catch (error) {
        console.error('Failed to update conversation title:', error);
        get().showNotification('标题更新失败', 'error');
      }
    },

    // 更新对话标签
    updateConversationTags: async (conversationId: string, tags: string[]) => {
      try {
        await ConversationService.updateConversationTags(conversationId, tags);
        
        // 更新本地状态
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv._id === conversationId ? { ...conv, tags } : conv
          )
        }));
        
        // 清除缓存并静默刷新最新数据
        ConversationStorage.clearConversationListCache();
        get().silentUpdateConversations();
        get().showNotification('标签更新成功', 'success');
      } catch (error) {
        console.error('Failed to update conversation tags:', error);
        get().showNotification('标签更新失败', 'error');
      }
    },

    // 永久删除对话
    deleteConversationPermanent: async (conversationId: string) => {
      try {
        await ConversationService.deleteConversationPermanent(conversationId);
        
        // 从本地状态移除
        set(state => ({
          conversations: state.conversations.filter(conv => conv._id !== conversationId),
          totalCount: state.totalCount - 1
        }));
        
        // 如果是当前对话，清除
        if (get().currentConversation?.conversation_id === conversationId) {
          get().clearCurrentConversation();
        }
        
        // 清除缓存并静默刷新最新数据
        ConversationStorage.clearConversationListCache();
        get().silentUpdateConversations();
        get().showNotification('对话已永久删除', 'success');
      } catch (error) {
        console.error('Failed to delete conversation:', error);
        get().showNotification('删除对话失败', 'error');
      }
    },

    // 设置当前模式
    setCurrentMode: (mode: ConversationMode) => {
      set({ currentMode: mode });
    },

    // 设置Agent类型
    setAgentType: (type: AgentType) => {
      set({ agentType: type });
    },

    // 清除当前对话
    clearCurrentConversation: () => {
      get().stopSSEConnection();
      ConversationStorage.clearCurrentConversation();
      set({ currentConversation: null });
    },

    // 临时更新当前对话（用于立即显示用户消息）
    updateCurrentConversationTemporarily: (conversation: ConversationDetail) => {
      set({ currentConversation: conversation });
      ConversationStorage.setCurrentConversation(conversation);
    },

    // 开始SSE连接
    startSSEConnection: (sse: EventSource) => {
      get().stopSSEConnection(); // 先停止之前的连接
      set({ currentSSE: sse, isStreaming: true });
    },

    // 停止SSE连接
    stopSSEConnection: () => {
      const { currentSSE } = get();
      if (currentSSE) {
        currentSSE.close();
        set({ currentSSE: null, isStreaming: false });
      }
    },

    // 处理SSE消息
    handleSSEMessage: (message: SSEMessage) => {
      // 这里可以根据消息类型进行不同的处理
      console.log('SSE Message:', message);
      
      if (message.error) {
        get().showNotification(message.error.message, 'error');
        get().stopSSEConnection();
      }
      
      if (message.completion) {
        get().showNotification(message.completion.message, 'success');
        get().stopSSEConnection();
      }
    },

    // 设置搜索查询
    setSearchQuery: (query: string) => {
      set({ searchQuery: query });
    },

    // 设置状态筛选
    setStatusFilter: (filter: 'active' | 'favorite' | 'deleted') => {
      set({ statusFilter: filter });
    },

    // 设置类型筛选
    setTypeFilter: (filter: 'chat' | 'agent' | 'graph') => {
      set({ typeFilter: filter });
    },

    // 切换侧边栏
    toggleSidebar: () => {
      const collapsed = !get().sidebarCollapsed;
      localStorage.setItem('sidebar_collapsed', collapsed.toString());
      set({ sidebarCollapsed: collapsed });
    },

    // 设置主题
    setTheme: (theme: 'light' | 'dark') => {
      localStorage.setItem('theme', theme);
      set({ theme });
      document.documentElement.setAttribute('data-theme', theme);
    },

    // 显示通知
    showNotification: (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
      // 使用 antd 的 message 组件
      switch (type) {
        case 'success':
          message.success(msg);
          break;
        case 'error':
          message.error(msg);
          break;
        case 'info':
        default:
          message.info(msg);
          break;
      }
    }
  }))
);

// 订阅主题变化，自动应用到DOM
useConversationStore.subscribe(
  (state) => state.theme,
  (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  }
);

// 应用初始主题
document.documentElement.setAttribute('data-theme', useConversationStore.getState().theme);