// src/constants/systemToolsStyles.ts

/**
 * 系统工具管理器样式常量
 */

export const COLORS = {
  primary: '#b85845',
  secondary: '#8b7355',
  tertiary: '#d4a574',
  text: '#2d2d2d',
  textSecondary: 'rgba(45, 45, 45, 0.65)',
  textLight: 'rgba(45, 45, 45, 0.45)',
  background: '#faf8f5',
  backgroundLight: 'rgba(250, 248, 245, 0.6)',
  white: 'rgba(255, 255, 255, 0.85)',
  whiteLight: 'rgba(255, 255, 255, 0.8)',
  border: 'rgba(139, 115, 85, 0.15)',
  borderLight: 'rgba(139, 115, 85, 0.1)',
  borderPrimary: 'rgba(184, 88, 69, 0.25)',
  shadow: 'rgba(139, 115, 85, 0.08)',
  shadowHover: 'rgba(184, 88, 69, 0.12)'
};

export const TAG_STYLES = {
  primary: {
    background: 'rgba(184, 88, 69, 0.08)',
    color: COLORS.primary,
    border: `1px solid ${COLORS.borderPrimary}`,
    borderRadius: '6px',
    fontWeight: 500,
    padding: '4px 12px',
    fontSize: '12px'
  },
  secondary: {
    background: 'rgba(139, 115, 85, 0.08)',
    color: COLORS.secondary,
    border: `1px solid rgba(139, 115, 85, 0.25)`,
    borderRadius: '6px',
    fontWeight: 500,
    padding: '4px 12px',
    fontSize: '12px'
  },
  tertiary: {
    background: 'rgba(212, 165, 116, 0.08)',
    color: COLORS.tertiary,
    border: '1px solid rgba(212, 165, 116, 0.25)',
    borderRadius: '4px',
    fontSize: '11px',
    padding: '2px 6px'
  },
  required: {
    background: 'rgba(184, 88, 69, 0.08)',
    color: COLORS.primary,
    border: `1px solid ${COLORS.borderPrimary}`,
    borderRadius: '4px',
    fontSize: '11px',
    padding: '2px 6px'
  }
};

export const CARD_STYLES = {
  base: {
    borderRadius: '6px',
    border: `1px solid ${COLORS.border}`,
    boxShadow: `0 1px 3px ${COLORS.shadow}, inset 0 1px 0 ${COLORS.whiteLight}`,
    background: COLORS.white,
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const
  },
  hover: {
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 12px ${COLORS.shadowHover}, inset 0 1px 0 rgba(255, 255, 255, 0.9)`,
    borderColor: 'rgba(184, 88, 69, 0.3)'
  }
};

export const BUTTON_STYLES = {
  icon: {
    padding: '4px',
    borderRadius: '4px',
    color: COLORS.secondary,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent'
  },
  iconHover: {
    color: COLORS.primary,
    background: 'rgba(184, 88, 69, 0.08)'
  }
};
