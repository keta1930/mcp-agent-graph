import React from 'react';
import { Drawer, Button, Checkbox, Tag } from 'antd';
import { Trash2 } from 'lucide-react';
import { useT } from '../../i18n/hooks';
import { BUTTON_STYLES } from '../../constants/agentManagerStyles';

interface AgentGroup {
  category: string;
  agents: Array<{
    name: string;
    tags?: string[];
  }>;
}

interface AgentBatchDeleteProps {
  visible: boolean;
  filteredGroups: AgentGroup[];
  selectedAgents: string[];
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onToggleSelection: (agentName: string) => void;
  onToggleSelectAll: () => void;
}

/**
 * 批量删除智能体抽屉组件
 */
const AgentBatchDelete: React.FC<AgentBatchDeleteProps> = ({
  visible,
  filteredGroups,
  selectedAgents,
  deleting,
  onClose,
  onConfirm,
  onToggleSelection,
  onToggleSelectAll
}) => {
  const t = useT();

  const allAgentNames = filteredGroups.flatMap(group => group.agents.map(agent => agent.name));
  const isAllSelected = selectedAgents.length === allAgentNames.length && allAgentNames.length > 0;

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trash2 size={20} strokeWidth={1.5} style={{ color: '#b85845' }} />
          <span style={{
            color: '#2d2d2d',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            {t('pages.agentManager.batchDelete.title')}
          </span>
        </div>
      }
      placement="right"
      width={480}
      open={visible}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button
            onClick={onClose}
            style={{
              height: '40px',
              borderRadius: '6px',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#8b7355',
              fontWeight: 500,
              fontSize: '14px',
              letterSpacing: '0.3px',
              padding: '0 24px'
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            danger
            type="primary"
            onClick={onConfirm}
            loading={deleting}
            disabled={selectedAgents.length === 0}
            style={{
              height: '40px',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '14px',
              letterSpacing: '0.3px',
              padding: '0 24px'
            }}
          >
            {t('pages.agentManager.batchDelete.deleteButton', { count: selectedAgents.length })}
          </Button>
        </div>
      }
      styles={{
        header: {
          background: 'rgba(250, 248, 245, 0.6)',
          borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
          padding: '16px 24px'
        },
        body: {
          padding: '24px',
          background: '#faf8f5'
        },
        footer: {
          borderTop: '1px solid rgba(139, 115, 85, 0.15)',
          padding: '16px 24px'
        }
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <Button
          onClick={onToggleSelectAll}
          style={{
            ...BUTTON_STYLES.secondary,
            width: '100%',
            marginBottom: '12px'
          }}
        >
          {isAllSelected
            ? t('pages.agentManager.batchDelete.deselectAll')
            : t('pages.agentManager.batchDelete.selectAll')}
        </Button>
        <div style={{
          padding: '8px 12px',
          background: 'rgba(184, 88, 69, 0.08)',
          border: '1px solid rgba(184, 88, 69, 0.2)',
          borderRadius: '6px',
          color: '#b85845',
          fontSize: '13px',
          fontWeight: 500
        }}>
          {t('pages.agentManager.batchDelete.selected', { count: selectedAgents.length })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredGroups.map(group => (
          <div key={group.category}>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#2d2d2d',
              marginBottom: '8px',
              padding: '8px 12px',
              background: 'rgba(139, 115, 85, 0.08)',
              borderRadius: '6px'
            }}>
              {group.category}
            </div>
            {group.agents.map(agent => (
              <div
                key={agent.name}
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.85)',
                  border: '1px solid rgba(139, 115, 85, 0.15)',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => onToggleSelection(agent.name)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(184, 88, 69, 0.3)';
                  e.currentTarget.style.background = 'rgba(250, 248, 245, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.15)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Checkbox
                    checked={selectedAgents.includes(agent.name)}
                    onChange={() => onToggleSelection(agent.name)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#2d2d2d',
                      marginBottom: '4px'
                    }}>
                      {agent.name}
                    </div>
                    {agent.tags && agent.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {agent.tags.map(tag => (
                          <Tag
                            key={tag}
                            style={{
                              background: 'rgba(139, 115, 85, 0.08)',
                              color: '#8b7355',
                              border: '1px solid rgba(139, 115, 85, 0.2)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              padding: '2px 8px',
                              margin: 0
                            }}
                          >
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Drawer>
  );
};

export default AgentBatchDelete;
