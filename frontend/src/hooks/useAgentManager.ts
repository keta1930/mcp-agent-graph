import { useState, useEffect, useCallback } from 'react';
import { App } from 'antd';
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgent,
  listCategories,
  AgentConfig,
  AgentListItem,
  AgentCategoryItem
} from '../services/agentService';
import { getModels } from '../services/modelService';
import { listSystemTools, ToolCategory } from '../services/systemToolsService';
import { getMCPConfig } from '../services/mcpService';
import { useT } from '../i18n/hooks';

interface CategoryGroup {
  category: string;
  agents: AgentListItem[];
}

/**
 * Agent Manager 数据管理 Hook
 * 封装所有数据加载、CRUD 操作和搜索过滤逻辑
 */
export const useAgentManager = () => {
  const t = useT();
  const { message } = App.useApp();

  // 状态管理
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // 可选项数据
  const [models, setModels] = useState<string[]>([]);
  const [systemTools, setSystemTools] = useState<string[]>([]);
  const [systemToolCategories, setSystemToolCategories] = useState<ToolCategory[]>([]);
  const [mcpServers, setMcpServers] = useState<string[]>([]);
  const [categories, setCategories] = useState<AgentCategoryItem[]>([]);

  // 分组数据
  const [groupedAgents, setGroupedAgents] = useState<CategoryGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<CategoryGroup[]>([]);

  /**
   * 按分类分组 Agents
   */
  const groupAgentsByCategory = useCallback((agentList: AgentListItem[]): CategoryGroup[] => {
    const groupMap = new Map<string, CategoryGroup>();

    agentList.forEach(agent => {
      const category = agent.category || t('pages.agentManager.noAgents');
      if (!groupMap.has(category)) {
        groupMap.set(category, {
          category,
          agents: []
        });
      }
      groupMap.get(category)!.agents.push(agent);
    });

    return Array.from(groupMap.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [t]);

  /**
   * 加载 Agents 列表
   */
  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listAgents();
      setAgents(response.agents || []);
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message || t('errors.serverError');
      console.error('Load agents error:', error.response?.data);
      message.error(t('pages.agentManager.loadFailed', { error: errorDetail }));
    } finally {
      setLoading(false);
    }
  }, [t, message]);

  /**
   * 加载所有选项数据（模型、工具、MCP服务器、分类）
   */
  const loadOptions = useCallback(async () => {
    try {
      const [modelResponse, toolsResponse, mcpResponse, categoriesResponse] = await Promise.all([
        getModels(),
        listSystemTools(),
        getMCPConfig(),
        listCategories()
      ]);

      setModels(modelResponse.map((m: any) => m.name));
      const allTools = toolsResponse.categories.flatMap((cat: any) => cat.tools.map((t: any) => t.name));
      setSystemTools(allTools);
      setSystemToolCategories(toolsResponse.categories || []);
      setMcpServers(Object.keys(mcpResponse.mcpServers || {}));
      setCategories(categoriesResponse.categories || []);
    } catch (error: any) {
      console.error('加载选项失败:', error);
    }
  }, []);

  /**
   * 创建 Agent
   */
  const handleCreateAgent = useCallback(async (agentConfig: AgentConfig) => {
    try {
      await createAgent(agentConfig);
      message.success(t('pages.agentManager.createSuccess', { name: agentConfig.name }));
      await loadAgents();
      return true;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message || t('errors.serverError');
      console.error('Agent operation error:', error.response?.data);
      message.error(t('pages.agentManager.operationFailed', { error: errorDetail }));
      return false;
    }
  }, [t, message, loadAgents]);

  /**
   * 更新 Agent
   */
  const handleUpdateAgent = useCallback(async (agentName: string, agentConfig: AgentConfig) => {
    try {
      await updateAgent(agentName, agentConfig);
      message.success(t('pages.agentManager.updateSuccess', { name: agentName }));
      await loadAgents();
      return true;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message || t('errors.serverError');
      console.error('Agent operation error:', error.response?.data);
      message.error(t('pages.agentManager.operationFailed', { error: errorDetail }));
      return false;
    }
  }, [t, message, loadAgents]);

  /**
   * 删除 Agent
   */
  const handleDeleteAgent = useCallback(async (agentName: string) => {
    try {
      await deleteAgent(agentName);
      message.success(t('pages.agentManager.deleteSuccess', { name: agentName }));
      await loadAgents();
      return true;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message || t('errors.serverError');
      console.error('Agent delete error:', error.response?.data);
      message.error(t('pages.agentManager.deleteFailed', { error: errorDetail }));
      return false;
    }
  }, [t, message, loadAgents]);

  /**
   * 获取 Agent 详情
   */
  const fetchAgentDetail = useCallback(async (agentName: string) => {
    try {
      const response = await getAgent(agentName);
      return response.agent;
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message || t('errors.serverError');
      console.error('Load agent detail error:', error.response?.data);
      message.error(t('pages.agentManager.loadDetailFailed', { error: errorDetail }));
      return null;
    }
  }, [t, message]);

  // 初始化加载
  useEffect(() => {
    loadAgents();
    loadOptions();
  }, [loadAgents, loadOptions]);

  // 分组 Agents
  useEffect(() => {
    const grouped = groupAgentsByCategory(agents);
    setGroupedAgents(grouped);
    setFilteredGroups(grouped);
  }, [agents, groupAgentsByCategory]);

  // 搜索过滤
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredGroups(groupedAgents);
    } else {
      const keyword = searchText.toLowerCase();
      const filtered = groupedAgents
        .map(group => ({
          ...group,
          agents: group.agents.filter(agent =>
            agent.name.toLowerCase().includes(keyword) ||
            agent.category.toLowerCase().includes(keyword) ||
            agent.tags?.some(tag => tag.toLowerCase().includes(keyword))
          )
        }))
        .filter(group => group.agents.length > 0);
      setFilteredGroups(filtered);
    }
  }, [searchText, groupedAgents]);

  return {
    // 状态
    agents,
    loading,
    searchText,
    filteredGroups,

    // 选项数据
    models,
    systemTools,
    systemToolCategories,
    mcpServers,
    categories,

    // 操作方法
    setSearchText,
    loadAgents,
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    fetchAgentDetail,
  };
};
