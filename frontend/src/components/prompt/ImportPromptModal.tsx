import React from 'react';
import { Modal, Form, Input, Button, Upload, Space } from 'antd';
import { Upload as UploadIcon } from 'lucide-react';
import { useT } from '../../i18n/hooks';
import { BUTTON_STYLES } from '../../constants/promptManagerStyles';

interface ImportPromptModalProps {
  open: boolean;
  loading: boolean;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

/**
 * 导入 Prompt 模态框组件
 */
const ImportPromptModal: React.FC<ImportPromptModalProps> = ({
  open,
  loading,
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

  const handleSubmit = (values: any) => {
    onSubmit(values);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UploadIcon size={18} strokeWidth={1.5} style={{ color: '#8b7355' }} />
          {t('pages.promptManager.importModal.title')}
        </div>
      }
      open={open}
      onCancel={handleCancel}
      width="min(90vw, 600px)"
      style={{ maxHeight: '80vh', top: '10vh' }}
      styles={{ body: { maxHeight: 'calc(70vh - 120px)', overflow: 'auto' } }}
      footer={null}
      destroyOnClose
      maskClosable={!loading}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ padding: '8px 0' }}
      >
        <Form.Item
          label={t('pages.promptManager.importModal.selectFile')}
          name="file"
          valuePropName="fileList"
          getValueFromEvent={(e) => e?.fileList}
          rules={[{ required: true, message: t('pages.promptManager.importModal.selectFileRequired') }]}
        >
          <Upload beforeUpload={() => false} accept=".md,.txt" maxCount={1} disabled={loading}>
            <Button icon={<UploadIcon size={16} strokeWidth={1.5} />} disabled={loading}>
              {t('pages.promptManager.importModal.selectButton')}
            </Button>
          </Upload>
        </Form.Item>

        <Form.Item
          label={t('pages.promptManager.importModal.name')}
          name="name"
          rules={[
            { required: true, message: t('pages.promptManager.importModal.nameRequired') },
            { max: 100, message: t('pages.promptManager.importModal.nameMaxLength') },
          ]}
        >
          <Input
            placeholder={t('pages.promptManager.importModal.namePlaceholder')}
            disabled={loading}
          />
        </Form.Item>

        <Form.Item
          label={t('pages.promptManager.importModal.category')}
          name="category"
          rules={[
            { required: true, message: t('pages.promptManager.importModal.categoryRequired') },
            { pattern: /^[a-zA-Z0-9_-]+$/, message: t('pages.promptManager.importModal.categoryPattern') },
          ]}
        >
          <Input
            placeholder={t('pages.promptManager.importModal.categoryPlaceholder')}
            disabled={loading}
          />
        </Form.Item>

        <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: '24px' }}>
          <Space>
            <Button onClick={handleCancel} disabled={loading}>
              {t('pages.promptManager.importModal.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} style={BUTTON_STYLES.primary}>
              {t('pages.promptManager.importModal.import')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ImportPromptModal;
