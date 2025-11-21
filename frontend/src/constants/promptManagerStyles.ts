/**
 * Prompt Manager 样式常量
 * 统一管理所有样式配置，提升可维护性
 */

export const COLORS = {
  primary: '#b85845',
  primaryLight: 'rgba(184, 88, 69, 0.08)',
  primaryBorder: 'rgba(184, 88, 69, 0.25)',
  secondary: '#8b7355',
  secondaryLight: 'rgba(139, 115, 85, 0.08)',
  secondaryBorder: 'rgba(139, 115, 85, 0.2)',
  text: '#2d2d2d',
  textLight: 'rgba(45, 45, 45, 0.85)',
  textMuted: 'rgba(45, 45, 45, 0.45)',
  background: '#faf8f5',
  backgroundLight: 'rgba(250, 248, 245, 0.6)',
  white: '#fff',
  whiteTransparent: 'rgba(255, 255, 255, 0.85)',
} as const;

export const HEADER_STYLES = {
  container: {
    background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(245, 243, 240, 0.6))',
    backdropFilter: 'blur(20px)',
    padding: '0 48px',
    borderBottom: 'none',
    boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
    position: 'relative' as const,
  },
  decorativeLine: {
    position: 'absolute' as const,
    bottom: 0,
    left: '20%',
    right: '20%',
    height: '1px',
    background: 'linear-gradient(to right, transparent, rgba(139, 115, 85, 0.3) 50%, transparent)',
  },
  title: {
    margin: 0,
    color: COLORS.text,
    fontWeight: 500,
    letterSpacing: '2px',
    fontSize: '18px',
  },
};

export const TAG_STYLES = {
  primary: {
    background: COLORS.primaryLight,
    color: COLORS.primary,
    border: `1px solid ${COLORS.primaryBorder}`,
    borderRadius: '6px',
    fontWeight: 500,
    padding: '4px 12px',
    fontSize: '13px',
  },
  secondary: {
    background: COLORS.secondaryLight,
    color: COLORS.secondary,
    border: `1px solid ${COLORS.secondaryBorder}`,
    borderRadius: '6px',
    fontWeight: 500,
    padding: '4px 12px',
    fontSize: '12px',
  },
};

export const BUTTON_STYLES = {
  primary: {
    background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '0.3px',
    boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
  },
  secondary: {
    color: COLORS.secondary,
    background: 'transparent',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
};

export const INPUT_STYLES = {
  search: {
    width: 240,
    height: '40px',
    padding: '10px 14px',
    borderRadius: '6px',
    border: `1px solid ${COLORS.secondaryBorder}`,
    background: COLORS.whiteTransparent,
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    fontSize: '14px',
    color: COLORS.text,
    letterSpacing: '0.3px',
    transition: 'all 0.3s ease',
  },
};

export const CARD_STYLES = {
  base: {
    borderRadius: '6px',
    border: '1px solid rgba(139, 115, 85, 0.15)',
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.06)',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
    background: COLORS.whiteTransparent,
    height: '100%',
  },
  hover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(184, 88, 69, 0.12)',
    borderColor: 'rgba(184, 88, 69, 0.3)',
  },
};

export const ACTION_BUTTON_STYLES = {
  base: {
    color: COLORS.secondary,
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hover: {
    color: COLORS.primary,
    background: COLORS.primaryLight,
  },
};

export const MODAL_STYLES = {
  wrapper: {
    maxHeight: '90vh',
    top: '5vh',
  },
  body: {
    height: 'calc(85vh - 120px)',
    padding: 0,
    overflow: 'hidden' as const,
  },
  form: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  basicInfo: {
    padding: '24px 24px 0',
    flexShrink: 0,
  },
  contentArea: {
    flex: 1,
    padding: '0 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: 0,
  },
  footer: {
    padding: '16px 24px 24px',
    borderTop: '1px solid rgba(139, 115, 85, 0.15)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    flexShrink: 0,
  },
};

export const COLLAPSE_STYLES = {
  panel: {
    marginBottom: '16px',
    borderRadius: '8px',
    border: '1px solid rgba(139, 115, 85, 0.15)',
    background: 'rgba(250, 248, 245, 0.6)',
    overflow: 'hidden' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '4px 0',
  },
  headerText: {
    fontSize: '14px',
    color: COLORS.text,
    fontWeight: 500,
    letterSpacing: '0.3px',
    flex: 1,
  },
};
