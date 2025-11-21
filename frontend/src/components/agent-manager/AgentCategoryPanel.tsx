import React from 'react';
import { Collapse, Row, Col, Tag, Typography } from 'antd';
import { ChevronDown, Sparkles } from 'lucide-react';
import { AgentListItem } from '../../services/agentService';
import AgentCard from './AgentCard';
import { TAG_STYLES } from '../../constants/agentManagerStyles';

const { Panel } = Collapse;
const { Text } = Typography;

interface CategoryGroup {
  category: string;
  agents: AgentListItem[];
}

interface AgentCategoryPanelProps {
  groups: CategoryGroup[];
  onView: (agentName: string) => void;
  onEdit: (agentName: string) => void;
  onDelete: (agentName: string) => void;
}

/**
 * Agent 分类面板组件
 * 展示按分类分组的 Agent 列表
 */
const AgentCategoryPanel: React.FC<AgentCategoryPanelProps> = ({ groups, onView, onEdit, onDelete }) => {
  return (
    <Collapse
      defaultActiveKey={[]}
      expandIconPosition="end"
      style={{
        background: 'transparent',
        border: 'none'
      }}
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
    >
      {groups.map((group) => (
        <Panel
          key={group.category}
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
              <Sparkles size={18} color="#b85845" strokeWidth={1.5} />
              <Text strong style={{
                fontSize: '15px',
                color: '#2d2d2d',
                fontWeight: 500,
                letterSpacing: '0.5px',
                flex: 1
              }}>
                {group.category}
              </Text>
              <Tag style={{
                ...TAG_STYLES.secondary,
                margin: 0,
                padding: '2px 10px'
              }}>
                {group.agents.length}
              </Tag>
            </div>
          }
          style={{
            marginBottom: '16px',
            borderRadius: '8px',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            background: 'rgba(250, 248, 245, 0.6)',
            overflow: 'hidden'
          }}
        >
          <Row gutter={[16, 16]} style={{ marginTop: '12px' }}>
            {group.agents.map((agent) => (
              <Col key={agent.name} xs={24} sm={24} md={24} lg={12} xl={8}>
                <AgentCard
                  agent={agent}
                  onView={onView}
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

export default AgentCategoryPanel;
