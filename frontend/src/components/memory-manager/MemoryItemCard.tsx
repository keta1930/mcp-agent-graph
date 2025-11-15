// src/components/memory-manager/MemoryItemCard.tsx
import React from 'react';
import { Card, Typography, Space } from 'antd';
import { Edit, Trash2 } from 'lucide-react';
import { MemoryItem } from '../../types/memory';

const { Text } = Typography;

interface MemoryItemCardProps {
  item: MemoryItem;
  onEdit: () => void;
  onDelete: () => void;
}

const MemoryItemCard: React.FC<MemoryItemCardProps> = ({ item, onEdit, onDelete }) => {

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <Card
      style={{
        marginBottom: '8px',
        borderRadius: '6px',
        border: '1px solid rgba(139, 115, 85, 0.15)',
        boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
        background: 'rgba(255, 255, 255, 0.85)',
        transition: 'all 0.2s ease',
      }}
      styles={{
        body: { padding: '12px 16px' },
      }}
      onMouseEnter={(e) => {
        const card = e.currentTarget;
        card.style.borderColor = 'rgba(139, 115, 85, 0.25)';
        card.style.boxShadow = '0 2px 6px rgba(139, 115, 85, 0.08)';
      }}
      onMouseLeave={(e) => {
        const card = e.currentTarget;
        card.style.borderColor = 'rgba(139, 115, 85, 0.15)';
        card.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, marginRight: '12px' }}>
          <Text
            style={{
              fontSize: '14px',
              color: '#2d2d2d',
              lineHeight: '1.6',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            {item.content}
          </Text>
          <Text
            style={{
              fontSize: '12px',
              color: 'rgba(45, 45, 45, 0.65)',
            }}
          >
            {formatDate(item.updated_at)}
          </Text>
        </div>
        <Space size={4}>
          <div
            onClick={onEdit}
            style={{
              padding: '4px',
              borderRadius: '4px',
              color: '#8b7355',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#b85845';
              e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8b7355';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Edit size={14} strokeWidth={1.5} />
          </div>
          <div
            onClick={onDelete}
            style={{
              padding: '4px',
              borderRadius: '4px',
              color: '#8b7355',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#b85845';
              e.currentTarget.style.background = 'rgba(184, 88, 69, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8b7355';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </div>
        </Space>
      </div>
    </Card>
  );
};

export default MemoryItemCard;
