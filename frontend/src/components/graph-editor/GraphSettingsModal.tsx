// 图设置模态框组件
import React, { useEffect } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { useT } from '../../i18n/hooks';
import { buttonStyles, inputStyles } from '../../utils/graphEditorConstants';

const { TextArea } = Input;

interface GraphSettingsModalProps {
  visible: boolean;
  graphName?: string;
  description?: string;
  endTemplate?: string;
  onOk: (values: { name: string; description?: string; end_template?: string }) => Promise<void>;
  onCancel: () => void;
}

/**
 * 图设置模态框
 */
const GraphSettingsModal: React.FC<GraphSettingsModalProps> = ({
  visible,
  graphName,
  description,
  endTemplate,
  onOk,
  onCancel
}) => {
  const t = useT();
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && graphName) {
      form.setFieldsValue({
        name: graphName,
        description: description || '',
        end_template: endTemplate || ''
      });
    }
  }, [visible, graphName, description, endTemplate, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onOk(values);
      onCancel();
    } catch (error) {
      // Form validation error or submission error
    }
  };

  return (
    <Modal
      title={t('pages.graphEditor.graphSettingsTitle')}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      footer={[
        <Button
          key="cancel"
          onClick={onCancel}
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
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={t('pages.graphEditor.graphName')}
          rules={[
            { required: true, message: t('pages.graphEditor.workflowNameRequired') },
            { pattern: /^[^./\\]+$/, message: t('pages.graphEditor.workflowNameInvalid') }
          ]}
        >
          <Input disabled style={{
            ...inputStyles.standard,
            background: 'rgba(139, 115, 85, 0.05)',
            cursor: 'not-allowed'
          }} />
        </Form.Item>

        <Form.Item
          name="description"
          label={t('pages.graphEditor.description')}
        >
          <TextArea rows={3} style={{
            ...inputStyles.textarea
          }} />
        </Form.Item>

        <Form.Item
          name="end_template"
          label={t('pages.graphEditor.endTemplate')}
          tooltip={t('pages.graphEditor.endTemplateTooltip')}
        >
          <TextArea rows={4} style={{
            ...inputStyles.textarea,
            fontFamily: 'monospace'
          }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default GraphSettingsModal;
