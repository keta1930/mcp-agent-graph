import React, { useEffect } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { Edit } from 'lucide-react';
import { PromptDetail, PromptUpdate } from '../../types/prompt';
import PromptEditor from './PromptEditor';
import { useT } from '../../i18n/hooks';
import { BUTTON_STYLES, MODAL_STYLES } from '../../constants/promptManagerStyles';

interface EditPromptModalProps {
  open: boolean;
  loading: boolean;
  prompt: PromptDetail | null;
  content: string;
  onContentChange: (value: string) => void;
  onSubmit: (values: PromptUpdate) => void;
  onCancel: () => void;
}

/**
 * 编辑 Prompt 模态框组件
 */
const EditPromptModal: React.FC<EditPromptModalProps> = ({
  open,
  loading,
  prompt,
  content,
  onContentChange,
  onSubmit,
  onCancel,
}) => {
  const t = useT();
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && prompt) {
      form.setFieldsValue({
        category: prompt.category || '',
        content: prompt.content,
      });
    }
  }, [open, prompt, form]);

  const handleCancel = () => {
    if (!loading) {
      form.resetFields();
      onCancel();
    }
  };

  const handleSubmit = (values: PromptUpdate) => {
    onSubmit(values);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Edit size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
          {t('pages.promptManager.editModal.title')}
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
          <Form.Item label={t('pages.promptManager.editModal.name')} style={{ marginBottom: '16px' }}>
            <Input value={prompt?.name} disabled style={{ color: 'rgba(0, 0, 0, 0.65)' }} />
          </Form.Item>

          <Form.Item
            label={t('pages.promptManager.editModal.category')}
            name="category"
            rules={[
              { pattern: /^[a-zA-Z0-9_-]*$/, message: t('pages.promptManager.editModal.categoryPattern') },
            ]}
          >
            <Input
              placeholder={t('pages.promptManager.editModal.categoryPlaceholder')}
              disabled={loading}
            />
          </Form.Item>
        </div>

        <div style={MODAL_STYLES.contentArea}>
          <div style={{ marginBottom: '8px', color: 'rgba(0, 0, 0, 0.85)', fontSize: '14px' }}>
            {t('pages.promptManager.editModal.content')}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <PromptEditor
              content={content}
              onChange={(value) => {
                onContentChange(value);
                form.setFieldsValue({ content: value });
              }}
              readOnly={loading}
              placeholder={t('pages.promptManager.editModal.contentPlaceholder')}
            />
          </div>
          <Form.Item
            name="content"
            rules={[{ required: true, message: t('pages.promptManager.editModal.contentRequired') }]}
            style={{ display: 'none' }}
          >
            <Input />
          </Form.Item>
        </div>

        <div style={MODAL_STYLES.footer}>
          <Button onClick={handleCancel} disabled={loading}>
            {t('pages.promptManager.editModal.cancel')}
          </Button>
          <Button type="primary" htmlType="submit" loading={loading} style={BUTTON_STYLES.primary}>
            {t('pages.promptManager.editModal.save')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default EditPromptModal;
