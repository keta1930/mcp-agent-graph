// 管理面板样式常量
export const COLORS = {
  primary: '#b85845',
  secondary: '#a0826d',
  tertiary: '#8b7355',
  text: '#2d2d2d',
  textSecondary: 'rgba(45, 45, 45, 0.65)',
  textLight: 'rgba(45, 45, 45, 0.85)',
  success: '#52c41a',
  background: '#faf8f5',
  white: '#fff',
  whiteAlpha85: 'rgba(255, 255, 255, 0.85)',
  whiteAlpha90: 'rgba(255, 255, 255, 0.9)',
  whiteAlpha95: 'rgba(255, 255, 255, 0.95)',
  whiteAlpha98: 'rgba(255, 255, 255, 0.98)',
  backgroundLight: 'rgba(250, 248, 245, 0.5)',
  backgroundCard: 'rgba(245, 243, 240, 0.6)',
};

export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
  header: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
  decorativeLine: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)',
};

export const SHADOWS = {
  card: '0 2px 8px rgba(139, 115, 85, 0.08)',
  button: '0 2px 6px rgba(184, 88, 69, 0.25)',
  buttonSmall: '0 1px 3px rgba(139, 115, 85, 0.08)',
  modal: '0 8px 24px rgba(139, 115, 85, 0.15)',
  input: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
  inputFocus: '0 0 0 3px rgba(184, 88, 69, 0.08), 0 1px 3px rgba(139, 115, 85, 0.08)',
};

export const BORDERS = {
  light: '1px solid rgba(139, 115, 85, 0.1)',
  normal: '1px solid rgba(139, 115, 85, 0.15)',
  medium: '1px solid rgba(139, 115, 85, 0.2)',
  strong: '1px solid rgba(139, 115, 85, 0.25)',
};

/**
 * 获取标签样式
 */
export const getTagStyle = (color: string) => ({
  background: `${color}15`,
  color: color,
  border: `1px solid ${color}40`,
  borderRadius: '6px',
  fontWeight: 500,
  padding: '4px 12px',
});

/**
 * 获取状态标签样式
 */
export const getStatusTagStyle = (isActive: boolean) => ({
  background: isActive ? 'rgba(82, 196, 26, 0.08)' : 'rgba(139, 115, 85, 0.08)',
  color: isActive ? COLORS.success : COLORS.tertiary,
  border: `1px solid ${isActive ? 'rgba(82, 196, 26, 0.25)' : 'rgba(139, 115, 85, 0.25)'}`,
  borderRadius: '6px',
  fontWeight: 500,
  padding: '4px 12px',
});

/**
 * 获取主按钮样式
 */
export const getPrimaryButtonStyle = (size: 'small' | 'default' = 'default') => ({
  background: GRADIENTS.primary,
  border: 'none',
  color: COLORS.white,
  borderRadius: '6px',
  fontSize: size === 'small' ? '12px' : '14px',
  fontWeight: 500,
  boxShadow: SHADOWS.button,
  height: size === 'small' ? '28px' : '36px',
  padding: size === 'small' ? '0 12px' : '0 20px',
});

/**
 * 获取次要按钮样式
 */
export const getSecondaryButtonStyle = (size: 'small' | 'default' = 'default') => ({
  borderRadius: '6px',
  height: size === 'small' ? '28px' : '36px',
  padding: size === 'small' ? '0 12px' : '0 20px',
  border: BORDERS.medium,
  background: COLORS.whiteAlpha85,
  color: COLORS.tertiary,
  fontSize: size === 'small' ? '12px' : '14px',
  fontWeight: 500,
  boxShadow: SHADOWS.buttonSmall,
  transition: 'all 0.3s ease',
});

/**
 * 获取输入框样式
 */
export const getInputStyle = () => ({
  height: '40px',
  borderRadius: '6px',
  border: BORDERS.medium,
  background: COLORS.whiteAlpha90,
  boxShadow: SHADOWS.input,
  fontSize: '14px',
  color: COLORS.text,
  letterSpacing: '0.3px',
  transition: 'all 0.3s ease',
});

/**
 * 获取输入框焦点样式
 */
export const getInputFocusStyle = () => ({
  borderColor: COLORS.primary,
  boxShadow: SHADOWS.inputFocus,
  background: COLORS.whiteAlpha98,
});

/**
 * 获取输入框失焦样式
 */
export const getInputBlurStyle = () => ({
  borderColor: 'rgba(139, 115, 85, 0.2)',
  boxShadow: SHADOWS.input,
  background: COLORS.whiteAlpha90,
});

/**
 * 获取用户头像样式
 */
export const getUserAvatarStyle = () => ({
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: GRADIENTS.primary,
  color: COLORS.white,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: 500,
  boxShadow: SHADOWS.button,
});

/**
 * 获取代码块样式
 */
export const getCodeStyle = () => ({
  background: 'rgba(139, 115, 85, 0.08)',
  color: COLORS.primary,
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500,
  border: BORDERS.medium,
  fontFamily: 'monospace',
});

/**
 * 获取Modal样式配置
 */
export const getModalStyles = () => ({
  mask: {
    backdropFilter: 'blur(8px)',
    background: 'rgba(139, 115, 85, 0.15)',
  },
  content: {
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: SHADOWS.modal,
    border: BORDERS.light,
  },
  header: {
    borderBottom: BORDERS.light,
    padding: '18px 24px',
    marginBottom: 0,
  },
  body: {
    background: COLORS.whiteAlpha98,
    padding: '24px',
  },
  footer: {
    padding: '14px 20px',
    marginTop: 0,
  },
});

/**
 * 获取确认Modal样式配置
 */
export const getConfirmModalStyles = () => ({
  mask: {
    backdropFilter: 'blur(8px)',
    background: 'rgba(139, 115, 85, 0.15)',
  },
});
