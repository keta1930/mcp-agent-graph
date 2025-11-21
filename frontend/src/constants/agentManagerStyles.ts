/**
 * Agent Manager 样式常量
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
    fontSize: '12px',
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
  dashed: {
    background: 'transparent',
    color: COLORS.textMuted,
    border: `1px dashed ${COLORS.secondaryBorder}`,
    borderRadius: '4px',
    fontWeight: 500,
    fontSize: '12px',
    padding: '2px 8px',
    margin: 0,
    lineHeight: '1.4',
  },
};

export const BUTTON_STYLES = {
  primary: {
    background: 'linear-gradient(135deg, #b85845 0%, #a0826d 100%)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontWeight: 500,
    fontSize: '14px',
    letterSpacing: '0.3px',
    boxShadow: '0 2px 6px rgba(184, 88, 69, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 20px',
  },
  secondary: {
    borderRadius: '6px',
    border: `1px solid ${COLORS.secondaryBorder}`,
    background: COLORS.whiteTransparent,
    color: COLORS.secondary,
    fontWeight: 500,
    fontSize: '14px',
    letterSpacing: '0.3px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 16px',
  },
};

export const INPUT_STYLES = {
  base: {
    borderRadius: '8px',
    border: `1px solid ${COLORS.secondaryBorder}`,
    background: COLORS.whiteTransparent,
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    fontSize: '14px',
    color: COLORS.text,
    letterSpacing: '0.3px',
  },
  focus: {
    borderColor: COLORS.primary,
    boxShadow: '0 0 0 3px rgba(184, 88, 69, 0.08), 0 1px 3px rgba(139, 115, 85, 0.08)',
  },
  blur: {
    borderColor: COLORS.secondaryBorder,
    boxShadow: '0 1px 3px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
  },
};

export const CARD_STYLES = {
  base: {
    borderRadius: '8px',
    border: `1px solid rgba(139, 115, 85, 0.15)`,
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
  iconContainer: {
    flexShrink: 0,
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: COLORS.primaryLight,
    borderRadius: '8px',
    border: `1px solid rgba(184, 88, 69, 0.1)`,
  },
};

export const ACTION_BUTTON_STYLES = {
  base: {
    color: COLORS.secondary,
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid rgba(139, 115, 85, 0.15)`,
  },
  hover: {
    color: COLORS.primary,
    background: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  delete: {
    color: COLORS.primary,
    border: `1px solid rgba(184, 88, 69, 0.15)`,
  },
  deleteHover: {
    color: '#d4574a',
    background: 'rgba(184, 88, 69, 0.12)',
    borderColor: 'rgba(184, 88, 69, 0.3)',
  },
};

export const MODAL_STYLES = {
  content: {
    borderRadius: '10px',
    boxShadow: '0 12px 40px rgba(139, 115, 85, 0.2)',
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(to bottom, rgba(250, 248, 245, 0.95), rgba(255, 255, 255, 0.9))',
    borderBottom: `1px solid rgba(139, 115, 85, 0.12)`,
    padding: '18px 28px',
    marginBottom: 0,
  },
  body: {
    padding: '28px 28px 20px',
    background: '#fff',
    maxHeight: '70vh',
    overflowY: 'auto' as const,
  },
  footer: {
    borderTop: `1px solid rgba(139, 115, 85, 0.12)`,
    padding: '16px 28px',
    background: 'rgba(250, 248, 245, 0.3)',
    marginTop: 0,
  },
};

export const FORM_SECTION_STYLES = {
  container: {
    background: 'rgba(250, 248, 245, 0.3)',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: `1px solid rgba(139, 115, 85, 0.1)`,
  },
  title: {
    fontSize: '13px',
    fontWeight: 600,
    color: COLORS.primary,
    marginBottom: '16px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  label: {
    color: COLORS.textLight,
    fontWeight: 500,
    fontSize: '14px',
  },
};
