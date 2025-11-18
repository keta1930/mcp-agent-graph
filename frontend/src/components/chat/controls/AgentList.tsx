// src/components/chat/controls/AgentList.tsx
import React, { useState } from 'react';
import { List, Card, Tag, Empty, Collapse, Descriptions, message, Spin } from 'antd';
import { RobotOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { AgentListItem, AgentCategoryItem, getAgent, Agent } from '../../../services/agentService';
import { useT } from '../../../i18n/hooks';
import './AgentList.css';

const { Panel } = Collapse;

/**
 * Agent 列表组件属性
 */
interface AgentListProps {
  /** Agent 列表 */
  agents: AgentListItem[];
  /** 分类列表 */
  categories: AgentCategoryItem[];
  /** 当前选中的 Agent */
  selectedAgent?: string | null;
  /** Agent 选择回调 */
  onSelect: (agentName: string | null) => void;
}

/**
 * Agent 列表组件
 * 
 * 按分类展示 Agent 列表，支持查看详情和选择
 */
const AgentList: React.FC<AgentListProps> = ({
  agents,
  categories,
  selectedAgent,
  onSelect
}) => {
  const t = useT();
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [agentDetails, setAgentDetails] = useState<Record<string, Agent>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  // 按分类分组 Agent
  const agentsByCategory = React.useMemo(() => {
    const grouped: Record<string, AgentListItem[]> = {};
    
    agents.forEach(agent => {
      const category = agent.category || 'uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(agent);
    });
    
    return grouped;
  }, [agents]);

  // 加载 Agent 详情
  const loadAgentDetails = async (agentName: string) => {
    if (agentDetails[agentName]) {
      return; // 已加载
    }

    setLoadingDetails(prev => ({ ...prev, [agentName]: true }));
    
    try {
      const agent = await getAgent(agentName);
      setAgentDetails(prev => ({ ...prev, [agentName]: agent }));
    } catch (error) {
      console.error(t('components.agentList.loadDetailsFailed'), error);
      message.error(t('components.agentList.loadDetailsError', { name: agentName }));
    } finally {
      setLoadingDetails(prev => ({ ...prev, [agentName]: false }));
    }
  };

  // 处理 Agent 卡片点击
  const handleAgentClick = (agentName: string) => {
    if (selectedAgent === agentName) {
      // 取消选择
      onSelect(null);
      setExpandedAgent(null);
    } else {
      // 选择 Agent
      onSelect(agentName);
      setExpandedAgent(agentName);
      loadAgentDetails(agentName);
    }
  };

  // 渲染 Agent 详情
  const renderAgentDetails = (agentName: string) => {
    const loading = loadingDetails[agentName];
    const agent = agentDetails[agentName];

    if (loading) {
      return (
        <div className="agent-details-loading">
          <Spin size="small" />
        </div>
      );
    }

    if (!agent) {
      return null;
    }

    const config = agent.agent_config;

    return (
      <div className="agent-details">
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label={t('components.agentList.description')}>
            {config.card || t('components.agentList.noDescription')}
          </Descriptions.Item>
          <Descriptions.Item label={t('components.agentList.model')}>
            {config.model}
          </Descriptions.Item>
          {config.instruction && (
            <Descriptions.Item label={t('components.agentList.systemPrompt')}>
              <div className="agent-instruction">
                {config.instruction}
              </div>
            </Descriptions.Item>
          )}
          {config.max_actions && (
            <Descriptions.Item label={t('components.agentList.maxIterations')}>
              {config.max_actions}
            </Descriptions.Item>
          )}
          {config.mcp && config.mcp.length > 0 && (
            <Descriptions.Item label={t('components.agentList.mcpServers')}>
              <div className="agent-tools">
                {config.mcp.map(mcp => (
                  <Tag key={mcp} color="blue">{mcp}</Tag>
                ))}
              </div>
            </Descriptions.Item>
          )}
          {config.system_tools && config.system_tools.length > 0 && (
            <Descriptions.Item label={t('components.agentList.systemTools')}>
              <div className="agent-tools">
                {config.system_tools.map(tool => (
                  <Tag key={tool} color="green">{tool}</Tag>
                ))}
              </div>
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>
    );
  };

  if (agents.length === 0) {
    return (
      <Empty
        description={t('components.agentList.noAgents')}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="agent-list">
      <Collapse 
        accordion 
        bordered={false}
        defaultActiveKey={categories.length > 0 ? [categories[0].category] : []}
      >
        {categories.map(category => {
          const categoryAgents = agentsByCategory[category.category] || [];
          
          return (
            <Panel
              header={
                <div className="category-header">
                  <span className="category-name">{category.category}</span>
                  <Tag color="default">{category.agent_count}</Tag>
                </div>
              }
              key={category.category}
            >
              <List
                dataSource={categoryAgents}
                renderItem={agent => (
                  <Card
                    key={agent.name}
                    className={`agent-card ${selectedAgent === agent.name ? 'agent-card-selected' : ''}`}
                    onClick={() => handleAgentClick(agent.name)}
                    hoverable
                  >
                    <div className="agent-card-header">
                      <div className="agent-card-title">
                        <RobotOutlined className="agent-icon" />
                        <span className="agent-name">{agent.name}</span>
                        {selectedAgent === agent.name && (
                          <CheckCircleOutlined className="agent-selected-icon" />
                        )}
                      </div>
                      <Tag color="blue">{agent.model}</Tag>
                    </div>
                    
                    {agent.tags && agent.tags.length > 0 && (
                      <div className="agent-tags">
                        {agent.tags.map(tag => (
                          <Tag key={tag} color="default" className="agent-tag">
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                    
                    {expandedAgent === agent.name && renderAgentDetails(agent.name)}
                  </Card>
                )}
              />
            </Panel>
          );
        })}
        
        {/* 未分类的 Agent */}
        {agentsByCategory['uncategorized'] && agentsByCategory['uncategorized'].length > 0 && (
          <Panel
            header={
              <div className="category-header">
                <span className="category-name">{t('components.agentList.uncategorized')}</span>
                <Tag color="default">{agentsByCategory['uncategorized'].length}</Tag>
              </div>
            }
            key="uncategorized"
          >
            <List
              dataSource={agentsByCategory['uncategorized']}
              renderItem={agent => (
                <Card
                  key={agent.name}
                  className={`agent-card ${selectedAgent === agent.name ? 'agent-card-selected' : ''}`}
                  onClick={() => handleAgentClick(agent.name)}
                  hoverable
                >
                  <div className="agent-card-header">
                    <div className="agent-card-title">
                      <RobotOutlined className="agent-icon" />
                      <span className="agent-name">{agent.name}</span>
                      {selectedAgent === agent.name && (
                        <CheckCircleOutlined className="agent-selected-icon" />
                      )}
                    </div>
                    <Tag color="blue">{agent.model}</Tag>
                  </div>
                  
                  {agent.tags && agent.tags.length > 0 && (
                    <div className="agent-tags">
                      {agent.tags.map(tag => (
                        <Tag key={tag} color="default" className="agent-tag">
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  )}
                  
                  {expandedAgent === agent.name && renderAgentDetails(agent.name)}
                </Card>
              )}
            />
          </Panel>
        )}
      </Collapse>
    </div>
  );
};

export default AgentList;
