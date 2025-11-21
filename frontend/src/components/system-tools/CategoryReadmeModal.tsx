// src/components/system-tools/CategoryReadmeModal.tsx
import React from 'react';
import { Modal, Typography } from 'antd';
import { BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CATEGORY_README_DATA } from '../../constants/systemToolsData';
import { COLORS } from '../../constants/systemToolsStyles';
import { useTranslation } from '../../i18n/hooks';

const { Text } = Typography;

interface CategoryReadmeModalProps {
  visible: boolean;
  category: string;
  onClose: () => void;
}

/**
 * 分类说明弹窗组件
 * 展示工具分类的详细说明文档
 */
const CategoryReadmeModal: React.FC<CategoryReadmeModalProps> = ({ visible, category, onClose }) => {
  const { t, locale } = useTranslation();

  /**
   * 获取分类 README 内容
   */
  const getCategoryReadme = (categoryName: string): string => {
    const data = CATEGORY_README_DATA[categoryName];
    if (!data) return '';
    return locale === 'zh' ? data.zh : data.en;
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={20} strokeWidth={1.5} style={{ color: COLORS.primary }} />
          <Text strong style={{ fontSize: '16px', color: COLORS.text }}>
            {t('pages.systemToolsManager.readmeModal.title', { category })}
          </Text>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
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
      <div style={{
        fontSize: '14px',
        lineHeight: '1.8',
        color: COLORS.text
      }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 style={{
                fontSize: '24px',
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: '16px',
                marginTop: '0'
              }}>
                {children}
              </h1>
            ),
            p: ({ children }) => (
              <p style={{
                marginBottom: '12px',
                lineHeight: '1.8'
              }}>
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong style={{
                fontWeight: 700,
                color: COLORS.primary
              }}>
                {children}
              </strong>
            ),
            code: ({ children }) => (
              <code style={{
                background: 'rgba(139, 115, 85, 0.08)',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '13px',
                fontFamily: 'Monaco, "Courier New", monospace',
                color: COLORS.secondary
              }}>
                {children}
              </code>
            )
          }}
        >
          {getCategoryReadme(category) || t('pages.systemToolsManager.readmeModal.noContent')}
        </ReactMarkdown>
      </div>
    </Modal>
  );
};

export default CategoryReadmeModal;
