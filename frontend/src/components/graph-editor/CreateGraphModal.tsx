// 创建图模态框组件
import React from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { Workflow } from 'lucide-react';
import { useT } from '../../i18n/hooks';
import { buttonStyles, inputStyles, modalStyles } from '../../utils/graphEditorConstants';

const { TextArea } = Input;

interface CreateGraphModalProps {
  visible: boolean;
  onOk: (values: { name: string; description?: string }) => Promise<void>;
  onCancel: () => void;
}

/**
 * 创建新图模态框
 */
const CreateGraphModal: React.FC<CreateGraphModalProps> = ({ visible, onOk, onCancel }) => {
  const t = useT();
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onOk(values);
      form.resetFields();
      onCancel();
    } catch (error) {
      // Form validation error or submission error
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Workflow size={20} strokeWidth={1.5} style={{ color: '#b85845' }} />
          <span style={{
            color: '#2d2d2d',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            {t('pages.graphEditor.createModalTitle')}
          </span>
        </div>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      footer={[
        <Button
          key="cancel"
          onClick={handleCancel}
          style={buttonStyles.modalCancel}
        >
          {t('common.cancel')}
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          style={buttonStyles.modalOk}
        >
          {t('common.confirm')}
        </Button>
      ]}
      styles={modalStyles}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.graphEditor.workflowName')}</span>}
          rules={[
            { required: true, message: t('pages.graphEditor.workflowNameRequired') },
            { pattern: /^[^./\\]+$/, message: t('pages.graphEditor.workflowNameInvalid') }
          ]}
          style={{ marginBottom: '16px' }}
        >
          <Input
            placeholder={t('pages.graphEditor.workflowNamePlaceholder')}
            style={inputStyles.standard}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={<span style={{ color: 'rgba(45, 45, 45, 0.85)', fontWeight: 500, fontSize: '14px' }}>{t('pages.graphEditor.description')}</span>}
          style={{ marginBottom: '0' }}
        >
          <TextArea
            rows={4}
            placeholder={t('pages.graphEditor.descriptionPlaceholder')}
            style={inputStyles.textarea}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateGraphModal;
