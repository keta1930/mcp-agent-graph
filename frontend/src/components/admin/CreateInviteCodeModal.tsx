import React from 'react';
import { Modal, Input, Typography } from 'antd';
import { COLORS, getPrimaryButtonStyle, getSecondaryButtonStyle, getInputStyle, getInputFocusStyle, getInputBlurStyle, getModalStyles } from '../../constants/adminPanelStyles';

const { Text } = Typography;

interface CreateInviteCodeModalProps {
  visible: boolean;
  description: string;
  onDescriptionChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  t: (key: string, params?: any) => string;
}

/**
 * 创建邀请码弹窗组件
 */
const CreateInviteCodeModal: React.FC<CreateInviteCodeModalProps> = ({
  visible,
  description,
  onDescriptionChange,
  onConfirm,
  onCancel,
  t,
}) => {
  const modalStyles = getModalStyles();

  return (
    <Modal
      title={
        <span style={{
          color: COLORS.text,
          fontSize: '16px',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}>
          {t('pages.adminPanel.inviteCodes.createCodeTitle')}
        </span>
      }
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      okText={t('pages.adminPanel.inviteCodes.generate')}
      cancelText={t('common.cancel')}
      centered
      width={480}
      styles={modalStyles}
      okButtonProps={{
        style: {
          ...getPrimaryButtonStyle(),
          letterSpacing: '0.3px'
        }
      }}
      cancelButtonProps={{
        style: {
          ...getSecondaryButtonStyle(),
          letterSpacing: '0.3px'
        }
      }}
    >
      <div>
        <Text style={{
          display: 'block',
          marginBottom: '10px',
          color: COLORS.textLight,
          fontWeight: 500,
          fontSize: '13px',
          letterSpacing: '0.3px'
        }}>
          {t('pages.adminPanel.inviteCodes.codeDescription')}
        </Text>
        <Input
          placeholder={t('pages.adminPanel.inviteCodes.codeDescriptionPlaceholder')}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          style={getInputStyle()}
          onFocus={(e) => {
            Object.assign(e.target.style, getInputFocusStyle());
          }}
          onBlur={(e) => {
            Object.assign(e.target.style, getInputBlurStyle());
          }}
        />
      </div>
    </Modal>
  );
};

export default CreateInviteCodeModal;
