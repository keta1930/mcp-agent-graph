// src/components/chat/controls/AgentSelector.tsx
import React, { useState, useEffect } from 'react';
import { Tabs, Spin, message } from 'antd';
import { AgentRunRequest } from '../../../types/conversation';
import { AgentListItem, AgentCategoryItem } from '../../../services/agentService';
import { listAgents, listCategories } from '../../../services/agentService';
import AgentList from './AgentList';
import ManualConfig from './ManualConfig';
import './AgentSelector.css';

const { TabPane } = Tabs;

/**
 * Agent 选择器组件属性
 */
interface AgentSelectorProps {
  /** 当前选中的 Agent 名称 */
  selectedAgent?: string | null;
  /** Agent 选择回调 */
  onAgentSelect: (agentName: string | null) => void;
  /** 配置变更回调 */
  onConfigChange: (config: Partial<AgentRunRequest>) => void;
  /** 当前配置 */
  currentConfig?: Partial<AgentRunRequest>;
}

/**
 * Agent 选择器组件
 * 
 * 提供两种模式：
 * 1. Agent 模式：从列表中选择预配置的 Agent
 * 2. 手动配置模式：手动配置模型、系统提示词等参数
 */
const AgentSelector: React.FC<AgentSelectorProps> = ({
  selectedAgent,
  onAgentSelect,
  onConfigChange,
  currentConfig = {}
}) => {
  const [activeTab, setActiveTab] = useState<'agent' | 'manual'>('agent');
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [categories, setCategories] = useState<AgentCategoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载 Agent 列表和分类
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsResponse, categoriesResponse] = await Promise.all([
        listAgents(),
        listCategories()
      ]);
      
      setAgents(agentsResponse.agents || []);
      setCategories(categoriesResponse.categories || []);
    } catch (error) {
      console.error('加载 Agent 数据失败:', error);
      message.error('加载 Agent 列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'agent' | 'manual');
    
    // 切换到手动配置时，清除选中的 Agent
    if (key === 'manual') {
      onAgentSelect(null);
    }
  };

  return (
    <div className="agent-selector">
      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange}
        className="agent-selector-tabs"
      >
        <TabPane tab="选择 Agent" key="agent">
          {loading ? (
            <div className="agent-selector-loading">
              <Spin tip="加载中..." />
            </div>
          ) : (
            <AgentList
              agents={agents}
              categories={categories}
              selectedAgent={selectedAgent}
              onSelect={onAgentSelect}
            />
          )}
        </TabPane>
        
        <TabPane tab="手动配置" key="manual">
          <ManualConfig
            config={currentConfig}
            onConfigChange={onConfigChange}
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default AgentSelector;
