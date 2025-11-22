import React from 'react';
import { Modal, Input, Typography, InputNumber } from 'antd';
import { COLORS, getPrimaryButtonStyle, getSecondaryButtonStyle, getInputStyle, getInputFocusStyle, getInputBlurStyle, getModalStyles } from '../../constants/adminPanelStyles';

const { Text } = Typography;

interface CreateInviteCodeModalProps {
  visible: boolean;
  description: string;
  maxUses: number | null;
  onDescriptionChange: (value: string) => void;
  onMaxUsesChange: (value: number | null) => void;
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
  maxUses,
  onDescriptionChange,
  onMaxUsesChange,
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 描述输入框 */}
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

        {/* 使用次数限制 */}
        <div>
          <Text style={{
            display: 'block',
            marginBottom: '10px',
            color: COLORS.textLight,
            fontWeight: 500,
            fontSize: '13px',
            letterSpacing: '0.3px'
          }}>
            {t('pages.adminPanel.inviteCodes.maxUses')}
          </Text>
          <InputNumber
            placeholder={t('pages.adminPanel.inviteCodes.maxUsesPlaceholder')}
            value={maxUses}
            onChange={onMaxUsesChange}
            min={1}
            style={{
              ...getInputStyle(),
              width: '100%'
            }}
            onFocus={(e) => {
              Object.assign(e.target.parentElement!.style, getInputFocusStyle());
            }}
            onBlur={(e) => {
              Object.assign(e.target.parentElement!.style, getInputBlurStyle());
            }}
          />
          <Text style={{
            display: 'block',
            marginTop: '8px',
            color: COLORS.textSecondary,
            fontSize: '12px'
          }}>
            {t('pages.adminPanel.inviteCodes.maxUsesHint')}
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default CreateInviteCodeModal;
