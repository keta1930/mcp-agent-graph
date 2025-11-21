// src/components/system-tools/CategorySection.tsx
import React from 'react';
import { Row, Col, Tag, Tooltip, Typography } from 'antd';
import { ChevronRight, BookOpen } from 'lucide-react';

const { Text } = Typography;
import { ToolCategory } from '../../services/systemToolsService';
import ToolCard from './ToolCard';
import { TAG_STYLES, COLORS, BUTTON_STYLES } from '../../constants/systemToolsStyles';
import { useTranslation } from '../../i18n/hooks';

interface CategorySectionProps {
  category: ToolCategory;
  isCollapsed: boolean;
  onToggleCollapse: (category: string) => void;
  onViewReadme: (category: string) => void;
  onViewToolDetail: (toolName: string) => void;
}

/**
 * 分类区域组件
 * 展示单个工具分类及其下的所有工具
 */
const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  isCollapsed,
  onToggleCollapse,
  onViewReadme,
  onViewToolDetail
}) => {
  const { t } = useTranslation();

  return (
    <div style={{ marginBottom: '40px' }}>
      {/* 类别标题 */}
      <div style={{
        fontSize: '16px',
        fontWeight: 500,
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: COLORS.text,
        letterSpacing: '0.5px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Tag style={TAG_STYLES.primary}>
            {category.category}
          </Tag>
          <Text style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
            {t('pages.systemToolsManager.categoryLabel', { count: category.tool_count })}
          </Text>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 说明按钮 */}
          <Tooltip title={t('pages.systemToolsManager.viewCategoryReadme')}>
            <div
              onClick={() => onViewReadme(category.category)}
              style={BUTTON_STYLES.icon}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, BUTTON_STYLES.iconHover);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, BUTTON_STYLES.icon);
              }}
            >
              <BookOpen size={18} strokeWidth={1.5} />
            </div>
          </Tooltip>

          {/* 折叠按钮 */}
          <div
            onClick={() => onToggleCollapse(category.category)}
            style={BUTTON_STYLES.icon}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, BUTTON_STYLES.iconHover);
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, BUTTON_STYLES.icon);
            }}
          >
            <ChevronRight 
              size={20} 
              strokeWidth={2}
              style={{
                transform: isCollapsed ? 'rotate(180deg)' : 'rotate(90deg)',
                transition: 'transform 0.3s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* 该类别下的工具卡片 */}
      {!isCollapsed && (
        <Row gutter={[16, 16]}>
          {category.tools.map((tool) => (
            <Col xs={24} sm={12} md={12} lg={8} xl={6} key={tool.name}>
              <ToolCard tool={tool} onViewDetail={onViewToolDetail} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default CategorySection;
