// src/components/system-tools/ToolCard.tsx
import React from 'react';
import { Card, Tooltip, Typography } from 'antd';
import { Wrench, Eye } from 'lucide-react';
import { SystemToolSchema } from '../../services/systemToolsService';
import { CARD_STYLES, BUTTON_STYLES, COLORS } from '../../constants/systemToolsStyles';
import { useTranslation } from '../../i18n/hooks';

const { Text } = Typography;

interface ToolCardProps {
  tool: SystemToolSchema;
  onViewDetail: (toolName: string) => void;
}

/**
 * 工具卡片组件
 * 展示单个系统工具的基本信息
 */
const ToolCard: React.FC<ToolCardProps> = ({ tool, onViewDetail }) => {
  const { t } = useTranslation();

  return (
    <Card
      hoverable
      style={CARD_STYLES.base}
      styles={{
        body: { 
          padding: '16px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }
      }}
      onMouseEnter={(e) => {
        Object.assign(e.currentTarget.style, CARD_STYLES.hover);
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, CARD_STYLES.base);
      }}
    >
      {/* 工具名称 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <Wrench size={16} strokeWidth={1.5} style={{ color: COLORS.primary, flexShrink: 0 }} />
        <Tooltip title={tool.name}>
          <Text strong style={{
            fontSize: '14px',
            color: COLORS.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}>
            {tool.name}
          </Text>
        </Tooltip>
      </div>

      {/* 工具描述 */}
      <Text style={{
        fontSize: '13px',
        color: COLORS.textSecondary,
        lineHeight: '1.6',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        marginBottom: '12px'
      }}>
        {tool.schema.function.description}
      </Text>

      {/* 查看详情按钮 */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        paddingTop: '8px',
        borderTop: `1px solid ${COLORS.borderLight}`
      }}>
        <Tooltip title={t('pages.systemToolsManager.viewDetail')}>
          <div
            style={BUTTON_STYLES.icon}
            onClick={() => onViewDetail(tool.name)}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, BUTTON_STYLES.iconHover);
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, BUTTON_STYLES.icon);
            }}
          >
            <Eye size={16} strokeWidth={1.5} />
          </div>
        </Tooltip>
      </div>
    </Card>
  );
};

export default ToolCard;
