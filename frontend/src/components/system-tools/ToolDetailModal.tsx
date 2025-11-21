// src/components/system-tools/ToolDetailModal.tsx
import React from 'react';
import { Modal, Descriptions, Tag, Typography } from 'antd';
import { Wrench } from 'lucide-react';
import { SystemToolSchema } from '../../services/systemToolsService';
import { TAG_STYLES, COLORS } from '../../constants/systemToolsStyles';
import { useTranslation } from '../../i18n/hooks';

const { Text } = Typography;

interface ToolDetailModalProps {
  visible: boolean;
  tool: SystemToolSchema | null;
  onClose: () => void;
}

/**
 * 工具详情弹窗组件
 * 展示系统工具的完整信息和参数
 */
const ToolDetailModal: React.FC<ToolDetailModalProps> = ({ visible, tool, onClose }) => {
  const { t } = useTranslation();

  /**
   * 渲染参数信息
   */
  const renderParameters = (parameters: any) => {
    if (!parameters || !parameters.properties) {
      return (
        <Text style={{ color: COLORS.textLight, fontStyle: 'italic' }}>
          {t('pages.systemToolsManager.detailModal.noParameters')}
        </Text>
      );
    }

    const props = parameters.properties;
    const required = parameters.required || [];

    return (
      <div>
        {Object.entries(props).map(([key, value]: [string, any]) => (
          <div key={key} style={{
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: `1px solid ${COLORS.borderLight}`
          }}>
            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag style={{
                background: required.includes(key) ? 'rgba(184, 88, 69, 0.08)' : 'rgba(139, 115, 85, 0.08)',
                color: required.includes(key) ? COLORS.primary : COLORS.secondary,
                border: `1px solid ${required.includes(key) ? COLORS.borderPrimary : 'rgba(139, 115, 85, 0.2)'}`,
                borderRadius: '4px',
                fontWeight: 500,
                fontSize: '12px',
                padding: '2px 8px'
              }}>
                {key}
              </Tag>
              {required.includes(key) && (
                <Tag style={TAG_STYLES.required}>
                  {t('pages.systemToolsManager.detailModal.required')}
                </Tag>
              )}
              <Tag style={TAG_STYLES.tertiary}>
                {value.type}
              </Tag>
            </div>
            <Text style={{
              fontSize: '13px',
              color: COLORS.textSecondary,
              lineHeight: '1.6'
            }}>
              {value.description || t('pages.systemToolsManager.detailModal.noDescription')}
            </Text>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Wrench size={20} strokeWidth={1.5} style={{ color: COLORS.primary }} />
          <Text strong style={{ fontSize: '16px', color: COLORS.text }}>
            {t('pages.systemToolsManager.detailModal.title', { name: tool?.name || '' })}
          </Text>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      styles={{
        body: { 
          padding: '24px',
          maxHeight: '70vh',
          overflowY: 'auto'
        }
      }}
      style={{
        top: 40
      }}
    >
      {tool && (
        <div>
          <Descriptions 
            bordered 
            column={1}
            labelStyle={{
              background: 'rgba(245, 243, 240, 0.6)',
              color: COLORS.secondary,
              fontWeight: 500,
              fontSize: '13px',
              width: '120px'
            }}
            contentStyle={{
              background: COLORS.white,
              color: COLORS.text,
              fontSize: '13px'
            }}
          >
            <Descriptions.Item label={t('pages.systemToolsManager.detailModal.toolName')}>
              <code style={{
                fontSize: '13px',
                background: 'rgba(139, 115, 85, 0.08)',
                padding: '2px 8px',
                borderRadius: '4px',
                color: COLORS.primary
              }}>
                {tool.schema.function.name}
              </code>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.systemToolsManager.detailModal.description')}>
              <Text style={{ color: 'rgba(45, 45, 45, 0.85)' }}>
                {tool.schema.function.description}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('pages.systemToolsManager.detailModal.parameters')}>
              {renderParameters(tool.schema.function.parameters)}
            </Descriptions.Item>
          </Descriptions>

          {/* JSON Schema */}
          <div style={{ marginTop: '24px' }}>
            <Text strong style={{
              fontSize: '14px',
              color: COLORS.text,
              display: 'block',
              marginBottom: '12px'
            }}>
              {t('pages.systemToolsManager.detailModal.fullSchema')}
            </Text>
            <pre
              className="custom-scrollbar"
              style={{
                background: COLORS.background,
                padding: '16px',
                borderRadius: '6px',
                border: `1px solid ${COLORS.border}`,
                overflow: 'auto',
                fontSize: '12px',
                color: COLORS.text,
                lineHeight: '1.6',
                margin: 0
              }}
            >
              {JSON.stringify(tool.schema, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ToolDetailModal;
