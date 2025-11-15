// src/components/memory-manager/MemoryCard.tsx
import React from 'react';
import { Card, Space, Tag, Typography } from 'antd';
import { User, Bot, Edit, Upload, Download } from 'lucide-react';
import { MemoryMetadata } from '../../types/memory';
import { useT } from '../../i18n/hooks';

const { Text } = Typography;

interface MemoryCardProps {
  memory: MemoryMetadata;
  onEdit: (owner: { type: string; id: string }) => void;
  onExport: (owner: { type: string; id: string }) => void;
  onImport: (owner: { type: string; id: string }) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onEdit, onExport, onImport }) => {
  const t = useT();

  const handleEdit = () => {
    onEdit({ type: memory.owner_type, id: memory.owner_id });
  };

  const handleExport = () => {
    onExport({ type: memory.owner_type, id: memory.owner_id });
  };

  const handleImport = () => {
    onImport({ type: memory.owner_type, id: memory.owner_id });
  };

  return (
    <Card
      hoverable
      style={{
        borderRadius: '6px',
        border: '1px solid rgba(139, 115, 85, 0.15)',
        boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        background: 'rgba(255, 255, 255, 0.85)',
        transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
      }}
      styles={{
        body: { padding: '16px 20px' },
      }}
      onMouseEnter={(e) => {
        const card = e.currentTarget;
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 4px 12px rgba(184, 88, 69, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
        card.style.borderColor = 'rgba(184, 88, 69, 0.3)';
      }}
      onMouseLeave={(e) => {
        const card = e.currentTarget;
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 1px 3px rgba(139, 115, 85, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
        card.style.borderColor = 'rgba(139, 115, 85, 0.15)';
      }}
    >
      {/* Card Header - Owner Info */}
      <div style={{ marginBottom: '12px' }}>
        <Space size="small" align="center">
          {memory.owner_type === 'user' ? (
            <User size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />
          ) : (
            <Bot size={16} strokeWidth={1.5} style={{ color: '#8b7355' }} />
          )}
          <Text
            strong
            style={{
              fontSize: '14px',
              color: '#2d2d2d',
              fontWeight: 500,
            }}
          >
            {memory.owner_id}
          </Text>
          <Tag
            style={{
              background: 'rgba(139, 115, 85, 0.08)',
              color: '#8b7355',
              border: '1px solid rgba(139, 115, 85, 0.2)',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '11px',
              padding: '2px 8px',
              margin: 0,
            }}
          >
            {memory.owner_type === 'user' ? t('pages.memoryManager.user') : t('pages.memoryManager.agent')}
          </Tag>
        </Space>
      </div>

      {/* Statistics */}
      <div style={{ marginBottom: '16px' }}>
        <Space size="middle">
          <div>
            <Text
              style={{
                fontSize: '12px',
                color: 'rgba(45, 45, 45, 0.65)',
              }}
            >
              {t('pages.memoryManager.categories')}
            </Text>
            <Text
              strong
              style={{
                fontSize: '18px',
                color: '#b85845',
                marginLeft: '8px',
                fontWeight: 600,
              }}
            >
              {memory.categories_count}
            </Text>
          </div>
          <div>
            <Text
              style={{
                fontSize: '12px',
                color: 'rgba(45, 45, 45, 0.65)',
              }}
            >
              {t('pages.memoryManager.items')}
            </Text>
            <Text
              strong
              style={{
                fontSize: '18px',
                color: '#8b7355',
                marginLeft: '8px',
                fontWeight: 600,
              }}
            >
              {memory.total_items}
            </Text>
          </div>
        </Space>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <div
          onClick={handleEdit}
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
          title={t('pages.memoryManager.edit')}
        >
          <Edit size={15} strokeWidth={1.5} />
        </div>
        <div
          onClick={handleImport}
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
          title={t('pages.memoryManager.import')}
        >
          <Upload size={15} strokeWidth={1.5} />
        </div>
        <div
          onClick={handleExport}
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
          title={t('pages.memoryManager.export')}
        >
          <Download size={15} strokeWidth={1.5} />
        </div>
      </div>
    </Card>
  );
};

export default MemoryCard;
