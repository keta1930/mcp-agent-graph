import React from 'react';
import { Collapse, Row, Col, Tag, Typography } from 'antd';
import { ChevronDown, BookOpen } from 'lucide-react';
import { PromptInfo } from '../../types/prompt';
import PromptCard from './PromptCard';
import { TAG_STYLES, COLLAPSE_STYLES } from '../../constants/promptManagerStyles';

const { Panel } = Collapse;
const { Text } = Typography;

interface PromptGroup {
  category: string;
  prompts: PromptInfo[];
}

interface PromptCategoryPanelProps {
  groups: PromptGroup[];
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
}

/**
 * Prompt 分类面板组件
 * 展示按分类分组的 Prompt 列表
 */
const PromptCategoryPanel: React.FC<PromptCategoryPanelProps> = ({ groups, onEdit, onDelete }) => {
  return (
    <Collapse
      defaultActiveKey={[]}
      expandIconPosition="end"
      expandIcon={({ isActive }) => (
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          style={{
            color: '#8b7355',
            transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        />
      )}
      style={{
        background: 'transparent',
        border: 'none',
      }}
    >
      {groups.map((group) => (
        <Panel
          key={group.category}
          header={
            <div style={COLLAPSE_STYLES.header}>
              <BookOpen size={18} color="#b85845" strokeWidth={1.5} />
              <Text strong style={COLLAPSE_STYLES.headerText}>
                {group.category}
              </Text>
              <Tag style={{ ...TAG_STYLES.secondary, margin: 0 }}>
                {group.prompts.length}
              </Tag>
            </div>
          }
          style={COLLAPSE_STYLES.panel}
        >
          <Row gutter={[12, 12]} style={{ marginTop: '8px' }}>
            {group.prompts.map((prompt) => (
              <Col key={prompt.name} xs={24} sm={12} md={12} lg={8} xl={6}>
                <PromptCard
                  prompt={prompt}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </Col>
            ))}
          </Row>
        </Panel>
      ))}
    </Collapse>
  );
};

export default PromptCategoryPanel;
