import React from 'react';
import { Card, Typography, Popconfirm } from 'antd';
import { Edit, Trash2 } from 'lucide-react';
import { PromptInfo } from '../../types/prompt';
import { useT } from '../../i18n/hooks';
import { CARD_STYLES, ACTION_BUTTON_STYLES } from '../../constants/promptManagerStyles';

const { Text } = Typography;

interface PromptCardProps {
  prompt: PromptInfo;
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
}

/**
 * Prompt 卡片组件
 * 展示单个 Prompt 的信息和操作按钮
 */
const PromptCard: React.FC<PromptCardProps> = ({ prompt, onEdit, onDelete }) => {
  const t = useT();

  const handleCardHover = (e: React.MouseEvent<HTMLDivElement>, isEnter: boolean) => {
    const target = e.currentTarget;
    if (isEnter) {
      Object.assign(target.style, CARD_STYLES.hover);
    } else {
      target.style.transform = 'translateY(0)';
      target.style.boxShadow = CARD_STYLES.base.boxShadow;
      target.style.borderColor = 'rgba(139, 115, 85, 0.15)';
    }
  };

  const handleActionHover = (e: React.MouseEvent<HTMLDivElement>, isEnter: boolean) => {
    const target = e.currentTarget;
    if (isEnter) {
      Object.assign(target.style, ACTION_BUTTON_STYLES.hover);
    } else {
      target.style.color = ACTION_BUTTON_STYLES.base.color;
      target.style.background = 'transparent';
    }
  };

  return (
    <Card
      hoverable
      style={CARD_STYLES.base}
      styles={{ body: { padding: '10px 12px' } }}
      onMouseEnter={(e) => handleCardHover(e, true)}
      onMouseLeave={(e) => handleCardHover(e, false)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text
            strong
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '14px',
              fontWeight: 500,
              color: '#2d2d2d',
              letterSpacing: '0.3px',
              marginBottom: '3px',
            }}
            title={prompt.name}
          >
            {prompt.name}
          </Text>
          <Text
            type="secondary"
            style={{
              fontSize: '12px',
              display: 'block',
              color: 'rgba(45, 45, 45, 0.45)',
              letterSpacing: '0.1px',
            }}
          >
            {prompt.modified_time}
          </Text>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', gap: '4px', alignItems: 'center' }}>
          <div
            style={ACTION_BUTTON_STYLES.base}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(prompt.name);
            }}
            onMouseEnter={(e) => handleActionHover(e, true)}
            onMouseLeave={(e) => handleActionHover(e, false)}
          >
            <Edit size={15} strokeWidth={1.5} />
          </div>
          <Popconfirm
            title={t('pages.promptManager.deleteConfirmTitle')}
            onConfirm={(e) => {
              e?.stopPropagation();
              onDelete(prompt.name);
            }}
            okText={t('pages.promptManager.deleteConfirmOk')}
            cancelText={t('pages.promptManager.deleteConfirmCancel')}
          >
            <div
              style={ACTION_BUTTON_STYLES.base}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={(e) => handleActionHover(e, true)}
              onMouseLeave={(e) => handleActionHover(e, false)}
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </div>
          </Popconfirm>
        </div>
      </div>
    </Card>
  );
};

export default PromptCard;
