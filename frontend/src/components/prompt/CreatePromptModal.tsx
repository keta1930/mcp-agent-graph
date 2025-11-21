import React from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { FileText } from 'lucide-react';
import { PromptCreate } from '../../types/prompt';
import PromptEditor from './PromptEditor';
import { useT } from '../../i18n/hooks';
import { BUTTON_STYLES, MODAL_STYLES } from '../../constants/promptManagerStyles';

interface CreatePromptModalProps {
  open: boolean;
  loading: boolean;
  content: string;
  onContentChange: (value: string) => void;
  onSubmit: (values: PromptCreate) => void;
  onCancel: () => void;
}

/**
 * 创建 Prompt 模态框组件
 */
const CreatePromptModal: React.FC<CreatePromptModalProps> = ({
  open,
  loading,
  content,
  onContentChange,
  onSubmit,
  onCancel,
}) => {
  const t = useT();
  const [form] = Form.useForm();

  const handleCancel = () => {
    if (!loading) {
      form.resetFields();
      onCancel();
    }
  };

  const handleSubmit = (values: PromptCreate) => {
    onSubmit(values);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
          {t('pages.promptManager.createModal.title')}
        </div>
      }
      open={open}
      onCancel={handleCancel}
      width="min(90vw, 800px)"
      style={MODAL_STYLES.wrapper}
      styles={{ body: MODAL_STYLES.body }}
      footer={null}
      destroyOnClose
      maskClosable={!loading}
    >
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        style={MODAL_STYLES.form}
      >
        <div style={MODAL_STYLES.basicInfo}>
          <Form.Item
            label={t('pages.promptManager.createModal.name')}
            name="name"
            rules={[
              { required: true, message: t('pages.promptManager.createModal.nameRequired') },
              { max: 100, message: t('pages.promptManager.createModal.nameMaxLength') },
            ]}
          >
            <Input
              placeholder={t('pages.promptManager.createModal.namePlaceholder')}
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            label={t('pages.promptManager.createModal.category')}
            name="category"
            rules={[
              { required: true, message: t('pages.promptManager.createModal.categoryRequired') },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: t('pages.promptManager.createModal.categoryPattern') },
            ]}
          >
            <Input
              placeholder={t('pages.promptManager.createModal.categoryPlaceholder')}
              disabled={loading}
            />
          </Form.Item>
        </div>

        <div style={MODAL_STYLES.contentArea}>
          <div style={{ marginBottom: '8px', color: 'rgba(0, 0, 0, 0.85)', fontSize: '14px' }}>
            {t('pages.promptManager.createModal.content')}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <PromptEditor
              content={content}
              onChange={(value) => {
                onContentChange(value);
                form.setFieldsValue({ content: value });
              }}
              readOnly={loading}
              placeholder={t('pages.promptManager.createModal.contentPlaceholder')}
            />
          </div>
          <Form.Item
            name="content"
            rules={[{ required: true, message: t('pages.promptManager.createModal.contentRequired') }]}
            style={{ display: 'none' }}
          >
            <Input />
          </Form.Item>
        </div>

        <div style={MODAL_STYLES.footer}>
          <Button onClick={handleCancel} disabled={loading}>
            {t('pages.promptManager.createModal.cancel')}
          </Button>
          <Button type="primary" htmlType="submit" loading={loading} style={BUTTON_STYLES.primary}>
            {t('pages.promptManager.createModal.create')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreatePromptModal;
