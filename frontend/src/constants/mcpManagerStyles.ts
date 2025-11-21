// MCP管理器样式常量
export const MCP_COLORS = {
  primary: '#b85845',
  secondary: '#a0826d',
  tertiary: '#8b7355',
  text: '#2d2d2d',
  textSecondary: 'rgba(45, 45, 45, 0.65)',
  textLight: 'rgba(45, 45, 45, 0.85)',
  textPlaceholder: 'rgba(45, 45, 45, 0.35)',
  success: '#52c41a',
  warning: '#d4a574',
  background: '#faf8f5',
  white: '#fff',
  whiteAlpha85: 'rgba(255, 255, 255, 0.85)',
  whiteAlpha90: 'rgba(255, 255, 255, 0.9)',
  whiteAlpha95: 'rgba(255, 255, 255, 0.95)',
  whiteAlpha98: 'rgba(255, 255, 255, 0.98)',
  backgroundLight: 'rgba(250, 248, 245, 0.5)',
  backgroundCard: 'rgba(245, 243, 240, 0.6)',
  backgroundNote: 'rgba(250, 248, 245, 0.8)',
};

export const MCP_GRADIENTS = {
  primary: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
  header: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
  decorativeLine: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)',
};

export const MCP_SHADOWS = {
  card: '0 2px 8px rgba(139, 115, 85, 0.08)',
  button: '0 2px 6px rgba(184, 88, 69, 0.25)',
  buttonHover: '0 4px 12px rgba(184, 88, 69, 0.35)',
  buttonSmall: '0 1px 3px rgba(139, 115, 85, 0.08)',
  modal: '0 8px 24px rgba(139, 115, 85, 0.15)',
  input: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
  inputFocus: '0 0 0 3px rgba(184, 88, 69, 0.08), 0 1px 3px rgba(139, 115, 85, 0.08)',
  buttonInset: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  buttonInsetHover: 'inset 0 1px 0 rgba(255, 255, 255, 0.3)',
};

export const MCP_BORDERS = {
  light: '1px solid rgba(139, 115, 85, 0.1)',
  lightMedium: '1px solid rgba(139, 115, 85, 0.12)',
  normal: '1px solid rgba(139, 115, 85, 0.15)',
  medium: '1px solid rgba(139, 115, 85, 0.2)',
  strong: '1px solid rgba(139, 115, 85, 0.25)',
  primary: '1px solid #b85845',
  warning: '1px solid rgba(212, 165, 116, 0.3)',
};

/**
 * 获取标签样式
 */
export const getMCPTagStyle = (color: string, opacity: string = '0.08') => ({
  background: `${color}${opacity.replace('0.', '')}`,
  color: color,
  border: `1px solid ${color}40`,
  borderRadius: '6px',
  fontWeight: 500,
  padding: '4px 12px',
  fontSize: '12px',
});

/**
 * 获取主按钮样式
 */
export const getMCPPrimaryButtonStyle = () => ({
  flex: 1,
  background: MCP_GRADIENTS.primary,
  border: 'none',
  borderRadius: '6px',
  color: MCP_COLORS.white,
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: 500,
  letterSpacing: '0.3px',
  boxShadow: `${MCP_SHADOWS.button}, ${MCP_SHADOWS.buttonInset}`,
  transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  height: '36px',
});

/**
 * 获取次要按钮样式
 */
export const getMCPSecondaryButtonStyle = () => ({
  flex: 1,
  height: '36px',
  borderRadius: '6px',
  border: MCP_BORDERS.medium,
  background: MCP_COLORS.whiteAlpha85,
  color: MCP_COLORS.tertiary,
  fontSize: '14px',
  fontWeight: 500,
  letterSpacing: '0.3px',
  boxShadow: MCP_SHADOWS.buttonSmall,
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
});

/**
 * 获取边框按钮样式
 */
export const getMCPOutlineButtonStyle = () => ({
  flex: 1,
  height: '36px',
  borderRadius: '6px',
  border: MCP_BORDERS.primary,
  background: 'transparent',
  color: MCP_COLORS.primary,
  fontSize: '14px',
  fontWeight: 500,
  letterSpacing: '0.3px',
  boxShadow: '0 1px 3px rgba(184, 88, 69, 0.1)',
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
});

/**
 * 获取视图切换按钮样式
 */
export const getMCPViewSwitchButtonStyle = () => ({
  height: '36px',
  borderRadius: '6px',
  border: MCP_BORDERS.medium,
  background: MCP_COLORS.whiteAlpha85,
  color: MCP_COLORS.tertiary,
  fontSize: '14px',
  fontWeight: 500,
  letterSpacing: '0.3px',
  boxShadow: MCP_SHADOWS.buttonSmall,
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
});

/**
 * 获取输入框样式
 */
export const getMCPInputStyle = () => ({
  height: '40px',
  borderRadius: '6px',
  border: MCP_BORDERS.medium,
  background: MCP_COLORS.whiteAlpha85,
  boxShadow: MCP_SHADOWS.input,
  fontSize: '14px',
  color: MCP_COLORS.text,
  letterSpacing: '0.3px',
});

/**
 * 获取文本域样式
 */
export const getMCPTextAreaStyle = () => ({
  borderRadius: '6px',
  border: MCP_BORDERS.medium,
  background: MCP_COLORS.whiteAlpha85,
  boxShadow: MCP_SHADOWS.input,
  fontSize: '14px',
  color: MCP_COLORS.text,
  letterSpacing: '0.3px',
  resize: 'vertical' as const,
});

/**
 * 获取代码文本域样式
 */
export const getMCPCodeTextAreaStyle = () => ({
  ...getMCPTextAreaStyle(),
  fontFamily: 'Monaco, "Courier New", monospace',
  fontSize: '13px',
  letterSpacing: '0.2px',
});

/**
 * 获取标签样式
 */
export const getMCPLabelStyle = () => ({
  display: 'block',
  marginBottom: '8px',
  fontSize: '14px',
  fontWeight: 500,
  color: MCP_COLORS.text,
  letterSpacing: '0.3px',
});

/**
 * 获取空状态容器样式
 */
export const getMCPEmptyStateStyle = () => ({
  textAlign: 'center' as const,
  padding: '80px 20px',
  background: 'rgba(250, 248, 245, 0.6)',
  borderRadius: '8px',
  border: MCP_BORDERS.normal,
});
