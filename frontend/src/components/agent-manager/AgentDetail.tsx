import React from 'react';
import { Descriptions, Tag } from 'antd';
import { useT } from '../../i18n/hooks';
import { TAG_STYLES } from '../../constants/agentManagerStyles';

interface AgentDetailProps {
  agent: any;
}

/**
 * Agent 详情组件
 * 展示 Agent 的详细信息
 */
const AgentDetail: React.FC<AgentDetailProps> = ({ agent }) => {
  const t = useT();

  if (!agent) return null;

  return (
    <Descriptions
      bordered
      column={1}
      labelStyle={{
        background: 'rgba(250, 248, 245, 0.6)',
        color: 'rgba(45, 45, 45, 0.85)',
        fontWeight: 500,
        fontSize: '14px',
        padding: '12px 16px',
        borderRight: '1px solid rgba(139, 115, 85, 0.15)'
      }}
      contentStyle={{
        background: '#fff',
        color: '#2d2d2d',
        fontSize: '14px',
        padding: '12px 16px'
      }}
      style={{
        border: '1px solid rgba(139, 115, 85, 0.15)',
        borderRadius: '6px',
        overflow: 'hidden'
      }}
    >
      <Descriptions.Item label={t('pages.agentManager.agentName')}>
        {agent.agent_config.name}
      </Descriptions.Item>
      
      <Descriptions.Item label={t('pages.agentManager.category')}>
        <Tag style={TAG_STYLES.secondary}>
          {agent.agent_config.category}
        </Tag>
      </Descriptions.Item>
      
      <Descriptions.Item label={t('pages.agentManager.capability')}>
        {agent.agent_config.card}
      </Descriptions.Item>
      
      <Descriptions.Item label={t('pages.agentManager.model')}>
        <Tag style={TAG_STYLES.secondary}>
          {agent.agent_config.model}
        </Tag>
      </Descriptions.Item>
      
      <Descriptions.Item label={t('pages.agentManager.instruction')}>
        <pre style={{
          whiteSpace: 'pre-wrap',
          margin: 0,
          fontSize: '13px',
          lineHeight: 1.6,
          color: 'rgba(45, 45, 45, 0.85)',
          background: 'rgba(250, 248, 245, 0.4)',
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid rgba(139, 115, 85, 0.1)'
        }}>
          {agent.agent_config.instruction || t('pages.agentManager.none')}
        </pre>
      </Descriptions.Item>
      
      <Descriptions.Item label={t('pages.agentManager.maxActions')}>
        {agent.agent_config.max_actions}
      </Descriptions.Item>
      
      <Descriptions.Item label={t('pages.agentManager.systemTools')}>
        {agent.agent_config.system_tools?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {agent.agent_config.system_tools.map((tool: string) => (
              <Tag key={tool} style={{ ...TAG_STYLES.secondary, margin: 0 }}>
                {tool}
              </Tag>
            ))}
          </div>
        ) : t('pages.agentManager.none')}
      </Descriptions.Item>
      
      <Descriptions.Item label={t('pages.agentManager.mcpServers')}>
        {agent.agent_config.mcp?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {agent.agent_config.mcp.map((server: string) => (
              <Tag key={server} style={{ ...TAG_STYLES.secondary, margin: 0 }}>
                {server}
              </Tag>
            ))}
          </div>
        ) : t('pages.agentManager.none')}
      </Descriptions.Item>
      
      <Descriptions.Item label={t('pages.agentManager.tags')}>
        {agent.agent_config.tags?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {agent.agent_config.tags.map((tag: string) => (
              <Tag key={tag} style={{ ...TAG_STYLES.secondary, margin: 0 }}>
                {tag}
              </Tag>
            ))}
          </div>
        ) : t('pages.agentManager.none')}
      </Descriptions.Item>
      
      <Descriptions.Item label={t('pages.agentManager.createdAt')}>
        <span style={{ color: 'rgba(45, 45, 45, 0.65)' }}>
          {new Date(agent.created_at).toLocaleString()}
        </span>
      </Descriptions.Item>
      
      <Descriptions.Item label={t('pages.agentManager.updatedAt')}>
        <span style={{ color: 'rgba(45, 45, 45, 0.65)' }}>
          {new Date(agent.updated_at).toLocaleString()}
        </span>
      </Descriptions.Item>
    </Descriptions>
  );
};

export default AgentDetail;
