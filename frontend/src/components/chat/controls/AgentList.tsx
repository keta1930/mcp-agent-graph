// src/components/chat/controls/AgentList.tsx
import React, { useState } from 'react';
import { List, Tag, Collapse, message, Spin } from 'antd';
import { Bot, ChevronDown, CheckCircle, Wrench, Server } from 'lucide-react';
import { AgentListItem, AgentCategoryItem, getAgent, Agent } from '../../../services/agentService';
import { useT } from '../../../i18n/hooks';

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
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '16px 0',
          marginTop: '12px',
          borderTop: '1px solid rgba(139, 115, 85, 0.15)'
        }}>
          <Spin size="small" />
        </div>
      );
    }

    if (!agent) {
      return null;
    }

    const config = agent.agent_config;

    return (
      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(139, 115, 85, 0.15)'
      }}>
        {/* 描述 */}
        {config.card && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '12px',
              color: 'rgba(45, 45, 45, 0.65)',
              fontWeight: 500,
              marginBottom: '6px',
              letterSpacing: '0.3px'
            }}>
              {t('components.agentList.description')}
            </div>
            <div style={{
              fontSize: '13px',
              color: 'rgba(45, 45, 45, 0.85)',
              lineHeight: '1.6',
              letterSpacing: '0.3px'
            }}>
              {config.card}
            </div>
          </div>
        )}

        {/* 系统提示词 */}
        {config.instruction && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '12px',
              color: 'rgba(45, 45, 45, 0.65)',
              fontWeight: 500,
              marginBottom: '6px',
              letterSpacing: '0.3px'
            }}>
              {t('components.agentList.systemPrompt')}
            </div>
            <div style={{
              maxHeight: '120px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '12px',
              color: 'rgba(45, 45, 45, 0.75)',
              lineHeight: '1.6',
              padding: '8px 12px',
              background: 'rgba(245, 243, 240, 0.6)',
              borderRadius: '4px',
              border: '1px solid rgba(139, 115, 85, 0.1)',
              letterSpacing: '0.2px'
            }}>
              {config.instruction}
            </div>
          </div>
        )}

        {/* 最大迭代次数 */}
        {config.max_actions && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '12px',
              color: 'rgba(45, 45, 45, 0.65)',
              fontWeight: 500,
              marginBottom: '6px',
              letterSpacing: '0.3px'
            }}>
              {t('components.agentList.maxIterations')}
            </div>
            <Tag style={{
              background: 'rgba(212, 165, 116, 0.08)',
              color: '#d4a574',
              border: '1px solid rgba(212, 165, 116, 0.25)',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '12px',
              padding: '4px 12px',
              margin: 0
            }}>
              {config.max_actions}
            </Tag>
          </div>
        )}

        {/* MCP 服务器 */}
        {config.mcp && config.mcp.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '12px',
              color: 'rgba(45, 45, 45, 0.65)',
              fontWeight: 500,
              marginBottom: '6px',
              letterSpacing: '0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Server size={14} strokeWidth={1.5} />
              {t('components.agentList.mcpServers')}
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px'
            }}>
              {config.mcp.map(mcp => (
                <Tag 
                  key={mcp}
                  style={{
                    background: 'rgba(160, 130, 109, 0.08)',
                    color: '#a0826d',
                    border: '1px solid rgba(160, 130, 109, 0.25)',
                    borderRadius: '6px',
                    fontWeight: 500,
                    fontSize: '11px',
                    padding: '4px 10px',
                    margin: 0,
                    letterSpacing: '0.2px'
                  }}
                >
                  {mcp}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* 系统工具 */}
        {config.system_tools && config.system_tools.length > 0 && (
          <div style={{ marginBottom: '0' }}>
            <div style={{
              fontSize: '12px',
              color: 'rgba(45, 45, 45, 0.65)',
              fontWeight: 500,
              marginBottom: '6px',
              letterSpacing: '0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Wrench size={14} strokeWidth={1.5} />
              {t('components.agentList.systemTools')}
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px'
            }}>
              {config.system_tools.map(tool => (
                <Tag 
                  key={tool}
                  style={{
                    background: 'rgba(139, 115, 85, 0.08)',
                    color: '#8b7355',
                    border: '1px solid rgba(139, 115, 85, 0.2)',
                    borderRadius: '6px',
                    fontWeight: 500,
                    fontSize: '11px',
                    padding: '4px 10px',
                    margin: 0,
                    letterSpacing: '0.2px'
                  }}
                >
                  {tool}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (agents.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        color: 'rgba(45, 45, 45, 0.45)'
      }}>
        <Bot size={48} strokeWidth={1.5} style={{ marginBottom: '16px', color: 'rgba(139, 115, 85, 0.3)' }} />
        <div style={{ fontSize: '14px', letterSpacing: '0.3px' }}>
          {t('components.agentList.noAgents')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Collapse 
        accordion 
        bordered={false}
        defaultActiveKey={categories.length > 0 ? [categories[0].category] : []}
        expandIcon={({ isActive }) => (
          <ChevronDown
            size={18}
            strokeWidth={2}
            style={{
              color: '#8b7355',
              transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }}
          />
        )}
        style={{ background: 'transparent' }}
      >
        {categories.map(category => {
          const categoryAgents = agentsByCategory[category.category] || [];
          
          return (
            <Panel
              header={
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  paddingRight: '8px'
                }}>
                  <span style={{
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#2d2d2d',
                    letterSpacing: '0.5px'
                  }}>
                    {category.category}
                  </span>
                  <Tag style={{
                    background: 'rgba(139, 115, 85, 0.08)',
                    color: '#8b7355',
                    border: '1px solid rgba(139, 115, 85, 0.2)',
                    borderRadius: '6px',
                    fontWeight: 500,
                    fontSize: '12px',
                    padding: '2px 10px',
                    margin: 0
                  }}>
                    {category.agent_count}
                  </Tag>
                </div>
              }
              key={category.category}
              style={{
                marginBottom: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(139, 115, 85, 0.15)',
                background: 'rgba(250, 248, 245, 0.6)',
                overflow: 'hidden'
              }}
            >
              <List
                dataSource={categoryAgents}
                renderItem={agent => (
                  <div
                    key={agent.name}
                    onClick={() => handleAgentClick(agent.name)}
                    style={{
                      padding: '12px 16px',
                      marginBottom: '8px',
                      borderRadius: '6px',
                      border: selectedAgent === agent.name 
                        ? '1px solid rgba(184, 88, 69, 0.4)' 
                        : '1px solid rgba(139, 115, 85, 0.15)',
                      background: selectedAgent === agent.name
                        ? 'rgba(184, 88, 69, 0.05)'
                        : 'rgba(255, 255, 255, 0.85)',
                      boxShadow: selectedAgent === agent.name
                        ? '0 2px 8px rgba(184, 88, 69, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                        : '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedAgent !== agent.name) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
                        e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedAgent !== agent.name) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
                        e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                      }
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: agent.tags && agent.tags.length > 0 ? '8px' : '0'
                    }}>
                      <Bot 
                        size={18} 
                        strokeWidth={1.5}
                        style={{ 
                          color: selectedAgent === agent.name ? '#b85845' : '#8b7355',
                          transition: 'color 0.3s ease'
                        }} 
                      />
                      <span style={{
                        fontWeight: 500,
                        fontSize: '14px',
                        color: selectedAgent === agent.name ? '#b85845' : '#2d2d2d',
                        letterSpacing: '0.3px',
                        transition: 'color 0.3s ease',
                        flex: 1
                      }}>
                        {agent.name}
                      </span>
                      {selectedAgent === agent.name && (
                        <CheckCircle 
                          size={16} 
                          strokeWidth={2}
                          style={{ 
                            color: '#b85845'
                          }} 
                        />
                      )}
                    </div>
                    
                    {agent.tags && agent.tags.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginTop: '8px'
                      }}>
                        {agent.tags.map(tag => (
                          <Tag 
                            key={tag}
                            style={{
                              background: 'rgba(139, 115, 85, 0.08)',
                              color: '#8b7355',
                              border: '1px solid rgba(139, 115, 85, 0.2)',
                              borderRadius: '4px',
                              fontWeight: 400,
                              fontSize: '11px',
                              padding: '2px 8px',
                              margin: 0,
                              letterSpacing: '0.2px'
                            }}
                          >
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                    
                    {expandedAgent === agent.name && renderAgentDetails(agent.name)}
                  </div>
                )}
              />
            </Panel>
          );
        })}
        
        {/* 未分类的 Agent */}
        {agentsByCategory['uncategorized'] && agentsByCategory['uncategorized'].length > 0 && (
          <Panel
            header={
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                paddingRight: '8px'
              }}>
                <span style={{
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#2d2d2d',
                  letterSpacing: '0.5px'
                }}>
                  {t('components.agentList.uncategorized')}
                </span>
                <Tag style={{
                  background: 'rgba(139, 115, 85, 0.08)',
                  color: '#8b7355',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '12px',
                  padding: '2px 10px',
                  margin: 0
                }}>
                  {agentsByCategory['uncategorized'].length}
                </Tag>
              </div>
            }
            key="uncategorized"
            style={{
              marginBottom: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 115, 85, 0.15)',
              background: 'rgba(250, 248, 245, 0.6)',
              overflow: 'hidden'
            }}
          >
            <List
              dataSource={agentsByCategory['uncategorized']}
              renderItem={agent => (
                <div
                  key={agent.name}
                  onClick={() => handleAgentClick(agent.name)}
                  style={{
                    padding: '12px 16px',
                    marginBottom: '8px',
                    borderRadius: '6px',
                    border: selectedAgent === agent.name 
                      ? '1px solid rgba(184, 88, 69, 0.4)' 
                      : '1px solid rgba(139, 115, 85, 0.15)',
                    background: selectedAgent === agent.name
                      ? 'rgba(184, 88, 69, 0.05)'
                      : 'rgba(255, 255, 255, 0.85)',
                    boxShadow: selectedAgent === agent.name
                      ? '0 2px 8px rgba(184, 88, 69, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                      : '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAgent !== agent.name) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
                      e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAgent !== agent.name) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: agent.tags && agent.tags.length > 0 ? '8px' : '0'
                  }}>
                    <Bot 
                      size={18} 
                      strokeWidth={1.5}
                      style={{ 
                        color: selectedAgent === agent.name ? '#b85845' : '#8b7355',
                        transition: 'color 0.3s ease'
                      }} 
                    />
                    <span style={{
                      fontWeight: 500,
                      fontSize: '14px',
                      color: selectedAgent === agent.name ? '#b85845' : '#2d2d2d',
                      letterSpacing: '0.3px',
                      transition: 'color 0.3s ease',
                      flex: 1
                    }}>
                      {agent.name}
                    </span>
                    {selectedAgent === agent.name && (
                      <CheckCircle 
                        size={16} 
                        strokeWidth={2}
                        style={{ 
                          color: '#b85845'
                        }} 
                      />
                    )}
                  </div>
                  
                  {agent.tags && agent.tags.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginTop: '8px'
                    }}>
                      {agent.tags.map(tag => (
                        <Tag 
                          key={tag}
                          style={{
                            background: 'rgba(139, 115, 85, 0.08)',
                            color: '#8b7355',
                            border: '1px solid rgba(139, 115, 85, 0.2)',
                            borderRadius: '4px',
                            fontWeight: 400,
                            fontSize: '11px',
                            padding: '2px 8px',
                            margin: 0,
                            letterSpacing: '0.2px'
                          }}
                        >
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  )}
                  
                  {expandedAgent === agent.name && renderAgentDetails(agent.name)}
                </div>
              )}
            />
          </Panel>
        )}
      </Collapse>
    </div>
  );
};

export default AgentList;
