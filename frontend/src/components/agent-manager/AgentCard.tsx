import React from 'react';
import { Card, Tag, Tooltip, Popconfirm, Typography } from 'antd';
import { Bot, Eye, Edit2, Trash2 } from 'lucide-react';
import { AgentListItem } from '../../services/agentService';
import { useT } from '../../i18n/hooks';
import { CARD_STYLES, ACTION_BUTTON_STYLES, TAG_STYLES } from '../../constants/agentManagerStyles';

const { Text } = Typography;

interface AgentCardProps {
  agent: AgentListItem;
  onView: (agentName: string) => void;
  onEdit: (agentName: string) => void;
  onDelete: (agentName: string) => void;
}

/**
 * Agent 卡片组件
 * 展示单个 Agent 的信息和操作按钮
 */
const AgentCard: React.FC<AgentCardProps> = ({ agent, onView, onEdit, onDelete }) => {
  const t = useT();

  const handleCardHover = (e: React.MouseEvent<HTMLDivElement>, isEnter: boolean) => {
    const target = e.currentTarget;
    if (isEnter) {
      Object.assign(target.style, CARD_STYLES.hover);
    } else {
      target.style.transform = 'translateY(0)';
      target.style.boxShadow = CARD_STYLES.base.boxShadow;
      target.style.borderColor = CARD_STYLES.base.border.split(' ')[2];
    }
  };

  const handleActionHover = (e: React.MouseEvent<HTMLDivElement>, isEnter: boolean) => {
    const target = e.currentTarget;
    if (isEnter) {
      Object.assign(target.style, ACTION_BUTTON_STYLES.hover);
    } else {
      target.style.color = ACTION_BUTTON_STYLES.base.color;
      target.style.background = 'transparent';
      target.style.borderColor = ACTION_BUTTON_STYLES.base.border.split(' ')[2];
    }
  };

  return (
    <Card
      hoverable
      style={CARD_STYLES.base}
      styles={{ body: { padding: '16px 18px' } }}
      onMouseEnter={(e) => handleCardHover(e, true)}
      onMouseLeave={(e) => handleCardHover(e, false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Agent 图标 */}
        <div style={CARD_STYLES.iconContainer}>
          <Bot size={28} strokeWidth={1.5} style={{ color: '#b85845' }} />
        </div>

        {/* Agent 信息 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Text
            strong
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '16px',
              fontWeight: 600,
              color: '#2d2d2d',
              letterSpacing: '0.3px',
              lineHeight: '1.3'
            }}
            title={agent.name}
          >
            {agent.name}
          </Text>
          
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', overflow: 'hidden' }}>
            {agent.tags && agent.tags.length > 0 && (
              <>
                {agent.tags.slice(0, 2).map((tag, idx) => (
                  <Tag
                    key={idx}
                    style={{
                      background: 'rgba(184, 88, 69, 0.06)',
                      color: 'rgba(184, 88, 69, 0.85)',
                      border: '1px solid rgba(184, 88, 69, 0.15)',
                      borderRadius: '4px',
                      fontWeight: 500,
                      fontSize: '12px',
                      padding: '2px 8px',
                      margin: 0,
                      lineHeight: '1.4'
                    }}
                  >
                    {tag}
                  </Tag>
                ))}
                {agent.tags.length > 2 && (
                  <Tag style={TAG_STYLES.dashed}>
                    +{agent.tags.length - 2}
                  </Tag>
                )}
              </>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Tooltip title={t('pages.agentManager.viewDetails')}>
            <div
              style={ACTION_BUTTON_STYLES.base}
              onClick={() => onView(agent.name)}
              onMouseEnter={(e) => handleActionHover(e, true)}
              onMouseLeave={(e) => handleActionHover(e, false)}
            >
              <Eye size={18} strokeWidth={1.5} />
            </div>
          </Tooltip>
          
          <Tooltip title={t('common.edit')}>
            <div
              style={ACTION_BUTTON_STYLES.base}
              onClick={() => onEdit(agent.name)}
              onMouseEnter={(e) => handleActionHover(e, true)}
              onMouseLeave={(e) => handleActionHover(e, false)}
            >
              <Edit2 size={18} strokeWidth={1.5} />
            </div>
          </Tooltip>
          
          <Popconfirm
            title={t('pages.agentManager.deleteConfirm')}
            onConfirm={() => onDelete(agent.name)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            okButtonProps={{
              style: {
                background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: 500,
                boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25)'
              }
            }}
            cancelButtonProps={{
              style: {
                borderRadius: '6px',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                color: '#8b7355',
                fontWeight: 500
              }
            }}
            overlayStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(139, 115, 85, 0.2)'
            }}
          >
            <Tooltip title={t('common.delete')}>
              <div
                style={ACTION_BUTTON_STYLES.base}
                onMouseEnter={(e) => handleActionHover(e, true)}
                onMouseLeave={(e) => handleActionHover(e, false)}
              >
                <Trash2 size={18} strokeWidth={1.5} />
              </div>
            </Tooltip>
          </Popconfirm>
        </div>
      </div>
    </Card>
  );
};

export default AgentCard;
